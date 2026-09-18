/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AppNotification,
  AutomationRulesConfig,
  CaptureDiagnosticEvent,
  ConnectorHealth,
  ExtractedTaskDraft,
  MonitoredGroup,
  PersonMapping,
  ProjectItem,
  Task,
  UserAuthSession,
  WhatsAppMessage,
} from '../types';

interface AppContextType {
  // Navigation & UI
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  showSimulator: boolean;
  setShowSimulator: (show: boolean) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Data Store
  groups: MonitoredGroup[];
  people: PersonMapping[];
  projects: ProjectItem[];
  tasks: Task[];
  drafts: ExtractedTaskDraft[];
  messages: WhatsAppMessage[];
  diagnostics: CaptureDiagnosticEvent[];
  rules: AutomationRulesConfig;
  health: ConnectorHealth;
  notifications: AppNotification[];
  user: UserAuthSession;
  setUser: (user: UserAuthSession) => void;

  // Actions
  isLoading: boolean;
  refreshState: () => Promise<void>;
  approveDraft: (draftId: string, overrides?: Partial<Task>) => Promise<void>;
  approveAllDrafts: () => Promise<void>;
  ignoreDraft: (draftId: string, reason?: string) => Promise<void>;
  splitDraft: (draftId: string, splits: any[]) => Promise<void>;
  updateTaskStatus: (taskId: string, status: any, note?: string) => Promise<void>;
  createTaskManual: (taskData: Partial<Task>) => Promise<void>;
  toggleGroupActive: (groupId: string) => Promise<void>;
  addGroup: (group: Partial<MonitoredGroup>) => Promise<void>;
  addPerson: (person: Partial<PersonMapping>) => Promise<void>;
  updateRules: (rules: Partial<AutomationRulesConfig>) => Promise<void>;
  sendSimulatedMessage: (payload: {
    sender: string;
    group: string;
    type: 'text' | 'voice';
    text?: string;
    voiceDuration?: number;
    audioBase64?: string;
    rawMetadata?: any;
  }) => Promise<any>;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  resetToSeeds: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [groups, setGroups] = useState<MonitoredGroup[]>([]);
  const [people, setPeople] = useState<PersonMapping[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drafts, setDrafts] = useState<ExtractedTaskDraft[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [diagnostics, setDiagnostics] = useState<CaptureDiagnosticEvent[]>([]);
  const [rules, setRules] = useState<AutomationRulesConfig>({
    autoCreateThreshold: 90,
    needsReviewThreshold: 70,
    primaryRequesterOnly: true,
    primaryRequesterName: 'Adel HAMMAD Egy',
    autoSuggestDoneOnCompletion: true,
    autoLinkFollowUps: true,
    deleteAudioAfterDays: 7,
    retainTranscripts: true,
    defaultSlaHours: { Critical: 4, High: 24, Medium: 48, Low: 72 },
  });
  const [health, setHealth] = useState<ConnectorHealth>({
    status: 'healthy',
    lastScan: 'Just now',
    lastObservedMessage: 'Just now',
    lastSuccessfulHandoff: '10 mins ago',
    messageMetadataCount: 0,
    currentWhatsAppGroup: 'GC Leaders',
    voiceCaptureHealth: 'operational',
    transcriptionServerHealth: 'operational',
    attentionRequired: false,
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif_1',
      title: 'WhatsApp Bridge Operational',
      message: 'Active monitoring on 13 groups for Adel HAMMAD Egy.',
      type: 'system',
      timestamp: '2 mins ago',
      read: false,
    },
    {
      id: 'notif_2',
      title: 'Voice Request Awaiting Review',
      message: 'New request from Adel in GC Leaders requires sign-off.',
      type: 'review_needed',
      timestamp: '15 mins ago',
      read: false,
      linkTab: 'inbox',
    },
  ]);

  const [user, setUser] = useState<UserAuthSession>({
    username: 'ahmed.lalatoo',
    role: 'admin',
  });

