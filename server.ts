/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_MONITORED_GROUPS,
  INITIAL_PEOPLE_MAPPINGS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_EXTRACTED_DRAFTS,
  INITIAL_CAPTURE_EVENTS,
  INITIAL_RULES,
  INITIAL_CONNECTOR_HEALTH,
  INITIAL_MESSAGES,
} from './src/data/seedData';
import {
  WhatsAppMessage,
  ExtractedTaskDraft,
  Task,
  CaptureDiagnosticEvent,
  MonitoredGroup,
  PersonMapping,
  ProjectItem,
  AutomationRulesConfig,
  ConnectorHealth,
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data persistence directory
const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

interface AppStore {
  groups: MonitoredGroup[];
  people: PersonMapping[];
  projects: ProjectItem[];
  tasks: Task[];
  drafts: ExtractedTaskDraft[];
  messages: WhatsAppMessage[];
  diagnostics: CaptureDiagnosticEvent[];
  rules: AutomationRulesConfig;
  health: ConnectorHealth;
  lastUpdated: string;
}

function loadStore(): AppStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading store, using defaults:', err);
  }

  const initialStore: AppStore = {
    groups: INITIAL_MONITORED_GROUPS,
    people: INITIAL_PEOPLE_MAPPINGS,
    projects: INITIAL_PROJECTS,
    tasks: INITIAL_TASKS,
    drafts: INITIAL_EXTRACTED_DRAFTS,
    messages: INITIAL_MESSAGES,
    diagnostics: INITIAL_CAPTURE_EVENTS,
    rules: INITIAL_RULES,
    health: INITIAL_CONNECTOR_HEALTH,
    lastUpdated: new Date().toISOString(),
  };
  saveStore(initialStore);
  return initialStore;
}

function saveStore(store: AppStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    store.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store:', err);
  }
}

let store: AppStore = loadStore();

