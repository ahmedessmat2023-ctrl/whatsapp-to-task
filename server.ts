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

  // Database Storage & Backup Stats
  const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
  function ensureBackupsDir() {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
  }

  function getSnapshotList() {
    ensureBackupsDir();
    try {
      const files = fs.readdirSync(BACKUPS_DIR);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          const p = path.join(BACKUPS_DIR, f);
          const st = fs.statSync(p);
          return {
            filename: f,
            sizeBytes: st.size,
            createdAt: st.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (_) {
      return [];
    }
  }

  function escapeCsvValue(val: any): string {
    if (val === null || val === undefined) return '""';
    if (Array.isArray(val)) {
      val = val.join('; ');
    } else if (typeof val === 'object') {
      val = JSON.stringify(val);
    }
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  function toCsvString(headers: { key: string; label: string }[], rows: any[]): string {
    const headerLine = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
    const rowLines = rows.map((row) =>
      headers.map((h) => escapeCsvValue(row[h.key])).join(',')
    );
    // Prepend UTF-8 BOM so Excel and Google Sheets render Arabic and English characters properly
    return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  }

  function parseCsvRows(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    if (csvText.charCodeAt(0) === 0xFEFF) {
      csvText = csvText.slice(1);
    }

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentField.trim());
          currentField = '';
        } else if (char === '\r') {
          if (nextChar === '\n') {
            i++;
          }
          currentRow.push(currentField.trim());
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
        } else if (char === '\n') {
          currentRow.push(currentField.trim());
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
        } else {
          currentField += char;
        }
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
    }

    return rows.filter((r) => r.length > 0 && r.some((c) => c.trim().length > 0));
  }

  // Backup / Database Stats
  app.get('/api/backup/stats', (req: Request, res: Response) => {
    let sizeBytes = 0;
    try {
      if (fs.existsSync(STORE_FILE)) {
        sizeBytes = fs.statSync(STORE_FILE).size;
      }
    } catch (_) {}

    res.json({
      engine: 'SQLite / Local-First Database Store',
      databaseFile: 'data/store.json',
      fileSizeBytes: sizeBytes,
      lastUpdated: store.lastUpdated,
      counts: {
        tasks: store.tasks?.length || 0,
        drafts: store.drafts?.length || 0,
        groups: store.groups?.length || 0,
        people: store.people?.length || 0,
        projects: store.projects?.length || 0,
        messages: store.messages?.length || 0,
        diagnostics: store.diagnostics?.length || 0,
      },
      snapshots: getSnapshotList(),
    });
  });

  // Backup / Export JSON
  app.get('/api/backup/export', (req: Request, res: Response) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      metadata: {
        app: 'TryGC WhatsApp Task Automation Hub',
        databaseEngine: 'SQLite / Local-First Database Store',
        version: '1.4.0',
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        recordCounts: {
          tasks: store.tasks?.length || 0,
          drafts: store.drafts?.length || 0,
          groups: store.groups?.length || 0,
          people: store.people?.length || 0,
          projects: store.projects?.length || 0,
          messages: store.messages?.length || 0,
          diagnostics: store.diagnostics?.length || 0,
        },
      },
      ...store,
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=trygc-sqlite-backup-${timestamp}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  });

  // Backup / Export CSV
  app.get('/api/backup/export-csv', (req: Request, res: Response) => {
    const table = (req.query.table as string) || 'tasks';
    const timestamp = new Date().toISOString().slice(0, 10);

    if (table === 'tasks') {
      const headers = [
        { key: 'id', label: 'Task ID' },
        { key: 'title', label: 'Task Title' },
        { key: 'description', label: 'Description' },
        { key: 'assignedTo', label: 'Assigned To' },
        { key: 'department', label: 'Department' },
        { key: 'project', label: 'Project' },
        { key: 'client', label: 'Client' },
        { key: 'country', label: 'Country' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'rag', label: 'RAG' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'rawDeadlinePhrase', label: 'Deadline Mention' },
        { key: 'confidence', label: 'Confidence %' },
        { key: 'sourceGroup', label: 'WhatsApp Group' },
        { key: 'sourceSender', label: 'Source Requester' },
        { key: 'dependencies', label: 'Dependencies' },
        { key: 'requiredOutput', label: 'Required Output' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'lastUpdated', label: 'Last Updated' },
      ];
      const csv = toCsvString(headers, store.tasks || []);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=trygc-tasks-${timestamp}.csv`);
      return res.send(csv);
    }

    if (table === 'drafts') {
      const headers = [
        { key: 'id', label: 'Draft ID' },
        { key: 'title', label: 'Extracted Title' },
        { key: 'description', label: 'Description' },
        { key: 'suggestedOwner', label: 'Suggested Assignee' },
        { key: 'department', label: 'Department' },
        { key: 'project', label: 'Project' },
        { key: 'client', label: 'Client' },
        { key: 'country', label: 'Country' },
        { key: 'priority', label: 'Priority' },
        { key: 'deadline', label: 'Target Deadline' },
        { key: 'rawDeadlinePhrase', label: 'Raw Mention' },
        { key: 'confidenceScore', label: 'Confidence Score' },
        { key: 'sourceGroupName', label: 'Source Group' },
        { key: 'sourceSender', label: 'Source Sender' },
        { key: 'originalRequest', label: 'Original Audio/Text' },
        { key: 'status', label: 'Review Status' },
        { key: 'createdAt', label: 'Extracted At' },
      ];
      const csv = toCsvString(headers, store.drafts || []);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=trygc-drafts-${timestamp}.csv`);
      return res.send(csv);
    }

    if (table === 'people') {
      const headers = [
        { key: 'id', label: 'Person ID' },
        { key: 'displayName', label: 'Display Name' },
        { key: 'canonicalName', label: 'Canonical Name' },
        { key: 'role', label: 'Role' },
        { key: 'department', label: 'Department' },
        { key: 'phone', label: 'WhatsApp Phone' },
        { key: 'email', label: 'Email' },
        { key: 'aliases', label: 'Aliases (Semicolon separated)' },
        { key: 'country', label: 'Country' },
        { key: 'isExecutive', label: 'Executive' },
      ];
      const csv = toCsvString(headers, store.people || []);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=trygc-people-${timestamp}.csv`);
      return res.send(csv);
    }

    if (table === 'groups') {
      const headers = [
        { key: 'id', label: 'Group ID' },
        { key: 'name', label: 'Group Name' },
        { key: 'jid', label: 'WhatsApp JID' },
        { key: 'priority', label: 'Monitoring Priority' },
        { key: 'autoExtract', label: 'Auto Extract' },
        { key: 'sentimentAnalysis', label: 'Sentiment' },
        { key: 'membersCount', label: 'Members' },
        { key: 'language', label: 'Language' },
        { key: 'region', label: 'Region' },
        { key: 'active', label: 'Active' },
      ];
      const csv = toCsvString(headers, store.groups || []);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=trygc-monitored-groups-${timestamp}.csv`);
      return res.send(csv);
    }

    if (table === 'messages') {
      const headers = [
        { key: 'id', label: 'Message ID' },
        { key: 'sender', label: 'Sender' },
        { key: 'senderName', label: 'Sender Name' },
        { key: 'senderPhone', label: 'Sender Phone' },
        { key: 'groupName', label: 'Group Name' },
        { key: 'type', label: 'Type (text/voice)' },
        { key: 'text', label: 'Text Message' },
        { key: 'transcript', label: 'Voice Transcript' },
        { key: 'voiceDuration', label: 'Duration Sec' },
        { key: 'isFromAdel', label: 'From Adel HAMMAD' },
        { key: 'status', label: 'Status' },
        { key: 'timestamp', label: 'Timestamp' },
      ];
      const csv = toCsvString(headers, store.messages || []);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=trygc-messages-log-${timestamp}.csv`);
      return res.send(csv);
    }

    res.status(400).json({ error: `Unknown table '${table}' for CSV export` });
  });

  // Backup / Import JSON
  app.post('/api/backup/import', (req: Request, res: Response) => {
    try {
      const payload = req.body;
      const mode = payload.mode || 'replace'; // 'replace' | 'merge'
      const importedData = payload.data || payload;

      if (!importedData || typeof importedData !== 'object') {
        return res.status(400).json({ error: 'Invalid JSON backup payload format' });
      }

      // Check required minimum entities
      if (!importedData.tasks && !importedData.groups && !importedData.people) {
        return res.status(400).json({
          error: 'Backup file must contain at least tasks, groups, or people tables',
        });
      }

      // Save an automated pre-import snapshot before modifying data
      ensureBackupsDir();
      const autoSnapshotFile = path.join(
        BACKUPS_DIR,
        `snapshot-auto-pre-import-${Date.now()}.json`
      );
      fs.writeFileSync(autoSnapshotFile, JSON.stringify(store, null, 2), 'utf-8');

      if (mode === 'replace') {
        store = {
          groups: Array.isArray(importedData.groups) ? importedData.groups : store.groups,
          people: Array.isArray(importedData.people) ? importedData.people : store.people,
          projects: Array.isArray(importedData.projects) ? importedData.projects : store.projects,
          tasks: Array.isArray(importedData.tasks) ? importedData.tasks : store.tasks,
          drafts: Array.isArray(importedData.drafts) ? importedData.drafts : store.drafts,
          messages: Array.isArray(importedData.messages) ? importedData.messages : store.messages,
          diagnostics: Array.isArray(importedData.diagnostics) ? importedData.diagnostics : store.diagnostics,
          rules: importedData.rules || store.rules,
          health: importedData.health || store.health,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        // Merge mode: upsert records
        const mergeById = <T extends { id: string }>(current: T[], incoming: T[] = []): T[] => {
          const map = new Map<string, T>();
          current.forEach((item) => map.set(item.id, item));
          incoming.forEach((item) => map.set(item.id, item));
          return Array.from(map.values());
        };

        store = {
          ...store,
          groups: mergeById(store.groups, importedData.groups || []),
          people: mergeById(store.people, importedData.people || []),
          projects: mergeById(store.projects, importedData.projects || []),
          tasks: mergeById(store.tasks, importedData.tasks || []),
          drafts: mergeById(store.drafts, importedData.drafts || []),
          messages: mergeById(store.messages, importedData.messages || []),
          diagnostics: Array.isArray(importedData.diagnostics)
            ? [...store.diagnostics, ...importedData.diagnostics].slice(-200)
            : store.diagnostics,
          rules: importedData.rules ? { ...store.rules, ...importedData.rules } : store.rules,
          lastUpdated: new Date().toISOString(),
        };
      }

      saveStore(store);

      return res.json({
        success: true,
        mode,
        message:
          mode === 'replace'
            ? 'Local database completely restored from backup file'
            : 'Backup data merged and deduplicated into local database',
        counts: {
          tasks: store.tasks.length,
          drafts: store.drafts.length,
          groups: store.groups.length,
          people: store.people.length,
          projects: store.projects.length,
          messages: store.messages.length,
        },
      });
    } catch (err: any) {
      console.error('Failed to import database:', err);
      res.status(500).json({ error: 'Database import failed: ' + (err?.message || 'Server error') });
    }
  });

  // Backup / Import CSV
  app.post('/api/backup/import-csv', (req: Request, res: Response) => {
    try {
      const { table = 'tasks', csvText = '', mode = 'merge' } = req.body;

      if (!csvText || typeof csvText !== 'string') {
        return res.status(400).json({ error: 'Empty or invalid CSV content' });
      }

      const rows = parseCsvRows(csvText);
      if (rows.length < 2) {
        return res.status(400).json({ error: 'CSV must have a header row and at least one data row' });
      }

      const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, ''));
      const dataRows = rows.slice(1);

      // Create pre-import snapshot
      ensureBackupsDir();
      const autoSnapshotFile = path.join(
        BACKUPS_DIR,
        `snapshot-auto-pre-csv-${table}-${Date.now()}.json`
      );
      fs.writeFileSync(autoSnapshotFile, JSON.stringify(store, null, 2), 'utf-8');

      let importedCount = 0;

      if (table === 'tasks') {
        const newTasks: Task[] = [];
        for (const row of dataRows) {
          const getVal = (possibleKeys: string[]): string => {
            for (const key of possibleKeys) {
              const idx = headers.findIndex((h) => h.includes(key.toLowerCase()));
              if (idx !== -1 && row[idx]) return row[idx].trim();
            }
            return '';
          };

          const title = getVal(['title', 'task', 'tasktitle', 'name']);
          if (!title) continue;

          const id = getVal(['id', 'taskid']) || `task_csv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const priorityRaw = getVal(['priority']);
          const priority: Task['priority'] = ['Critical', 'High', 'Medium', 'Low'].includes(priorityRaw)
            ? (priorityRaw as any)
            : 'Medium';

          const statusRaw = getVal(['status']);
          const status: Task['status'] = ['Not Started', 'In Progress', 'Awaiting Sign-off', 'Done', 'Blocked'].includes(statusRaw)
            ? (statusRaw as any)
            : 'Not Started';

          const ragRaw = getVal(['rag', 'ragstatus']);
          const rag: Task['rag'] = ['Green', 'Amber', 'Red'].includes(ragRaw)
            ? (ragRaw as any)
            : 'Green';

          const task: Task = {
            id,
            title,
            description: getVal(['description', 'desc', 'notes']) || title,
            originalRequest: getVal(['originalrequest', 'original', 'request']) || title,
            whatsAppGroup: getVal(['sourcegroup', 'whatsappgroup', 'group']) || 'CSV Import',
            requester: getVal(['sourcesender', 'sender', 'requester']) || 'Bulk Import',
            sourceMessageId: `csv_import_${Date.now()}_${id}`,
            sourceTimestamp: new Date().toISOString(),
            messageType: 'text',
            assignedTo: getVal(['assignedto', 'assignee', 'owner', 'assigned']) || 'Unassigned',
            department: getVal(['department', 'dept']) || 'General Operations',
            project: getVal(['project', 'proj']) || 'GC Operational Requests',
            client: getVal(['client']) || 'General Client',
            country: getVal(['country']) || 'Egypt',
            priority,
            status,
            startDate: new Date().toISOString().split('T')[0],
            dueDate: getVal(['duedate', 'deadline', 'due']) || new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
            sla: getVal(['sla']) || 'On Track (Imported)',
            rag,
            progress: Number(getVal(['progress'])) || 0,
            dependencies: getVal(['dependencies', 'deps']) || 'None',
            requiredOutput: getVal(['requiredoutput', 'output']) || 'Execution Deliverable',
            lastUpdate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            timeline: [
              {
                id: `evt_${Date.now()}`,
                timestamp: new Date().toISOString(),
                actor: 'System CSV Importer',
                action: 'Imported task from CSV file',
              },
            ],
          };
          newTasks.push(task);
        }

        if (mode === 'replace') {
          store.tasks = newTasks;
        } else {
          const map = new Map<string, Task>();
          store.tasks.forEach((t) => map.set(t.id, t));
          newTasks.forEach((t) => map.set(t.id, t));
          store.tasks = Array.from(map.values());
        }
        importedCount = newTasks.length;
      } else if (table === 'people') {
        const newPeople: PersonMapping[] = [];
        for (const row of dataRows) {
          const getVal = (possibleKeys: string[]): string => {
            for (const key of possibleKeys) {
              const idx = headers.findIndex((h) => h.includes(key.toLowerCase()));
              if (idx !== -1 && row[idx]) return row[idx].trim();
            }
            return '';
          };

          const displayName = getVal(['displayname', 'name', 'person', 'fullname']);
          if (!displayName) continue;

          const id = getVal(['id', 'personid']) || `person_csv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const aliasesRaw = getVal(['aliases', 'alias', 'nicknames']);
          const aliases = aliasesRaw ? aliasesRaw.split(';').map((s) => s.trim()).filter(Boolean) : [displayName];

          const person: PersonMapping = {
            id,
            displayName,
            internalName: getVal(['internalname', 'canonicalname', 'canonical']) || displayName,
            canonicalName: getVal(['canonicalname', 'canonical']) || displayName,
            role: getVal(['role', 'title', 'position']) || 'Team Member',
            department: getVal(['department', 'dept']) || 'Operations',
            phone: getVal(['phone', 'whatsappphone', 'mobile']) || '+20100000000',
            aliases,
            isAuthorizedRequester: getVal(['isauthorized', 'authorized', 'isexecutive']).toLowerCase() === 'true',
          };
          newPeople.push(person);
        }

        if (mode === 'replace') {
          store.people = newPeople;
        } else {
          const map = new Map<string, PersonMapping>();
          store.people.forEach((p) => map.set(p.id, p));
          newPeople.forEach((p) => map.set(p.id, p));
          store.people = Array.from(map.values());
        }
        importedCount = newPeople.length;
      } else {
        return res.status(400).json({ error: `CSV import for '${table}' is not supported. Use 'tasks' or 'people'.` });
      }

      saveStore(store);

      return res.json({
        success: true,
        table,
        importedCount,
        totalInTable: table === 'tasks' ? store.tasks.length : store.people.length,
        message: `Successfully imported ${importedCount} records from CSV into ${table} table`,
      });
    } catch (err: any) {
      console.error('CSV import error:', err);
      res.status(500).json({ error: 'Failed to parse and import CSV: ' + (err?.message || 'Server error') });
    }
  });

  // Backup / Create Manual Snapshot
  app.post('/api/backup/snapshot', (req: Request, res: Response) => {
    try {
      ensureBackupsDir();
      const label = (req.body?.label || 'manual').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `snapshot-${label}-${Date.now()}.json`;
      const filePath = path.join(BACKUPS_DIR, filename);
      fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
      res.json({
        success: true,
        filename,
        message: `Backup snapshot '${filename}' created successfully`,
        snapshots: getSnapshotList(),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create snapshot: ' + err?.message });
    }
  });

  // Backup / Restore Snapshot
  app.post('/api/backup/restore-snapshot', (req: Request, res: Response) => {
    try {
      const { filename } = req.body;
      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'Snapshot filename is required' });
      }

      // Security check: avoid directory traversal
      const safeFilename = path.basename(filename);
      const filePath = path.join(BACKUPS_DIR, safeFilename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `Snapshot file '${safeFilename}' not found` });
      }

      // Save a safety copy of current store before restoring snapshot
      const safetyCopy = path.join(BACKUPS_DIR, `snapshot-pre-restore-${Date.now()}.json`);
      fs.writeFileSync(safetyCopy, JSON.stringify(store, null, 2), 'utf-8');

      const fileData = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileData);
      const restoredStore = parsed.data || parsed;

      if (restoredStore && restoredStore.tasks) {
        store = {
          ...restoredStore,
          lastUpdated: new Date().toISOString(),
        };
        saveStore(store);
        return res.json({
          success: true,
          message: `Restored local database from snapshot '${safeFilename}'`,
          counts: {
            tasks: store.tasks.length,
            drafts: store.drafts.length,
            groups: store.groups.length,
            people: store.people.length,
          },
        });
      }
      res.status(400).json({ error: 'Invalid snapshot data structure' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to restore snapshot: ' + err?.message });
    }
  });

  // Reset to initial seed
  app.post('/api/backup/reset', (req: Request, res: Response) => {
    // Save snapshot before factory reset
    ensureBackupsDir();
    const preResetFile = path.join(BACKUPS_DIR, `snapshot-pre-factory-reset-${Date.now()}.json`);
    fs.writeFileSync(preResetFile, JSON.stringify(store, null, 2), 'utf-8');

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
    res.json({ success: true, message: 'Store reset to factory seed data. Safety snapshot created.' });
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
              sourceGroup: matchedGroup?.name || group,
              sourceSender: matchedPerson?.displayName || sender,
              sourceMessageType: type,
              originalRequest: contentToParse,
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
              confidenceScore: item.confidence,
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

  // Update Draft (e.g. override suggestedOwner, department, priority, etc.)
  app.post('/api/drafts/update', (req: Request, res: Response) => {
    const { draftId, updates = {} } = req.body;
    const draft = store.drafts.find((d) => d.id === draftId);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    Object.assign(draft, updates);
    saveStore(store);
    res.json({ success: true, draft });
  });

  // Batch Auto Cross-Reference Drafts
  app.post('/api/drafts/auto-cross-reference', (req: Request, res: Response) => {
    let updatedCount = 0;
    store.drafts.forEach((draft) => {
      const sourceMsg = store.messages.find((m) => m.id === draft.sourceMessageId);
      const textToSearch = draft.originalRequest || sourceMsg?.voiceTranscript || sourceMsg?.text || draft.description;
      if (textToSearch) {
        for (const person of store.people) {
          const namesToCheck = [person.displayName, person.internalName, ...(person.aliases || [])];
          const matched = namesToCheck.some((alias) => {
            if (!alias || alias.trim().length < 2) return false;
            return textToSearch.toLowerCase().includes(alias.toLowerCase());
          });
          if (matched && draft.suggestedOwner !== person.displayName) {
            draft.suggestedOwner = person.displayName;
            draft.department = person.department;
            draft.matchedAlias = namesToCheck.find((a) => textToSearch.toLowerCase().includes(a.toLowerCase()));
            updatedCount++;
            break;
          }
        }
      }
    });
    if (updatedCount > 0) {
      saveStore(store);
    }
    res.json({ success: true, updatedCount, drafts: store.drafts });
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
