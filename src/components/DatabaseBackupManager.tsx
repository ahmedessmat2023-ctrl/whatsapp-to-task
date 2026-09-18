/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Table,
  Layers,
  ArrowDownToLine,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface DatabaseStats {
  engine: string;
  databaseFile: string;
  fileSizeBytes: number;
  lastUpdated: string;
  counts: {
    tasks: number;
    drafts: number;
    groups: number;
    people: number;
    projects: number;
    messages: number;
    diagnostics: number;
  };
  snapshots: {
    filename: string;
    sizeBytes: number;
    createdAt: string;
  }[];
}

interface ParsedJsonPreview {
  valid: boolean;
  filename: string;
  sizeKb: number;
  exportedAt?: string;
  recordCounts: {
    tasks: number;
    drafts: number;
    groups: number;
    people: number;
    projects: number;
    messages: number;
  };
  rawJsonData: any;
  error?: string;
}

interface ParsedCsvPreview {
  valid: boolean;
  filename: string;
  table: 'tasks' | 'people';
  headers: string[];
  rowsCount: number;
  sampleRows: string[][];
  csvText: string;
  error?: string;
}

export const DatabaseBackupManager: React.FC = () => {
  const { language, refreshState, resetToSeeds } = useApp();
  const isAr = language === 'ar';

  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Active Tab: 'export' | 'import_json' | 'import_csv' | 'snapshots'
  const [activeTab, setActiveTab] = useState<'export' | 'import_json' | 'import_csv' | 'snapshots'>('export');

  // JSON Export state
  const [jsonExportLoading, setJsonExportLoading] = useState(false);
  const [csvExportLoading, setCsvExportLoading] = useState<string | null>(null);

  // JSON Import state
  const [jsonFilePreview, setJsonFilePreview] = useState<ParsedJsonPreview | null>(null);
  const [jsonImportMode, setJsonImportMode] = useState<'merge' | 'replace'>('merge');
  const [jsonImporting, setJsonImporting] = useState(false);
  const [jsonImportStatus, setJsonImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // CSV Import state
  const [csvTargetTable, setCsvTargetTable] = useState<'tasks' | 'people'>('tasks');
  const [csvImportMode, setCsvImportMode] = useState<'merge' | 'replace'>('merge');
  const [csvFilePreview, setCsvFilePreview] = useState<ParsedCsvPreview | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportStatus, setCsvImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Snapshot state
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [snapshotStatus, setSnapshotStatus] = useState<string | null>(null);
  const [restoringSnapshot, setRestoringSnapshot] = useState<string | null>(null);

  // Reset state
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/backup/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load database stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return isAr ? 'غير محدد' : 'Unknown';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // --- EXPORT HANDLERS ---
  const handleExportJson = async () => {
    setJsonExportLoading(true);
    try {
      const res = await fetch('/api/backup/export');
      if (!res.ok) throw new Error('Export request failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `trygc-sqlite-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      fetchStats();
    } catch (err: any) {
      alert('Failed to export JSON backup: ' + err?.message);
    } finally {
      setJsonExportLoading(false);
    }
  };

  const handleExportCsv = async (table: string) => {
    setCsvExportLoading(table);
    try {
      const res = await fetch(`/api/backup/export-csv?table=${table}`);
      if (!res.ok) throw new Error(`Export CSV for ${table} failed`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `trygc-${table}-${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export CSV: ' + err?.message);
    } finally {
      setCsvExportLoading(null);
    }
  };

  const handleExportAllCsv = async () => {
    const tables = ['tasks', 'drafts', 'people', 'groups', 'messages'];
    for (const tbl of tables) {
      await handleExportCsv(tbl);
    }
  };

  // --- JSON IMPORT HANDLERS ---
  const handleJsonFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const dataObj = parsed.data || parsed;

        const recordCounts = {
          tasks: Array.isArray(dataObj.tasks) ? dataObj.tasks.length : 0,
          drafts: Array.isArray(dataObj.drafts) ? dataObj.drafts.length : 0,
          groups: Array.isArray(dataObj.groups) ? dataObj.groups.length : 0,
          people: Array.isArray(dataObj.people) ? dataObj.people.length : 0,
          projects: Array.isArray(dataObj.projects) ? dataObj.projects.length : 0,
          messages: Array.isArray(dataObj.messages) ? dataObj.messages.length : 0,
        };

        const hasValidTables =
          recordCounts.tasks > 0 || recordCounts.groups > 0 || recordCounts.people > 0;

        if (!hasValidTables) {
          setJsonFilePreview({
            valid: false,
            filename: file.name,
            sizeKb: Math.round(file.size / 1024),
            recordCounts,
            rawJsonData: null,
            error: 'The selected JSON file does not contain valid TryGC tables (tasks, groups, or people).',
          });
          return;
        }

        setJsonFilePreview({
          valid: true,
          filename: file.name,
          sizeKb: Math.round(file.size / 1024),
          exportedAt: parsed.metadata?.exportedAt,
          recordCounts,
          rawJsonData: dataObj,
        });
        setJsonImportStatus(null);
      } catch (err: any) {
        setJsonFilePreview({
          valid: false,
          filename: file.name,
          sizeKb: Math.round(file.size / 1024),
          recordCounts: { tasks: 0, drafts: 0, groups: 0, people: 0, projects: 0, messages: 0 },
          rawJsonData: null,
          error: 'Invalid JSON file syntax: ' + err?.message,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteJsonImport = async () => {
    if (!jsonFilePreview || !jsonFilePreview.valid || !jsonFilePreview.rawJsonData) return;

    if (
      jsonImportMode === 'replace' &&
      !confirm(
        isAr
          ? 'تنبيه: وضع الاستبدال الكامل سيقوم باستبدال قاعدة البيانات الحالية بالكامل بالبيانات المستوردة. هل تريد الاستمرار؟'
          : 'Warning: Full Overwrite mode will replace the current local database with the imported backup. A safety restore point will be created automatically. Proceed?'
      )
    ) {
      return;
    }

    setJsonImporting(true);
    setJsonImportStatus(null);

    try {
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: jsonImportMode,
          data: jsonFilePreview.rawJsonData,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Import failed');

      setJsonImportStatus({
        type: 'success',
        message:
          jsonImportMode === 'replace'
            ? isAr
              ? `تم استعادة قاعدة البيانات بنجاح (${resData.counts?.tasks || 0} مهمة، ${resData.counts?.drafts || 0} مسودة)`
              : `Database successfully restored (${resData.counts?.tasks || 0} tasks, ${resData.counts?.drafts || 0} drafts)`
            : isAr
            ? `تم دمج البيانات وإلغاء التكرار بنجاح (${resData.counts?.tasks || 0} مهمة إجمالية)`
            : `Data merged and deduplicated successfully (${resData.counts?.tasks || 0} total tasks in database)`,
      });

      // Refresh application state and stats
      await refreshState();
      await fetchStats();

      // Clear preview after short delay
      setTimeout(() => {
        setJsonFilePreview(null);
        if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
      }, 3500);
    } catch (err: any) {
      setJsonImportStatus({
        type: 'error',
        message: err?.message || 'Failed to import backup file',
      });
    } finally {
      setJsonImporting(false);
    }
  };

  // --- CSV IMPORT HANDLERS ---
  const parseSimpleCsv = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const splitLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          result.push(cur.trim().replace(/^"|"$/g, ''));
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = splitLine(lines[0]);
    const rows = lines.slice(1).map(splitLine);
    return { headers, rows };
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { headers, rows } = parseSimpleCsv(text);

        if (headers.length === 0 || rows.length === 0) {
          setCsvFilePreview({
            valid: false,
            filename: file.name,
            table: csvTargetTable,
            headers: [],
            rowsCount: 0,
            sampleRows: [],
            csvText: '',
            error: 'CSV file is empty or missing data rows.',
          });
          return;
        }

        setCsvFilePreview({
          valid: true,
          filename: file.name,
          table: csvTargetTable,
          headers,
          rowsCount: rows.length,
          sampleRows: rows.slice(0, 4),
          csvText: text,
        });
        setCsvImportStatus(null);
      } catch (err: any) {
        setCsvFilePreview({
          valid: false,
          filename: file.name,
          table: csvTargetTable,
          headers: [],
          rowsCount: 0,
          sampleRows: [],
          csvText: '',
          error: 'Error parsing CSV: ' + err?.message,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteCsvImport = async () => {
    if (!csvFilePreview || !csvFilePreview.valid || !csvFilePreview.csvText) return;

    setCsvImporting(true);
    setCsvImportStatus(null);

    try {
      const res = await fetch('/api/backup/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: csvTargetTable,
          csvText: csvFilePreview.csvText,
          mode: csvImportMode,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'CSV import failed');

      setCsvImportStatus({
        type: 'success',
        message:
          isAr
            ? `تم استيراد ${resData.importedCount || 0} سجل بنجاح إلى جدول ${csvTargetTable}`
            : `Successfully imported ${resData.importedCount || 0} records into ${csvTargetTable} table (${resData.totalInTable} total in table)`,
      });

      await refreshState();
      await fetchStats();

      setTimeout(() => {
        setCsvFilePreview(null);
        if (csvFileInputRef.current) csvFileInputRef.current.value = '';
      }, 3500);
    } catch (err: any) {
      setCsvImportStatus({
        type: 'error',
        message: err?.message || 'Failed to import CSV records',
      });
    } finally {
      setCsvImporting(false);
    }
  };

  // Sample CSV templates generator
  const downloadSampleTemplate = (type: 'tasks' | 'people') => {
    let content = '';
    let filename = '';

    if (type === 'tasks') {
      filename = 'trygc-sample-tasks-template.csv';
      content =
        '\uFEFF"Title","Description","Assigned To","Department","Priority","Status","Due Date","WhatsApp Group","Source Requester"\r\n' +
        '"Coordinate Riyadh shipment logistics","Ensure customs clearing documents are verified","Amr Nabil","Logistics & Supply Chain","High","In Progress","2026-09-25","GC Leaders","Adel HAMMAD Egy"\r\n' +
        '"Review Q3 Alexandria sales report","Compile revenue metrics from Alexandria hub","Kareem Fahmy","Finance & Auditing","Medium","Not Started","2026-09-28","GC Operations Egypt","Adel HAMMAD Egy"\r\n' +
        '"Audit Cairo warehouse cold storage","Check cooling unit sensor alarms and temperatures","Tarek Osman","Maintenance & Quality","Critical","Not Started","2026-09-22","Executive Directives","Adel HAMMAD Egy"';
    } else {
      filename = 'trygc-sample-people-template.csv';
      content =
        '\uFEFF"Display Name","Canonical Name","Role","Department","WhatsApp Phone","Email","Aliases (Semicolon separated)","Country","Is Executive"\r\n' +
        '"Amr Nabil","Amr Nabil","Head of Logistics","Logistics & Supply Chain","+201011223344","amr.nabil@gc.internal","عمر نبيل;عمرو;Amr Logistics","Egypt","false"\r\n' +
        '"Kareem Fahmy","Kareem Fahmy","Finance Controller","Finance & Auditing","+201022334455","kareem.fahmy@gc.internal","كريم فهمي;كريم مالي;Kareem Finance","Egypt","false"\r\n' +
        '"Tarek Osman","Tarek Osman","Quality Assurance Lead","Maintenance & Quality","+201033445566","tarek.osman@gc.internal","طارق عثمان;الباشمهندس طارق;Tarek QA","Egypt","false"';
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- SNAPSHOT HANDLERS ---
  const handleCreateSnapshot = async () => {
    setCreatingSnapshot(true);
    setSnapshotStatus(null);
    try {
      const res = await fetch('/api/backup/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: snapshotLabel || 'manual' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Snapshot creation failed');

      setSnapshotStatus(`Created: ${data.filename}`);
      setSnapshotLabel('');
      await fetchStats();
      setTimeout(() => setSnapshotStatus(null), 3000);
    } catch (err: any) {
      alert('Error creating snapshot: ' + err?.message);
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (filename: string) => {
    if (
      !confirm(
        isAr
          ? `هل أنت متأكد من استعادة النسخة الاحتياطية "${filename}"؟ سيتم حفظ نسخة احتياطية للحالة الحالية أولاً.`
          : `Are you sure you want to restore snapshot "${filename}"? A safety snapshot will be created automatically before restoring.`
      )
    ) {
      return;
    }

    setRestoringSnapshot(filename);
    try {
      const res = await fetch('/api/backup/restore-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');

      alert(
        isAr
          ? `تمت استعادة قاعدة البيانات بنجاح من النسخة "${filename}"`
          : `Database successfully restored from snapshot "${filename}"`
      );

      await refreshState();
      await fetchStats();
    } catch (err: any) {
      alert('Failed to restore snapshot: ' + err?.message);
    } finally {
      setRestoringSnapshot(null);
    }
  };

  // --- FACTORY RESET ---
  const handleFactoryReset = async () => {
    if (
      confirm(
        isAr
          ? 'تحذير: هل أنت متأكد من إعادة ضبط قاعدة البيانات إلى الحالة التجريبية الأولى؟ سيتم حفظ نسخة احتياطية من الحالة الحالية تلقائياً.'
          : 'Warning: Are you sure you want to reset all tasks, drafts, and records to the clean factory demo state? A safety snapshot will be saved automatically.'
      )
    ) {
      setResetting(true);
      try {
        await resetToSeeds();
        setResetSuccess(true);
        await fetchStats();
        setTimeout(() => setResetSuccess(false), 3500);
      } catch (err: any) {
        alert('Reset failed: ' + err?.message);
      } finally {
        setResetting(false);
      }
    }
  };

  return (
    <div
      id="section-database-backup"
      className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5 transition-colors"
    >
      {/* Header & Live Storage Statistics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'قاعدة البيانات المحلية والنسخ الاحتياطي' : 'Local SQLite & Data Portability Hub'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {isAr ? 'محلي آمن' : 'Local-First Active'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'تصدير واستيراد كامل لقاعدة البيانات بصيغتي JSON و CSV مع حفظ النسخ السريعة وسلامة البيانات'
                  : 'Full database backups to JSON and CSV formats for complete data portability, safety snapshots & restore.'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchStats}
          disabled={statsLoading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
          title="Refresh database metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>{isAr ? 'تحديث الإحصائيات' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* Database Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-indigo-500" />
            {isAr ? 'حجم القاعدة' : 'Database Size'}
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white">
            {stats ? formatBytes(stats.fileSizeBytes) : '...'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {stats?.engine || 'Local-First Store'}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            {isAr ? 'المهام' : 'Tasks'}
          </div>
          <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
            {stats?.counts.tasks ?? '...'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">{isAr ? 'مهمة مسجلة' : 'tasks in tracker'}</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            {isAr ? 'المسودات' : 'Review Drafts'}
          </div>
          <div className="text-base font-black text-amber-600 dark:text-amber-400">
            {stats?.counts.drafts ?? '...'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">{isAr ? 'بانتظار الاعتماد' : 'in review inbox'}</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            {isAr ? 'المجموعات' : 'WhatsApp Chats'}
          </div>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
            {stats?.counts.groups ?? '...'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">{isAr ? 'مجموعة مراقبة' : 'monitored groups'}</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            {isAr ? 'الأشخاص والأسماء' : 'People & Aliases'}
          </div>
          <div className="text-base font-black text-purple-600 dark:text-purple-400">
            {stats?.counts.people ?? '...'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">{isAr ? 'شخص ومطابقة' : 'team members'}</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            {isAr ? 'رسائل مرصودة' : 'Messages Log'}
          </div>
          <div className="text-base font-black text-slate-800 dark:text-slate-200">
            {stats?.counts.messages ?? '...'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">{isAr ? 'سجل محادثات' : 'captured items'}</div>
        </div>
      </div>

      {/* Navigation Pills between Backup Operations */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'export'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isAr ? 'تصدير البيانات (JSON / CSV)' : 'Export Data (JSON & CSV)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('import_json')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'import_json'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileJson className="w-3.5 h-3.5" />
          <span>{isAr ? 'استعادة قاعدة البيانات (JSON)' : 'Restore Database (JSON)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('import_csv')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'import_csv'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>{isAr ? 'استيراد جماعي (CSV)' : 'Import Bulk Records (CSV)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('snapshots')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'snapshots'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>
            {isAr ? 'نقاط الاسترجاع السريعة' : 'Snapshots'} ({stats?.snapshots?.length || 0})
          </span>
        </button>
      </div>

      {/* --- TAB 1: EXPORT (JSON & CSV) --- */}
      {activeTab === 'export' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* JSON Full Database Backup Card */}
            <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/40 dark:from-indigo-950/20 dark:via-slate-900 dark:to-purple-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {isAr ? 'النسخة الاحتياطية الكاملة (JSON)' : 'Full Database Backup (JSON)'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isAr ? 'يشمل جميع الجداول، القواعد، التشخيصات والإعدادات' : 'Complete schema, all entities & configuration'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                  .JSON
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {isAr
                  ? 'يقوم بتصدير نسخة متكاملة ومطابقة لقاعدة البيانات الحالية، متوافقة للاسترجاع الفوري على أي جهاز آخر أو للاحتفاظ بنسخة أمان خارجية.'
                  : 'Produces a portable snapshot of all tasks, drafts, groups, people mappings, automation rules, and live diagnostics with full relational integrity.'}
              </p>

              <button
                id="btn-export-json-backup"
                onClick={handleExportJson}
                disabled={jsonExportLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all"
              >
                <ArrowDownToLine className={`w-4 h-4 ${jsonExportLoading ? 'animate-bounce' : ''}`} />
                <span>{jsonExportLoading ? (isAr ? 'جاري التحميل...' : 'Generating Backup...') : isAr ? 'تصدير نسخة JSON كاملة' : 'Export Full JSON Backup'}</span>
              </button>
            </div>

            {/* CSV Quick Export Card */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {isAr ? 'تصدير الجداول إلى CSV (Excel / Sheets)' : 'Table Exports to CSV (Excel & Sheets)'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isAr ? 'ترميز UTF-8 مع BOM لدعم كامل للغة العربية' : 'UTF-8 with BOM for crisp Arabic & English rendering'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold">
                  .CSV
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {isAr
                  ? 'تصدير أي جدول منفصل إلى ملف CSV مخصص مع كافة الأعمدة والتفاصيل متوافق بنسبة 100% مع برامج المحاسبة والإدارة.'
                  : 'Export individual relational tables directly into formatted CSV files ready for spreadsheet reporting, executive reviews, and external BI tools.'}
              </p>

              <button
                id="btn-export-all-csv"
                onClick={handleExportAllCsv}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-xs transition-all"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isAr ? 'تصدير كافة الجداول (حزمة CSV)' : 'Export All Tables to CSV Files'}</span>
              </button>
            </div>
          </div>

          {/* Granular CSV Table Buttons */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isAr ? 'اختر الجدول المطلوب تصديره إلى ملف CSV:' : 'Select Individual Table to Export to CSV:'}</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[
                { key: 'tasks', label: isAr ? 'المهام النشطة' : 'Active Tasks', count: stats?.counts.tasks, desc: '20 columns' },
                { key: 'drafts', label: isAr ? 'صندوق المراجعة' : 'Review Drafts', count: stats?.counts.drafts, desc: '18 columns' },
                { key: 'people', label: isAr ? 'فريق العمل والأسماء' : 'People & Aliases', count: stats?.counts.people, desc: '10 columns' },
                { key: 'groups', label: isAr ? 'المجموعات المراقبة' : 'WhatsApp Groups', count: stats?.counts.groups, desc: '10 columns' },
                { key: 'messages', label: isAr ? 'سجل المحادثات' : 'Messages Log', count: stats?.counts.messages, desc: '12 columns' },
              ].map((tbl) => (
                <button
                  key={tbl.key}
                  id={`btn-export-csv-${tbl.key}`}
                  onClick={() => handleExportCsv(tbl.key)}
                  disabled={csvExportLoading === tbl.key}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {tbl.label}
                    </span>
                    <Download className={`w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 ${csvExportLoading === tbl.key ? 'animate-bounce' : ''}`} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-bold">{tbl.count ?? 0} rows</span>
                    <span className="font-medium">{tbl.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: RESTORE DATABASE (JSON) --- */}
      {activeTab === 'import_json' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>{isAr ? 'استيراد واستعادة ملف النسخة الاحتياطية (JSON)' : 'Import & Restore Local Database from Backup (JSON)'}</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'اختر ملف النسخة الاحتياطية من جهازك لمعاينته والتحقق من صحته قبل اعتماده.'
                  : 'Select a previously exported TryGC backup JSON file to inspect and restore.'}
              </p>
            </div>

            {/* File Dropzone */}
            <div
              onClick={() => jsonFileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white dark:bg-slate-900/60"
            >
              <input
                ref={jsonFileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleJsonFileSelect}
                className="hidden"
                id="input-file-backup-json"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <FileJson className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {isAr ? 'انقر هنا لاختيار ملف JSON أو اسحبه هنا' : 'Click to select TryGC backup JSON file or drag and drop'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isAr ? 'يدعم ملفات .json الصادرة من نظام TryGC' : 'Supports standard TryGC backup files (.json)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Box */}
            {jsonFilePreview && (
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  jsonFilePreview.valid
                    ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-red-200 dark:border-red-800/60 bg-red-50/40 dark:bg-red-950/20'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {jsonFilePreview.valid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {jsonFilePreview.filename} ({jsonFilePreview.sizeKb} KB)
                      </span>
                      {jsonFilePreview.exportedAt && (
                        <p className="text-[10px] text-slate-500">
                          {isAr ? 'تاريخ التصدير الأصلي:' : 'Exported on:'} {formatDate(jsonFilePreview.exportedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      jsonFilePreview.valid
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200'
                    }`}
                  >
                    {jsonFilePreview.valid ? (isAr ? 'ملف سليم ومعتمد' : 'Valid Schema') : isAr ? 'ملف غير مطابق' : 'Invalid Schema'}
                  </span>
                </div>

                {jsonFilePreview.error ? (
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{jsonFilePreview.error}</p>
                ) : (
                  <div className="space-y-4">
                    {/* Discovered Records Pills */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-2">
                        {isAr ? 'السجلات المكتشفة بالملف للمزامنة:' : 'Discovered Records Ready for Restoration:'}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">{isAr ? 'مهام' : 'Tasks'}</span>
                          <span className="font-extrabold text-indigo-600">{jsonFilePreview.recordCounts.tasks}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">{isAr ? 'مسودات' : 'Drafts'}</span>
                          <span className="font-extrabold text-amber-600">{jsonFilePreview.recordCounts.drafts}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">{isAr ? 'مجموعات' : 'Groups'}</span>
                          <span className="font-extrabold text-emerald-600">{jsonFilePreview.recordCounts.groups}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">{isAr ? 'فريق' : 'People'}</span>
                          <span className="font-extrabold text-purple-600">{jsonFilePreview.recordCounts.people}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">{isAr ? 'مشاريع' : 'Projects'}</span>
                          <span className="font-extrabold text-slate-700 dark:text-slate-300">{jsonFilePreview.recordCounts.projects}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">{isAr ? 'رسائل' : 'Messages'}</span>
                          <span className="font-extrabold text-slate-700 dark:text-slate-300">{jsonFilePreview.recordCounts.messages}</span>
                        </div>
                      </div>
                    </div>

                    {/* Mode Selection */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        {isAr ? 'اختر طريقة الاستيراد والتطبيق:' : 'Select Restoration Mode:'}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <label
                          className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                            jsonImportMode === 'merge'
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="jsonImportMode"
                            checked={jsonImportMode === 'merge'}
                            onChange={() => setJsonImportMode('merge')}
                            className="mt-1 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                              {isAr ? 'الدمج الذكي وإلغاء التكرار (موصى به)' : 'Merge & Deduplicate (Recommended)'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                              {isAr
                                ? 'يحافظ على البيانات الحالية ويقوم بإضافة أو تحديث السجلات الجديدة دون حذف أي عمل قائم.'
                                : 'Preserves existing records. Updates existing tasks/people by ID and appends newly found entries.'}
                            </span>
                          </div>
                        </label>

                        <label
                          className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                            jsonImportMode === 'replace'
                              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="jsonImportMode"
                            checked={jsonImportMode === 'replace'}
                            onChange={() => setJsonImportMode('replace')}
                            className="mt-1 text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                              {isAr ? 'استبدال كامل لقاعدة البيانات' : 'Clean Full Overwrite / Exact Restore'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                              {isAr
                                ? 'يستبدل قاعدة البيانات بالكامل بما يحتويه الملف. يتم حفظ نقطة استرجاع تلقائية قبل البدء.'
                                : 'Replaces the current state with this backup. An automated safety snapshot is saved beforehand.'}
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Commit Button */}
                    <button
                      id="btn-execute-json-import"
                      onClick={handleExecuteJsonImport}
                      disabled={jsonImporting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all"
                    >
                      <RotateCcw className={`w-4 h-4 ${jsonImporting ? 'animate-spin' : ''}`} />
                      <span>
                        {jsonImporting
                          ? isAr
                            ? 'جاري الاستيراد والتحديث...'
                            : 'Applying Restoration...'
                          : isAr
                          ? 'تنفيذ الاستعادة وتحديث قاعدة البيانات'
                          : 'Execute Database Restoration'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Status Alert */}
            {jsonImportStatus && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                  jsonImportStatus.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
                }`}
              >
                {jsonImportStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span>{jsonImportStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: CSV DIRECT BULK IMPORT --- */}
      {activeTab === 'import_csv' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'استيراد سجلات من ملف CSV مباشر' : 'Bulk Import Records from CSV File'}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr
                    ? 'استيراد قائمة مهام أو قائمة موظفين من ملف إكسل بصيغة CSV مع معاينة مسبقة'
                    : 'Import tasks or people mappings from spreadsheet CSV with column auto-matching & live preview.'}
                </p>
              </div>

              {/* Download Sample Template Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadSampleTemplate('tasks')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                  title="Download Tasks CSV Template"
                >
                  <Download className="w-3 h-3 text-indigo-500" />
                  <span>{isAr ? 'نموذج المهام' : 'Tasks Template'}</span>
                </button>
                <button
                  onClick={() => downloadSampleTemplate('people')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                  title="Download People CSV Template"
                >
                  <Download className="w-3 h-3 text-purple-500" />
                  <span>{isAr ? 'نموذج الأسماء' : 'People Template'}</span>
                </button>
              </div>
            </div>

            {/* Target Table Selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'جدول الوجهة المطلوب الاستيراد إليه:' : 'Target Database Table:'}
              </span>
              <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-900 text-xs font-bold">
                <button
                  onClick={() => {
                    setCsvTargetTable('tasks');
                    setCsvFilePreview(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    csvTargetTable === 'tasks'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'جدول المهام (Tasks)' : 'Tasks Table'}
                </button>
                <button
                  onClick={() => {
                    setCsvTargetTable('people');
                    setCsvFilePreview(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    csvTargetTable === 'people'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'جدول فريق العمل (People & Aliases)' : 'People & Aliases Table'}
                </button>
              </div>
            </div>

            {/* CSV File Input */}
            <div
              onClick={() => csvFileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white dark:bg-slate-900/60"
            >
              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileSelect}
                className="hidden"
                id="input-file-backup-csv"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {isAr ? 'انقر هنا لاختيار ملف CSV أو اسحبه هنا' : 'Click to select CSV file or drag and drop'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isAr
                      ? `استيراد بيانات إلى جدول ${csvTargetTable === 'tasks' ? 'المهام' : 'فريق العمل والأسماء'}`
                      : `Targeting: ${csvTargetTable === 'tasks' ? 'Tasks table' : 'People & Aliases table'}`}
                  </p>
                </div>
              </div>
            </div>

            {/* CSV Preview */}
            {csvFilePreview && (
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  csvFilePreview.valid
                    ? 'border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-slate-900'
                    : 'border-red-200 dark:border-red-800/60 bg-red-50/40 dark:bg-red-950/20'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {csvFilePreview.filename}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {isAr ? 'تم رصد' : 'Detected:'} {csvFilePreview.rowsCount}{' '}
                        {isAr ? 'صفوف و' : 'rows and'} {csvFilePreview.headers.length}{' '}
                        {isAr ? 'أعمدة' : 'columns'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                    {isAr ? 'جاهز للاستيراد' : 'Ready to Parse'}
                  </span>
                </div>

                {/* Table Preview */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 mb-4 max-h-48">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                      <tr>
                        {csvFilePreview.headers.map((h, i) => (
                          <th key={i} className="p-2 border-b border-slate-200 dark:border-slate-700 truncate">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      {csvFilePreview.sampleRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          {row.map((col, cIdx) => (
                            <td key={cIdx} className="p-2 truncate max-w-[180px]">
                              {col}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Import Mode Selection */}
                <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="csvImportMode"
                        checked={csvImportMode === 'merge'}
                        onChange={() => setCsvImportMode('merge')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{isAr ? 'دمج مع السجلات الحالية' : 'Merge with existing records'}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="csvImportMode"
                        checked={csvImportMode === 'replace'}
                        onChange={() => setCsvImportMode('replace')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>{isAr ? 'استبدال الجدول بالكامل' : 'Replace table content'}</span>
                    </label>
                  </div>

                  <button
                    id="btn-execute-csv-import"
                    onClick={handleExecuteCsvImport}
                    disabled={csvImporting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <Upload className={`w-3.5 h-3.5 ${csvImporting ? 'animate-bounce' : ''}`} />
                    <span>
                      {csvImporting
                        ? isAr
                          ? 'جاري الاستيراد...'
                          : 'Importing CSV...'
                        : isAr
                        ? `استيراد ${csvFilePreview.rowsCount} سجل`
                        : `Import ${csvFilePreview.rowsCount} Records`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* CSV Status Alert */}
            {csvImportStatus && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                  csvImportStatus.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
                }`}
              >
                {csvImportStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span>{csvImportStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 4: SNAPSHOTS & POINT-IN-TIME RECOVERY --- */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>{isAr ? 'النسخ السريعة ونقاط الاسترجاع الزمنية' : 'Local Snapshots & Instant Recovery Points'}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr
                    ? 'حفظ لقطة فورية من قاعدة البيانات على الخادم للاسترجاع الفوري عند الحاجة'
                    : 'Create immediate local checkpoints on server storage before critical modifications.'}
                </p>
              </div>

              {/* New Snapshot Form */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={isAr ? 'اسم لقطة النسخ (اختياري)...' : 'Snapshot tag (e.g. pre-review)...'}
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  className="font-medium text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 w-48"
                />
                <button
                  onClick={handleCreateSnapshot}
                  disabled={creatingSnapshot}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{creatingSnapshot ? (isAr ? 'جاري الحفظ...' : 'Saving...') : isAr ? 'إنشاء نقطة استرجاع' : 'Take Snapshot'}</span>
                </button>
              </div>
            </div>

            {snapshotStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{snapshotStatus}</span>
              </div>
            )}

            {/* Snapshots List Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {stats?.snapshots && stats.snapshots.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.snapshots.map((snap) => (
                    <div
                      key={snap.filename}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex-shrink-0">
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                            {snap.filename}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatDate(snap.createdAt)} • {formatBytes(snap.sizeBytes)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleRestoreSnapshot(snap.filename)}
                          disabled={restoringSnapshot === snap.filename}
                          className="px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${restoringSnapshot === snap.filename ? 'animate-spin' : ''}`} />
                          <span>{restoringSnapshot === snap.filename ? (isAr ? 'جاري الاستعادة...' : 'Restoring...') : isAr ? 'استرجاع هذه النقطة' : 'Restore'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Database className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p>{isAr ? 'لا توجد نقاط استرجاع مسجلة بعد. أنشئ نقطة أولى الآن.' : 'No snapshots saved yet. Create a checkpoint above.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Safety Factory Reset Safeguard */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs">
          <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
            {isAr ? 'إعادة التعيين للحالة التجريبية الافتراضية' : 'Factory Seed Demo Reset'}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {isAr
              ? 'يقوم بإعادة ملء البيانات الأولية المعتمدة لعادل حماد (مع حفظ نسخة أمان تلقائياً)'
              : 'Resets to canonical Adel HAMMAD directives and group seed data. An automated safety backup is saved before reset.'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {resetSuccess && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {isAr ? 'تمت إعادة الضبط بنجاح' : 'Reset Complete!'}
            </span>
          )}
          <button
            id="btn-factory-reset"
            onClick={handleFactoryReset}
            disabled={resetting}
            className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? (isAr ? 'جاري الضبط...' : 'Resetting...') : isAr ? 'إعادة ضبط البيانات الأولية' : 'Reset to Initial Seed Demo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
