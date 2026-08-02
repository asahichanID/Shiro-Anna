import React from 'react';
import { Video, X, Sparkles, Check, Film, Zap } from 'lucide-react';

export interface QualityOption {
  label: string; // Displayed to user, e.g., "360p", "480p", "720p", "1080p", "1440p", "2K"
  value: string; // Sent to backend/API: "360", "480", "720", "1080", "1440", "2k"
  description: string;
  badge?: string;
  recommended?: boolean;
}

export const QUALITY_OPTIONS: QualityOption[] = [
  { label: '360p', value: '360', description: 'SD • Hemat Kuota & Cepat' },
  { label: '480p', value: '480', description: 'SD • Kualitas Standar Ringan' },
  { label: '720p', value: '720', description: 'HD • Kualitas Utama', recommended: true, badge: 'Rekomendasi' },
  { label: '1080p', value: '1080', description: 'Full HD • Jernih & Tajam', badge: 'HD' },
  { label: '1440p', value: '1440', description: '2K QHD • Kualitas Sangat Tinggi' },
  { label: '2K', value: '2k', description: '2K Ultra HD • Kualitas Maksimal', badge: 'Ultra HD' },
];

interface YouTubeQualityModalProps {
  isOpen: boolean;
  videoTitle?: string;
  videoUrl?: string;
  thumbnail?: string;
  onSelectQuality: (qualityValue: string, qualityLabel: string) => void;
  onClose: () => void;
}

export const YouTubeQualityModal: React.FC<YouTubeQualityModalProps> = ({
  isOpen,
  videoTitle,
  videoUrl,
  thumbnail,
  onSelectQuality,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <span>Pilih Kualitas Video</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">
                Pilih resolusi video YouTube yang ingin diproses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Info Card if title/thumb available */}
        {(videoTitle || videoUrl) && (
          <div className="flex items-center space-x-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            {thumbnail && (
              <img
                src={thumbnail}
                alt={videoTitle || 'YouTube Video'}
                className="w-16 h-12 object-cover rounded-lg flex-shrink-0 border border-slate-800"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {videoTitle || 'YouTube Video'}
              </p>
              {videoUrl && (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {videoUrl}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quality Options Grid */}
        <div className="grid grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
          {QUALITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onSelectQuality(option.value, option.label);
                onClose();
              }}
              className={`relative flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all group ${
                option.recommended
                  ? 'bg-purple-950/40 border-purple-500/50 hover:bg-purple-900/50 hover:border-purple-400'
                  : 'bg-slate-950/80 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-sm font-bold text-slate-100 group-hover:text-purple-300 transition-colors">
                  {option.label}
                </span>
                {option.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      option.recommended
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {option.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 group-hover:text-slate-300">
                {option.description}
              </p>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-purple-400" /> Format dikirim ke API: <code className="bg-slate-950 px-1 py-0.5 rounded text-purple-300">360</code>, <code className="bg-slate-950 px-1 py-0.5 rounded text-purple-300">720</code>, <code className="bg-slate-950 px-1 py-0.5 rounded text-purple-300">2k</code>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
