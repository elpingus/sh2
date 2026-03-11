function enforcePlanSettings(plan, settings) {
  const next = {
    ...settings,
  };

  if (plan === 'free') {
    next.autoFriend = false;
    next.hideActivity = false;
    next.cardFarmer = false;
    next.cardFarmerAutoResume = false;
    next.customTitleEnabled = true;
    next.customTitle = 'ste**hoursnet.xyz';
    next.awayMessageEnabled = true;
    next.awayMessage = 'get free hour boost steamhoursnet.xyz';
    return next;
  }

  if (plan === 'basic') {
    next.cardFarmer = false;
    next.cardFarmerAutoResume = false;
    return next;
  }

  return next;
}

module.exports = {
  enforcePlanSettings,
};
