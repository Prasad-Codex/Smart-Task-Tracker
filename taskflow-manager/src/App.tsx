import { useCallback, useEffect, useState } from 'react';
import {
  fetchCurrentUser,
  fetchTasks,
  logoutUser,
  setStoredToken,
} from './api/client.ts';
import { AuthView } from './components/AuthView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import type { DashboardStats, Task, User } from './types.ts';

function getLocalTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const EMPTY_STATS: DashboardStats = {
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  today: 0,
};

export default function App() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [todayDate, setTodayDate] = useState<string>(getLocalTodayIso());
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const data = await fetchTasks();
      setTasks(data.tasks);
      setStats(data.stats);
      if (data.todayDate) {
        setTodayDate(data.todayDate);
      }
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Unable to load tasks.');
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchCurrentUser();
        if (active) {
          setUser(res.user);
        }
      } catch {
        if (active) {
          setStoredToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setAuthChecking(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadTasks();
    } else {
      setTasks([]);
      setStats(EMPTY_STATS);
    }
  }, [user, loadTasks]);

  const handleAuthenticated = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setTasks([]);
    setStats(EMPTY_STATS);
  };

  const handleTasksUpdated = (nextTasks: Task[], nextStats: DashboardStats) => {
    setTasks(nextTasks);
    setStats(nextStats);
  };

  if (authChecking) {
    return (
      <div className="min-h-dvh bg-[#1D4ED8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-white">Loading Prasad&apos;s Workshop...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  return (
    <DashboardView
      user={user}
      tasks={tasks}
      stats={stats}
      todayDate={todayDate}
      loading={tasksLoading}
      error={tasksError}
      onTasksUpdated={handleTasksUpdated}
      onRetryLoad={loadTasks}
      onLogout={handleLogout}
    />
  );
}
