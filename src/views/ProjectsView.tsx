/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FolderKanban,
  Building2,
  Globe,
  Plus,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProjectsView: React.FC = () => {
  const { projects, tasks, language } = useApp();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'المشاريع والعملاء والمناطق' : 'Projects, Clients & Territories'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {projects.length} {isAr ? 'مشروع' : 'Projects'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'توجيهات عادل حماد يتم ربطها تلقائياً بالمشروع والبلد المناسب (Egypt, KSA, UAE)'
              : 'Auto-association of WhatsApp tasks to projects and client territories.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {projects.map((proj) => {
          const count = tasks.filter((t) => t.project === proj.code).length;
          return (
            <div
              key={proj.id}
              className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 block mb-0.5">
                    {proj.code}
                  </span>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">{proj.name}</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                  {proj.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                <div>
                  <span className="text-slate-400 block text-[10px]">Client</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{proj.client}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Country</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{proj.country}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Active Tasks:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{count} tasks</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
