import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Columns3,
  LayoutGrid,
  List,
  LogOut,
  Menu,
  Plus,
  Search,
  X,
} from 'lucide-react';
import {
  createTask,
  deleteTask,
  toggleTaskComplete,
  updateTask,
} from '../api/client.ts';
import type {
  DashboardStats,
  FilterView,
  Task,
  TaskInput,
  TaskPriority,
  TaskStatus,
  User,
} from '../types.ts';
import { TaskCard } from './TaskCard.tsx';
import { TaskModal } from './TaskModal.tsx';

interface DashboardViewProps {
  user: User;
  tasks: Task[];
  stats: DashboardStats;
  todayDate: string;
  loading: boolean;
  error: string | null;
  onTasksUpdated: (tasks: Task[], stats: DashboardStats) => void;
  onRetryLoad: () => void;
  onLogout: () => Promise<void>;
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

const BOARD_COLUMNS: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];

export function DashboardView({
  user,
  tasks,
  stats,
  todayDate,
  loading,
  error,
  onTasksUpdated,
  onRetryLoad,
  onLogout,
}: DashboardViewProps) {
  const [activeView, setActiveView] = useState<FilterView>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'board' | 'list'>('grid');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'newest'>('dueDate');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const navLinks: Array<{ id: FilterView; label: string }> = [
    { id: 'all', label: 'All Tasks' },
    { id: 'today', label: 'Today' },
    { id: 'Pending', label: 'Pending' },
    { id: 'In Progress', label: 'In Progress' },
    { id: 'Completed', label: 'Completed' },
  ];

  const completionPercent =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks
      .filter((task) => {
        if (activeView === 'today' && task.dueDate !== todayDate) return false;
        if (
          viewMode !== 'board' &&
          (activeView === 'Pending' ||
            activeView === 'In Progress' ||
            activeView === 'Completed') &&
          task.status !== activeView
        ) {
          return false;
        }
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
          return false;
        }
        if (query) {
          const matchTitle = task.title.toLowerCase().includes(query);
          const matchDesc = task.description.toLowerCase().includes(query);
          if (!matchTitle && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
          if (diff !== 0) return diff;
          return a.dueDate.localeCompare(b.dueDate);
        }
        if (sortBy === 'newest') {
          return b.createdAt.localeCompare(a.createdAt);
        }
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [tasks, activeView, viewMode, priorityFilter, sortBy, searchQuery, todayDate]);

  const openCreateModal = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSaveTask = async (input: TaskInput, taskId?: string) => {
    setActionError(null);
    if (taskId) {
      const res = await updateTask(taskId, input);
      onTasksUpdated(
        tasks.map((t) => (t.id === taskId ? res.task : t)),
        res.stats
      );
    } else {
      const res = await createTask(input);
      onTasksUpdated([res.task, ...tasks], res.stats);
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    setActionError(null);
    try {
      const res = await toggleTaskComplete(taskId);
      onTasksUpdated(
        tasks.map((t) => (t.id === taskId ? res.task : t)),
        res.stats
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update task status.');
    }
  };

  const handleChangeStatus = async (task: Task, nextStatus: TaskStatus) => {
    setActionError(null);
    try {
      const res = await updateTask(task.id, {
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        status: nextStatus,
      });
      onTasksUpdated(
        tasks.map((t) => (t.id === task.id ? res.task : t)),
        res.stats
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to change task status.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setActionError(null);
    try {
      const res = await deleteTask(taskId);
      onTasksUpdated(
        tasks.filter((t) => t.id !== taskId),
        res.stats
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete task.');
    }
  };

  const handleNavClick = (id: FilterView) => {
    setActiveView(id);
    if (viewMode === 'board' && (id === 'Pending' || id === 'In Progress' || id === 'Completed')) {
      setViewMode('grid');
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#1D4ED8] text-slate-900 flex flex-col">
      {/* Top Bar Contract: compact h-14 on mobile (<= 15% sticky cap) */}
      <header className="sticky top-0 z-30 bg-[#0f296b] text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
              className="md:hidden w-11 h-11 -ml-2 rounded-lg flex items-center justify-center text-blue-100 hover:bg-white/10 shrink-0"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-white truncate">
              Prasad&apos;s Workshop
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-7" aria-label="Task views">
            {navLinks.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${
                    isActive ? 'text-white' : 'text-blue-200 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 sm:h-10 px-3.5 sm:px-4 rounded-lg bg-white hover:bg-blue-50 active:bg-blue-100 text-[#0f296b] text-sm font-semibold inline-flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New Task</span>
          </button>
        </div>
      </header>

      {/* Full-Screen Mobile Navigation Overlay (outside sticky header) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-x-0 top-14 bottom-0 z-40 md:hidden bg-[#0f296b] text-white p-5 flex flex-col justify-between overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <nav aria-label="Mobile task views" className="space-y-2">
            {navLinks.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full min-h-[48px] px-4 rounded-xl text-left text-base font-semibold transition-colors flex items-center justify-between ${
                    isActive
                      ? 'bg-white text-[#0f296b]'
                      : 'bg-white/10 text-blue-100 hover:bg-white/15'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-white/15 space-y-4">
            <div>
              <p className="text-sm font-semibold text-white">{user.fullName}</p>
              <p className="text-xs text-blue-200">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full min-h-[48px] px-4 rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Blue Workshop Summary Banner */}
      <section className="bg-[#1E40AF] text-white border-b border-blue-400/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Prasad&apos;s Workshop
              </h1>
              <p className="mt-1 text-sm text-blue-100 flex items-center gap-2 flex-wrap">
                <span>{user.fullName}</span>
                <span aria-hidden="true">·</span>
                <span>{user.email}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-white">Today: {todayDate}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Completion Progress Bar */}
              <div className="w-48 sm:w-56">
                <div className="flex items-center justify-between text-xs font-medium text-blue-100 mb-1.5">
                  <span>Completion rate</span>
                  <span className="font-mono tabular-nums font-semibold text-white">
                    {completionPercent}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-blue-950/60 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="h-10 px-3.5 rounded-lg border border-white/25 bg-white/10 hover:bg-white/20 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <LogOut className="w-4 h-4 text-blue-100" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* 4-Column Crisp White KPI Metric Cards on Blue */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => handleNavClick('all')}
              className={`p-4 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                activeView === 'all'
                  ? 'border-white bg-white shadow-md'
                  : 'border-white/20 bg-white/95 hover:bg-white'
              }`}
            >
              <span className="text-xs font-semibold text-slate-500">Total Tasks</span>
              <p className="mt-1 font-display text-3xl font-bold text-slate-900 tabular-nums">
                {stats.total}
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('Pending')}
              className={`p-4 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                activeView === 'Pending'
                  ? 'border-white bg-white shadow-md'
                  : 'border-white/20 bg-white/95 hover:bg-white'
              }`}
            >
              <span className="text-xs font-semibold text-slate-500">Pending Tasks</span>
              <p className="mt-1 font-display text-3xl font-bold text-amber-600 tabular-nums">
                {stats.pending}
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('Completed')}
              className={`p-4 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                activeView === 'Completed'
                  ? 'border-white bg-white shadow-md'
                  : 'border-white/20 bg-white/95 hover:bg-white'
              }`}
            >
              <span className="text-xs font-semibold text-slate-500">Completed Tasks</span>
              <p className="mt-1 font-display text-3xl font-bold text-emerald-700 tabular-nums">
                {stats.completed}
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('today')}
              className={`p-4 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                activeView === 'today'
                  ? 'border-white bg-white shadow-md'
                  : 'border-white/20 bg-white/95 hover:bg-white'
              }`}
            >
              <span className="text-xs font-semibold text-slate-500">Today&apos;s Tasks</span>
              <p className="mt-1 font-display text-3xl font-bold text-blue-700 tabular-nums">
                {stats.today}
              </p>
            </button>
          </div>
        </div>
      </section>

      {/* Main Blue Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Search, Filter & Layout Switcher */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 lg:max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title or description..."
              aria-label="Search tasks"
              className="w-full h-11 sm:h-10 pl-10 pr-3.5 rounded-lg border border-blue-300/40 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
              className="h-11 sm:h-10 px-3 rounded-lg border border-blue-300/40 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <option value="all">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            <select
              aria-label="Sort tasks"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'dueDate' | 'priority' | 'newest')
              }
              className="h-11 sm:h-10 px-3 rounded-lg border border-blue-300/40 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <option value="dueDate">Sort by Due Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="newest">Sort by Newest</option>
            </select>

            {/* View Switcher: Grid | Board | List */}
            <div
              className="col-span-2 sm:col-span-1 grid grid-cols-3 sm:flex items-center gap-1 p-1 rounded-lg bg-white border border-blue-300/40"
              role="group"
              aria-label="Task layout view"
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`h-9 sm:h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  viewMode === 'grid'
                    ? 'bg-[#0f296b] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`h-9 sm:h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  viewMode === 'board'
                    ? 'bg-[#0f296b] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Board</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`h-9 sm:h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  viewMode === 'list'
                    ? 'bg-[#0f296b] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" aria-hidden="true" />
                <span>List</span>
              </button>
            </div>
          </div>
        </section>

        {actionError && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-center justify-between gap-3"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading, Error, Empty, or Active Layout */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Loading tasks">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-xl border border-white/30 bg-white/95 p-5 h-44 animate-pulse"
              >
                <div className="h-4 w-1/3 bg-slate-200 rounded" />
                <div className="mt-4 h-5 w-3/4 bg-slate-200 rounded" />
                <div className="mt-3 h-4 w-full bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
            <p className="text-base font-semibold text-slate-900">Unable to load tasks</p>
            <p className="mt-1 text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={onRetryLoad}
              className="mt-4 h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-xl border border-white/25 bg-white p-12 text-center shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <CheckSquare className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-lg font-bold text-slate-900">
              {tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
              {tasks.length === 0
                ? 'Create your first task with a deadline and priority level to start organizing your schedule.'
                : 'Try clearing your search query or switching filters to view other tasks.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {tasks.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('all');
                    setPriorityFilter('all');
                    setSearchQuery('');
                  }}
                  className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                >
                  Reset Filters
                </button>
              )}
              <button
                type="button"
                onClick={openCreateModal}
                className="h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{tasks.length === 0 ? 'Create Your First Task' : 'New Task'}</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'board' ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible items-start">
            {BOARD_COLUMNS.map((colStatus) => {
              const columnTasks = filteredTasks.filter((t) => t.status === colStatus);
              return (
                <section
                  key={colStatus}
                  aria-label={`${colStatus} column`}
                  className="min-w-[84vw] sm:min-w-[320px] lg:min-w-0 snap-start rounded-xl border border-white/20 bg-[#153693]/75 p-4 space-y-3 shrink-0 lg:shrink"
                >
                  <div className="flex items-center justify-between px-1">
                    <h2 className="font-display text-sm font-bold text-white">
                      {colStatus}
                    </h2>
                    <span className="text-xs font-mono tabular-nums font-semibold text-blue-100">
                      {columnTasks.length}
                    </span>
                  </div>
                  {columnTasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/25 bg-white/10 p-6 text-center text-xs text-blue-100">
                      No {colStatus.toLowerCase()} tasks
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence initial={false}>
                        {columnTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            todayDate={todayDate}
                            layout="grid"
                            onToggleComplete={handleToggleComplete}
                            onChangeStatus={handleChangeStatus}
                            onEdit={openEditModal}
                            onDelete={handleDeleteTask}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            }
          >
            <AnimatePresence initial={false}>
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  todayDate={todayDate}
                  layout={viewMode === 'grid' ? 'grid' : 'list'}
                  onToggleComplete={handleToggleComplete}
                  onChangeStatus={handleChangeStatus}
                  onEdit={openEditModal}
                  onDelete={handleDeleteTask}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <TaskModal
        isOpen={modalOpen}
        editingTask={editingTask}
        defaultDate={todayDate}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTask}
      />
    </div>
  );
}
