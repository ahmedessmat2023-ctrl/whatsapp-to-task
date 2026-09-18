/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  Zap,
  Terminal,
  ShieldCheck,
  Filter,
  Eye,
  X,
  FileCode,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CaptureDiagnosticEvent } from '../types';

export const DiagnosticsView: React.FC = () => {
  const { diagnostics, sendSimulatedMessage, createTaskManual, language, isDarkMode, setShowSimulator } = useApp();
  const isAr = language === 'ar';

  const [selectedEvent, setSelectedEvent] = useState<CaptureDiagnosticEvent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'matched' | 'filtered'>('all');

  const filteredDiagnostics = diagnostics.filter((d) => {
    if (filterType === 'matched') return d.ruleMatch;
    if (filterType === 'filtered') return !d.ruleMatch;
    return true;
  });

  const copyDebugJson = (event: CaptureDiagnosticEvent) => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleForceCreateTask = async (event: CaptureDiagnosticEvent) => {
    await createTaskManual({
      title: `Task forced from Diagnostic Event ${event.id}`,
      description: `Raw capture text: ${event.rawSnippet}`,
      assignedTo: 'Ismail',
      department: 'Tech',
      priority: 'High',
      whatsAppGroup: event.group,
      requester: event.sender,
      originalRequest: event.rawSnippet,
      sourceMessageType: event.messageType,
      dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
      sla: '24 Hours',
      rag: 'Amber',
      progress: 0,
    });
    alert('Task created via manual override!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'محرك تشخيصات الرصد البرمجي (Diagnostics)' : 'Engineering Capture Diagnostics'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-mono">
              AUDIT TRAIL
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'الضمان البرمجي لعدم إهمال أي رسالة دون تدقيق: سجل لكل حدث، سبب القبول أو الاستبعاد، وإمكانية الفرض اليدوي'
              : 'Never Fail Silently Guarantee. Every observed DOM event, filter decision, and selector telemetry.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterType === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
              }`}
            >
              All ({diagnostics.length})
            </button>
            <button
              onClick={() => setFilterType('matched')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterType === 'matched' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Matched ({diagnostics.filter((d) => d.ruleMatch).length})
            </button>
            <button
              onClick={() => setFilterType('filtered')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterType === 'filtered' ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Filtered ({diagnostics.filter((d) => !d.ruleMatch).length})
            </button>
          </div>

          <button
            onClick={() => setShowSimulator(true)}
            className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulate</span>
          </button>
        </div>
      </div>

      {/* Diagnostics Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Event ID</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">WhatsApp Group</th>
                <th className="px-4 py-3">Sender</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Rule Result</th>
                <th className="px-4 py-3">Reason / Details</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDiagnostics.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                    {event.id}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {event.group}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                    {event.sender}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {(event.messageType || 'text').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {event.ruleMatch ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        MATCH (PROMOTED)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        FILTERED (AUDITED)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">
                      {event.reason || (event.ruleMatch ? 'Matched primary requester & active group' : 'Ignored')}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">"{event.rawSnippet}"</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        title="View Raw Debug JSON"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => copyDebugJson(event)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        title="Copy JSON Payload"
                      >
                        {copiedId === event.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {!event.ruleMatch && (
                        <button
                          onClick={() => handleForceCreateTask(event)}
                          className="px-2 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px]"
                          title="Override & force create task"
                        >
                          Force Task
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-950 text-slate-100 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h3 className="font-mono font-bold text-sm">Diagnostic Event Debug Payload ({selectedEvent.id})</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono overflow-x-auto max-h-96 text-emerald-400">
              {JSON.stringify(selectedEvent, null, 2)}
            </pre>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => copyDebugJson(selectedEvent)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                {copiedId === selectedEvent.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>Copy Payload</span>
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
