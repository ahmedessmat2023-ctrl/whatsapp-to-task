/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckSquare,
  Search,
  Filter,
  Columns,
  List,
  Calendar,
  AlertCircle,
  Clock,
  Mic,
  MessageSquare,
  Plus,
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
  User,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Priority, Task, TaskStatus } from '../types';

export const TaskTrackerView: React.FC = () => {
  const { tasks, setSelectedTaskId, updateTaskStatus, createTaskManual, language, isDarkMode, setShowSimulator, people, groups, projects } = useApp();

  const isAr = language === 'ar';

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [adelOnly, setAdelOnly] = useState<boolean>(false);

  // New Manual Task Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskOwner, setNewTaskOwner] = useState('Ismail');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('High');
  const [newTaskGroup, setNewTaskGroup] = useState('GC Leaders');
  const [newTaskDept, setNewTaskDept] = useState('Tech');

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.assignedTo.toLowerCase().includes(q) ||
        t.whatsAppGroup.toLowerCase().includes(q) ||
        t.originalRequest.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
    if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
    if (selectedAssignee !== 'all' && t.assignedTo !== selectedAssignee) return false;
    if (selectedGroup !== 'all' && t.whatsAppGroup !== selectedGroup) return false;
    if (adelOnly && !t.requester.includes('Adel')) return false;
    return true;
  });

  const kanbanStatuses: TaskStatus[] = ['New', 'Assigned', 'In Progress', 'Waiting', 'Blocked', 'Done'];

  const priorityColors: Record<Priority, string> = {
    Critical: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
    High: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
    Medium: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
    Low: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400',
  };

  const ragColors = {
    Red: 'bg-red-500 text-white',
    Amber: 'bg-amber-500 text-white',
    Green: 'bg-emerald-500 text-white',
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await createTaskManual({
      title: newTaskTitle,
      description: `Manual task created in Tracker: ${newTaskTitle}`,
      assignedTo: newTaskOwner,
      department: newTaskDept,
      priority: newTaskPriority,
      whatsAppGroup: newTaskGroup,
      requester: 'Adel HAMMAD Egy',
      originalRequest: newTaskTitle,
      sourceMessageType: 'text',
      dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
      sla: '24 Hours',
      rag: 'Green',
      progress: 0,
    });
    setNewTaskTitle('');
    setShowNewModal(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'متتبع المهام التنفيذي' : 'Task Tracker & Lifecycle'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {filteredTasks.length} {isAr ? 'مهمة' : 'Tasks'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'تتبع دورة حياة المهام المستخرجة من واتساب، نسب الإنجاز، والأشخاص المكلفين'
              : 'End-to-end task operations with source WhatsApp verification, SLA tracking, and audit timelines.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
              }`}
              title="Kanban Board View"
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة مهمة يدوية' : 'New Task'}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم، الكود، المحادثة، أو الشخص...' : 'Search task, group, owner, ID...'}
              className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="New">New</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting">Waiting</option>
              <option value="Blocked">Blocked</option>
              <option value="Done">Done</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{isAr ? 'جميع الأولويات' : 'All Priorities'}</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{isAr ? 'كل المسؤولين' : 'All Owners'}</option>
              {people.map((p) => (
                <option key={p.id} value={p.canonicalName}>
                  {p.canonicalName}
                </option>
              ))}
            </select>
          </div>

          {/* Adel Fast Toggle */}
          <div className="lg:col-span-2 flex items-center">
            <button
              onClick={() => setAdelOnly(!adelOnly)}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                adelOnly
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isAr ? 'توجيهات عادل فقط' : 'Adel Only'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Task ID</th>
                  <th className="px-4 py-3">Title & Request</th>
                  <th className="px-4 py-3">WhatsApp Group</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due Date / SLA</th>
                  <th className="px-4 py-3 text-right">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No matching tasks found. Adjust your filters or dispatch a simulation.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      {/* Task ID */}
                      <td className="px-4 py-3.5 font-mono font-black text-indigo-600 dark:text-indigo-400">
                        {t.id}
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{t.title}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 italic">"{t.originalRequest}"</div>
                      </td>

                      {/* Group */}
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {t.whatsAppGroup}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{t.assignedTo}</div>
                        <div className="text-[10px] text-slate-400">{t.department}</div>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityColors[t.priority]}`}>
                          {t.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-[11px]">
                          {t.status}
                        </span>
                      </td>

                      {/* Due / SLA */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{t.dueDate}</div>
                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${ragColors[t.rag]}`} />
                          {t.sla}
                        </div>
                      </td>

                      {/* Source Type Icon */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                          {t.messageType === 'voice' ? <Mic className="w-3.5 h-3.5 text-orange-500" /> : <MessageSquare className="w-3.5 h-3.5 text-blue-500" />}
                          {t.messageType.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
          {kanbanStatuses.map((status) => {
            const columnTasks = filteredTasks.filter((t) => t.status === status);
            return (
              <div
                key={status}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col min-w-[220px]"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{status}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px]">
                  {columnTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500 shadow-xs cursor-pointer space-y-2 transition-all hover:scale-[1.01]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">
                          {t.id}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${priorityColors[t.priority]}`}>
                          {t.priority}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {t.title}
                      </h4>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                          {t.assignedTo}
                        </span>
                        <span className="flex items-center gap-1">
                          {t.messageType === 'voice' ? <Mic className="w-3 h-3 text-orange-500" /> : <MessageSquare className="w-3 h-3 text-blue-500" />}
                          {t.dueDate}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Task Creator Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTask}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {isAr ? 'إنشاء مهمة تنفيذية يدوية' : 'Create New Operational Task'}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Deploy urgent hotfix to payments gateway"
                  className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">Assignee</label>
                  <select
                    value={newTaskOwner}
                    onChange={(e) => setNewTaskOwner(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2 text-slate-800 dark:text-slate-200"
                  >
                    {people.map((p) => (
                      <option key={p.id} value={p.canonicalName}>
                        {p.canonicalName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">WhatsApp Group Context</label>
                <select
                  value={newTaskGroup}
                  onChange={(e) => setNewTaskGroup(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2 text-slate-800 dark:text-slate-200"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-extrabold shadow-sm"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
