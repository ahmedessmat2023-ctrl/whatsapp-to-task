/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  Building2,
  Phone,
  Tag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { crossReferenceTranscriptWithPeople } from '../utils/peopleAliasMatcher';

export const PeopleMappingView: React.FC = () => {
  const { people, addPerson, language } = useApp();
  const isAr = language === 'ar';

  const [testMention, setTestMention] = useState('@ismail');
  const [matchResult, setMatchResult] = useState<string | null>(null);

  const handleTestMention = () => {
    const res = crossReferenceTranscriptWithPeople(testMention, people);
    if (res.primarySuggestion) {
      const found = res.primarySuggestion;
      const name = found.displayName || found.canonicalName;
      setMatchResult(
        `Resolved to: ${name} (${found.role} — ${found.department}) [Matched alias: "${res.primaryMatch?.matchedAlias}", Confidence: ${res.primaryMatch?.confidence}%]`
      );
    } else {
      setMatchResult('No registered person alias matched. System defaults to Unassigned or Department Lead.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'مطابقة الأشخاص والأسماء المستعارة' : 'People & Alias Mapping Matrix'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {people.length} {isAr ? 'شخص وفريق' : 'Profiles'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'توجيهات عادل حماد الصوتية والنصية تذكر أسماء الفريق (إسماعيل، آلاء، عبد الفتاح...). يقوم النظام بربطها تلقائياً.'
              : 'Multi-lingual alias dictionary connecting spoken and written names to canonical owners.'}
          </p>
        </div>
      </div>

      {/* Primary Requester Highlight */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black">
            AH
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-400/20 text-purple-200 border border-purple-400/30">
                AUTHORIZED TARGET REQUESTER
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-lg font-black mt-0.5">Adel HAMMAD Egy</h2>
            <p className="text-xs text-purple-200">
              Executive Leadership | Primary instruction pipeline source
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-purple-300">Registered Aliases:</span>
          {['Adel', 'عادل', 'عادل حماد', 'adel hammad', 'adel egy'].map((al) => (
            <span key={al} className="px-2 py-0.5 rounded-lg bg-white/10 font-mono text-[11px]">
              {al}
            </span>
          ))}
        </div>
      </div>

      {/* Mention Matcher Test */}
      <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            {isAr ? 'اختبار التعرف على المنشن والأسماء الصوتية' : 'Test Spoken / Mention Alias Recognition'}
          </span>
          <span className="text-[10px] text-slate-400">Arabic & Latin Support</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={testMention}
            onChange={(e) => setTestMention(e.target.value)}
            placeholder="Type name e.g. آلاء or @Ismail or عبد الفتاح..."
            className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-200"
          />
          <button
            onClick={handleTestMention}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-sm"
          >
            Resolve Alias
          </button>
        </div>

        {matchResult && (
          <p className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900">
            {matchResult}
          </p>
        )}
      </div>

      {/* People Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {people.map((person) => (
          <div
            key={person.id}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                  {(person.isPrimaryRequester || person.isAuthorizedRequester) && <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />}
                  {person.canonicalName || person.displayName}
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {person.role} ({person.department})
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                {person.id}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Voice & Text Aliases
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {person.aliases.map((alias) => (
                  <span
                    key={alias}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    {alias}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
