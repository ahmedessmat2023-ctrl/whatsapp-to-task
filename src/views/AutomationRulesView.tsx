/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Trash2,
  Zap,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AutomationRulesView: React.FC = () => {
  const { rules, updateRules, language } = useApp();
  const isAr = language === 'ar';

  const [form, setForm] = useState(rules);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateRules(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'قواعد الأتمتة وعتبات الثقة الذكية' : 'Automation & NLP Confidence Rules'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              CONFIGURABLE ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'تحديد متى يتم إنشاء المهام فوراً ومتى تُرسل لصندوق المراجعة للاعتماد البشري'
              : 'Tune confidence score thresholds, auto-creation criteria, follow-up linking, and default SLAs.'}
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
        >
          {saved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          <span>{saved ? (isAr ? 'تم الحفظ بنجاح!' : 'Rules Saved!') : isAr ? 'حفظ التعديلات' : 'Save Rules'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Confidence Thresholds */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            {isAr ? 'عتبات الثقة للاستخراج الذكي' : 'NLP Confidence Thresholds'}
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Auto-Create Task Directly in Tracker:
                </span>
                <span className="font-black text-indigo-600">{form.autoCreateThreshold}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="99"
                value={form.autoCreateThreshold}
                onChange={(e) => setForm({ ...form, autoCreateThreshold: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
              <span className="text-[10px] text-slate-400">
                Tasks with score &ge; {form.autoCreateThreshold}% skip Review Inbox and go straight to Task Tracker.
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Route to Review Inbox (Human Decision):
                </span>
                <span className="font-black text-orange-600">{form.needsReviewThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="85"
                value={form.needsReviewThreshold}
                onChange={(e) => setForm({ ...form, needsReviewThreshold: Number(e.target.value) })}
                className="w-full accent-orange-600"
              />
              <span className="text-[10px] text-slate-400">
                Tasks with score between {form.needsReviewThreshold}% and {form.autoCreateThreshold - 1}% enter Review Inbox.
              </span>
            </div>
          </div>
        </div>

        {/* Target Requester & Directives Rules */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            {isAr ? 'قواعد التوجيهات والمُرسل' : 'Target Requester & Directives'}
          </h3>

          <div className="space-y-3">
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={form.primaryRequesterOnly}
                onChange={(e) => setForm({ ...form, primaryRequesterOnly: e.target.checked })}
                className="mt-0.5"
              />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Enforce Primary Requester Filter (Adel HAMMAD Egy)
                </span>
                <span className="text-[10px] text-slate-400">
                  Only instructions issued by Adel in approved groups generate tasks. Other messages are audited in Diagnostics.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoSuggestDoneOnCompletion}
                onChange={(e) => setForm({ ...form, autoSuggestDoneOnCompletion: e.target.checked })}
                className="mt-0.5"
              />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Auto-Detect Completion Signals ("تم", "خلصنا", "Fixed")
                </span>
                <span className="text-[10px] text-slate-400">
                  Suggests marking the matching open task as Done when Adel or the assignee confirms completion.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoLinkFollowUps}
                onChange={(e) => setForm({ ...form, autoLinkFollowUps: e.target.checked })}
                className="mt-0.5"
              />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Link Follow-Up Messages ("وصلنا لفين؟")
                </span>
                <span className="text-[10px] text-slate-400">
                  Attaches inquiry as an update to the active task rather than generating an accidental duplicate.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Default SLA Hours */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            {isAr ? 'المواعيد الافتراضية واتفاقية مستوى الخدمة (SLAs)' : 'Default SLA Rules by Priority'}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-inherit">
              <span className="text-red-600 font-bold block mb-1">Critical SLA (Hours)</span>
              <input
                type="number"
                value={form.defaultSlaHours.Critical}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultSlaHours: { ...form.defaultSlaHours, Critical: Number(e.target.value) },
                  })
                }
                className="w-full font-bold text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="p-3 rounded-xl border border-inherit">
              <span className="text-orange-600 font-bold block mb-1">High SLA (Hours)</span>
              <input
                type="number"
                value={form.defaultSlaHours.High}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultSlaHours: { ...form.defaultSlaHours, High: Number(e.target.value) },
                  })
                }
                className="w-full font-bold text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="p-3 rounded-xl border border-inherit">
              <span className="text-blue-600 font-bold block mb-1">Medium SLA (Hours)</span>
              <input
                type="number"
                value={form.defaultSlaHours.Medium}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultSlaHours: { ...form.defaultSlaHours, Medium: Number(e.target.value) },
                  })
                }
                className="w-full font-bold text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="p-3 rounded-xl border border-inherit">
              <span className="text-slate-500 font-bold block mb-1">Low SLA (Hours)</span>
              <input
                type="number"
                value={form.defaultSlaHours.Low}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultSlaHours: { ...form.defaultSlaHours, Low: Number(e.target.value) },
                  })
                }
                className="w-full font-bold text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Audio Retention Policy */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-orange-600" />
            {isAr ? 'سياسة الاحتفاظ بالملفات الصوتية' : 'Audio & Data Retention Policy'}
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Purge Audio Binary Blobs After:
              </span>
              <span className="font-black text-orange-600">{form.deleteAudioAfterDays} Days</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={form.deleteAudioAfterDays}
              onChange={(e) => setForm({ ...form, deleteAudioAfterDays: Number(e.target.value) })}
              className="w-full accent-orange-600"
            />
            <span className="text-[10px] text-slate-400 block">
              Audio files are pruned after {form.deleteAudioAfterDays} days to respect storage limits. All transcripts remain stored permanently.
            </span>

            <label className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={form.retainTranscripts}
                onChange={(e) => setForm({ ...form, retainTranscripts: e.target.checked })}
              />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Retain Full Egyptian Transcripts Indefinitely
              </span>
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};
