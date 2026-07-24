import React, { useState } from 'react';
import { Download, CheckCircle, Loader2, FileCode, FolderArchive, Sparkles } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const ProjectDownloadButton: React.FC = () => {
  const [isZipping, setIsZipping] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleDownloadZip = async () => {
    setIsZipping(true);
    setDownloadSuccess(false);

    try {
      const zip = new JSZip();

      // List of all essential source files to read and package
      const filePaths = [
        'package.json',
        'server.ts',
        'vite.config.ts',
        'index.html',
        'tsconfig.json',
        '.env.example',
        'metadata.json',
        'public/assets/avatar.png',
        'public/assets/oguri_avatar.png',
        'src/App.tsx',
        'src/main.tsx',
        'src/index.css',
        'src/types.ts',
        'src/types/index.ts',
        'src/database/gameDb.ts',
        'src/database/userDb.ts',
        'src/handler/messageHandler.ts',
        'src/handler/reply.ts',
        'src/musume/gametebak/tebakkata/index.ts',
        'src/musume/gametebak/tebakkata/data.json',
        'src/musume/gametebak/tebakkata/data2.json',
        'src/musume/gametebak/tebakkata/data3.json',
        'src/components/OguriCapHeader.tsx',
        'src/components/ChatSimulator.tsx',
        'src/components/MusicPlayViewer.tsx',
        'src/components/DatabaseViewer.tsx',
        'src/components/DataQueueViewer.tsx',
        'src/components/ArchitectureAnalysisModal.tsx',
        'src/components/ProjectDownloadButton.tsx',
      ];

      // Fetch each file and add to zip
      for (const path of filePaths) {
        try {
          const res = await fetch(`/${path}`);
          if (res.ok) {
            if (path.endsWith('.mp4') || path.endsWith('.png') || path.endsWith('.jpg')) {
              const blob = await res.blob();
              zip.file(path, blob);
            } else {
              const content = await res.text();
              zip.file(path, content);
            }
          }
        } catch (e) {
          console.warn(`Could not include file ${path} in zip:`, e);
        }
      }

      // Generate readme
      zip.file(
        'README.md',
        `# Oguri Cap Web App & Music Play Jukebox 🐎

A full-stack Web Application featuring:
- Oguri Cap Tebak Kata Game Bot Simulator
- YouTube Jukebox Music & Video Download Player (Naze API Integration)
- Real-time Carrot Coins & Win Streak System
- Database Inspector & Queue Inspector

## How to Run Locally

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Start development server:
\`\`\`bash
npm run dev
\`\`\`

3. Build for production:
\`\`\`bash
npm run build
npm start
\`\`\`
`
      );

      // Generate blob & trigger download
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'OguriCap_WebApp_Project.zip');

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to generate ZIP download:', err);
      alert('Gagal membuat file ZIP. Silakan coba lagi.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <>
      {/* Download Button in Header / Navigation Bar */}
      <button
        onClick={() => setShowModal(true)}
        className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 border border-emerald-400/40 flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span>Download Project</span>
        <span className="bg-emerald-400/30 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold border border-emerald-300/30">
          ZIP
        </span>
      </button>

      {/* Download Options Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Modal Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 p-0.5 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
                <FolderArchive className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                  Download Project Source Code
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h3>
                <p className="text-xs text-slate-400">Unduh seluruh berkas project Oguri Cap Web App</p>
              </div>
            </div>

            {/* Quick Action Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-3">
                <FileCode className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">1-Click Instant ZIP Download</h4>
                  <p className="text-[11px] text-slate-400">
                    Mengunduh seluruh file React + TypeScript + Server Express ke dalam file `.zip`.
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all"
              >
                {isZipping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mempersiapkan Berkas ZIP...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                    <span>Berhasil Diunduh! (Check Downloads)</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Source Code (ZIP)</span>
                  </>
                )}
              </button>
            </div>

            {/* Export via AI Studio Note */}
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-sky-300">💡 Ekspor via Menu AI Studio:</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Anda juga dapat mengekspor atau menghubungkan project ini ke **GitHub** atau mengunduh ZIP kapan saja melalui menu **Settings / Export** di pojok kanan atas AI Studio.
              </p>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
