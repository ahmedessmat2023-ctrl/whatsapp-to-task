/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldCheck,
  User,
  CheckCircle2,
  Lock,
  Server,
  Key,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DatabaseBackupManager } from '../components/DatabaseBackupManager';

export const SettingsView: React.FC = () => {
  const { user, setUser, language } = useApp();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'الإعدادات والأمان والنسخ الاحتياطي' : 'Settings, Security & Data Management'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              ENTERPRISE AUDIT
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {isAr
              ? 'إدارة صلاحيات المشغلين، تصدير واستيراد البيانات بصيغتي JSON و CSV، ومعايير أمان قاعدة البيانات المحلية'
              : 'Local-first architecture persistence, operator RBAC sessions, and full SQLite JSON/CSV backup portability.'}
          </p>
        </div>
      </div>

      {/* Top Grid: Operator Session & Security Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* User Role & Session */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            {isAr ? 'جلسة المشغل والصلاحيات (RBAC)' : 'Operator Session & Role'}
          </h3>

          <div className="space-y-3.5">
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                {isAr ? 'اسم المشغل' : 'Operator Username'}
              </label>
              <input
                type="text"
                value={user.username}
                onChange={(e) => setUser({ ...user, username: e.target.value })}
                className="w-full font-bold text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                {isAr ? 'مستوى الصلاحية (Role Tier)' : 'Role Permission Tier'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['admin', 'manager', 'viewer'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUser({ ...user, role: r })}
                    className={`p-2.5 rounded-xl border text-center font-bold uppercase text-[11px] transition-all ${
                      user.role === r
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-slate-700 dark:text-slate-300 space-y-1.5 text-[11px]">
              <div className="font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isAr ? 'صلاحيات الدور الحالي:' : 'Current Role Capabilities:'}</span>
              </div>
              <div className="leading-relaxed">
                • <strong className="text-slate-900 dark:text-white">Admin:</strong> Full review inbox access, approve, split, delete, automation rules modification & database backups.
              </div>
              <div className="leading-relaxed">
                • <strong className="text-slate-900 dark:text-white">Manager:</strong> Approve drafts, reassign owners, update task statuses.
              </div>
              <div className="leading-relaxed">
                • <strong className="text-slate-900 dark:text-white">Viewer:</strong> Read-only monitoring of tasks, analytics, and diagnostics.
              </div>
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
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block">Local-First Architecture</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Zero external telemetry leakage</span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                Compliant
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block">Server-Side Secret Isolation</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Environment keys guarded behind /api/*</span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                Zero Client Leaks
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block">WhatsApp PII Redaction</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Sensitive phone & address masking</span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                Active Filtering
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block">Audit Logging & Recovery</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Safety snapshots prior to updates</span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                Enabled
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Database Backup, Export/Import & Snapshots Hub */}
      <DatabaseBackupManager />
    </div>
  );
};
