/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  PauseCircle,
  Plus,
  Search,
  Sparkles,
  ShieldCheck,
  Building2,
  Globe,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MonitoredGroup } from '../types';

export const MonitoredGroupsView: React.FC = () => {
  const { groups, toggleGroupActive, addGroup, language } = useApp();
  const isAr = language === 'ar';

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [testInput, setTestInput] = useState('Roadmap 2026');
  const [matchResult, setMatchResult] = useState<string | null>(null);

  // New Group Form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDept, setNewGroupDept] = useState('Tech');
  const [newGroupCountry, setNewGroupCountry] = useState('Egypt');
  const [newGroupPriority, setNewGroupPriority] = useState<'High' | 'Medium' | 'Critical'>('High');

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.department || g.departmentTag || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await addGroup({
      name: newGroupName,
      department: newGroupDept,
      country: newGroupCountry,
      priority: newGroupPriority,
      active: true,
      aliases: [newGroupName.toLowerCase()],
    });
    setNewGroupName('');
    setShowAddModal(false);
  };

  const handleTestMatch = () => {
    const inputClean = testInput.toLowerCase().replace(/[\s\-_🚀🔥💬]/g, '');
    const found = groups.find((g) => {
      const gClean = g.name.toLowerCase().replace(/[\s\-_🚀🔥💬]/g, '');
      return gClean.includes(inputClean) || inputClean.includes(gClean) || g.name.toLowerCase() === testInput.toLowerCase();
    });

    if (found) {
      setMatchResult(`Matched to: "${found.name}" (Active: ${found.active ? 'Yes' : 'No - Paused'})`);
    } else {
      setMatchResult('No matching monitored group found. Message will be safely logged in Diagnostics without creating tasks.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'مجموعات واتساب المراقبة المعتمدة' : 'Monitored WhatsApp Groups'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {groups.length} {isAr ? 'مجموعة' : 'Chats'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'يتم رصد رسائل عادل حماد فقط داخل هذه المجموعات الـ 13 المصرح بها'
              : 'Adel HAMMAD instructions are strictly monitored within approved groups with fuzzy emoji tolerance.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'إضافة مجموعة جديدة' : 'Add Approved Group'}</span>
        </button>
      </div>

      {/* Fuzzy Tolerance Matcher Test Box */}
      <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            {isAr ? 'اختبار محرك مطابقة أسماء المجموعات (Emoji & Punctuation Tolerance)' : 'Fuzzy Tolerance Group Matcher Test'}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Exact, Case-insensitive, Emoji-tolerant</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Type group name e.g. Roadmap 2026 or gc leaders..."
            className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-200"
          />
          <button
            onClick={handleTestMatch}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-sm"
          >
            Test Match
          </button>
        </div>

        {matchResult && (
          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900">
            {matchResult}
          </p>
        )}
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredGroups.map((g) => (
          <div
            key={g.id}
            className={`p-4 rounded-2xl border transition-all ${
              g.active
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">{g.name}</h3>
                <span className="text-[10px] text-slate-400 font-mono">ID: {g.id}</span>
              </div>

              <button
                onClick={() => toggleGroupActive(g.id)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                  g.active
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300'
                }`}
              >
                {g.active ? (isAr ? 'نشطة (يراقب)' : 'ACTIVE') : (isAr ? 'متوقفة' : 'PAUSED')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
              <div>
                <span className="text-slate-400 block text-[10px]">Department</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{g.department}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Country</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{g.country}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateGroup}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {isAr ? 'إضافة مجموعة واتساب مصرح بها' : 'Add Approved WhatsApp Group'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">Group Name (Exact as in WhatsApp)</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. TryGC Expansion UAE"
                  className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">Department</label>
                  <input
                    type="text"
                    value={newGroupDept}
                    onChange={(e) => setNewGroupDept(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">Country</label>
                  <input
                    type="text"
                    value={newGroupCountry}
                    onChange={(e) => setNewGroupCountry(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-extrabold shadow-sm"
              >
                Add Group
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