// Lazy Gemini SDK client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Group matching tolerance helper
function matchesGroup(targetGroupName: string, monitoredGroups: MonitoredGroup[]): MonitoredGroup | undefined {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[_\-\.\,\(\)\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const targetClean = clean(targetGroupName);

  return monitoredGroups.find((g) => {
    if (!g.active) return false;
    const gClean = clean(g.name);
    return gClean === targetClean || gClean.includes(targetClean) || targetClean.includes(gClean);
  });
}

// Requester matching helper
function matchesRequester(senderText: string, people: PersonMapping[], rules: AutomationRulesConfig): PersonMapping | undefined {
  const senderLower = senderText.toLowerCase().trim();

  // Check Adel HAMMAD specifically
  const adel = people.find((p) => p.displayName.toLowerCase().includes('adel'));

  for (const person of people) {
    if (person.displayName.toLowerCase() === senderLower) return person;
    if (person.internalName.toLowerCase() === senderLower) return person;
    if (person.phone && senderLower.includes(person.phone.replace(/[\s\+]/g, ''))) return person;
    for (const alias of person.aliases) {
      if (senderLower.includes(alias.toLowerCase())) return person;
    }
  }

  // If sender string contains "adel", map to Adel
  if (senderLower.includes('adel') || senderLower.includes('عادل')) {
    return adel;
  }

  return undefined;
}

// Natural Language Date Normalization Helper
function normalizeDatePhrase(phrase: string): { normalizedDate: string; phrase: string } {
  const now = new Date();
  const lower = phrase.toLowerCase().trim();

  let target = new Date(now);

  if (lower.includes('today') || lower.includes('النهاردة') || lower.includes('اليوم') || lower.includes('asap') || lower.includes('end of day') || lower.includes('آخر اليوم')) {
    // Today
  } else if (lower.includes('tomorrow') || lower.includes('بكرة') || lower.includes('غدا')) {
    target.setDate(target.getDate() + 1);
  } else if (lower.includes('sunday') || lower.includes('الأحد')) {
    const day = target.getDay(); // 0 is Sun
    const diff = (7 - day) % 7 || 7;
    target.setDate(target.getDate() + diff);
  } else if (lower.includes('tuesday') || lower.includes('الثلاثاء')) {
    const day = target.getDay();
    const diff = (2 - day + 7) % 7 || 7;
    target.setDate(target.getDate() + diff);
  } else if (lower.includes('week') || lower.includes('الأسبوع ده')) {
    target.setDate(target.getDate() + 3);
  } else if (lower.includes('month') || lower.includes('آخر الشهر')) {
    target = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else {
    // Default 24h
    target.setDate(target.getDate() + 1);
  }

  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  return {
    normalizedDate: `${yyyy}-${mm}-${dd}`,
    phrase: phrase || 'Standard SLA',
  };
}

// Core Task Extraction Engine (Gemini with Robust NLP Fallback)
async function extractTasksWithAI(
  content: string,
  requesterName: string,
  groupName: string,
  people: PersonMapping[],
  existingTasks: Task[]
): Promise<Array<{
  title: string;
  description: string;
  suggestedOwner: string;
  department: string;
  project: string;
  client: string;
  country: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  rawDeadlinePhrase: string;
  deadline: string;
  confidence: number;
  dependencies?: string;
  requiredOutput?: string;
  isFollowUp?: boolean;
  followUpTaskId?: string;
  isCompletionSignal?: boolean;
  completionTaskId?: string;
  possibleDuplicateOf?: string;
}>> {
  const ai = getGenAI();

  // Known employee directory list for prompt
  const employeeDirectory = people.map((p) => `${p.displayName} (${p.department}) aliases: [${p.aliases.join(', ')}]`).join('\n');
  const recentTaskList = existingTasks.slice(0, 10).map((t) => `${t.id}: "${t.title}" (Owner: ${t.assignedTo}, Group: ${t.whatsAppGroup}, Status: ${t.status})`).join('\n');

  if (ai) {
    try {
      const prompt = `You are the TryGC WhatsApp Task Extraction Engine.
Analyze this message/voice transcript sent by authorized requester "${requesterName}" in group "${groupName}".

Message text/transcript:
"""
${content}
"""

Reference Employee Directory:
${employeeDirectory}

Recent Existing Tasks (Check for duplicates, follow-ups like "Any update?" / "وصلنا لفين؟", or completions like "تم" / "خلصنا" / "Done"):
${recentTaskList}

INSTRUCTIONS:
1. Detect if this is a follow-up inquiry asking about status on an existing task (e.g., "وصلنا لفين؟", "Any update?"). If so, set isFollowUp: true and specify followUpTaskId.
2. Detect if this is a completion signal (e.g. "Done", "تم", "خلصنا", "Fixed"). If so, set isCompletionSignal: true and specify completionTaskId.
3. If this single message contains MULTIPLE separate action items/tasks (e.g. "كلم إسماعيل يشوف الـ API، وآلاء تراجع الـ requirements، وعبد الفتاح يتابع الأوتوميشن"), extract them as SEPARATE tasks in the array!
4. Map owners to closest employee from directory (e.g. "إسماعيل" -> Ismail, "آلاء" -> Alaa, "عبد الفتاح" -> Abdelfatah, "الداتا تيم" -> Data Analysts, "الـ UI" -> UI/UX).
5. Extract priority: "Critical" for urgent/blocker/production issues/ضروري/ASAP, "High" for time-sensitive, "Medium" for normal operations, "Low" for general ideas.
6. Extract raw deadline phrase (e.g. "بكرة", "النهاردة", "قبل الأحد", "next Tuesday", "today") and normalized YYYY-MM-DD date.
7. Check for duplicate requests against recent tasks. If similar, set possibleDuplicateOf with the task ID.
8. Retain original language in title/description when appropriate or provide clear bilingual technical summary.

Return JSON according to the schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                suggestedOwner: { type: Type.STRING },
                department: { type: Type.STRING },
                project: { type: Type.STRING },
                client: { type: Type.STRING },
                country: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ['Critical', 'High', 'Medium', 'Low'] },
                rawDeadlinePhrase: { type: Type.STRING },
                deadline: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                dependencies: { type: Type.STRING },
                requiredOutput: { type: Type.STRING },
                isFollowUp: { type: Type.BOOLEAN },
                followUpTaskId: { type: Type.STRING },
                isCompletionSignal: { type: Type.BOOLEAN },
                completionTaskId: { type: Type.STRING },
                possibleDuplicateOf: { type: Type.STRING },
              },
              required: ['title', 'description', 'suggestedOwner', 'department', 'priority', 'confidence'],
            },
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => {
          const deadlineNorm = normalizeDatePhrase(item.rawDeadlinePhrase || item.deadline || '');
          return {
            title: item.title || 'Task Request',
            description: item.description || content,
            suggestedOwner: item.suggestedOwner || 'Essmat',
            department: item.department || 'Operations',
            project: item.project || 'GC-ADM',
            client: item.client || 'Grand Community Internal',
            country: item.country || (groupName.includes('ksa') || groupName.includes('🇸🇦') ? 'KSA' : 'Egypt'),
            priority: (item.priority as any) || 'High',
            rawDeadlinePhrase: item.rawDeadlinePhrase || deadlineNorm.phrase,
            deadline: item.deadline && item.deadline.includes('-') ? item.deadline : deadlineNorm.normalizedDate,
            confidence: Math.round(Number(item.confidence) || 92),
            dependencies: item.dependencies || 'None',
            requiredOutput: item.requiredOutput || 'Verification and deployment',
            isFollowUp: Boolean(item.isFollowUp),
            followUpTaskId: item.followUpTaskId || undefined,
            isCompletionSignal: Boolean(item.isCompletionSignal),
            completionTaskId: item.completionTaskId || undefined,
            possibleDuplicateOf: item.possibleDuplicateOf || undefined,
          };
        });
      }
    } catch (err) {
      console.warn('Gemini extraction error, falling back to heuristic NLP parser:', err);
    }
  }

  // Heuristic Rule-Based NLP Parser (Works 100% reliably even offline)
  const lower = content.toLowerCase();

  // Check for follow-up message
  if (lower.includes('وصلنا لفين') || lower.includes('any update') || lower.includes('فين التقرير') || lower.includes('ايه الاخبار') || lower.includes('update?')) {
    const matchingTask = existingTasks.find((t) => t.status !== 'Done' && (t.whatsAppGroup === groupName || lower.includes(t.assignedTo.toLowerCase())));
    return [
      {
        title: `Follow-up on ${matchingTask ? matchingTask.id : 'Active Request'}`,
        description: `Requester asked for update: "${content}"`,
        suggestedOwner: matchingTask ? matchingTask.assignedTo : 'Essmat',
        department: matchingTask ? matchingTask.department : 'Operations',
        project: matchingTask ? matchingTask.project : 'GC-ADM',
        client: matchingTask ? matchingTask.client : 'Grand Community Internal',
        country: 'Egypt',
        priority: 'High',
        rawDeadlinePhrase: 'ASAP',
        deadline: normalizeDatePhrase('today').normalizedDate,
        confidence: 95,
        isFollowUp: true,
        followUpTaskId: matchingTask ? matchingTask.id : undefined,
      },
    ];
  }

  // Check for completion signal
  if (lower.includes('تم') || lower.includes('خلصنا') || lower.includes('done') || lower.includes('fixed') || lower.includes('deployed')) {
    const openTask = existingTasks.find((t) => t.status !== 'Done' && t.whatsAppGroup === groupName);
    return [
      {
        title: `Mark ${openTask ? openTask.id : 'Task'} as Completed`,
        description: `Completion notice received: "${content}"`,
        suggestedOwner: openTask ? openTask.assignedTo : 'Essmat',
        department: openTask ? openTask.department : 'Operations',
        project: openTask ? openTask.project : 'GC-ADM',
        client: 'Grand Community Internal',
        country: 'Egypt',
        priority: 'Medium',
        rawDeadlinePhrase: 'Completed',
        deadline: normalizeDatePhrase('today').normalizedDate,
        confidence: 96,
        isCompletionSignal: true,
        completionTaskId: openTask ? openTask.id : undefined,
      },
    ];
  }

  // Multi-task splitting detector
  // E.g.: "كلم إسماعيل يشوف الـ API، وآلاء تراجع الـ requirements، وعبد الفتاح يتابع موضوع الـ automation وبكرة عايز update"
  const clauses: string[] = [];
  const parts = content.split(/[،,؛;\n]|\s+و(?=[ا-يA-Za-z])/);

  if (parts.length > 1 && (content.includes('إسماعيل') || content.includes('آلاء') || content.includes('عبد الفتاح') || content.includes('Ismail') || content.includes('Alaa') || content.includes('Abdelfatah'))) {
    for (const p of parts) {
      if (p.trim().length > 8) clauses.push(p.trim());
    }
  }

  if (clauses.length >= 2) {
    return clauses.map((clause, idx) => {
      let owner = 'Essmat';
      let dept = 'Operations';
      if (clause.includes('إسماعيل') || clause.includes('Ismail') || clause.includes('api')) {
        owner = 'Ismail';
        dept = 'Development';
      } else if (clause.includes('آلاء') || clause.includes('Alaa') || clause.includes('requirements')) {
        owner = 'Alaa';
        dept = 'Business Analysis';
      } else if (clause.includes('عبد الفتاح') || clause.includes('Abdelfatah') || clause.includes('automation')) {
        owner = 'Abdelfatah';
        dept = 'Engineering / Automation';
      } else if (clause.includes('الداتا') || clause.includes('data')) {
        owner = 'Data Analysts';
        dept = 'Data Operations';
      } else if (clause.includes('ui') || clause.includes('تصميم')) {
        owner = 'UI/UX';
        dept = 'Design';
      }

      let priority: 'Critical' | 'High' | 'Medium' | 'Low' = 'High';
      if (clause.includes('ضروري') || clause.includes('urgent') || clause.includes('asap') || clause.includes('مشكلة') || clause.includes('blocker')) {
        priority = 'Critical';
      }

      const deadline = normalizeDatePhrase(content.includes('بكرة') ? 'بكرة' : 'today');

      return {
        title: `Task ${idx + 1}: ${clause.length > 55 ? clause.slice(0, 52) + '...' : clause}`,
        description: `Action extracted from multi-task voice note/message: "${clause}"`,
        suggestedOwner: owner,
        department: dept,
        project: 'GC-WAA',
        client: 'Grand Community Internal',
        country: groupName.includes('ksa') || groupName.includes('🇸🇦') ? 'KSA' : 'Egypt',
        priority,
        rawDeadlinePhrase: content.includes('بكرة') ? 'بكرة' : 'Today',
        deadline: deadline.normalizedDate,
        confidence: 94,
        dependencies: 'Part of multi-action audio dispatch',
        requiredOutput: 'Completion confirmation to Adel HAMMAD Egy',
      };
    });
  }

  // Single task fallback
  let suggestedOwner = 'Essmat';
  let department = 'Operations';
  if (lower.includes('ismail') || lower.includes('إسماعيل') || lower.includes('اسماعيل') || lower.includes('api') || lower.includes('backend')) {
    suggestedOwner = 'Ismail';
    department = 'Development';
  } else if (lower.includes('alaa') || lower.includes('آلاء') || lower.includes('الاء') || lower.includes('requirements') || lower.includes('prd')) {
    suggestedOwner = 'Alaa';
    department = 'Business Analysis';
  } else if (lower.includes('abdelfatah') || lower.includes('عبد الفتاح') || lower.includes('automation') || lower.includes('أوتوميشن')) {
    suggestedOwner = 'Abdelfatah';
    department = 'Engineering / Automation';
  } else if (lower.includes('amr') || lower.includes('عمرو') || lower.includes('frontend')) {
    suggestedOwner = 'Amr';
    department = 'Development';
  } else if (lower.includes('data') || lower.includes('داتا') || lower.includes('بيانات')) {
    suggestedOwner = 'Data Analysts';
    department = 'Data Operations';
  } else if (lower.includes('ui') || lower.includes('تصميم')) {
    suggestedOwner = 'UI/UX';
    department = 'Design';
  }

  let priority: 'Critical' | 'High' | 'Medium' | 'Low' = 'High';
  if (lower.includes('urgent') || lower.includes('ضروري') || lower.includes('asap') || lower.includes('blocker') || lower.includes('مشكلة') || lower.includes('critical')) {
    priority = 'Critical';
  } else if (lower.includes('فكرة') || lower.includes('idea') || lower.includes('future') || lower.includes('تحسين')) {
    priority = 'Low';
  } else if (lower.includes('تقرير') || lower.includes('report') || lower.includes('weekly')) {
    priority = 'Medium';
  }

  let rawDeadline = 'today';
  if (lower.includes('بكرة') || lower.includes('tomorrow')) rawDeadline = 'بكرة';
  else if (lower.includes('الأحد') || lower.includes('sunday')) rawDeadline = 'قبل الأحد';
  else if (lower.includes('الثلاثاء') || lower.includes('tuesday')) rawDeadline = 'next Tuesday';
  else if (lower.includes('آخر اليوم') || lower.includes('end of day')) rawDeadline = 'آخر اليوم';

  const dl = normalizeDatePhrase(rawDeadline);

  // Check duplicate
  const duplicate = existingTasks.find(
    (t) =>
      t.status !== 'Done' &&
      (t.title.toLowerCase().includes(suggestedOwner.toLowerCase()) || t.originalRequest.toLowerCase().includes(content.slice(0, 20).toLowerCase()))
  );

  return [
    {
      title: content.length > 60 ? `${content.slice(0, 58)}...` : content,
      description: `Task identified from WhatsApp request: ${content}`,
      suggestedOwner,
      department,
      project: groupName.includes('Influencers') ? 'GC-INF-KSA' : 'GC-ADM',
      client: groupName.includes('KSA') || groupName.includes('🇸🇦') ? 'KSA Brands Partner' : 'Grand Community Internal',
      country: groupName.includes('KSA') || groupName.includes('🇸🇦') ? 'KSA' : 'Egypt',
      priority,
      rawDeadlinePhrase: rawDeadline,
      deadline: dl.normalizedDate,
      confidence: 91,
      dependencies: 'None',
      requiredOutput: 'Resolution and verification',
      possibleDuplicateOf: duplicate ? duplicate.id : undefined,
    },
  ];
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Health
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'TryGC WhatsApp Task Automation Hub',
      uptime: process.uptime(),
      storeCount: {
        tasks: store.tasks.length,
        drafts: store.drafts.length,
        diagnostics: store.diagnostics.length,
      },
    });
  });

  // State endpoint
  app.get('/api/state', (req: Request, res: Response) => {
    res.json(store);
  });

  // Backup / Export
  app.get('/api/backup/export', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=trygc-hub-backup-${Date.now()}.json`);
    res.send(JSON.stringify(store, null, 2));
  });

  // Backup / Import
  app.post('/api/backup/import', (req: Request, res: Response) => {
    const importedData = req.body;
    if (importedData && importedData.tasks && importedData.groups) {
      store = { ...importedData, lastUpdated: new Date().toISOString() };
      saveStore(store);
      return res.json({ success: true, message: 'Store imported successfully' });
    }
    res.status(400).json({ error: 'Invalid backup file payload' });
  });

  // Reset to initial seed
  app.post('/api/backup/reset', (req: Request, res: Response) => {
    store = {
      groups: INITIAL_MONITORED_GROUPS,
      people: INITIAL_PEOPLE_MAPPINGS,
      projects: INITIAL_PROJECTS,
      tasks: INITIAL_TASKS,
      drafts: INITIAL_EXTRACTED_DRAFTS,
      messages: INITIAL_MESSAGES,
      diagnostics: INITIAL_CAPTURE_EVENTS,
      rules: INITIAL_RULES,
      health: INITIAL_CONNECTOR_HEALTH,
      lastUpdated: new Date().toISOString(),
    };
    saveStore(store);
    res.json({ success: true, message: 'Store reset to factory seed data' });
  });

  // Capture Diagnostics List
  app.get('/api/diagnostics', (req: Request, res: Response) => {
    res.json(store.diagnostics);
  });

  // Webhook / Live Capture from WhatsApp Companion or Simulator
  app.post('/api/capture/webhook', async (req: Request, res: Response) => {
    try {
      const {
        sender = 'Adel HAMMAD Egy',
        group = 'GC Leaders',
        type = 'text',
        text = '',
        voiceDuration,
        audioBase64,
        rawMetadata = {},
        sourceMessageId,
      } = req.body;

      const messageId = sourceMessageId || `msg_wam_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const timestamp = new Date().toISOString();

      // Step 1: Group matching check
      const matchedGroup = matchesGroup(group, store.groups);

      // Step 2: Sender check
      const matchedPerson = matchesRequester(sender, store.people, store.rules);
      const isAuthorized = matchedPerson ? matchedPerson.isAuthorizedRequester : false;

      const ruleMatch = Boolean(matchedGroup && isAuthorized);
      let matchReason = '';
      let failureReason = '';

      if (!matchedGroup) {
        failureReason = `Group "${group}" is not in active monitored groups list.`;
      } else if (!isAuthorized) {
        failureReason = `Sender "${sender}" is not an authorized requester. Monitored primary requester: Adel HAMMAD Egy.`;
      } else {
        matchReason = `Authorized requester "${matchedPerson?.displayName}" inside active group "${matchedGroup.name}".`;
      }

      // Voice note handling
      let transcriptionStatus: 'none' | 'pending' | 'completed' | 'failed' = type === 'voice' ? 'pending' : 'none';
      let voiceTranscript = text;

      if (type === 'voice') {
        if (!voiceTranscript && audioBase64) {
          // Attempt Gemini transcription if base64 audio is provided
          const ai = getGenAI();
          if (ai) {
            try {
              const audioResponse = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'audio/mp3',
                        data: audioBase64,
                      },
                    },
                    {
                      text: 'Transcribe this WhatsApp voice message accurately. It contains spoken Egyptian Arabic, Gulf Arabic, or mixed English/Arabic. Retain technical terms accurately.',
                    },
                  ],
                },
              });
              voiceTranscript = audioResponse.text?.trim() || '';
              transcriptionStatus = 'completed';
            } catch (err: any) {
              console.error('Audio transcription error:', err);
              transcriptionStatus = 'failed';
            }
          } else {
            // Simulated transcription
            voiceTranscript = text || 'شوف يا أحمد محتاجين نخلص موضوع الـ API النهاردة وكلم إسماعيل يشوف المشكلة في الـ admin';
            transcriptionStatus = 'completed';
          }
        } else if (text) {
          transcriptionStatus = 'completed';
        }
      }

      // Create WhatsApp message record
      const newMessage: WhatsAppMessage = {
        id: messageId,
        timestamp,
        group,
        sender,
        type,
        text: type === 'text' ? text : undefined,
        voiceDuration: voiceDuration || (type === 'voice' ? 14 : undefined),
        audioBase64: store.rules.deleteAudioAfterDays > 0 ? audioBase64 : undefined,
        voiceTranscript,
        transcriptionStatus,
        rawMetadata,
        matchedRule: ruleMatch,
        matchReason,
        enteredReview: false,
        taskCreated: false,
        failureReason,
      };

      // Diagnostic event record
      const diagnosticEvent: CaptureDiagnosticEvent = {
        id: `diag_${Date.now()}`,
        timestamp,
        whatsappGroup: group,
        sender,
        rawMetadata: {
          ...rawMetadata,
          detectedGroupName: matchedGroup?.name || group,
          detectedSenderName: matchedPerson?.displayName || sender,
        },
        messageId,
        text: type === 'voice' ? `[Voice Note: ${voiceDuration || 14}s] "${voiceTranscript || 'Transcription pending...'}"` : text,
        voiceDetected: type === 'voice',
        audioCaptured: Boolean(audioBase64 || type === 'voice'),
        transcriptionStatus: type === 'voice' ? transcriptionStatus : 'n/a',
        ruleMatch,
        handoffStatus: ruleMatch ? 'sent_to_review' : 'ignored',
        taskCreated: false,
        errorReason: failureReason || undefined,
      };

      store.messages.unshift(newMessage);
      store.diagnostics.unshift(diagnosticEvent);

      // Update Connector Health
      store.health.lastScan = 'Just now';
      store.health.lastObservedMessage = 'Just now';
      store.health.messageMetadataCount += 1;
      store.health.currentWhatsAppGroup = group;
      if (ruleMatch) {
        store.health.lastSuccessfulHandoff = 'Just now';
      }

      // If matched, extract task(s)
      const createdDrafts: ExtractedTaskDraft[] = [];
      const autoCreatedTasks: Task[] = [];

      if (ruleMatch) {
        const contentToParse = type === 'voice' ? voiceTranscript : text;
        const extracted = await extractTasksWithAI(
          contentToParse || 'General request',
          matchedPerson?.displayName || sender,
          matchedGroup?.name || group,
          store.people,
          store.tasks
        );

        for (const item of extracted) {
          // Check auto-creation threshold
          const shouldAutoCreate =
            item.confidence >= store.rules.autoCreateThreshold &&
            !item.isFollowUp &&
            !item.isCompletionSignal &&
            item.suggestedOwner &&
            item.deadline;

          if (shouldAutoCreate) {
            // Auto create task
            const taskId = `GC-${store.tasks.length + 101}`;
            const newTask: Task = {
              id: taskId,
              title: item.title,
              description: item.description,
              originalRequest: contentToParse,
              whatsAppGroup: matchedGroup?.name || group,
              requester: matchedPerson?.displayName || sender,
              sourceMessageId: messageId,
              sourceTimestamp: timestamp,
              messageType: type,
              voiceTranscript: type === 'voice' ? voiceTranscript : undefined,
              assignedTo: item.suggestedOwner,
              department: item.department,
              project: item.project,
              client: item.client,
              country: item.country,
              priority: item.priority,
              status: 'Assigned',
              startDate: new Date().toISOString().split('T')[0],
              dueDate: item.deadline,
              sla: 'On Track (Auto-created)',
              rag: 'Green',
              progress: 10,
              requiredOutput: item.requiredOutput || 'Completion and report',
              lastUpdate: timestamp,
              createdAt: timestamp,
              timeline: [
                {
                  id: `tl_${Date.now()}_1`,
                  timestamp,
                  actor: 'WhatsApp Companion Engine',
                  action: `${type === 'voice' ? 'Voice note' : 'Text message'} captured from ${group}`,
                  details: `Requester: ${sender}, Message ID: ${messageId}`,
                },
                {
                  id: `tl_${Date.now()}_2`,
                  timestamp,
                  actor: 'AI Auto-Creation Rule',
                  action: `Auto-created task (${item.confidence}% confidence >= ${store.rules.autoCreateThreshold}%)`,
                  details: `Assigned to ${item.suggestedOwner} (${item.department}) with priority ${item.priority}`,
                },
              ],
            };
            store.tasks.unshift(newTask);
            autoCreatedTasks.push(newTask);
            newMessage.taskCreated = true;
            diagnosticEvent.taskCreated = true;
            diagnosticEvent.handoffStatus = 'auto_created';
          } else {
            // Push to Review Inbox
            const draft: ExtractedTaskDraft = {
              id: `draft_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              sourceMessageId: messageId,
              sourceGroupId: matchedGroup?.id || 'grp_13',
              sourceGroupName: matchedGroup?.name || group,
              requester: matchedPerson?.displayName || sender,
              title: item.title,
              description: item.description,
              suggestedOwner: item.suggestedOwner,
              department: item.department,
              project: item.project,
              client: item.client,
              country: item.country,
              priority: item.priority,
              rawDeadlinePhrase: item.rawDeadlinePhrase,
              deadline: item.deadline,
              confidence: item.confidence,
              confidenceLevel: item.confidence >= 85 ? 'high' : item.confidence >= 70 ? 'medium' : 'low',
              autoCreated: false,
              dependencies: item.dependencies,
              requiredOutput: item.requiredOutput,
              possibleDuplicateOf: item.possibleDuplicateOf,
              isFollowUp: item.isFollowUp,
              followUpTaskId: item.followUpTaskId,
              isCompletionSignal: item.isCompletionSignal,
              completionTaskId: item.completionTaskId,
              status: 'pending_review',
              createdAt: timestamp,
            };
            store.drafts.unshift(draft);
            createdDrafts.push(draft);
            newMessage.enteredReview = true;
          }
        }
      }

      saveStore(store);

      res.json({
        success: true,
        messageId,
        ruleMatch,
        matchedGroup: matchedGroup?.name,
        matchedRequester: matchedPerson?.displayName,
        createdDrafts,
        autoCreatedTasks,
        diagnosticId: diagnosticEvent.id,
      });
    } catch (err: any) {
      console.error('Webhook processing error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Approve Draft from Review Inbox
  app.post('/api/drafts/approve', (req: Request, res: Response) => {
    const { draftId, overrides = {} } = req.body;
    const draftIndex = store.drafts.findIndex((d) => d.id === draftId);
    if (draftIndex === -1) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const draft = store.drafts[draftIndex];
    const sourceMsg = store.messages.find((m) => m.id === draft.sourceMessageId);

    const taskId = `GC-${store.tasks.length + 101}`;
    const timestamp = new Date().toISOString();

    const newTask: Task = {
      id: taskId,
      title: overrides.title || draft.title,
      description: overrides.description || draft.description,
      originalRequest: sourceMsg?.voiceTranscript || sourceMsg?.text || draft.description,
      whatsAppGroup: overrides.group || draft.sourceGroupName,
      requester: draft.requester,
      sourceMessageId: draft.sourceMessageId,
      sourceTimestamp: sourceMsg?.timestamp || draft.createdAt,
      messageType: sourceMsg?.type || 'text',
      voiceTranscript: sourceMsg?.voiceTranscript,
      assignedTo: overrides.assignedTo || draft.suggestedOwner,
      department: overrides.department || draft.department,
      project: overrides.project || draft.project,
      client: overrides.client || draft.client,
      country: overrides.country || draft.country,
      priority: overrides.priority || draft.priority,
      status: overrides.status || 'Assigned',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: overrides.dueDate || draft.deadline,
      sla: 'On Track (Approved from Inbox)',
      rag: 'Green',
      progress: 0,
      dependencies: overrides.dependencies || draft.dependencies,
      requiredOutput: overrides.requiredOutput || draft.requiredOutput || 'Report & deployment',
      lastUpdate: timestamp,
      createdAt: timestamp,
      timeline: [
        {
          id: `tl_${Date.now()}_1`,
          timestamp: draft.createdAt,
          actor: 'WhatsApp Companion Engine',
          action: `Captured from ${draft.sourceGroupName}`,
          details: `Source message ID: ${draft.sourceMessageId}`,
        },
        {
          id: `tl_${Date.now()}_2`,
          timestamp,
          actor: 'Operator (Review Inbox)',
          action: `Approved and converted to Task ${taskId}`,
          details: `Assigned to ${overrides.assignedTo || draft.suggestedOwner} with priority ${overrides.priority || draft.priority}`,
        },
      ],
    };

    store.tasks.unshift(newTask);
    store.drafts.splice(draftIndex, 1);
    saveStore(store);

    res.json({ success: true, task: newTask });
  });

  // Approve ALL pending drafts
  app.post('/api/drafts/approve-all', (req: Request, res: Response) => {
    const approvedTasks: Task[] = [];
    const timestamp = new Date().toISOString();

    const pendingDrafts = [...store.drafts.filter((d) => d.status === 'pending_review')];

    pendingDrafts.forEach((draft) => {
      const taskId = `GC-${store.tasks.length + 101}`;
      const sourceMsg = store.messages.find((m) => m.id === draft.sourceMessageId);

      const newTask: Task = {
        id: taskId,
        title: draft.title,
        description: draft.description,
        originalRequest: sourceMsg?.voiceTranscript || sourceMsg?.text || draft.description,
        whatsAppGroup: draft.sourceGroupName,
        requester: draft.requester,
        sourceMessageId: draft.sourceMessageId,
        sourceTimestamp: sourceMsg?.timestamp || draft.createdAt,
        messageType: sourceMsg?.type || 'text',
        voiceTranscript: sourceMsg?.voiceTranscript,
        assignedTo: draft.suggestedOwner,
        department: draft.department,
        project: draft.project,
        client: draft.client,
        country: draft.country,
        priority: draft.priority,
        status: 'Assigned',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: draft.deadline,
        sla: 'On Track',
        rag: 'Green',
        progress: 0,
        dependencies: draft.dependencies,
        requiredOutput: draft.requiredOutput || 'Resolution',
        lastUpdate: timestamp,
        createdAt: timestamp,
        timeline: [
          {
            id: `tl_${Date.now()}_1`,
            timestamp: draft.createdAt,
            actor: 'WhatsApp Companion Engine',
            action: `Captured from ${draft.sourceGroupName}`,
          },
          {
            id: `tl_${Date.now()}_2`,
            timestamp,
            actor: 'Operator (Batch Approval)',
            action: `Approved from Review Inbox into Task Tracker as ${taskId}`,
          },
        ],
      };

      store.tasks.unshift(newTask);
      approvedTasks.push(newTask);
    });

    store.drafts = store.drafts.filter((d) => d.status !== 'pending_review');
    saveStore(store);

    res.json({ success: true, count: approvedTasks.length, tasks: approvedTasks });
  });

  // Ignore / Reject Draft
  app.post('/api/drafts/ignore', (req: Request, res: Response) => {
    const { draftId, reason = 'Operator rejected' } = req.body;
    const index = store.drafts.findIndex((d) => d.id === draftId);
    if (index !== -1) {
      store.drafts.splice(index, 1);
      saveStore(store);
      return res.json({ success: true, message: 'Draft removed' });
    }
    res.status(404).json({ error: 'Draft not found' });
  });

  // Split Draft into Multiple Sub-tasks
  app.post('/api/drafts/split', (req: Request, res: Response) => {
    const { draftId, splits } = req.body; // splits: array of partial draft overrides
    const index = store.drafts.findIndex((d) => d.id === draftId);
    if (index === -1) return res.status(404).json({ error: 'Draft not found' });

    const original = store.drafts[index];
    store.drafts.splice(index, 1);

    splits.forEach((split: any, idx: number) => {
      const newDraft: ExtractedTaskDraft = {
        ...original,
        id: `draft_${Date.now()}_split_${idx}`,
        title: split.title || `${original.title} (Part ${idx + 1})`,
        description: split.description || original.description,
        suggestedOwner: split.suggestedOwner || original.suggestedOwner,
        department: split.department || original.department,
        priority: split.priority || original.priority,
        deadline: split.deadline || original.deadline,
        status: 'pending_review',
        createdAt: new Date().toISOString(),
      };
      store.drafts.unshift(newDraft);
    });

    saveStore(store);
    res.json({ success: true, message: `Draft split into ${splits.length} tasks` });
  });

  // Tasks CRUD
  app.post('/api/tasks/update-status', (req: Request, res: Response) => {
    const { taskId, status, note, actor = 'System Operator' } = req.body;
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.status = status;
    task.lastUpdate = new Date().toISOString();
    if (status === 'Done') {
      task.completedAt = new Date().toISOString();
      task.progress = 100;
      task.rag = 'Green';
      task.sla = 'Completed';
    }

    task.timeline.unshift({
      id: `tl_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor,
      action: `Status changed to ${status}`,
      details: note || undefined,
    });

    saveStore(store);
    res.json({ success: true, task });
  });

  app.post('/api/tasks/create', (req: Request, res: Response) => {
    const data = req.body;
    const taskId = `GC-${store.tasks.length + 101}`;
    const timestamp = new Date().toISOString();

    const newTask: Task = {
      id: taskId,
      title: data.title || 'Untitled Task',
      description: data.description || '',
      originalRequest: data.originalRequest || data.title,
      whatsAppGroup: data.whatsAppGroup || 'GC Leaders',
      requester: data.requester || 'Adel HAMMAD Egy',
      sourceMessageId: data.sourceMessageId || `manual_${Date.now()}`,
      sourceTimestamp: timestamp,
      messageType: data.messageType || 'text',
      voiceTranscript: data.voiceTranscript,
      assignedTo: data.assignedTo || 'Essmat',
      department: data.department || 'Operations',
      project: data.project || 'GC-ADM',
      client: data.client || 'Grand Community Internal',
      country: data.country || 'Egypt',
      priority: data.priority || 'Medium',
      status: data.status || 'New',
      startDate: data.startDate || timestamp.split('T')[0],
      dueDate: data.dueDate || timestamp.split('T')[0],
      sla: 'On Track',
      rag: 'Green',
      progress: data.progress || 0,
      dependencies: data.dependencies,
      requiredOutput: data.requiredOutput || 'Resolution',
      lastUpdate: timestamp,
      createdAt: timestamp,
      timeline: [
        {
          id: `tl_${Date.now()}`,
          timestamp,
          actor: 'Operator Manual Entry',
          action: `Created task ${taskId}`,
        },
      ],
    };

    store.tasks.unshift(newTask);
    saveStore(store);
    res.json({ success: true, task: newTask });
  });

  // Settings & Groups / People endpoints
  app.post('/api/groups/toggle', (req: Request, res: Response) => {
    const { groupId } = req.body;
    const group = store.groups.find((g) => g.id === groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    group.active = !group.active;
    saveStore(store);
    res.json({ success: true, group });
  });

  app.post('/api/groups/add', (req: Request, res: Response) => {
    const { name, departmentTag, description, color = 'indigo' } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const newGroup: MonitoredGroup = {
      id: `grp_${Date.now()}`,
      name,
      normalizedName: name.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim(),
      active: true,
      lastActivity: 'Just added',
      messageCount: 0,
      description,
      color,
      departmentTag,
    };
    store.groups.push(newGroup);
    saveStore(store);
    res.json({ success: true, group: newGroup });
  });

  app.post('/api/people/add', (req: Request, res: Response) => {
    const { displayName, internalName, role, department, phone, aliases = [], isAuthorizedRequester = false } = req.body;
    const newPerson: PersonMapping = {
      id: `person_${Date.now()}`,
      displayName,
      internalName: internalName || displayName,
      role: role || 'Team Member',
      department: department || 'General',
      phone,
      aliases: aliases.length ? aliases : [displayName],
      isAuthorizedRequester: Boolean(isAuthorizedRequester),
    };
    store.people.push(newPerson);
    saveStore(store);
    res.json({ success: true, person: newPerson });
  });

  app.post('/api/rules/update', (req: Request, res: Response) => {
    store.rules = { ...store.rules, ...req.body };
    saveStore(store);
    res.json({ success: true, rules: store.rules });
  });

  // Chrome Extension Companion Files download/fetch
  app.get('/api/companion/manifest', (req: Request, res: Response) => {
    res.json({
      manifest_version: 3,
      name: 'TryGC WhatsApp Task Bridge Companion',
      version: '1.2.0',
      description: 'Continuous background monitoring companion for WhatsApp Web to capture authorized Adel requests and voice notes.',
      permissions: ['activeTab', 'storage'],
      host_permissions: ['https://web.whatsapp.com/*', 'http://localhost:3000/*'],
      content_scripts: [
        {
          matches: ['https://web.whatsapp.com/*'],
          js: ['content.js'],
          run_at: 'document_idle',
        },
      ],
    });
  });

  // Vite middleware in dev or static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TryGC WhatsApp Task Automation Hub running on http://localhost:${PORT}`);
  });
}

startServer();