  // Fetch state from server
  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        setPeople(data.people || []);
        setProjects(data.projects || []);
        setTasks(data.tasks || []);
        setDrafts(data.drafts || []);
        setMessages(data.messages || []);
        setDiagnostics(data.diagnostics || []);
        if (data.rules) setRules(data.rules);
        if (data.health) setHealth(data.health);
      }
    } catch (err) {
      console.error('Failed to load state from backend:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
    // Periodic poll every 8 seconds for live capture updates
    const interval = setInterval(refreshState, 8000);
    return () => clearInterval(interval);
  }, [refreshState]);

  // Actions
  const approveDraft = async (draftId: string, overrides?: Partial<Task>) => {
    try {
      const res = await fetch('/api/drafts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, overrides }),
      });
      if (res.ok) {
        await refreshState();
        setNotifications((prev) => [
          {
            id: `notif_${Date.now()}`,
            title: 'Task Created from Review Inbox',
            message: 'Draft successfully converted to active task in Task Tracker.',
            type: 'task_created',
            timestamp: 'Just now',
            read: false,
            linkTab: 'tasks',
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error('Error approving draft:', err);
    }
  };

  const approveAllDrafts = async () => {
    try {
      const res = await fetch('/api/drafts/approve-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await refreshState();
        setNotifications((prev) => [
          {
            id: `notif_${Date.now()}`,
            title: 'Batch Approval Complete',
            message: 'All pending inbox requests converted into tasks.',
            type: 'task_created',
            timestamp: 'Just now',
            read: false,
            linkTab: 'tasks',
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error('Error approving all drafts:', err);
    }
  };

  const ignoreDraft = async (draftId: string, reason?: string) => {
    try {
      const res = await fetch('/api/drafts/ignore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, reason }),
      });
      if (res.ok) {
        await refreshState();
      }
    } catch (err) {
      console.error('Error ignoring draft:', err);
    }
  };

  const splitDraft = async (draftId: string, splits: any[]) => {
    try {
      const res = await fetch('/api/drafts/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, splits }),
      });
      if (res.ok) {
        await refreshState();
      }
    } catch (err) {
      console.error('Error splitting draft:', err);
    }
  };

  const updateTaskStatus = async (taskId: string, status: any, note?: string) => {
    try {
      const res = await fetch('/api/tasks/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status, note, actor: user.username }),
      });
      if (res.ok) {
        await refreshState();
      }
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  const createTaskManual = async (taskData: Partial<Task>) => {
    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        await refreshState();
      }
    } catch (err) {
      console.error('Error creating manual task:', err);
    }
  };

  const toggleGroupActive = async (groupId: string) => {
    try {
      const res = await fetch('/api/groups/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) {
        await refreshState();
      }
    } catch (err) {
      console.error('Error toggling group:', err);
    }
  };

  const addGroup = async (group: Partial<MonitoredGroup>) => {
    try {
      const res = await fetch('/api/groups/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group),
      });
      if (res.ok) {
        await refreshState();
      }
    } catch (err) {
      console.error('Error adding group:', err);
    }
  };

  const addPerson = async (person: Partial<PersonMapping>) => {
    try {
      const res = await fetch('/api/people/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(person),
      });
      if (res.ok) {
        await refreshState();
      }
    } catch (err) {
      console.error('Error adding person:', err);
    }
  };

  const updateRules = async (newRules: Partial<AutomationRulesConfig>) => {
    try {
      const res = await fetch('/api/rules/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRules),
      });
      if (res.ok) {
        await refreshState();
      }
    } catch (err) {
      console.error('Error updating rules:', err);
    }
  };

  const sendSimulatedMessage = async (payload: {
    sender: string;
    group: string;
    type: 'text' | 'voice';
    text?: string;
    voiceDuration?: number;
    audioBase64?: string;
    rawMetadata?: any;
  }) => {
    try {
      const res = await fetch('/api/capture/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      await refreshState();

      if (data.ruleMatch) {
        setNotifications((prev) => [
          {
            id: `notif_${Date.now()}`,
            title: `Captured ${payload.type === 'voice' ? 'Voice Note' : 'Request'} from ${payload.sender}`,
            message: `Group: ${payload.group} - Processed into ${data.autoCreatedTasks?.length ? 'Task Tracker' : 'Review Inbox'}.`,
            type: 'review_needed',
            timestamp: 'Just now',
            read: false,
            linkTab: data.autoCreatedTasks?.length ? 'tasks' : 'inbox',
          },
          ...prev,
        ]);
      }

      return data;
    } catch (err) {
      console.error('Error sending simulated message:', err);
      throw err;
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const resetToSeeds = async () => {
    try {
      const res = await fetch('/api/backup/reset', { method: 'POST' });
      if (res.ok) {
        await refreshState();
      }
    } catch (err) {
      console.error('Error resetting seeds:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        language,
        setLanguage,
        isDarkMode,
        setIsDarkMode,
        showSimulator,
        setShowSimulator,
        selectedTaskId,
        setSelectedTaskId,
        groups,
        people,
        projects,
        tasks,
        drafts,
        messages,
        diagnostics,
        rules,
        health,
        notifications,
        user,
        setUser,
        isLoading,
        refreshState,
        approveDraft,
        approveAllDrafts,
        ignoreDraft,
        splitDraft,
        updateTaskStatus,
        createTaskManual,
        toggleGroupActive,
        addGroup,
        addPerson,
        updateRules,
        sendSimulatedMessage,
        markNotificationRead,
        clearAllNotifications,
        resetToSeeds,
      }}
    >
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}>
        {children}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
