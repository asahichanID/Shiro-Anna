import React from 'react';
import { Settings, X } from 'lucide-react';
import { ServiceView } from './ServiceView';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[75vh] sm:h-[72vh] shadow-2xl overflow-hidden flex flex-col my-auto border-amber-500/20">
        
        {/* Modal Header */}
        <div className="bg-slate-950/95 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                Pengaturan & Service Hub
              </h3>
              <p className="text-[11px] text-slate-400">Pusat Bantuan Resmi, Kontak Developer, & Status Sistem</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700/60 flex items-center gap-1.5 text-xs font-bold shadow-sm"
            title="Tutup (ESC)"
          >
            <span>Tutup</span>
            <X className="w-4 h-4 text-amber-400" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          <ServiceView />
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950/90 px-5 py-3 border-t border-slate-800/80 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">
            💡 Tekan <strong className="text-amber-400">Tutup</strong> atau klik di luar modal untuk kembali.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Tutup Modal</span>
          </button>
        </div>

      </div>
    </div>
  );
};

