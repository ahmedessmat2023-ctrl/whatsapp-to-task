/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Scissors,
  Merge,
  Eye,
  Play,
  Pause,
  Volume2,
  Mic,
  MessageSquare,
  Sparkles,
  ArrowRight,
  User,
  Calendar,
  Building2,
  FolderKanban,
  Flag,
  AlertTriangle,
  Layers,
  Copy,
  Check,
  Edit2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExtractedTaskDraft, Priority, Task } from '../types';

export const ReviewInboxView: React.FC = () => {
  const { drafts, approveDraft, approveAllDrafts, ignoreDraft, splitDraft, people, projects, language, setShowSimulator } = useApp();

  const isAr = language === 'ar';

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
    // Suggest 2 or 3 splits
    setSplitItems([
      {
        title: `${draft.title} (Part 1)`,
        assignedTo: draft.suggestedOwner || 'Ismail',
        priority: draft.priority,
        department: draft.department,
      },
      {
        title: `Follow up requirements & update documentation`,
        assignedTo: 'Alaa',
        priority: 'High',
        department: 'Product',
      },
    ]);
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
      // Simulate audio play duration
      setTimeout(() => {
        setPlayingDraftId((current) => (current === draftId ? null : current));
      }, 5000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'صندوق مراجعة توجيهات واتساب' : 'Review Inbox'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-500 text-white shadow-xs">
              {drafts.length} {isAr ? 'بانتظار الاعتماد' : 'Pending'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'مراجعة المهام المستخرجة ذكياً من رسائل وتسجيلات عادل حماد قبل تحويلها لمتتبع المهام'
              : 'Human-in-the-loop control center. Verify, edit, split, or approve tasks extracted from Adel HAMMAD.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {drafts.length > 0 && (
            <button
              id="btn-approve-all-inbox"
              onClick={approveAllDrafts}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isAr ? 'اعتماد جميع المهام دفعة واحدة' : 'Approve All Drafts'}</span>
            </button>
          )}

          <button
            onClick={() => setShowSimulator(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isAr ? 'محاكاة رسالة جديدة' : 'Simulate Incoming'}</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {drafts.length === 0 && (
        <div className="p-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            {isAr ? 'صندوق المراجعة فارغ تماماً!' : 'Review Inbox is Clear!'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {isAr
              ? 'تم اعتماد أو معالجة جميع توجيهات واتساب. عندما يُرسل عادل حماد تسجيلاً أو رسالة جديدة، ستظهر هنا فوراً.'
              : 'All captured Adel requests have been reviewed or auto-promoted. Dispatch a test message to see the extraction pipeline.'}
          </p>
          <button
            onClick={() => setShowSimulator(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md"
          >
            {isAr ? 'تجربة إرسال رسالة صوتية الآن' : 'Simulate Voice Note Now'}
          </button>
        </div>
      )}

      {/* Draft Cards List */}
      <div className="space-y-4">
        {drafts.map((draft) => {
          const isEditing = editingDraftId === draft.id;
          const isVoice = draft.sourceMessageType === 'voice';
          const isPlaying = playingDraftId === draft.id;

          return (
            <div
              key={draft.id}
              className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-4"
            >
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {draft.sourceGroup}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    {draft.sourceSender}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(draft.createdAt || draft.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    {isVoice ? <Mic className="w-3 h-3 text-orange-500" /> : <MessageSquare className="w-3 h-3 text-blue-500" />}
                    {isVoice ? 'Voice Note' : 'Text'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    AI Confidence: {draft.confidenceScore}%
                  </span>
                </div>
              </div>

              {/* Source Original Audio / Message Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                {isVoice && (
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-700/60">
                    <button
                      onClick={() => handleTogglePlay(draft.id)}
                      className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-sm"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                        <span>{isPlaying ? 'Playing Egyptian Audio Note...' : 'Recorded Audio Note (PTT)'}</span>
                        <span>0:14</span>
                      </div>
                      {/* Interactive audio waveform simulation */}
                      <div className="flex items-center gap-0.5 h-4">
                        {[12, 24, 18, 30, 20, 10, 28, 32, 14, 22, 16, 26, 12, 18, 30, 22, 16, 28, 14, 20].map((h, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-all ${
                              isPlaying && i < 12 ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    {isVoice ? (isAr ? 'تفريغ التسجيل الصوتي بالعامية المصرية:' : 'Egyptian Arabic Voice Note Transcript:') : (isAr ? 'نص الرسالة الأصلية:' : 'Original Message Text:')}
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium italic leading-relaxed">
                    "{draft.originalRequest}"
                  </p>
                </div>
              </div>

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
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'المسؤول المقترح' : 'Suggested Owner'}</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block">{draft.suggestedOwner}</span>
                    </div>
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'القسم' : 'Department'}</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block">{draft.department}</span>
                    </div>
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'المشروع' : 'Project'}</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block">{draft.project}</span>
                    </div>
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'الأولوية والموعد' : 'Priority & Due'}</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate block">
                        {draft.priority} ({draft.deadline})
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Editable Form Mode */
                <div className="space-y-3 p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Task Title</label>
                    <input
                      type="text"
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Task Description</label>
                    <textarea
                      rows={2}
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Owner</label>
                      <select
                        value={editForm.suggestedOwner}
                        onChange={(e) => setEditForm({ ...editForm, suggestedOwner: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
                      >
                        {people.map((p) => (
                          <option key={p.id} value={p.canonicalName}>
                            {p.canonicalName} ({p.department})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Priority</label>
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Priority })}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Department</label>
                      <input
                        type="text"
                        value={editForm.department || ''}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Deadline</label>
                      <input
                        type="text"
                        value={editForm.deadline || ''}
                        onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
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
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-sm"
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

      {/* Split Modal (Module 5 & 28) */}
      {splitDraftItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-orange-500" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {isAr ? 'تقسيم التوجيه الصوتي لعدة مهام مستقلة' : 'Split Multi-Task Instruction'}
                </h3>
              </div>
              <button onClick={() => setSplitDraftItem(null)} className="text-slate-400 hover:text-white text-sm font-bold">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {isAr
                ? 'استخراج عدة مهام من نفس التسجيل الصوتي مع ربطها بنفس المرجع:'
                : 'Extract separate actionable items from Adel\'s voice instruction, all traced back to the same audio:'}
            </p>

            <div className="space-y-3">
              {splitItems.map((item, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-600">Sub-Task #{idx + 1}</span>
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
                    <select
                      value={item.assignedTo}
                      onChange={(e) => {
                        const updated = [...splitItems];
                        updated[idx].assignedTo = e.target.value;
                        setSplitItems(updated);
                      }}
                      className="text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-1.5"
                    >
                      {people.map((p) => (
                        <option key={p.id} value={p.canonicalName}>
                          {p.canonicalName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={item.priority}
                      onChange={(e) => {
                        const updated = [...splitItems];
                        updated[idx].priority = e.target.value;
                        setSplitItems(updated);
                      }}
                      className="text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-1.5"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  setSplitItems([
                    ...splitItems,
                    {
                      title: 'New action item from voice note',
                      assignedTo: 'Abdelfatah',
                      priority: 'Medium',
                      department: 'Operations',
                    },
                  ])
                }
                className="w-full py-2 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 text-xs font-bold"
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
              {['Not an actionable task', 'FYI / Informational announcement only', 'Duplicate request', 'Casual conversation'].map((r) => (
                <label key={r} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
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
              <button onClick={() => setRejectDraftId(null)} className="px-4 py-2 rounded-xl border text-xs font-bold">
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
