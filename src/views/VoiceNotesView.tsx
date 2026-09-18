/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Mic,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Scissors,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  Volume2,
  Trash2,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const VoiceNotesView: React.FC = () => {
  const { messages, drafts, setCurrentTab, setShowSimulator, language } = useApp();
  const isAr = language === 'ar';

  const [playingId, setPlayingId] = useState<string | null>(null);

  const voiceMessages = messages.filter((m) => m.type === 'voice');

  const togglePlay = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
      setTimeout(() => {
        setPlayingId((curr) => (curr === id ? null : curr));
      }, 6000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'مركز معالجة الرسائل الصوتية (Voice Pipeline)' : 'Executive Voice Notes Hub'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-500 text-white shadow-xs">
              {voiceMessages.length} {isAr ? 'تسجيل صوتي' : 'Voice Notes'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? '90% من توجيهات عادل حماد تصل كرسائل صوتية بالعامية المصرية. تفريغ فوري واستخراج المهام.'
              : 'Specialized speech-to-text pipeline for Egyptian Arabic, Gulf Arabic & Arabizi with multi-task splitting.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimulator(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 flex items-center gap-1.5"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل صوتي مباشر / تجربة' : 'Record / Simulate Voice'}</span>
          </button>
        </div>
      </div>

      {/* Voice Dialects & Retention Policy Capsule */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-900/50 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {isAr ? 'محرك التفريغ الصوتي متعدد اللهجات' : 'Multi-Dialect Egyptian & Gulf Speech Engine'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Trained on Egyptian tech slang (الـ API, الـ requirements, الـ staging, باصيلي, كلم فلان)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300">
              Retention: 7 Days Audio / Indefinite Transcripts
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-orange-100 dark:border-orange-900/40">
            <span className="text-[10px] text-slate-400 block">Egyptian Colloquial</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">100% Supported</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-orange-100 dark:border-orange-900/40">
            <span className="text-[10px] text-slate-400 block">Mixed Tech English</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Auto Code-Switching</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-orange-100 dark:border-orange-900/40">
            <span className="text-[10px] text-slate-400 block">Transcription Latency</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">&lt; 2.1 seconds</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-orange-100 dark:border-orange-900/40">
            <span className="text-[10px] text-slate-400 block">Multi-Task Extractor</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Automated Split</span>
          </div>
        </div>
      </div>

      {/* Voice Notes List */}
      <div className="space-y-4">
        {voiceMessages.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-3xl text-slate-400">
            No voice notes captured yet. Send a test voice note via the Simulator!
          </div>
        ) : (
          voiceMessages.map((msg) => {
            const isPlaying = playingId === msg.id;
            return (
              <div
                key={msg.id}
                className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap text-xs">
                    <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      {msg.sender}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {msg.group}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    Duration: {msg.voiceDuration || 18}s
                  </span>
                </div>

                {/* Audio Player Bar */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <button
                    onClick={() => togglePlay(msg.id)}
                    className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                      <span>{isPlaying ? 'Playing Egyptian WhatsApp Voice Note...' : 'Click to preview audio note'}</span>
                      <span>0:{msg.voiceDuration || 18}</span>
                    </div>

                    <div className="flex items-center gap-1 h-6">
                      {[14, 28, 16, 32, 22, 10, 26, 36, 18, 24, 16, 30, 14, 22, 34, 26, 18, 28, 16, 22, 30, 20, 14, 26].map(
                        (h, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-all ${
                              isPlaying && i < 14 ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            style={{ height: `${h}px` }}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Transcript */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      {isAr ? 'نص التفريغ الدقيق:' : 'Verified Egyptian Arabic Transcript:'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Dialect: Egyptian Colloquial
                    </span>
                  </div>

                  <blockquote className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs font-medium text-slate-800 dark:text-slate-200 italic leading-relaxed">
                    "{msg.transcript || msg.text || 'Processing Egyptian voice note...'}"
                  </blockquote>
                </div>

                {/* Extracted Tasks Association */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Source WhatsApp ID: <span className="font-mono">{msg.id}</span>
                  </span>
                  <button
                    onClick={() => setCurrentTab('inbox')}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    View in Review Inbox →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
