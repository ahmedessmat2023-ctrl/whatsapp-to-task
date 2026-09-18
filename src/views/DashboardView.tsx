/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  MessageSquare,
  Mic,
  Inbox,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  BarChart3,
  TrendingUp,
  Radio,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DashboardView: React.FC = () => {
  const { tasks, drafts, messages, language, setCurrentTab, setSelectedTaskId, setShowSimulator } = useApp();

  const isAr = language === 'ar';

  const totalCaptured = messages.length;
  const adelRequests = messages.filter((m) => m.sender.includes('Adel')).length;
  const voiceNotes = messages.filter((m) => m.type === 'voice').length;
  const voiceTranscribed = messages.filter((m) => m.type === 'voice' && m.transcript).length;
  const awaitingReview = drafts.length;
  const tasksCreated = tasks.length;
  const tasksCompleted = tasks.filter((t) => t.status === 'Done').length;
  const overdueTasks = tasks.filter((t) => t.rag === 'Red' || new Date(t.dueDate) < new Date()).length;
  const criticalTasks = tasks.filter((t) => t.priority === 'Critical').length;
  const blockedTasks = tasks.filter((t) => t.status === 'Blocked').length;

  const stats = [
    {
      label: isAr ? 'إجمالي الرسائل المرصودة' : 'Total Messages Captured',
      value: totalCaptured,
      sub: isAr ? 'عبر 13 مجموعة مراقبة' : 'Across 13 monitored chats',
      icon: Radio,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
    },
    {
      label: isAr ? 'طلبات عادل حماد المعتمدة' : 'Adel Requests Identified',
      value: adelRequests,
      sub: isAr ? 'مُرسل رئيسي معتمد' : 'Authorized requester matches',
      icon: ShieldCheck,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
    },
    {
      label: isAr ? 'رسائل صوتية مرصودة' : 'Voice Notes Captured',
      value: voiceNotes,
      sub: `${voiceTranscribed} ${isAr ? 'تم تفريغها بنجاح' : 'transcribed'}`,
      icon: Mic,
      color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10',
    },
    {
      label: isAr ? 'بانتظار المراجعة والاعتماد' : 'Awaiting Review in Inbox',
      value: awaitingReview,
      sub: isAr ? 'تتطلب قرار المشغل' : 'Pending operator sign-off',
      icon: Inbox,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
      actionTab: 'inbox',
    },
    {
      label: isAr ? 'المهام النشطة بمتتبع المهام' : 'Tasks in Tracker',
      value: tasksCreated,
      sub: `${tasksCompleted} ${isAr ? 'مكتملة' : 'completed'} (${Math.round((tasksCompleted / (tasksCreated || 1)) * 100)}%)`,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
      actionTab: 'tasks',
    },
    {
      label: isAr ? 'مهام حرجة وعاجلة' : 'Critical Priority Tasks',
      value: criticalTasks,
      sub: isAr ? 'SLA = 4 ساعات' : '4-hour SLA response',
      icon: Flame,
      color: 'text-red-600 dark:text-red-400 bg-red-500/10',
    },
  ];

  // Department breakdown
  const deptCounts: Record<string, number> = {};
  tasks.forEach((t) => {
    deptCounts[t.department] = (deptCounts[t.department] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-orange-500 text-white">
                TRYGC EXECUTIVE AUTOMATION
              </span>
              <span className="text-xs text-indigo-200">
                {isAr ? 'الرصد متصل ومستمر' : 'Continuous WhatsApp Monitoring'}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-1">
              {isAr ? 'منظومة أتمتة المهام واستقبال التوجيهات' : 'TryGC WhatsApp Task Automation Hub'}
            </h1>
            <p className="text-xs text-indigo-200 max-w-2xl leading-relaxed">
              {isAr
                ? 'رصد مستمر لمجموعات واتساب المعتمدة، التقاط تسجيلات عادل حماد الصوتية والنصوص، وتحويلها لمهام تنفيذية مع تتبع كامل للمصدر.'
                : 'Real-time observation of WhatsApp Web groups, capturing Adel HAMMAD Egy requests & Egyptian voice notes, NLP task extraction, and full lifecycle tracking.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowSimulator(true)}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>{isAr ? 'اختبار محاكاة واتساب' : 'Test WhatsApp Event'}</span>
            </button>
            {drafts.length > 0 && (
              <button
                onClick={() => setCurrentTab('inbox')}
                className="px-4 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
              >
                <span>{isAr ? 'مراجعة الطلبات' : 'Review Inbox'} ({drafts.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 bottom-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              onClick={() => item.actionTab && setCurrentTab(item.actionTab)}
              className={`p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs transition-all ${
                item.actionTab ? 'cursor-pointer hover:border-indigo-500 hover:shadow-md' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold truncate">
                  {item.label}
                </span>
                <div className={`p-2 rounded-xl ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                {item.value}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{item.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics & Department Load Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Workload Distribution */}
        <div className="lg:col-span-6 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {isAr ? 'توزيع المهام حسب الأقسام' : 'Department Workload Distribution'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'المهام المستخرجة من توجيهات عادل حماد' : 'Active tasks generated from Adel requests'}
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {tasks.length} {isAr ? 'مهمة' : 'Tasks'}
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(deptCounts).map(([dept, count]) => {
              const pct = Math.round((count / (tasks.length || 1)) * 100);
              return (
                <div key={dept} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{dept}</span>
                    <span className="font-mono text-slate-500 font-bold">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority & Delivery Health */}
        <div className="lg:col-span-6 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {isAr ? 'مؤشرات الإنجاز وصحة الالتزام (SLA & RAG)' : 'SLA Compliance & Priority Matrix'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'التزام الفريق بمواعيد التوجيهات' : 'Delivery health across active assignments'}
              </p>
            </div>
            <button
              onClick={() => setCurrentTab('tasks')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>{isAr ? 'عرض الكل' : 'View Tracker'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-center">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold block mb-1">
                Green (On Track)
              </span>
              <span className="text-xl font-black text-emerald-800 dark:text-emerald-200">
                {tasks.filter((t) => t.rag === 'Green').length}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-center">
              <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold block mb-1">
                Amber (Needs Push)
              </span>
              <span className="text-xl font-black text-amber-800 dark:text-amber-200">
                {tasks.filter((t) => t.rag === 'Amber').length}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-center">
              <span className="text-[11px] text-red-700 dark:text-red-300 font-bold block mb-1">
                Red (Risk / Overdue)
              </span>
              <span className="text-xl font-black text-red-800 dark:text-red-200">
                {tasks.filter((t) => t.rag === 'Red').length}
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{isAr ? 'متوسط وقت التحويل لمهمة:' : 'Avg Extraction Latency:'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">1.4s (Automated AI)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{isAr ? 'دقة تحديد الأشخاص والمشاريع:' : 'Entity Match Accuracy:'}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">98.5% (Predefined Aliases)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Tasks List */}
      <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {isAr ? 'أحدث المهام النشطة من توجيهات واتساب' : 'Recently Extracted Active Tasks'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {isAr ? 'اضغط على المهمة للاطلاع على المصدر والخط الزمني' : 'Click any task to view source WhatsApp traceability'}
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('tasks')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>{isAr ? 'فتح متتبع المهام الكامل' : 'Open Tasks Tracker'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {tasks.slice(0, 5).map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                    {task.id}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {task.whatsAppGroup}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {task.messageType === 'voice' ? '🎙️ Voice Note' : '💬 Text'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{task.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  "{task.originalRequest}"
                </p>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0 text-xs">
                <div className="text-right">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">{task.assignedTo}</span>
                  <span className="text-[10px] text-slate-400">{task.department}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs">
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
