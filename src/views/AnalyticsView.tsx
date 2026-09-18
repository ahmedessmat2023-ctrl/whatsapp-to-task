/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Mic,
  MessageSquare,
  Clock,
  CheckCircle2,
  Users,
  Flame,
  Calendar,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AnalyticsView: React.FC = () => {
  const { tasks, messages, language } = useApp();
  const isAr = language === 'ar';

  const adelMessages = messages.filter((m) => m.sender.includes('Adel'));
  const voiceCount = adelMessages.filter((m) => m.type === 'voice').length;
  const textCount = adelMessages.filter((m) => m.type === 'text').length;
  const voicePct = Math.round((voiceCount / (adelMessages.length || 1)) * 100);

  // Assignee count from Adel tasks
  const ownerCounts: Record<string, number> = {};
  tasks.forEach((t) => {
    ownerCounts[t.assignedTo] = (ownerCounts[t.assignedTo] || 0) + 1;
  });

  // Group counts
  const groupCounts: Record<string, number> = {};
  tasks.forEach((t) => {
    groupCounts[t.whatsAppGroup] = (groupCounts[t.whatsAppGroup] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'تحليلات توجيهات عادل حماد والمخرجات' : 'Adel HAMMAD Directive Analytics'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              EXECUTIVE INTELLIGENCE
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'أنماط التوجيهات، توزيع الصوت مقابل النصوص، ومعدلات استجابة الفريق'
              : 'Behavioral intelligence on directive frequency, voice-to-text ratio, and assignee turnaround.'}
          </p>
        </div>
      </div>

      {/* Voice vs Text Hero Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              {isAr ? 'توزيع وسائط طلبات عادل حماد (Voice vs Text)' : 'Adel Medium Breakdown (Voice Dominance)'}
            </h3>
            <p className="text-xs text-slate-500">
              Corroborates the ~90% voice note requirement in WhatsApp communication
            </p>
          </div>
          <span className="text-sm font-black text-orange-600 dark:text-orange-400">
            {voicePct}% Voice Notes
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-4 rounded-full bg-blue-100 dark:bg-blue-950 overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
            style={{ width: `${voicePct}%` }}
            title={`Voice Notes: ${voicePct}%`}
          />
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${100 - voicePct}%` }}
            title={`Text: ${100 - voicePct}%`}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-bold pt-1">
          <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" />
            Voice Notes ({voiceCount} directives)
          </span>
          <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Text Messages ({textCount} directives)
          </span>
        </div>
      </div>

      {/* Top Assignees & Top Directives Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Assignees */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            {isAr ? 'أكثر الأشخاص تكليفاً بالمهام' : 'Top Assignees from Adel Directives'}
          </h3>

          <div className="space-y-3">
            {Object.entries(ownerCounts).map(([owner, count]) => {
              const pct = Math.round((count / (tasks.length || 1)) * 100);
              return (
                <div key={owner} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{owner}</span>
                    <span className="font-mono text-slate-500">{count} tasks ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Active Groups */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            {isAr ? 'أكثر المجموعات استقبالاً للتوجيهات' : 'Most Active WhatsApp Directive Channels'}
          </h3>

          <div className="space-y-3">
            {Object.entries(groupCounts).map(([group, count]) => {
              const pct = Math.round((count / (tasks.length || 1)) * 100);
              return (
                <div key={group} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{group}</span>
                    <span className="font-mono text-slate-500">{count} tasks ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
