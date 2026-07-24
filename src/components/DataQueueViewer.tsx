import React, { useState } from 'react';
import { QueueState, QuestionData } from '../types';
import { tebakKataManager } from '../musume/gametebak/tebakkata';
import { Database, Zap, FileText, Shuffle, CheckCircle2 } from 'lucide-react';
import data1 from '../musume/gametebak/tebakkata/data.json';
import data2 from '../musume/gametebak/tebakkata/data2.json';
import data3 from '../musume/gametebak/tebakkata/data3.json';

export const DataQueueViewer: React.FC = () => {
  const [activeFile, setActiveFile] = useState<'data.json' | 'data2.json' | 'data3.json'>('data.json');
  const [queueState, setQueueState] = useState<QueueState>(tebakKataManager.getQueueState());

  const handleShuffle = () => {
    tebakKataManager.shufflePermanentQueue();
    setQueueState(tebakKataManager.getQueueState());
  };

  const getSelectedDataset = (): QuestionData[] => {
    if (activeFile === 'data.json') return data1 as QuestionData[];
    if (activeFile === 'data2.json') return data2 as QuestionData[];
    return data3 as QuestionData[];
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-400" />
              Word Data & Permanent Random Queue
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Menampilkan file dataset kata (<code className="text-sky-300">data.json</code>, <code className="text-sky-300">data2.json</code>, dst.) dan status antrean permanen.
            </p>
          </div>

          <button
            onClick={handleShuffle}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all self-start sm:self-auto"
          >
            <Shuffle className="w-4 h-4" />
            <span>Shuffle Queue Permanen</span>
          </button>
        </div>

        {/* Queue Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-xs">Total Soal Terload</span>
            <p className="text-xl font-extrabold text-white mt-0.5">{queueState.totalQuestions} Soal</p>
            <span className="text-[10px] text-slate-500">Dari 3 file JSON</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-xs">Sisa di Queue Permanen</span>
            <p className="text-xl font-extrabold text-sky-400 mt-0.5">{queueState.remainingInQueue} Soal</p>
            <span className="text-[10px] text-slate-500">Akan reshuffle saat 0</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-xs">Status Mekanisme</span>
            <p className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Queue → Random Permanen
            </p>
            <span className="text-[10px] text-slate-500">Tidak berulang berurutan</span>
          </div>
        </div>
      </div>

      {/* File Dataset Selector Tabs */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <FileText className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-bold text-white">Inspeksi File Dataset:</span>

          {(['data.json', 'data2.json', 'data3.json'] as const).map((filename) => (
            <button
              key={filename}
              onClick={() => setActiveFile(filename)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                activeFile === filename
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              /musume/gametebak/tebakkata/{filename}
            </button>
          ))}
        </div>

        {/* JSON Content Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Soal Tebak Kata</th>
                <th className="px-4 py-3">Jawaban</th>
                <th className="px-4 py-3">Clue / Hint</th>
                <th className="px-4 py-3">Kategori</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {getSelectedDataset().map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-400">{item.id}</td>
                  <td className="px-4 py-3 text-white font-medium">{item.soal}</td>
                  <td className="px-4 py-3 font-bold text-emerald-400 font-mono">{item.jawaban}</td>
                  <td className="px-4 py-3 text-sky-300/90">{item.clue}</td>
                  <td className="px-4 py-3 text-slate-400">
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] border border-slate-700">
                      {item.kategori || 'General'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
