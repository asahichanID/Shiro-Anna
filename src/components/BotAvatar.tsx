import React, { useState, useEffect } from 'react';
import { BOT_DEFAULT_AVATAR } from '../config/constants';

interface BotAvatarProps {
  src?: string;
  alt?: string;
  className?: string; // Container dimensions, e.g. "w-10 h-10" or "w-11 h-11"
  imgClassName?: string;
  showGlow?: boolean;
}

export const BotAvatar: React.FC<BotAvatarProps> = ({
  src,
  alt = 'Bot Avatar',
  className = 'w-10 h-10',
  imgClassName = '',
  showGlow = false,
}) => {
  const getInitialSrc = (inputSrc?: string) => {
    if (inputSrc && inputSrc.trim() !== '' && inputSrc !== '/assets/avatar.png') {
      return inputSrc;
    }
    return BOT_DEFAULT_AVATAR;
  };

  const [imgSrc, setImgSrc] = useState<string>(() => getInitialSrc(src));
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(getInitialSrc(src));
    setLoaded(false);
  }, [src]);

  const handleError = () => {
    if (imgSrc !== BOT_DEFAULT_AVATAR) {
      setImgSrc(BOT_DEFAULT_AVATAR);
    }
  };

  const imgContent = (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse rounded-full z-0" />
      )}
      <img
        src={imgSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={`w-full h-full rounded-full object-cover transition-opacity duration-300 ${
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
