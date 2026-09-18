/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { COMPANION_CONTENT_JS, COMPANION_MANIFEST_JSON, TAMPERMONKEY_USER_SCRIPT } from '../utils/companionCode';

export const LiveCaptureView: React.FC = () => {
  const { health, messages, language, setShowSimulator } = useApp();
  const isAr = language === 'ar';

  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stream' | 'extension' | 'userscript'>('stream');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'الرصد المباشر ورابط واتساب ويب' : 'Live Capture & WhatsApp Bridge'}
            </h1>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                health.status === 'healthy'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              }`}
            >
              {health.status === 'healthy' ? 'MONITORING ACTIVE' : 'CONNECTOR ATTENTION'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'مراقبة مستمرة لأحداث واتساب ويب، سلامة المحددات (DOM Selectors)، وتنزيل إضافة المتصفح'
              : 'Continuous observation telemetry, selector resilience checks, and companion Chrome extension / script.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimulator(true)}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isAr ? 'تجربة إرسال رسالة رصد' : 'Simulate WhatsApp Event'}</span>
          </button>
        </div>
      </div>

      {/* Connection Diagnostics Bar */}
      <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {isAr ? 'حالة محرك المراقبة المحلي' : 'Local Capture Engine Status'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Listening on <code className="font-mono font-bold text-indigo-600">/api/capture/webhook</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Last DOM Scan:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{health.lastScan}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Target Requester:</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">Adel HAMMAD Egy</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block mb-1 text-[11px]">Active Group in View</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate block">
              {health.currentWhatsAppGroup}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block mb-1 text-[11px]">Voice Subsystem</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Operational
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block mb-1 text-[11px]">Speech Transcription</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Gemini & Whisper
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block mb-1 text-[11px]">Observed Messages</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{messages.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs: Stream vs Extension Setup */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('stream')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'stream'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          {isAr ? 'بث الرسائل المرصودة الحية' : 'Live Captured Events Stream'}
        </button>
        <button
          onClick={() => setActiveTab('extension')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'extension'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>{isAr ? 'كود إضافة كروم (Chrome Extension)' : 'Chrome Extension Files'}</span>
        </button>
        <button
          onClick={() => setActiveTab('userscript')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'userscript'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>{isAr ? 'سكريبت Tampermonkey التلقائي' : 'Tampermonkey Userscript'}</span>
        </button>
      </div>

      {/* TAB 1: Live Stream */}
      {activeTab === 'stream' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Showing latest {messages.length} captured WhatsApp message containers</span>
            <span className="flex items-center gap-1 text-emerald-500 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live WebSocket / Polling Active
            </span>
          </div>

          <div className="space-y-2.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-slate-400">{msg.id}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                      {msg.sender.includes('Adel') && <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />}
                      {msg.sender}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      {msg.group}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      {msg.type.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {msg.type === 'voice' ? (
                      <span className="italic text-orange-600 dark:text-orange-400">
                        🎙️ [Voice Note {msg.voiceDuration || 15}s]: {msg.transcript || msg.text || 'Processing Egyptian transcript...'}
                      </span>
                    ) : (
                      msg.text
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Selector: data-pre-plain-text
                  </span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
                    Processed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Chrome Extension Code */}
      {activeTab === 'extension' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
            <h4 className="font-extrabold text-indigo-950 dark:text-indigo-200">
              {isAr ? 'طريقة تثبيت إضافة كروم في دقيقة واحدة:' : 'How to install the Chrome Extension in 1 minute:'}
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
              <li>Create a folder on your computer named <code className="font-bold">trygc-whatsapp-bridge</code></li>
              <li>Save <code className="font-bold">manifest.json</code> and <code className="font-bold">content.js</code> from the code blocks below into that folder.</li>
              <li>Open Chrome and navigate to <code className="font-bold">chrome://extensions</code>.</li>
              <li>Toggle <strong>Developer mode</strong> (top right), then click <strong>Load unpacked</strong> and select the folder.</li>
              <li>Open <a href="https://web.whatsapp.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">web.whatsapp.com</a>. The bridge connects automatically and captures Adel HAMMAD requests to this Hub!</li>
            </ol>
          </div>

          <div className="space-y-3">
            {/* manifest.json */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">manifest.json</span>
                <button
                  onClick={() => copyToClipboard(COMPANION_MANIFEST_JSON, 'manifest')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1"
                >
                  {copiedScript === 'manifest' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript === 'manifest' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-56">
                {COMPANION_MANIFEST_JSON}
              </pre>
            </div>

            {/* content.js */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">content.js (DOM Observer Engine)</span>
                <button
                  onClick={() => copyToClipboard(COMPANION_CONTENT_JS, 'content')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1"
                >
                  {copiedScript === 'content' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript === 'content' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-72">
                {COMPANION_CONTENT_JS}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Tampermonkey Userscript */}
      {activeTab === 'userscript' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 space-y-2">
            <h4 className="font-extrabold text-orange-950 dark:text-orange-200">
              {isAr ? 'طريقة تثبيت سكريبت Tampermonkey:' : 'Single-Click Userscript Installation:'}
            </h4>
            <p className="text-slate-700 dark:text-slate-300">
              If you use Tampermonkey or Violentmonkey, create a new script and paste the code below. It executes continuously in the background on web.whatsapp.com.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-3 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between">
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">trygc-whatsapp-bridge.user.js</span>
              <button
                onClick={() => copyToClipboard(TAMPERMONKEY_USER_SCRIPT, 'userscript')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1"
              >
                {copiedScript === 'userscript' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript === 'userscript' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-80">
              {TAMPERMONKEY_USER_SCRIPT}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
