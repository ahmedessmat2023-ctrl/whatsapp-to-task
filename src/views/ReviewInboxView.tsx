/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Scissors,
  Eye,
  Play,
  Pause,
  Mic,
  MessageSquare,
  Sparkles,
  ArrowRight,
  User,
  UserCheck,
  Users,
  Calendar,
  Building2,
  FolderKanban,
  Flag,
  AlertTriangle,
  Check,
  Edit2,
  ShieldCheck,
  Zap,
  BookOpen,
  Search,
  Info,
  HelpCircle,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExtractedTaskDraft, PersonMapping, Priority } from '../types';
import {
  crossReferenceTranscriptWithPeople,
  splitTranscriptIntoTokens,
  AliasMatch,
} from '../utils/peopleAliasMatcher';

export const ReviewInboxView: React.FC = () => {
  const {
    drafts,
    approveDraft,
    approveAllDrafts,
    updateDraft,
    autoCrossReferenceDrafts,
    ignoreDraft,
    splitDraft,
    people,
    messages,
    language,
    setShowSimulator,
  } = useApp();

  const isAr = language === 'ar';

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'needs_mapping' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExtractedTaskDraft>>({});

  // Audio player state
  const [playingDraftId, setPlayingDraftId] = useState<string | null>(null);

  // Split Modal state
  const [splitDraftItem, setSplitDraftItem] = useState<ExtractedTaskDraft | null>(null);
  const [splitItems, setSplitItems] = useState<any[]>([]);

  // Ignore / Reject Modal state
  const [rejectDraftId, setRejectDraftId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Not an actionable task');

  // People Mapping Alias Reference Modal
  const [showAliasLibraryModal, setShowAliasLibraryModal] = useState<boolean>(false);
  const [aliasSearchQuery, setAliasSearchQuery] = useState<string>('');
  const [testMentionText, setTestMentionText] = useState<string>('');

  // Banner notification for batch actions
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Cross-reference data map for all current drafts
  const draftCrossRefs = useMemo(() => {
    const map = new Map<string, ReturnType<typeof crossReferenceTranscriptWithPeople>>();
    drafts.forEach((draft) => {
      const sourceMsg = messages.find((m) => m.id === draft.sourceMessageId);
      const textToExamine =
        draft.originalRequest ||
        sourceMsg?.voiceTranscript ||
        sourceMsg?.text ||
        draft.description ||
        draft.title;

      const crossRef = crossReferenceTranscriptWithPeople(textToExamine, people, draft.suggestedOwner);
      map.set(draft.id, crossRef);
    });
    return map;
  }, [drafts, messages, people]);

  // Statistics for top filter pills
  const stats = useMemo(() => {
    let verifiedCount = 0;
    let needsMappingCount = 0;
    let pendingSuggestionsCount = 0;

    drafts.forEach((draft) => {
      const crossRef = draftCrossRefs.get(draft.id);
      if (crossRef?.isCurrentOwnerMatched) {
        verifiedCount++;
      } else {
        needsMappingCount++;
        if (crossRef?.primarySuggestion) {
          pendingSuggestionsCount++;
        }
      }
    });

    return {
      total: drafts.length,
      verifiedCount,
      needsMappingCount,
      pendingSuggestionsCount,
    };
  }, [drafts, draftCrossRefs]);

  // Filtered drafts
  const filteredDrafts = useMemo(() => {
    return drafts.filter((draft) => {
      const crossRef = draftCrossRefs.get(draft.id);

      if (filterType === 'verified' && !crossRef?.isCurrentOwnerMatched) return false;
      if (filterType === 'needs_mapping' && crossRef?.isCurrentOwnerMatched) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = draft.title.toLowerCase().includes(q);
        const matchOwner = (draft.suggestedOwner || '').toLowerCase().includes(q);
        const matchReq = (draft.originalRequest || '').toLowerCase().includes(q);
        const matchGroup = (draft.sourceGroupName || draft.sourceGroup || '').toLowerCase().includes(q);
        const matchAlias = crossRef?.matches.some(
          (m) =>
            m.matchedAlias.toLowerCase().includes(q) ||
            m.person.displayName.toLowerCase().includes(q) ||
            (m.person.canonicalName || '').toLowerCase().includes(q)
        );
        if (!matchTitle && !matchOwner && !matchReq && !matchGroup && !matchAlias) return false;
      }

      return true;
    });
  }, [drafts, filterType, searchQuery, draftCrossRefs]);

  // Apply single assignee suggestion
  const handleApplyAssignee = async (
    draftId: string,
    person: PersonMapping,
    matchedAliasName?: string
  ) => {
    const targetDepartment = person.department || 'Operations';
    await updateDraft(draftId, {
      suggestedOwner: person.displayName || person.canonicalName,
      department: targetDepartment,
      matchedAlias: matchedAliasName || person.displayName,
      suggestedAssigneeReason: `Resolved via People Mapping alias "${matchedAliasName || person.displayName}"`,
    });
    showToast(
      isAr
        ? `تم تعيين المسؤول: ${person.displayName} (${targetDepartment}) بناءً على مكتبة الأسماء والكنى`
        : `Assigned to ${person.displayName} (${targetDepartment}) based on alias library match.`
    );
  };

  // Batch auto-map assignees across all drafts
  const handleBatchAutoMap = async () => {
    let mapped = 0;
    for (const draft of drafts) {
      const crossRef = draftCrossRefs.get(draft.id);
      if (crossRef?.primarySuggestion && !crossRef.isCurrentOwnerMatched) {
        await updateDraft(draft.id, {
          suggestedOwner: crossRef.primarySuggestion.displayName || crossRef.primarySuggestion.canonicalName,
          department: crossRef.primarySuggestion.department,
          matchedAlias: crossRef.primaryMatch?.matchedAlias,
          suggestedAssigneeReason: `Auto-mapped from transcript alias "${crossRef.primaryMatch?.matchedAlias}"`,
        });
        mapped++;
      }
    }

    if (mapped > 0) {
      showToast(
        isAr
          ? `تم تحديث وتعيين ${mapped} مسودة بنجاح بمطابقة كنى فريق العمل!`
          : `Successfully cross-referenced and auto-assigned ${mapped} draft(s) with People Mapping!`
      );
    } else {
      await autoCrossReferenceDrafts();
      showToast(
        isAr
          ? 'تم فحص جميع المسودات، الأسماء الحالية مطابقة بالفعل.'
          : 'All draft assignees are already up-to-date with People Mapping.'
      );
    }
  };

  const startEdit = (draft: ExtractedTaskDraft) => {
    setEditingDraftId(draft.id);
    setEditForm({ ...draft });
  };

  const saveEdit = (draftId: string) => {
    approveDraft(draftId, {
      title: editForm.title,
      description: editForm.description,
      assignedTo: editForm.suggestedOwner,
      department: editForm.department,
      project: editForm.project,
      priority: editForm.priority,
      dueDate: editForm.deadline,
    });
    setEditingDraftId(null);
  };

  const handleOpenSplit = (draft: ExtractedTaskDraft) => {
    setSplitDraftItem(draft);
    const crossRef = draftCrossRefs.get(draft.id);

    // Intelligently pre-populate sub-tasks based on detected people in the transcript!
    if (crossRef && crossRef.matches.length >= 2) {
      // Get unique persons mentioned
      const uniquePersons = crossRef.matches
        .map((m) => m.person)
        .filter((p, index, self) => index === self.findIndex((o) => o.id === p.id));

      const generatedSplits = uniquePersons.slice(0, 3).map((person, idx) => ({
        title:
          idx === 0
            ? `${draft.title} (${person.displayName} scope)`
            : `Coordinate and follow up with ${person.displayName} (${person.department})`,
        assignedTo: person.displayName,
        priority: draft.priority || 'High',
        department: person.department,
        matchedReason: `Pre-assigned from transcript mention "${person.aliases?.[0] || person.displayName}"`,
      }));

      setSplitItems(generatedSplits);
    } else {
      // Default fallback
      setSplitItems([
        {
          title: `${draft.title} (Part 1)`,
          assignedTo: draft.suggestedOwner || 'Ismail',
          priority: draft.priority,
          department: draft.department,
        },
        {
          title: 'Follow up requirements & update documentation',
          assignedTo: 'Alaa',
          priority: 'High',
          department: 'Business Analysis',
        },
      ]);
    }
  };

  const handleConfirmSplit = () => {
    if (splitDraftItem) {
      splitDraft(splitDraftItem.id, splitItems);
      setSplitDraftItem(null);
    }
  };

  const handleTogglePlay = (draftId: string) => {
    if (playingDraftId === draftId) {
      setPlayingDraftId(null);
    } else {
      setPlayingDraftId(draftId);
      setTimeout(() => {
        setPlayingDraftId((current) => (current === draftId ? null : current));
      }, 5000);
    }
  };

  // Test mention within the People Mapping library modal
  const testMentionResult = useMemo(() => {
    if (!testMentionText.trim()) return null;
    return crossReferenceTranscriptWithPeople(testMentionText, people);
  }, [testMentionText, people]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="view-review-inbox">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-xl text-xs font-semibold border border-slate-700 animate-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'صندوق مراجعة توجيهات واتساب' : 'Review Inbox'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-500 text-white shadow-xs">
              {drafts.length} {isAr ? 'بانتظار الاعتماد' : 'Pending'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              {isAr ? 'مطابقة الكنى مفعلة' : 'People Mapping Active'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'مراجعة المهام المستخرجة ذكياً ومطابقة أسماء المكلفين تلقائياً مع مكتبة الكنى والأسماء بالعامية'
              : 'Human-in-the-loop control center. Auto-suggest task assignees by cross-referencing extracted names with the People Mapping alias library.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View People Mapping Library Button */}
          <button
            id="btn-open-people-library"
            onClick={() => setShowAliasLibraryModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Inspect configured team aliases and test name resolutions"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isAr ? 'مكتبة كنى الفريق' : 'People Mapping Library'}</span>
          </button>

          {/* Batch Auto-Map Button */}
          {stats.pendingSuggestionsCount > 0 && (
            <button
              id="btn-batch-auto-map"
              onClick={handleBatchAutoMap}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
              title="Apply all suggested assignees detected from voice and text transcripts"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isAr
                  ? `تطبيق المطابقات التلقائية (${stats.pendingSuggestionsCount})`
                  : `Auto-Map Assignees (${stats.pendingSuggestionsCount})`}
              </span>
            </button>
          )}

          {drafts.length > 0 && (
            <button
              id="btn-approve-all-inbox"
              onClick={approveAllDrafts}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isAr ? 'اعتماد الكل' : 'Approve All'}</span>
            </button>
          )}

          <button
            onClick={() => setShowSimulator(true)}
            className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isAr ? 'محاكاة رسالة' : 'Simulate'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Cross-Reference Status Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>{isAr ? 'الكل' : 'All Tasks'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => setFilterType('needs_mapping')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filterType === 'needs_mapping'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'اقتراحات معلقة' : 'Pending Suggestions'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {stats.needsMappingCount}
            </span>
          </button>

          <button
            onClick={() => setFilterType('verified')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filterType === 'verified'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAr ? 'مطابق ومؤكد' : 'Verified with People'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {stats.verifiedCount}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isAr ? 'بحث في المسودات أو الأسماء...' : 'Filter by task, owner, alias...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredDrafts.length === 0 && (
        <div className="p-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            {isAr ? 'لا توجد مسودات مطابقة' : 'No Pending Drafts in View'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {filterType !== 'all' || searchQuery
              ? isAr
                ? 'لا توجد عناصر تطابق معايير التصفية المحددة. جرب اختيار "الكل".'
                : 'No items match your active filter. Switch back to "All Tasks" or clear search.'
              : isAr
              ? 'صندوق المراجعة نظيف تماماً! جميع التوجيهات تمت معالجتها أو اعتمادها.'
              : 'All captured Adel requests have been reviewed or auto-promoted. Dispatch a test message to see the extraction pipeline.'}
          </p>
          {(filterType !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterType('all');
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Draft Cards List */}
      <div className="space-y-4">
        {filteredDrafts.map((draft) => {
          const isEditing = editingDraftId === draft.id;
          const isVoice = draft.sourceMessageType === 'voice';
          const isPlaying = playingDraftId === draft.id;

          const sourceMsg = messages.find((m) => m.id === draft.sourceMessageId);
          const transcriptText =
            draft.originalRequest ||
            sourceMsg?.voiceTranscript ||
            sourceMsg?.text ||
            draft.description;

          const crossRef =
            draftCrossRefs.get(draft.id) ||
            crossReferenceTranscriptWithPeople(transcriptText, people, draft.suggestedOwner);

          const transcriptTokens = splitTranscriptIntoTokens(transcriptText, crossRef.matches);

          return (
            <div
              key={draft.id}
              className={`p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm transition-all space-y-4 ${
                crossRef.primarySuggestion && !crossRef.isCurrentOwnerMatched
                  ? 'border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-400/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Card Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {draft.sourceGroupName || draft.sourceGroup || 'GC Leaders'}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    {draft.sourceSender || draft.requester || 'Adel HAMMAD Egy'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(
                      draft.createdAt || draft.timestamp || Date.now()
                    ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    {isVoice ? (
                      <Mic className="w-3 h-3 text-orange-500" />
                    ) : (
                      <MessageSquare className="w-3 h-3 text-blue-500" />
                    )}
                    {isVoice ? 'Voice Note' : 'Text'}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Confidence Badge */}
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    AI Confidence: {draft.confidenceScore || draft.confidence || 90}%
                  </span>

                  {/* Verification Status Pill */}
                  {crossRef.isCurrentOwnerMatched ? (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      {isAr ? 'مطابق للكنية' : 'People Verified'}
                    </span>
                  ) : crossRef.primarySuggestion ? (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      {isAr ? 'اقتراح ذكي متاح' : 'Suggestion Ready'}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Source Original Audio / Message Box with Interactive Transcript Tokens */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                {isVoice && (
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-700/60">
                    <button
                      onClick={() => handleTogglePlay(draft.id)}
                      className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-sm"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                        <span>
                          {isPlaying
                            ? 'Playing Egyptian Audio Note...'
                            : 'Recorded Audio Note (PTT)'}
                        </span>
                        <span>0:14</span>
                      </div>
                      {/* Audio waveform */}
                      <div className="flex items-center gap-0.5 h-4">
                        {[
                          12, 24, 18, 30, 20, 10, 28, 32, 14, 22, 16, 26, 12, 18, 30, 22, 16, 28,
                          14, 20,
                        ].map((h, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-all ${
                              isPlaying && i < 12
                                ? 'bg-orange-500'
                                : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Transcript Title and Highlighted Token Stream */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {isVoice ? (
                        <>
                          <Mic className="w-3 h-3 text-orange-500" />
                          {isAr
                            ? 'تفريغ التسجيل الصوتي بالعامية المصرية (مع تمييز الأسماء والكنى):'
                            : 'Egyptian Arabic Voice Transcript (with People Mapping Aliases):'}
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-3 h-3 text-blue-500" />
                          {isAr ? 'نص الرسالة الأصلية:' : 'Original WhatsApp Message:'}
                        </>
                      )}
                    </span>
                    {crossRef.matches.length > 0 && (
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {crossRef.matches.length}{' '}
                        {isAr ? 'كنى مستخرجة' : 'alias mention(s) detected'}
                      </span>
                    )}
                  </div>

                  {/* Interactive Tokenized Text with Clickable Mentions */}
                  <div className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80">
                    &ldquo;
                    {transcriptTokens.map((tok, i) => {
                      if (!tok.isMatch || !tok.match) {
                        return <span key={i}>{tok.text}</span>;
                      }

                      const m = tok.match;
                      const isOwner =
                        draft.suggestedOwner?.toLowerCase() ===
                          m.person.displayName.toLowerCase() ||
                        draft.suggestedOwner?.toLowerCase() ===
                          (m.person.canonicalName || '').toLowerCase();

                      return (
                        <span
                          key={i}
                          className="relative inline-flex items-center mx-1 group"
                        >
                          <span
                            onClick={() =>
                              handleApplyAssignee(draft.id, m.person, m.matchedAlias)
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all border shadow-2xs ${
                              isOwner
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 hover:bg-amber-200'
                            }`}
                            title={`Click to assign ${m.person.displayName} (${m.person.department})`}
                          >
                            <User className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            <span>{tok.text}</span>
                            <span className="text-[9px] opacity-75 font-normal">
                              ➔ {m.person.displayName}
                            </span>
                          </span>

                          {/* Hover Tooltip Popup */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-56 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] shadow-2xl border border-slate-700 z-30 pointer-events-auto">
                            <div className="flex items-center gap-2 pb-1 border-b border-slate-800 mb-1">
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                                {m.person.displayName[0]}
                              </span>
                              <div>
                                <span className="font-bold text-white block leading-tight">
                                  {m.person.displayName}
                                </span>
                                <span className="text-[9px] text-slate-400 block">
                                  {m.person.role} &bull; {m.person.department}
                                </span>
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-300 space-y-0.5">
                              <div>
                                <strong className="text-slate-400">Matched Alias:</strong> &ldquo;
                                {m.matchedAlias}&rdquo;
                              </div>
                              <div>
                                <strong className="text-slate-400">Match Confidence:</strong>{' '}
                                {m.confidence}%
                              </div>
                            </div>
                            {!isOwner && (
                              <button
                                onClick={() =>
                                  handleApplyAssignee(draft.id, m.person, m.matchedAlias)
                                }
                                className="mt-2 w-full py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center justify-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Assign to {m.person.displayName}
                              </button>
                            )}
                          </div>
                        </span>
                      );
                    })}
                    &rdquo;
                  </div>
                </div>
              </div>

              {/* Intelligent Cross-Reference Recommendation Banner */}
              {crossRef.primarySuggestion && !crossRef.isCurrentOwnerMatched && (
                <div className="p-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                          {isAr ? 'اقتراح تعيين ذكي:' : 'Auto-Suggested Assignee:'}
                        </span>
                        <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 underline decoration-indigo-400 decoration-2">
                          {crossRef.primarySuggestion.displayName}
                        </span>
                        <span className="text-[10px] text-amber-800 dark:text-amber-300">
                          ({crossRef.primarySuggestion.role} &bull;{' '}
                          {crossRef.primarySuggestion.department})
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                        {isAr
                          ? `تم رصد كنية "${crossRef.primaryMatch?.matchedAlias}" في التفريغ، ومطابقتها مع مكتبة كنى الفريق (دقة ${crossRef.primaryMatch?.confidence}%).`
                          : `Cross-referenced transcript alias "${crossRef.primaryMatch?.matchedAlias}" with the People Mapping library (${crossRef.primaryMatch?.confidence}% match).`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        handleApplyAssignee(
                          draft.id,
                          crossRef.primarySuggestion!,
                          crossRef.primaryMatch?.matchedAlias
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1 active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {isAr
                          ? `اعتماد ${crossRef.primarySuggestion.displayName}`
                          : `Apply ${crossRef.primarySuggestion.displayName}`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Alternate Person Mentions (Multi-person detection) */}
              {crossRef.alternateSuggestions.length > 0 && (
                <div className="flex items-center gap-2 text-xs flex-wrap px-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    {isAr ? 'أشخاص آخرون ذُكروا في التسجيل:' : 'Other team members mentioned:'}
                  </span>
                  {crossRef.alternateSuggestions.map((alt) => (
                    <button
                      key={alt.id}
                      onClick={() => handleApplyAssignee(draft.id, alt)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      <User className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      <span>{alt.displayName}</span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">({alt.department})</span>
                    </button>
                  ))}
                  <button
                    onClick={() => handleOpenSplit(draft)}
                    className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5 ml-1"
                  >
                    <Scissors className="w-3 h-3" />
                    {isAr ? 'تقسيم لمهام لكل شخص' : 'Split task by members'}
                  </button>
                </div>
              )}

              {/* Extracted Structured Task Form / Display */}
              {!isEditing ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">
                      {draft.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {draft.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    {/* Suggested Owner Box with People Verification Tag */}
                    <div
                      className={`p-2.5 rounded-xl border transition-all ${
                        crossRef.isCurrentOwnerMatched
                          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">
                          {isAr ? 'المسؤول المكلف' : 'Assigned Owner'}
                        </span>
                        {crossRef.isCurrentOwnerMatched ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                      <span className="font-extrabold text-slate-900 dark:text-white truncate block mt-0.5">
                        {draft.suggestedOwner}
                      </span>
                      {crossRef.isCurrentOwnerMatched ? (
                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                          ✓ Verified via &ldquo;{crossRef.primaryMatch?.matchedAlias}&rdquo;
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Click transcript to re-assign
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <span className="text-[10px] text-slate-400 block">
                        {isAr ? 'القسم' : 'Department'}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                        {draft.department}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <span className="text-[10px] text-slate-400 block">
                        {isAr ? 'المشروع' : 'Project'}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                        {draft.project}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <span className="text-[10px] text-slate-400 block">
                        {isAr ? 'الأولوية والموعد' : 'Priority & Due'}
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate block mt-0.5">
                        {draft.priority} ({draft.deadline})
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Editable Form Mode */
                <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Task Description
                    </label>
                    <textarea
                      rows={2}
                      value={editForm.description || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, description: e.target.value })
                      }
                      className="w-full text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    {/* Owner Select with Suggested Markers */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          Owner
                        </label>
                        {crossRef.primarySuggestion && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditForm({
                                ...editForm,
                                suggestedOwner: crossRef.primarySuggestion!.displayName,
                                department: crossRef.primarySuggestion!.department,
                              })
                            }
                            className="text-[9px] font-bold text-indigo-600 hover:underline"
                          >
                            Set {crossRef.primarySuggestion.displayName}
                          </button>
                        )}
                      </div>
                      <select
                        value={editForm.suggestedOwner}
                        onChange={(e) => {
                          const selectedPerson = people.find(
                            (p) => p.displayName === e.target.value || p.canonicalName === e.target.value
                          );
                          setEditForm({
                            ...editForm,
                            suggestedOwner: e.target.value,
                            department: selectedPerson ? selectedPerson.department : editForm.department,
                          });
                        }}
                        className="w-full text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 mt-0.5"
                      >
                        {people.map((p) => {
                          const isSuggested = crossRef.primarySuggestion?.id === p.id;
                          return (
                            <option key={p.id} value={p.displayName || p.canonicalName}>
                              {isSuggested ? '★ [Suggested] ' : ''}
                              {p.displayName} ({p.department})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        Priority
                      </label>
                      <select
                        value={editForm.priority}
                        onChange={(e) =>
                          setEditForm({ ...editForm, priority: e.target.value as Priority })
                        }
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 mt-0.5"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        Department
                      </label>
                      <input
                        type="text"
                        value={editForm.department || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, department: e.target.value })
                        }
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 mt-0.5"
                      >
                      </input>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        Deadline
                      </label>
                      <input
                        type="text"
                        value={editForm.deadline || ''}
                        onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 mt-0.5"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingDraftId(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(draft.id)}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                    >
                      Save & Approve
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => startEdit(draft)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isAr ? 'تعديل المسودة' : 'Edit Draft'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenSplit(draft)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-all"
                  >
                    <Scissors className="w-3.5 h-3.5 text-orange-500" />
                    <span>{isAr ? 'تقسيم لعدة مهام' : 'Split Tasks'}</span>
                  </button>

                  <button
                    onClick={() => setRejectDraftId(draft.id)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تجاهل / ليست مهمة' : 'Ignore / FYI'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id={`btn-approve-draft-${draft.id}`}
                    onClick={() => approveDraft(draft.id)}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAr ? 'اعتماد ونقل لمتتبع المهام' : 'Approve Task'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* People Mapping Alias Library Drawer / Modal */}
      {showAliasLibraryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'مكتبة كنى ومسميات أعضاء الفريق' : 'People Mapping Alias Library'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAr
                      ? 'الكنى والأسماء العامية المصرية المستخدمة في التعرف التلقائي على أصحاب المهام'
                      : 'Configured Egyptian Arabic aliases used by the cross-referencer to resolve task owners'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAliasLibraryModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Test Mention Sandbox */}
            <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 space-y-2">
              <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                {isAr ? 'اختبار كنية أو جملة بالعامية فوراً:' : 'Test Alias Cross-Referencer Live:'}
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    isAr
                      ? 'مثال: "كلم إسماعيل" أو "شوفي يا آلاء" أو "يا عصمت خلص الـ IBAN"'
                      : 'e.g. "كلم إسماعيل" or "يا عصمت" or "مع آلاء"'
                  }
                  value={testMentionText}
                  onChange={(e) => setTestMentionText(e.target.value)}
                  className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                {testMentionText && (
                  <button
                    onClick={() => setTestMentionText('')}
                    className="px-2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {testMentionResult && (
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 text-xs">
                  {testMentionResult.primarySuggestion ? (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        Matched: {testMentionResult.primarySuggestion.displayName}
                      </span>
                      <span className="text-slate-500">
                        ({testMentionResult.primarySuggestion.role} -{' '}
                        {testMentionResult.primarySuggestion.department})
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold">
                        Matched Alias: &ldquo;{testMentionResult.primaryMatch?.matchedAlias}&rdquo; (
                        {testMentionResult.primaryMatch?.confidence}%)
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">
                      No alias match found for this phrase in the active library.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter people or aliases..."
                value={aliasSearchQuery}
                onChange={(e) => setAliasSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            {/* People List */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {people
                .filter((p) => {
                  if (!aliasSearchQuery.trim()) return true;
                  const q = aliasSearchQuery.toLowerCase();
                  return (
                    p.displayName.toLowerCase().includes(q) ||
                    (p.canonicalName || '').toLowerCase().includes(q) ||
                    p.department.toLowerCase().includes(q) ||
                    p.aliases?.some((a) => a.toLowerCase().includes(q))
                  );
                })
                .map((person) => (
                  <div
                    key={person.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {person.displayName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                          {person.department}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {person.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-slate-400 font-bold">Aliases:</span>
                        {person.aliases && person.aliases.length > 0 ? (
                          person.aliases.map((alias, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {alias}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowAliasLibraryModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Modal */}
      {splitDraftItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-orange-500" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'تقسيم التوجيه الصوتي لعدة مهام مستقلة' : 'Split Multi-Task Instruction'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAr
                      ? 'تم اقتراح المكلفين بناءً على الكنى الواردة في التسجيل الصوتي'
                      : 'Pre-populated assignees based on extracted people mentions'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSplitDraftItem(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {splitItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      Sub-Task #{idx + 1}
                    </span>
                    <button
                      onClick={() => setSplitItems(splitItems.filter((_, i) => i !== idx))}
                      className="text-red-500 text-[11px] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...splitItems];
                      updated[idx].title = e.target.value;
                      setSplitItems(updated);
                    }}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                        Assignee
                      </label>
                      <select
                        value={item.assignedTo}
                        onChange={(e) => {
                          const updated = [...splitItems];
                          updated[idx].assignedTo = e.target.value;
                          const selectedP = people.find((p) => p.displayName === e.target.value);
                          if (selectedP) {
                            updated[idx].department = selectedP.department;
                          }
                          setSplitItems(updated);
                        }}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-1.5"
                      >
                        {people.map((p) => (
                          <option key={p.id} value={p.displayName || p.canonicalName}>
                            {p.displayName} ({p.department})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                        Priority
                      </label>
                      <select
                        value={item.priority}
                        onChange={(e) => {
                          const updated = [...splitItems];
                          updated[idx].priority = e.target.value;
                          setSplitItems(updated);
                        }}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-1.5"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  setSplitItems([
                    ...splitItems,
                    {
                      title: 'Follow-up deliverable from voice instruction',
                      assignedTo: 'Abdelfatah',
                      priority: 'Medium',
                      department: 'Engineering / Automation',
                    },
                  ])
                }
                className="w-full py-2 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                + Add Another Sub-Task
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSplitDraftItem(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSplit}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold shadow-sm"
              >
                Create Split Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectDraftId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {isAr ? 'تجاهل هذا الطلب أو تصنيفه كمرجع' : 'Ignore or File as Reference'}
            </h3>
            <p className="text-xs text-slate-500">
              {isAr
                ? 'اختر سبب التجاهل لتسجيله في سجل التشخيصات وتدريب القواعد:'
                : 'Select the categorization reason to ensure diagnostics audit integrity:'}
            </p>

            <div className="space-y-2 text-xs">
              {[
                'Not an actionable task',
                'FYI / Informational announcement only',
                'Duplicate request',
                'Casual conversation',
              ].map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    checked={rejectReason === r}
                    onChange={() => setRejectReason(r)}
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{r}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setRejectDraftId(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  ignoreDraft(rejectDraftId, rejectReason);
                  setRejectDraftId(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                Confirm Ignore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
