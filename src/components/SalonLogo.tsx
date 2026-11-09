import React from 'react';
import { Scissors } from 'lucide-react';
import { SystemConfig } from '../types';
import { StorageService } from '../services/storage';

interface SalonLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  showText?: boolean;
  overrideConfig?: SystemConfig;
}

export const SalonLogo: React.FC<SalonLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  overrideConfig,
}) => {
  const config = overrideConfig || StorageService.getConfig();
  const logoUrl = config.logoUrl;
  const logoType = config.logoType || (logoUrl && (logoUrl.startsWith('data:video') || logoUrl.toLowerCase().includes('.mp4')) ? 'video' : 'image');

  // Dimensions based on size
  let dimensionClasses = 'w-12 h-12';
  let iconSize = 'w-6 h-6';
  let roundedClass = 'rounded-2xl';

  if (size === 'xs') {
    dimensionClasses = 'w-6 h-6';
    iconSize = 'w-3.5 h-3.5';
    roundedClass = 'rounded-lg';
  } else if (size === 'sm') {
    dimensionClasses = 'w-8 h-8';
    iconSize = 'w-4 h-4';
    roundedClass = 'rounded-xl';
  } else if (size === 'md') {
    dimensionClasses = 'w-12 h-12';
    iconSize = 'w-6 h-6';
    roundedClass = 'rounded-2xl';
  } else if (size === 'lg') {
    dimensionClasses = 'w-16 h-16';
    iconSize = 'w-8 h-8';
    roundedClass = 'rounded-2xl';
  } else if (size === 'xl') {
    dimensionClasses = 'w-24 h-24';
    iconSize = 'w-12 h-12';
    roundedClass = 'rounded-2xl';
  } else if (size === '2xl') {
    dimensionClasses = 'w-32 h-32';
    iconSize = 'w-16 h-16';
    roundedClass = 'rounded-3xl';
  } else if (size === '3xl') {
    dimensionClasses = 'w-40 h-40';
    iconSize = 'w-20 h-20';
    roundedClass = 'rounded-3xl';
  } else if (size === '4xl') {
    dimensionClasses = 'w-48 h-48';
    iconSize = 'w-24 h-24';
    roundedClass = 'rounded-3xl';
  }

  const renderVisual = () => {
    if (logoUrl) {
      if (logoType === 'video') {
        return (
          <div className={`${dimensionClasses} ${roundedClass} overflow-hidden border-2 border-[#C8A45D]/60 shadow-[0_0_25px_rgba(255,90,0,0.5)] bg-black shrink-0 relative flex items-center justify-center`}>
            <video
              src={logoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        );
      }

      return (
        <div className={`${dimensionClasses} ${roundedClass} overflow-hidden border-2 border-[#C8A45D]/60 shadow-[0_0_25px_rgba(255,90,0,0.5)] bg-[#0C1C2B] shrink-0 flex items-center justify-center p-1.5`}>
          <img
            src={logoUrl}
            alt={config.salonNetworkName || 'Logo'}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(255,90,0,0.4)]"
          />
        </div>
      );
    }

    // Default icon
    return (
      <div className={`${dimensionClasses} ${roundedClass} bg-gradient-to-br from-[#C8A45D] via-[#c43800] to-[#591400] flex items-center justify-center shadow-[0_0_25px_rgba(255,90,0,0.6)] border-2 border-[#E2C98A]/60 shrink-0`}>
        <Scissors className={`${iconSize} text-white animate-pulse`} />
      </div>
    );
  };

  if (!showText) {
    return <div className={`inline-flex items-center ${className}`}>{renderVisual()}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {renderVisual()}
      <div className="min-w-0">
        <div className="text-[10px] font-mono tracking-widest text-[#D7C08E] uppercase truncate">
          // {config.slogan || 'Rede de Alta Performance & Gestão de Salões'}
        </div>
        <div className="text-sm font-bold tracking-wider text-white uppercase truncate">
          {config.salonNetworkName || 'Bom Corte Salões'}
        </div>
      </div>
    </div>
  );
};
