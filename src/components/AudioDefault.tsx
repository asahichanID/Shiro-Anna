import React from 'react';
import { BackgroundMusicPlayer } from './BackgroundMusicPlayer';
import { JukeboxTrack } from '../context/AudioPlayerContext';

export const BOT_DEFAULT_TRACK: JukeboxTrack = {
  trackId: 'bot_theme_oguri',
  source: 'bot',
  title: 'Oguri Theme (Bot Default)',
  artist: 'Tracen Academy Bot',
  thumbnail: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
  downloadUrl: 'https://cdn.jsdelivr.net/gh/asahichanID/SoundMp3/girls_legend_u_2.mp3',
  isBotTheme: true,
};

export const AudioDefault: React.FC = () => {
  return <BackgroundMusicPlayer />;
};
