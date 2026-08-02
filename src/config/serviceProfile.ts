import { BadgeThemeId } from './badgeThemes';

export interface ServiceProfileConfig {
  name: string;
  badgeName: string;
  badgeThemeId: BadgeThemeId;
  badgeIconOverride?: string;
  bio: string;
  avatarUrl: string;
  status?: string;
  whatsappUrl: string;
  whatsappNumber: string;
  systemInfo: {
    version: string;
    apiStatus: string;
    workerUrl: string;
    workerStatus: string;
    responseTime: string;
    serverRegion: string;
  };
}

export const SERVICE_PROFILE: ServiceProfileConfig = {
  name: 'Shiro Anna',
  badgeName: 'Daveloper',
  badgeThemeId: 'ruby',
  badgeIconOverride: '',
  bio: 'Developer sekaligus pembuat project Oguri Cap Web App.',
  avatarUrl: '/assets/bot_avatar.jpg',
  status: 'Online',
  whatsappUrl: 'https://wa.me/6281563808289',
  whatsappNumber: '+62 815-6380-8289',
  systemInfo: {
    version: 'v2.5.0-PRO',
    apiStatus: 'Active / Normal',
    workerUrl: 'shiroapi.shiroanna.workers.dev',
    workerStatus: 'Operational 100%',
    responseTime: '~12ms (Optimal)',
    serverRegion: 'Asia-Southeast Edge',
  },
};
