/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Radio,
  Inbox,
  CheckSquare,
  Mic,
  Users,
  Building2,
  FolderKanban,
  BarChart3,
  Activity,
  Sliders,
  Settings,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Sidebar: React.FC = () => {
  const { currentTab, setCurrentTab, drafts, language, isDarkMode, setShowSimulator, health } = useApp();

  const isAr = language === 'ar';

  const navItems = [
    {
      id: 'dashboard',
      label: isAr ? 'لوحة القيادة' : 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'live_capture',
      label: isAr ? 'الرصد المباشر' : 'Live Capture',
      icon: Radio,
      badge: health.status === 'healthy' ? (isAr ? 'متصل' : 'LIVE') : (isAr ? 'تنبيه' : 'ATTN'),
      badgeColor: health.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
    {
      id: 'inbox',
      label: isAr ? 'صندوق المراجعة' : 'Review Inbox',
      icon: Inbox,
      badge: drafts.length > 0 ? `${drafts.length}` : undefined,
      badgeColor: 'bg-orange-500 text-white font-bold',
    },
    {
      id: 'tasks',
      label: isAr ? 'متتبع المهام' : 'Tasks Tracker',
      icon: CheckSquare,
    },
    {
      id: 'voice_notes',
      label: isAr ? 'الرسائل الصوتية' : 'Voice Notes',
      icon: Mic,
    },
    {
      id: 'groups',
      label: isAr ? 'المجموعات المراقبة' : 'Monitored Groups',
      icon: Users,
    },
    {
      id: 'people',
      label: isAr ? 'مطابقة الأشخاص' : 'People Mapping',
      icon: Building2,
    },
    {
      id: 'projects',
      label: isAr ? 'المشاريع والعملاء' : 'Projects & Clients',
      icon: FolderKanban,
    },
    {
      id: 'analytics',
      label: isAr ? 'التحليلات والمُرسل' : 'Requester Analytics',
      icon: BarChart3,
    },
    {
      id: 'diagnostics',
      label: isAr ? 'تشخيصات الرصد' : 'Capture Diagnostics',
      icon: Activity,
    },
    {
      id: 'rules',
      label: isAr ? 'قواعد الأتمتة' : 'Automation Rules',
      icon: Sliders,
    },
    {
      id: 'settings',
      label: isAr ? 'الإعدادات والأمان' : 'Settings & Security',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`w-64 flex-shrink-0 flex flex-col justify-between border-r ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
      } select-none transition-colors duration-200 z-30`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-inherit">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-indigo-500/20">
              GC
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">TryGC</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  HUB
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-[130px]">
                {isAr ? 'أتمتة مهام واتساب' : 'WhatsApp Automation'}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Monitored Requester Pill */}
        <div className="mx-3 my-3 p-2.5 rounded-xl bg-gradient-to-r from-indigo-50/80 to-purple-50/60 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              {isAr ? 'المُرسل المعتمد' : 'Target Requester'}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active Monitoring" />
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Adel HAMMAD Egy</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {isAr ? 'رصد فوري للنصوص والصوتيات' : 'Primary Voice & Text Pipeline'}
          </p>
        </div>

        {/* Nav Items List */}
        <nav className="px-2.5 space-y-0.5 overflow-y-auto max-h-[calc(100vh-270px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : isDarkMode
                    ? 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      item.badgeColor || (isActive ? 'bg-white/20 text-white border-transparent' : 'bg-slate-200 text-slate-700 border-slate-300')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Simulator Quick Action Trigger */}
      <div className="p-3 border-t border-inherit">
        <button
          id="btn-open-simulator"
          onClick={() => setShowSimulator(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all active:scale-[0.98]"
        >
          <Zap className="w-4 h-4" />
          <span>{isAr ? 'مُحاكي واتساب للتجربة' : 'WhatsApp Event Simulator'}</span>
        </button>
      </div>
    </aside>
  );
};
