function inferFreeFromStoreItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.is_free_game === 'boolean') return item.is_free_game;
  if (typeof item.is_free === 'boolean') return item.is_free;
  if (item.price && typeof item.price === 'object') {
    if (typeof item.price.final === 'number') return item.price.final <= 0;
    if (typeof item.price.initial === 'number') return item.price.initial <= 0;
  }
  return false;
}

async function fetchSteamAppMeta(appId) {
  const id = String(appId || '').trim();
  if (!id) return null;

  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(id)}&cc=us&l=english`
    );
    if (!response.ok) return null;

    const data = await response.json();
    const appData = data?.[id];
    if (!appData?.success || !appData?.data) return null;

    return {
      appId: id,
      name: appData.data.name || '',
      icon: appData.data.header_image || appData.data.capsule_image || '',
      isFree: Boolean(appData.data.is_free),
      type: appData.data.type || '',
    };
  } catch (_error) {
    return null;
  }
}

module.exports = {
  inferFreeFromStoreItem,
  fetchSteamAppMeta,
};
