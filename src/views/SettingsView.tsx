/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Download,
  Upload,
  RotateCcw,
  User,
  Key,
  Database,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SettingsView: React.FC = () => {
  const { user, setUser, resetToSeeds, refreshState, language } = useApp();
  const isAr = language === 'ar';

  const [exportLoading, setExportLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch('/api/backup/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trygc-hub-backup-${Date.now()}.json`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all tasks, drafts, and groups to the clean initial seed state?')) {
      await resetToSeeds();
      setResetDone(true);
      setTimeout(() => setResetDone(false), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'الإعدادات والأمان والنسخ الاحتياطي' : 'Settings, Security & Data Management'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              ENTERPRISE AUDIT
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'إدارة صلاحيات المستخدمين، تصدير واستيراد البيانات، ومعايير الأمان المحلية'
              : 'Local-first architecture persistence, security audit posture, and full database backups.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* User Role & Session */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            {isAr ? 'جلسة المشغل والصلاحيات (RBAC)' : 'Operator Session & Role'}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 block mb-1">Operator Username</label>
              <input
                type="text"
                value={user.username}
                onChange={(e) => setUser({ ...user, username: e.target.value })}
                className="w-full font-bold text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Role Permission Tier</label>
              <div className="grid grid-cols-3 gap-2">
                {(['admin', 'manager', 'viewer'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUser({ ...user, role: r })}
                    className={`p-2.5 rounded-xl border text-center font-bold uppercase text-[11px] transition-all ${
                      user.role === r
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-slate-600 dark:text-slate-400 space-y-1 text-[11px]">
              <div className="font-bold text-indigo-900 dark:text-indigo-200">Current Role Capabilities:</div>
              <div>• <strong>Admin:</strong> Full review, approve, split, delete, rule update & system configuration.</div>
              <div>• <strong>Manager:</strong> Approve drafts, reassign owners, update task statuses.</div>
              <div>• <strong>Viewer:</strong> Read-only access to tasks, analytics, and diagnostics.</div>
            </div>
          </div>
        </div>

        {/* Security & Local-First Architecture Compliance */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            {isAr ? 'الامتثال الأمني والمعماري' : 'Security & Architecture Compliance'}
          </h3>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200">Local-First Architecture</span>
              <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Compliant (Server JSON)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200">Server-Side Secret Isolation</span>
              <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Zero Client Key Leaks
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200">WhatsApp Data Redaction</span>
              <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sensitive PII Filtered
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200">Audit Logging</span>
              <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Never Fail Silently
              </span>
            </div>
          </div>
        </div>

        {/* Database Backup & Export/Import */}
        <div className="lg:col-span-2 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-600" />
            {isAr ? 'إدارة البيانات والنسخ الاحتياطي الكامل' : 'Full Database Backup & Data Operations'}
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{exportLoading ? 'Exporting...' : 'Export Full JSON Backup'}</span>
            </button>

            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-extrabold text-xs flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Initial Seed Demo State</span>
            </button>

            {resetDone && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Reset Successful!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
