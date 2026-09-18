/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  Clock,
  User,
  Building2,
  FolderKanban,
  Flag,
  Calendar,
  AlertCircle,
  FileText,
  Mic,
  MessageSquare,
  History,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Send,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Priority, TaskStatus } from '../types';

export const TaskDetailDrawer: React.FC = () => {
  const { selectedTaskId, setSelectedTaskId, tasks, updateTaskStatus, language, isDarkMode } = useApp();
  const [timelineNote, setTimelineNote] = useState('');

  if (!selectedTaskId) return null;

  const task = tasks.find((t) => t.id === selectedTaskId);
  if (!task) return null;

  const isAr = language === 'ar';

  const statusOptions: TaskStatus[] = [
    'New',
    'Assigned',
    'In Progress',
    'Waiting',
    'Blocked',
    'Under Review',
    'Done',
    'Cancelled',
  ];

  const priorityColors: Record<Priority, string> = {
    Critical: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
    High: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
    Medium: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
    Low: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400',
  };

  const ragColors = {
    Red: 'bg-red-500 text-white',
    Amber: 'bg-amber-500 text-white',
    Green: 'bg-emerald-500 text-white',
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateTaskStatus(task.id, newStatus, timelineNote || `Operator shifted status to ${newStatus}`);
    setTimelineNote('');
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
      <div
        className={`w-full max-w-2xl h-full border-l shadow-2xl flex flex-col ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        } animate-in slide-in-from-right duration-200`}
      >
        {/* Header */}
        <div className="p-5 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {task.id}
            </span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
              {task.priority} Priority
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${ragColors[task.rag]}`}>
              RAG: {task.rag}
            </span>
          </div>

          <button
            onClick={() => setSelectedTaskId(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Title & Status Bar */}
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3 leading-snug">
              {task.title}
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">{isAr ? 'الحالة:' : 'Current Status:'}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {statusOptions.map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      task.status === st
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 21: Source Traceability Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                {isAr ? 'مصدر رسالة واتساب المعتمد (Source Traceability)' : 'Verified WhatsApp Source'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Msg ID: {task.sourceMessageId}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">{isAr ? 'المجموعة:' : 'Group:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{task.whatsAppGroup}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{isAr ? 'المُرسل:' : 'Requester:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{task.requester}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{isAr ? 'توقيت الإرسال:' : 'Captured At:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {new Date(task.sourceTimestamp).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{isAr ? 'نوع الرسالة:' : 'Message Type:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  {task.messageType === 'voice' ? <Mic className="w-3 h-3 text-orange-500" /> : <MessageSquare className="w-3 h-3 text-blue-500" />}
                  {task.messageType.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Original Audio / Transcript */}
            <div className="pt-2 border-t border-purple-200/60 dark:border-purple-900/60">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                {task.messageType === 'voice' ? (isAr ? 'تفريغ الصوت الأصلي:' : 'Original Voice Note Transcript:') : (isAr ? 'النص الأصلي:' : 'Original Message Text:')}
              </span>
              <blockquote className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-purple-200/50 dark:border-purple-900/40 text-slate-700 dark:text-slate-300 italic leading-relaxed">
                "{task.originalRequest}"
              </blockquote>
            </div>
          </div>

          {/* Description & Requirements */}
          <div className="space-y-3">
            <div>
              <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'تفاصيل المهمة والمطلوب:' : 'Description & Action Items:'}</h4>
              <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed">
                {task.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-inherit">
                <span className="text-slate-400 block mb-0.5">{isAr ? 'المسؤول المعين' : 'Assigned To'}</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{task.assignedTo}</span>
                <span className="text-[10px] text-slate-500 block">{task.department}</span>
              </div>

              <div className="p-3 rounded-xl border border-inherit">
                <span className="text-slate-400 block mb-0.5">{isAr ? 'المشروع / البلد' : 'Project / Country'}</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{task.project}</span>
                <span className="text-[10px] text-slate-500 block">{task.country} — {task.client}</span>
              </div>

              <div className="p-3 rounded-xl border border-inherit">
                <span className="text-slate-400 block mb-0.5">{isAr ? 'الموعد النهائي و SLA' : 'Due Date & SLA'}</span>
                <span className="font-bold text-slate-900 dark:text-white">{task.dueDate}</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">{task.sla}</span>
              </div>

              <div className="p-3 rounded-xl border border-inherit">
                <span className="text-slate-400 block mb-0.5">{isAr ? 'نسبة الإنجاز' : 'Progress'}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${task.progress}%` }} />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{task.progress}%</span>
                </div>
              </div>
            </div>

            {task.blocker && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300">
                <span className="font-bold block mb-0.5">{isAr ? 'معوق / Blocker:' : 'Active Blocker:'}</span>
                <span>{task.blocker}</span>
              </div>
            )}

            {task.dependency && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <span className="font-bold block mb-0.5">{isAr ? 'الاعتماديات / Dependencies:' : 'Dependencies:'}</span>
                <span>{task.dependency}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">{isAr ? 'المخرجات المطلوبة:' : 'Required Output:'}</span>
              <span className="text-slate-600 dark:text-slate-400">{task.requiredOutput}</span>
            </div>
          </div>

          {/* Section 20: Audit Trail & Timeline */}
          <div className="pt-3 border-t border-inherit">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-extrabold text-slate-900 dark:text-white">
                {isAr ? 'سجل التعديلات والخط الزمني (Audit Trail)' : 'Activity Timeline & Audit Trail'}
              </h4>
            </div>

            <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 dark:border-slate-700 ml-2">
              {task.timeline.map((event, idx) => (
                <div key={event.id || idx} className="relative">
                  <div className="absolute -left-[31px] top-0 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-slate-900" />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{event.action}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">By: {event.actor}</p>
                    {event.details && (
                      <p className="mt-1 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[11px]">
                        {event.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Timeline Note Adder */}
            <div className="mt-4 pt-3 border-t border-inherit flex gap-2">
              <input
                type="text"
                value={timelineNote}
                onChange={(e) => setTimelineNote(e.target.value)}
                placeholder={isAr ? 'إضافة ملاحظة متابعة على المهمة...' : 'Add progress note or Adel follow-up update...'}
                className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => {
                  if (timelineNote.trim()) {
                    updateTaskStatus(task.id, task.status, timelineNote);
                    setTimelineNote('');
                  }
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isAr ? 'تسجيل' : 'Log'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
