/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MessageType = 'text' | 'voice' | 'image_note' | 'document';

export type TranscriptionStatus = 'none' | 'pending' | 'completed' | 'failed';

export interface WhatsAppMessage {
  id: string;
  timestamp: string;
  group: string;
  sender: string;
  type: MessageType;
  text?: string;
  voiceDuration?: number; // in seconds
  audioBase64?: string;
  audioUrl?: string;
  voiceTranscript?: string;
  transcript?: string; // alias for voiceTranscript
  transcriptionStatus: TranscriptionStatus;
  transcriptionError?: string;
  rawMetadata?: {
    prePlainText?: string;
    senderData?: string;
    msgId?: string;
    ariaLabel?: string;
    domTag?: string;
    hasPttControl?: boolean;
    durationText?: string;
    quotedMessage?: string;
  };
  matchedRule: boolean;
  matchReason?: string;
  enteredReview: boolean;
  taskCreated: boolean;
  failureReason?: string;
}

export interface MonitoredGroup {
  id: string;
  name: string;
  normalizedName?: string;
  active: boolean;
  lastActivity?: string;
  messageCount?: number;
  description?: string;
  color?: string;
  departmentTag?: string;
  department?: string;
  country?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  aliases?: string[];
}

export interface PersonMapping {
  id: string;
  displayName: string; // e.g. "Adel HAMMAD Egy"
  internalName: string; // e.g. "Adel Hammad"
  canonicalName?: string;
  role: string;
  department: string;
  phone?: string;
  aliases: string[];
  isAuthorizedRequester?: boolean;
  isPrimaryRequester?: boolean;
  avatar?: string;
}

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export type TaskStatus =
  | 'New'
  | 'Assigned'
  | 'In Progress'
  | 'Waiting'
  | 'Blocked'
  | 'Under Review'
  | 'Done'
  | 'Cancelled';

export interface ExtractedTaskDraft {
  id: string;
  sourceMessageId: string;
  sourceGroupId?: string;
  sourceGroupName: string;
  sourceGroup?: string;
  sourceSender?: string;
  sourceMessageType?: MessageType;
  timestamp?: string;
  requester: string;
  title: string;
  description: string;
  originalRequest?: string;
  suggestedOwner: string;
  department: string;
  project: string;
  client: string;
  country: string;
  priority: Priority;
  rawDeadlinePhrase?: string;
  deadline: string;
  confidence?: number; // 0 - 100
  confidenceScore?: number; // alias for confidence
  confidenceLevel?: 'high' | 'medium' | 'low';
  autoCreated?: boolean;
  dependencies?: string;
  dependency?: string;
  requiredOutput?: string;
  possibleDuplicateOf?: string;
  isFollowUp?: boolean;
  followUpTaskId?: string;
  isCompletionSignal?: boolean;
  completionTaskId?: string;
  status: 'pending_review' | 'approved' | 'ignored' | 'merged' | 'split';
  createdAt: string;
  clarificationNote?: string;
  matchedAlias?: string;
  suggestedAssigneeReason?: string;
}

export interface TaskTimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details?: string;
}

export interface Task {
  id: string; // e.g. "GC-101"
  title: string;
  description: string;
  originalRequest: string;
  whatsAppGroup: string;
  requester: string;
  sourceMessageId: string;
  sourceTimestamp: string;
  messageType: MessageType;
  voiceTranscript?: string;
  assignedTo: string;
  department: string;
  project: string;
  client: string;
  country: string;
  priority: Priority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  sla: string;
  rag: 'Red' | 'Amber' | 'Green';
  progress: number; // 0-100
  blocker?: string;
  dependency?: string;
  dependencies?: string; // alias
  sourceMessageType?: MessageType; // alias
  requiredOutput: string;
  lastUpdate: string;
  createdAt: string;
  completedAt?: string;
  timeline: TaskTimelineEvent[];
}

export interface CaptureDiagnosticEvent {
  id: string;
  timestamp: string;
  whatsappGroup: string;
  group?: string; // alias for whatsappGroup
  sender: string;
  rawMetadata: Record<string, any>;
  messageId: string;
  text: string;
  rawSnippet?: string; // alias for text
  messageType?: MessageType;
  voiceDetected: boolean;
  audioCaptured: boolean;
  transcriptionStatus: 'completed' | 'failed' | 'pending' | 'n/a' | 'none';
  ruleMatch: boolean;
  handoffStatus: 'sent_to_review' | 'auto_created' | 'ignored' | 'error';
  taskCreated: boolean;
  errorReason?: string;
  reason?: string; // alias for errorReason
}

export interface AutomationRulesConfig {
  autoCreateThreshold: number; // e.g. 90
  needsReviewThreshold: number; // e.g. 70
  primaryRequesterOnly: boolean; // default true
  primaryRequesterName: string; // "Adel HAMMAD Egy"
  autoSuggestDoneOnCompletion: boolean;
  autoLinkFollowUps: boolean;
  deleteAudioAfterDays: number; // 0 = keep forever
  retainTranscripts: boolean;
  defaultSlaHours: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
}

export interface ConnectorHealth {
  status: 'healthy' | 'warning' | 'error';
  lastScan: string;
  lastObservedMessage: string;
  lastSuccessfulHandoff: string;
  messageMetadataCount: number;
  currentWhatsAppGroup: string;
  voiceCaptureHealth: 'operational' | 'degraded' | 'offline';
  transcriptionServerHealth: 'operational' | 'degraded' | 'offline';
  attentionRequired: boolean;
  alertMessage?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  code: string;
  client: string;
  country: string;
  department: string;
  status: 'active' | 'planning' | 'completed';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'task_created' | 'review_needed' | 'follow_up' | 'overdue' | 'system';
  timestamp: string;
  read: boolean;
  linkTab?: string;
  referenceId?: string;
}

export interface UserAuthSession {
  username: string;
  role: 'admin' | 'manager' | 'viewer';
  token?: string;
}
