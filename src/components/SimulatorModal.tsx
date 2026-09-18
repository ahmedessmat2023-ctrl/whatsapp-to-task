/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Zap,
  Mic,
  Send,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Square,
  Volume2,
  Copy,
  ChevronDown,
  Layers,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SimulatorModal: React.FC = () => {
  const { showSimulator, setShowSimulator, groups, sendSimulatedMessage, language, setCurrentTab } = useApp();

  const isAr = language === 'ar';

  const [selectedGroup, setSelectedGroup] = useState<string>('GC Leaders');
  const [senderName, setSenderName] = useState<string>('Adel HAMMAD Egy');
  const [messageType, setMessageType] = useState<'text' | 'voice'>('text');
  const [customText, setCustomText] = useState<string>('');
  const [voiceDuration, setVoiceDuration] = useState<number>(14);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Live mic recorder state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!showSimulator) return null;

  // Preset Scenarios specified in prompt
  const presets = [
    {
      id: 'scenario_dod_1',
      badge: 'Definition of Done 1',
      title: 'Adel Text Request in GC Leaders',
      group: 'GC Leaders',
      sender: 'Adel HAMMAD Egy',
      type: 'text' as const,
      text: '@Ismail please check the API issue today and verify admin portal credentials.',
      desc: 'Normal text request from Adel -> Review Inbox -> Approve -> Task Tracker.',
    },
    {
      id: 'scenario_dod_2',
      badge: 'Definition of Done 2 (Voice)',
      title: 'Adel Egyptian Voice Note (Single Task)',
      group: 'GC Leaders',
      sender: 'Adel HAMMAD Egy',
      type: 'voice' as const,
      duration: 16,
      text: 'شوف يا أحمد محتاجين نخلص موضوع الـ API النهاردة وكلم إسماعيل يشوف المشكلة في الـ admin',
      desc: 'Speech-to-text pipeline transcribes Egyptian Arabic voice note, extracts task, assigns to Ismail.',
    },
    {
      id: 'scenario_multi_voice',
      badge: 'Section 5: Multi-Task Voice',
      title: 'Adel Multi-Task Voice Note (3 Sub-tasks)',
      group: 'Roadmap 2026 🚀',
      sender: 'Adel HAMMAD Egy',
      type: 'voice' as const,
      duration: 28,
      text: 'كلم إسماعيل يشوف الـ API، وآلاء تراجع الـ requirements، وعبد الفتاح يتابع موضوع الـ automation وبكرة عايز update',
      desc: 'Automatically extracts 3 distinct structured tasks (Ismail, Alaa, Abdelfatah) sharing same voice source reference.',
    },
    {
      id: 'scenario_followup',
      badge: 'Section 13: Follow-Up Inquiry',
      title: 'Follow-up Status Check ("وصلنا لفين؟")',
      group: 'GC Leaders',
      sender: 'Adel HAMMAD Egy',
      type: 'text' as const,
      text: 'وصلنا لفين في موضوع الـ API؟ Any update?',
      desc: 'Detects follow-up inquiry and links as Task Update/Follow-up rather than duplicate task.',
    },
    {
      id: 'scenario_completion',
      badge: 'Section 14: Completed Detection',
      title: 'Completion Notice ("تم وخلصنا")',
      group: 'GC Leaders',
      sender: 'Adel HAMMAD Egy',
      type: 'text' as const,
      text: 'تمام يا شباب تم وخلصنا موضوع الـ API and deployed to staging.',
      desc: 'Suggests changing matching related open task to Done status.',
    },
    {
      id: 'scenario_duplicate',
      badge: 'Section 12: Duplicate Request',
      title: 'Duplicate Request Alert',
      group: 'GC Leaders',
      sender: 'Adel HAMMAD Egy',
      type: 'text' as const,
      text: 'موضوع الـ API في الـ admin محتاجين نخلصه النهاردة ضروري',
      desc: 'Detects existing task GC-101 and shows "Possible duplicate of Task #GC-101".',
    },
    {
      id: 'scenario_wrong_sender',
      badge: 'Section 1: Diagnostics Rule',
      title: 'Non-Authorized Sender (Filter Test)',
      group: 'Gc_it specialists team',
      sender: 'Karim IT Support',
      type: 'text' as const,
      text: 'Restarting staging redis container in 5 minutes for maintenance.',
      desc: 'Never fails silently: observed & logged in Diagnostics with exact reason why ignored.',
    },
    {
      id: 'scenario_wrong_group',
      badge: 'Section 2: Group Matching',
      title: 'Unapproved Group (Random Chat)',
      group: 'Friday Lunch Random Group',
      sender: 'Adel HAMMAD Egy',
      type: 'text' as const,
      text: 'يا شباب مين جاي الغداء النهاردة؟',
      desc: 'Logged in Diagnostics as non-monitored group, no false tasks generated.',
    },
  ];

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setSelectedGroup(preset.group);
    setSenderName(preset.sender);
    setMessageType(preset.type);
    setCustomText(preset.text);
    if (preset.duration) setVoiceDuration(preset.duration);
  };

  const handleSend = async () => {
    setIsSending(true);
    setTestResult(null);
    try {
      const payload: any = {
        sender: senderName,
        group: selectedGroup,
        type: messageType,
        text: customText,
        voiceDuration: messageType === 'voice' ? voiceDuration : undefined,
        audioBase64: recordedAudioBase64 || undefined,
        rawMetadata: {
          prePlainText: `[${new Date().toLocaleTimeString()}, ${new Date().toLocaleDateString()}] ${senderName}: `,
          msgId: `sim_${Date.now()}`,
          isSimulated: true,
        },
      };

      const res = await sendSimulatedMessage(payload);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ error: err.message || 'Failed to send event' });
    } finally {
      setIsSending(false);
    }
  };

  // Live Voice Recording from Microphone
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          setRecordedAudioBase64(base64data);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setMessageType('voice');
    } catch (err) {
      console.warn('Microphone access denied or not supported in current environment:', err);
      // Fallback
      setCustomText('شوف يا أحمد محتاجين نخلص موضوع الـ API النهاردة وكلم إسماعيل يشوف المشكلة في الـ admin');
      setMessageType('voice');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setVoiceDuration(8);
      if (!customText) {
        setCustomText('Live recorded voice note from Adel HAMMAD Egy (audio stream captured)');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {isAr ? 'مُحاكي أحداث واتساب (بيئة الاختبار)' : 'WhatsApp Event Simulator & Testing Suite'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {isAr ? 'جاهز للتجربة' : 'TEST ENVIRONMENT'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'اختبر سيناريوهات الرصد، الصوتيات المصرية، استخراج المهام المتعددة، والمتابعة التلقائية'
                  : 'Test real-world scenarios: Egyptian voice notes, multi-task extraction, follow-up matching, and diagnostics'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSimulator(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Presets Column (Left) */}
          <div className="lg:col-span-5 space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {isAr ? 'سيناريوهات الاختبار المعتمدة (1-Click Presets)' : 'Preset Scenarios (1-Click Test)'}
            </label>
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  className="w-full text-left p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      {preset.badge}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      {preset.type === 'voice' ? <Mic className="w-3 h-3 text-orange-500" /> : <MessageSquare className="w-3 h-3 text-blue-500" />}
                      {preset.type.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {preset.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {preset.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Configuration & Form Column (Right) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isAr ? 'المجموعة المستهدفة' : 'WhatsApp Group'}
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name} {!g.active ? '(Paused)' : ''}
                    </option>
                  ))}
                  <option value="Friday Lunch Random Group">Friday Lunch Random Group (Unapproved Test)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isAr ? 'المُرسل (WhatsApp Sender)' : 'WhatsApp Sender'}
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Adel HAMMAD Egy"
                />
              </div>
            </div>

            {/* Message Type Selector & Live Mic Recorder */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMessageType('text')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    messageType === 'text'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Text Message
                </button>
                <button
                  type="button"
                  onClick={() => setMessageType('voice')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    messageType === 'voice'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  Voice Note (PTT)
                </button>
              </div>

              {/* Live Mic Action */}
              <div>
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold transition-all"
                  >
                    <Mic className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    <span>{isAr ? 'سجّل بصوتك الآن' : 'Record Real Mic'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs animate-pulse"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>{isAr ? 'إيقاف التسجيل' : 'Stop Recording'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom Content Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {messageType === 'voice'
                    ? isAr
                      ? 'النص الصوتي المراد محاكاته / التفريغ'
                      : 'Voice Note Audio Content / Transcript'
                    : isAr
                    ? 'نص الرسالة المكتوبة'
                    : 'WhatsApp Message Body'}
                </label>
                {messageType === 'voice' && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Duration: {voiceDuration}s
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={
                  messageType === 'voice'
                    ? 'e.g. شوف يا أحمد محتاجين نخلص موضوع الـ API النهاردة وكلم إسماعيل يشوف المشكلة في الـ admin'
                    : 'e.g. @Ismail please check the API issue today.'
                }
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            {/* Send Dispatch Button */}
            <div className="pt-2">
              <button
                type="button"
                id="btn-execute-simulation"
                disabled={isSending || !customText.trim()}
                onClick={handleSend}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-sm shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all active:scale-[0.99]"
              >
                {isSending ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>{isAr ? 'جاري الرصد والتحليل الذكي...' : 'Simulating Capture & NLP Extraction...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {isAr
                        ? 'إطلاق الحدث الآن ومحاكاة الاستقبال'
                        : 'Dispatch Event to WhatsApp Capture Engine'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Test Results Output Box */}
            {testResult && (
              <div
                className={`p-4 rounded-2xl border text-xs animate-in fade-in duration-200 ${
                  testResult.error
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200'
                    : testResult.ruleMatch
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-100'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-100'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-2">
                  <span className="flex items-center gap-1.5">
                    {testResult.ruleMatch ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>
                      {testResult.ruleMatch
                        ? isAr
                          ? 'تم الرصد والتقاط المهمة بنجاح!'
                          : 'Message Successfully Matched & Captured!'
                        : isAr
                        ? 'تم تسجيل الحدث في التشخيصات (لم يدخل المراجعة)'
                        : 'Message Filtered / Logged to Diagnostics'}
                    </span>
                  </span>
                  <span className="text-[10px] opacity-75 font-mono">ID: {testResult.messageId}</span>
                </div>

                {testResult.createdDrafts?.length > 0 && (
                  <div className="space-y-1 mb-2">
                    <p className="font-semibold text-[11px]">
                      {isAr ? 'تم إنشاء بطاقات في صندوق المراجعة:' : 'Created Review Inbox Drafts:'}
                    </p>
                    {testResult.createdDrafts.map((d: any) => (
                      <div key={d.id} className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-inherit">
                        <span className="font-bold">{d.title}</span> — Owner: <span className="underline">{d.suggestedOwner}</span> | Priority: {d.priority} | Due: {d.deadline}
                      </div>
                    ))}
                  </div>
                )}

                {testResult.autoCreatedTasks?.length > 0 && (
                  <div className="space-y-1 mb-2">
                    <p className="font-semibold text-[11px] text-indigo-700 dark:text-indigo-300">
                      {isAr ? 'تم الإنشاء المباشر في متتبع المهام (ثقة >= 90%):' : 'Auto-Created Tasks in Tracker:'}
                    </p>
                    {testResult.autoCreatedTasks.map((t: any) => (
                      <div key={t.id} className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-inherit">
                        <span className="font-extrabold text-indigo-600">{t.id}</span>: {t.title} (Assigned: {t.assignedTo})
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-inherit flex items-center justify-between">
                  <span className="text-[11px] opacity-80">
                    {testResult.ruleMatch
                      ? isAr
                        ? 'اذهب إلى صندوق المراجعة أو متتبع المهام لمعاينة النتيجة'
                        : 'Check Review Inbox or Tasks to see full live state'
                      : 'Details available in Diagnostics Engine'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSimulator(false);
                      setCurrentTab(testResult.autoCreatedTasks?.length ? 'tasks' : 'inbox');
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-[11px] flex items-center gap-1"
                  >
                    <span>{isAr ? 'عرض النتيجة' : 'View in App'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
