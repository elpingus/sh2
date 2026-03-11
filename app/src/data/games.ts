import type { Game } from '@/types';

export const popularGames: Game[] = [
  { id: '1', appId: '730', name: 'Counter-Strike 2', icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/730/8db4c6ae3c3a8ba9a23e8f1b1c8a5f3d2e1c0b9a.jpg' },
  { id: '2', appId: '570', name: 'Dota 2', icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/570/0bbb630d63262dd66d2fdd0f7d37e8661a410075.jpg' },
  { id: '3', appId: '440', name: 'Team Fortress 2', icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/440/e3f595a92552da3d664ad00277fad2107345f743.jpg' },
  { id: '4', appId: '252490', name: 'Rust', icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/252490/820be478263098d40f5e3f5a5c7e23a1b3c1a7e5.jpg' },
  { id: '5', appId: '271590', name: 'Grand Theft Auto V', icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/271590/ce69d2c3c9d3e3e1b3a3c3d3e3f3a3b3c3d3e3f3.jpg' },
  { id: '6', appId: '1085660', name: "Baldur's Gate 3", icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/1085660/4a3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3.jpg' },
  { id: '7', appId: '1172470', name: 'Apex Legends', icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/1172470/3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3.jpg' },
  { id: '8', appId: '578080', name: 'PUBG: BATTLEGROUNDS', icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/578080/3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3.jpg' },
  { id: '9', appId: '1966720', name: 'Lethal Company', icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/1966720/3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3.jpg' },
  { id: '10', appId: '1623730', name: 'Palworld', icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/1623730/3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3.jpg' },
  { id: '11', appId: '236850', name: 'Europa Universalis IV', icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/236850/3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3.jpg' },
  { id: '12', appId: '8930', name: 'Sid Meier\'s Civilization V', icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/8930/3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3.jpg' },
];

export const gameAliases: Record<string, string[]> = {
  'counter-strike 2': ['cs2', 'csgo', 'cs go', 'counter strike', 'counterstrike'],
  'dota 2': ['dota', 'dota2'],
  'grand theft auto v': ['gta', 'gta5', 'gta v', 'gtav'],
  'team fortress 2': ['tf2', 'tf 2', 'team fortress'],
  'apex legends': ['apex'],
  'pubg: battlegrounds': ['pubg', 'playerunknown'],
  "baldur's gate 3": ['bg3', 'baldurs gate'],
  'europa universalis iv': ['eu4', 'eu iv', 'europa universalis 4'],
  "sid meier's civilization v": ['civ5', 'civ 5', 'civilization 5'],
};
