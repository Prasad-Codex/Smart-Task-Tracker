import { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calendar,
  Check,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '../types.ts';

interface TaskCardProps {
  task: Task;
  todayDate: string;
  layout?: 'grid' | 'list';
  onToggleComplete: (taskId: string) => Promise<void>;
  onChangeStatus: (task: Task, nextStatus: TaskStatus) => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void>;
}

function formatDueDate(
  iso: string,
  todayDate: string
): { label: string; isOverdue: boolean; isToday: boolean } {
  const isToday = iso === todayDate;
  const isOverdue = iso < todayDate;
  if (isToday) {
    return { label: `Today · ${iso}`, isOverdue: false, isToday: true };
  }
  const [year, month, day] = iso.split('-').map(Number);
  const dateObj = new Date(year, (month || 1) - 1, day || 1);
  const formatted = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return { label: formatted, isOverdue, isToday: false };
}

function PriorityIndicator({ priority }: { priority: TaskPriority }) {
  if (priority === 'High') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
        <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
        <span>High</span>
      </span>
    );
  }
  if (priority === 'Medium') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Medium</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
      <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Low</span>
    </span>
  );
}

function StatusIndicator({ status }: { status: TaskStatus }) {
  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <Check className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Completed</span>
      </span>
    );
  }
  if (status === 'In Progress') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        <span>In Progress</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
      <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Pending</span>
    </span>
  );
}

export function TaskCard({
  task,
  todayDate,
  layout = 'grid',
  onToggleComplete,
  onChangeStatus,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const isCompleted = task.status === 'Completed';
  const due = formatDueDate(task.dueDate, todayDate);

  const handleToggle = async () => {
    setBusy(true);
    try {
      await onToggleComplete(task.id);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    setBusy(true);
    try {
      await onDelete(task.id);
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className={`group rounded-xl border bg-white p-5 flex flex-col justify-between transition-all duration-150 ${
        isCompleted
          ? 'border-slate-200 bg-slate-50/75'
          : 'border-slate-200 hover:border-blue-400 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-950/5'
      }`}
    >
      <div>
        {/* Card Header: Checkbox + Status & Priority + Action Icons */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              disabled={busy}
              onClick={handleToggle}
              aria-label={
                isCompleted
                  ? `Mark "${task.title}" as pending`
                  : `Mark "${task.title}" as completed`
              }
              className="w-10 h-10 -m-2.5 flex items-center justify-center rounded-lg shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
            >
              <span
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                  isCompleted
                    ? 'bg-blue-700 border-blue-700 text-white'
                    : 'border-slate-300 bg-white group-hover:border-blue-600'
                }`}
              >
                {isCompleted && <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />}
              </span>
            </button>

            <div className="flex items-center gap-1.5 text-xs truncate">
              <StatusIndicator status={task.status} />
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <PriorityIndicator priority={task.priority} />
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!confirmingDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  aria-label={`Edit ${task.title}`}
                  className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-700 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                >
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  aria-label={`Delete ${task.title}`}
                  className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleConfirmDelete}
                  className="h-9 sm:h-8 px-3 sm:px-2.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                >
                  Delete
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmingDelete(false)}
                  className="h-9 sm:h-8 px-3 sm:px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div className="mt-3.5 min-w-0">
          <h3
            className={`font-display text-base font-bold leading-snug break-words ${
              isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
            }`}
          >
            {task.title}
          </h3>
          {task.description && (
            <p
              className={`mt-1.5 text-sm leading-relaxed break-words ${
                layout === 'grid' ? 'line-clamp-3' : ''
              } ${isCompleted ? 'text-slate-400' : 'text-slate-600'}`}
            >
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer: Due Date + Status Switcher */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-mono tabular-nums ${
            !isCompleted && due.isOverdue
              ? 'text-red-600 font-semibold'
              : !isCompleted && due.isToday
                ? 'text-blue-700 font-semibold'
                : 'text-slate-500'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{!isCompleted && due.isOverdue ? `Overdue · ${due.label}` : due.label}</span>
        </span>

        <select
          aria-label={`Change status for ${task.title}`}
          value={task.status}
          disabled={busy}
          onChange={(e) => onChangeStatus(task, e.target.value as TaskStatus)}
          className="h-8 px-2 rounded-md border border-slate-200 bg-[#F8FAFC] hover:bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
        >
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
    </motion.article>
  );
}
