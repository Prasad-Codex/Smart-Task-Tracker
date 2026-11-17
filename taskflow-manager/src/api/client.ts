import type { DashboardStats, Task, TaskInput, User } from '../types.ts';

const TOKEN_STORAGE_KEY = 'taskflow_auth_token';

function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or sandbox restrictions
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
  }
  return data as T;
}

export async function fetchCurrentUser(): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/api/auth/me');
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<{ token: string; user: User }> {
  const data = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredToken(data.token);
  return data;
}

export async function registerUser(payload: {
  fullName: string;
  email: string;
  password: string;
}): Promise<{ token: string; user: User }> {
  const data = await apiFetch<{ token: string; user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredToken(data.token);
  return data;
}

export async function logoutUser(): Promise<void> {
  try {
    await apiFetch<{ message: string }>('/api/auth/logout', { method: 'POST' });
  } finally {
    setStoredToken(null);
  }
}

export async function fetchTasks(): Promise<{
  tasks: Task[];
  stats: DashboardStats;
  todayDate: string;
}> {
  return apiFetch<{ tasks: Task[]; stats: DashboardStats; todayDate: string }>('/api/tasks');
}

export async function createTask(
  input: TaskInput
): Promise<{ task: Task; stats: DashboardStats }> {
  return apiFetch<{ task: Task; stats: DashboardStats }>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateTask(
  id: string,
  input: TaskInput
): Promise<{ task: Task; stats: DashboardStats }> {
  return apiFetch<{ task: Task; stats: DashboardStats }>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function toggleTaskComplete(
  id: string
): Promise<{ task: Task; stats: DashboardStats }> {
  return apiFetch<{ task: Task; stats: DashboardStats }>(
    `/api/tasks/${encodeURIComponent(id)}/complete`,
    {
      method: 'PATCH',
    }
  );
}

export async function deleteTask(
  id: string
): Promise<{ deletedId: string; stats: DashboardStats }> {
  return apiFetch<{ deletedId: string; stats: DashboardStats }>(
    `/api/tasks/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  );
}
