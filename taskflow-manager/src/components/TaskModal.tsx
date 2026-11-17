import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Task, TaskInput, TaskPriority, TaskStatus } from '../types.ts';

interface TaskModalProps {
  isOpen: boolean;
  editingTask: Task | null;
  defaultDate: string;
  onClose: () => void;
  onSave: (input: TaskInput, taskId?: string) => Promise<void>;
}

const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];
const STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];

export function TaskModal({
  isOpen,
  editingTask,
  defaultDate,
  onClose,
  onSave,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(defaultDate);
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setDueDate(editingTask.dueDate);
      setPriority(editingTask.priority);
      setStatus(editingTask.status);
    } else {
      setTitle('');
      setDescription('');
      setDueDate(defaultDate);
      setPriority('Medium');
      setStatus('Pending');
    }
  }, [isOpen, editingTask, defaultDate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Please enter a task title.');
      return;
    }
    if (!dueDate) {
      setError('Please choose a due date.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          title: title.trim(),
          description: description.trim(),
          dueDate,
          priority,
          status,
        },
        editingTask?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0b1f4b]/50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-dvh sm:h-auto sm:max-h-[90dvh] sm:max-w-lg rounded-none sm:rounded-2xl bg-white border-0 sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-[#0b1f4b] text-white shrink-0">
          <h2 id="task-modal-title" className="font-display text-lg font-semibold tracking-tight">
            {editingTask ? 'Edit Task Details' : 'Create New Task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 -mr-1 rounded-lg flex items-center justify-center text-blue-200 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 flex flex-col">
          {error && (
            <div
              role="alert"
              className="px-3.5 py-2.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="task-title" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Task title <span className="text-red-600">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              required
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Prepare sprint review slides"
              className="w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-[#F8FAFC] focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="task-description"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Description
            </label>
            <textarea
              id="task-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add helpful context, deliverables, or checklist notes..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-[#F8FAFC] focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15 resize-y transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="task-due" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Due date <span className="text-red-600">*</span>
              </label>
              <input
                id="task-due"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-[#F8FAFC] focus:bg-white text-slate-900 text-sm font-mono tabular-nums focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
            </div>

            <div>
              <label
                htmlFor="task-priority"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-[#F8FAFC] focus:bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-status"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-[#F8FAFC] focus:bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              {saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
