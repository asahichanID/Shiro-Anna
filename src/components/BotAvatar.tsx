import React, { useState, useEffect } from 'react';
import { BOT_DEFAULT_AVATAR } from '../config/constants';

interface BotAvatarProps {
  src?: string;
  alt?: string;
  className?: string; // Container dimensions, e.g. "w-10 h-10" or "w-11 h-11"
  imgClassName?: string;
  showGlow?: boolean;
}

const LOCAL_BOT_AVATAR = '/assets/bot_avatar.jpg';
const CDN_BOT_AVATAR = 'https://raw.githubusercontent.com/asahichanID/media/main/images%20(6).jpeg';

export const BotAvatar: React.FC<BotAvatarProps> = ({
  src,
  alt = 'Bot Avatar',
  className = 'w-10 h-10',
  imgClassName = '',
  showGlow = false,
}) => {
  const getInitialSrc = (inputSrc?: string) => {
    // 1. If valid custom inputSrc (and not empty or generic dummy path)
    if (
      inputSrc &&
      inputSrc.trim() !== '' &&
      inputSrc !== '/assets/avatar.png' &&
      !inputSrc.includes('jsdelivr')
    ) {
      return inputSrc;
    }

    // 2. Try cached base64/url from localStorage for zero-latency instant render
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem('oguri_cached_bot_avatar');
      if (cached && cached.trim() !== '' && cached !== '/assets/avatar.png' && !cached.includes('jsdelivr')) {
        return cached;
      }
    }

    return LOCAL_BOT_AVATAR;
  };

  const [imgSrc, setImgSrc] = useState<string>(() => getInitialSrc(src));
  const [loaded, setLoaded] = useState<boolean>(true);

  useEffect(() => {
    setImgSrc(getInitialSrc(src));
  }, [src]);

  const handleError = () => {
    if (imgSrc !== LOCAL_BOT_AVATAR) {
      setImgSrc(LOCAL_BOT_AVATAR);
    } else if (imgSrc !== CDN_BOT_AVATAR) {
      setImgSrc(CDN_BOT_AVATAR);
    }
  };

  const handleLoad = () => {
    setLoaded(true);
    try {
      if (imgSrc && typeof localStorage !== 'undefined') {
        localStorage.setItem('oguri_cached_bot_avatar', imgSrc);
      }
    } catch {}
  };

  const imgContent = (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse rounded-full z-0" />
      )}
      <img
        src={imgSrc || LOCAL_BOT_AVATAR}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full rounded-full object-cover transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${imgClassName}`}
      />
    </>
  );

  if (showGlow) {
    return (
      <div
        className={`relative rounded-full bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 p-0.5 shadow-md shadow-sky-500/20 overflow-hidden flex-shrink-0 ${className}`}
      >
        {imgContent}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-full flex-shrink-0 ${className}`}>
      {imgContent}
    </div>
  );
};
