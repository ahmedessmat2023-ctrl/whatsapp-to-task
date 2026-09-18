/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bell,
  Sun,
  Moon,
  Globe,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Zap,
  Check,
  Trash2,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header: React.FC = () => {
  const {
    language,
    setLanguage,
    isDarkMode,
    setIsDarkMode,
    health,
    notifications,
    markNotificationRead,
    clearAllNotifications,
    refreshState,
    setShowSimulator,
    setCurrentTab,
    user,
  } = useApp();

  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAr = language === 'ar';
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshState();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const getStatusColor = () => {
    if (health.attentionRequired || health.status === 'error') return 'bg-red-500 text-red-700 dark:text-red-300';
    if (health.status === 'warning') return 'bg-amber-500 text-amber-700 dark:text-amber-300';
    return 'bg-emerald-500 text-emerald-700 dark:text-emerald-300';
  };

  return (
    <header
      className={`h-16 px-6 flex items-center justify-between border-b ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
      } backdrop-blur sticky top-0 z-20`}
    >
      {/* Connector Health Indicator */}
      <div className="flex items-center gap-3">
        <button
          id="btn-connector-health"
          onClick={() => setShowHealthModal(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all hover:shadow-sm ${
            health.status === 'healthy'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300'
              : health.status === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                health.status === 'healthy' ? 'bg-emerald-400' : health.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                health.status === 'healthy' ? 'bg-emerald-500' : health.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
              }`}
            />
          </span>
          <span>
            {health.status === 'healthy'
              ? isAr
                ? 'الرابط شغال وبيرصد'
                : 'WhatsApp Connector Operational'
              : health.status === 'warning'
              ? isAr
                ? 'الرابط يحتاج انتباه'
                : 'Connector Warning'
              : isAr
                ? 'الرابط متوقف'
                : 'WhatsApp capture connector requires attention'}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
            ({health.lastScan})
          </span>
        </button>

        {health.attentionRequired && (
          <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-300 dark:border-red-800 animate-pulse">
            {health.alertMessage || 'Attention Required'}
          </span>
        )}
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2.5">
        {/* Fast Simulator Trigger */}
        <button
          id="header-btn-simulate"
          onClick={() => setShowSimulator(true)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-bold transition-all"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isAr ? 'تجربة إرسال رسالة' : 'Simulate Event'}</span>
        </button>

        {/* Manual Refresh */}
        <button
          id="btn-manual-refresh"
          onClick={handleRefresh}
          title={isAr ? 'تحديث البيانات' : 'Refresh State'}
          className={`p-2 rounded-lg border text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all ${
            isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
        </button>

        {/* Language Toggle */}
        <button
          id="btn-language-toggle"
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
            isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
          }`}
          title="Toggle English / Arabic"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-500" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          id="btn-darkmode-toggle"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-2 rounded-lg border transition-all ${
            isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-amber-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
          }`}
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Popover Trigger */}
        <div className="relative">
          <button
            id="btn-notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-lg border relative transition-all ${
              isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white font-bold text-[9px] flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-xl border p-3 z-50 animate-in fade-in slide-in-from-top-2 ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-inherit">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {isAr ? 'الإشعارات' : 'Notifications'} ({notifications.length})
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{isAr ? 'مسح الكل' : 'Clear'}</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    {isAr ? 'لا توجد إشعارات جديدة' : 'No notifications'}
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.linkTab) setCurrentTab(n.linkTab);
                        setShowNotifications(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        n.read
                          ? isDarkMode
                            ? 'bg-slate-800/40 border-slate-800 opacity-70'
                            : 'bg-slate-50/50 border-slate-100 opacity-75'
                          : isDarkMode
                          ? 'bg-indigo-950/40 border-indigo-900/60'
                          : 'bg-indigo-50/70 border-indigo-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{n.title}</span>
                        <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Capsule */}
        <div
          className={`flex items-center gap-2 pl-2 border-l ${
            isDarkMode ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{user.username}</p>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{user.role}</span>
          </div>
        </div>
      </div>

      {/* Connector Health Diagnostics Modal */}
      {showHealthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-2xl p-6 border shadow-2xl ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit mb-4">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {isAr ? 'فحص صحة اتصال واتساب' : 'WhatsApp Connector Health Diagnostics'}
                </h3>
              </div>
              <button
                onClick={() => setShowHealthModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                  {isAr ? 'حالة الرابط العامة:' : 'Overall Bridge Status:'}
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {health.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl border border-inherit">
                  <span className="text-slate-400 block mb-0.5">{isAr ? 'آخر فحص للمحادثات' : 'Last DOM Scan'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{health.lastScan}</span>
                </div>
                <div className="p-3 rounded-xl border border-inherit">
                  <span className="text-slate-400 block mb-0.5">{isAr ? 'آخر رسالة مرصودة' : 'Last Observed Msg'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{health.lastObservedMessage}</span>
                </div>
                <div className="p-3 rounded-xl border border-inherit">
                  <span className="text-slate-400 block mb-0.5">{isAr ? 'المجموعة الحالية' : 'Current WhatsApp Group'}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate block">
                    {health.currentWhatsAppGroup}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-inherit">
                  <span className="text-slate-400 block mb-0.5">{isAr ? 'إجمالي ميتا الرسائل' : 'Metadata Elements'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{health.messageMetadataCount}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {isAr ? 'رصد الرسائل الصوتية (PTT):' : 'Voice Capture Subsystem:'}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">OPERATIONAL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {isAr ? 'محرك التفريغ الصوتي (Whisper/Gemini):' : 'Transcription Engine:'}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">OPERATIONAL</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-inherit flex items-center justify-between">
              <button
                onClick={() => {
                  setShowHealthModal(false);
                  setCurrentTab('diagnostics');
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-xs flex items-center gap-1"
              >
                <span>{isAr ? 'فتح سجل التشخيصات التفصيلي' : 'Open Full Diagnostics Engine'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowHealthModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
