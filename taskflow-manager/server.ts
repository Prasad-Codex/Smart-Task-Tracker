import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type TaskPriority = 'Low' | 'Medium' | 'High';
type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

interface StoredSession {
  token: string;
  userId: string;
  expiresAt: number;
}

interface StoredTask {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

interface DataStore {
  users: StoredUser[];
  sessions: StoredSession[];
  tasks: StoredTask[];
}

interface AuthenticatedRequest extends Request {
  authUser?: {
    id: string;
    fullName: string;
    email: string;
  };
  authToken?: string;
}

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const SESSION_COOKIE_NAME = 'taskflow_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const VALID_PRIORITIES = new Set<TaskPriority>(['Low', 'Medium', 'High']);
const VALID_STATUSES = new Set<TaskStatus>(['Pending', 'In Progress', 'Completed']);

function getTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysIso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash, salt: actualSalt };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  const hashBuf = Buffer.from(hash, 'hex');
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (hashBuf.length !== storedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(hashBuf, storedBuf);
}

function createInitialStore(): DataStore {
  const demoUserId = 'usr_demo_01';
  const { hash, salt } = hashPassword('demo1234');
  const today = getTodayIso();
  const nowIso = new Date().toISOString();

  return {
    users: [
      {
        id: demoUserId,
        fullName: 'Prasad Madhavan',
        email: 'demo@taskflow.app',
        passwordHash: hash,
        passwordSalt: salt,
        createdAt: nowIso,
      },
    ],
    sessions: [],
    tasks: [
      {
        id: 'tsk_01',
        userId: demoUserId,
        title: 'Finalize quarterly product roadmap',
        description: 'Review engineering estimates and align release milestones with design lead before afternoon sync.',
        dueDate: today,
        priority: 'High',
        status: 'In Progress',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'tsk_02',
        userId: demoUserId,
        title: 'Send client onboarding checklist',
        description: 'Prepare workspace access links and share initial setup documentation with the new account team.',
        dueDate: today,
        priority: 'Medium',
        status: 'Pending',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'tsk_03',
        userId: demoUserId,
        title: 'Audit database backup schedule',
        description: 'Verify automated nightly snapshots and confirm retention policy matches compliance checklist.',
        dueDate: addDaysIso(2),
        priority: 'High',
        status: 'Pending',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'tsk_04',
        userId: demoUserId,
        title: 'Update API authentication documentation',
        description: 'Document session endpoints, token headers, and error codes for internal developers.',
        dueDate: addDaysIso(4),
        priority: 'Low',
        status: 'Pending',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'tsk_05',
        userId: demoUserId,
        title: 'Review mobile navigation accessibility',
        description: 'Check keyboard focus rings, contrast ratios, and touch target spacing on smaller screens.',
        dueDate: addDaysIso(-1),
        priority: 'Medium',
        status: 'Completed',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
  };
}

function readStore(): DataStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial = createInitialStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as DataStore;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    };
  } catch {
    const initial = createInitialStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

function writeStore(store: DataStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpFile, DATA_FILE);
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) {
    return result;
  }
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      result[key] = decodeURIComponent(val);
    }
  }
  return result;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token) return token;
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] || null;
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const store = readStore();
  const now = Date.now();
  const activeSessions = store.sessions.filter((s) => s.expiresAt > now);
  if (activeSessions.length !== store.sessions.length) {
    store.sessions = activeSessions;
    writeStore(store);
  }

  const session = activeSessions.find((s) => s.token === token);
  if (!session) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  const user = store.users.find((u) => u.id === session.userId);
  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  req.authUser = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
  };
  req.authToken = token;
  next();
}

function computeStats(tasks: StoredTask[]) {
  const today = getTodayIso();
  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'Pending').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
    today: tasks.filter((t) => t.dueDate === today).length,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Register
  app.post('/api/auth/register', (req, res) => {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (fullName.length < 2 || fullName.length > 80) {
      res.status(400).json({ error: 'Full name must be between 2 and 80 characters.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const store = readStore();
    if (store.users.some((u) => u.email === email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const newUser: StoredUser = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      fullName,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
    };

    const token = crypto.randomBytes(32).toString('hex');
    store.users.push(newUser);
    store.sessions.push({
      token,
      userId: newUser.id,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    writeStore(store);

    setSessionCookie(res, token);
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
      },
    });
  });

  // Login
  app.post('/api/auth/login', (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const store = readStore();
    const user = store.users.find((u) => u.email === email);
    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    store.sessions = store.sessions.filter((s) => s.expiresAt > Date.now());
    store.sessions.push({
      token,
      userId: user.id,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    writeStore(store);

    setSessionCookie(res, token);
    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const token = extractToken(req);
    if (token) {
      const store = readStore();
      store.sessions = store.sessions.filter((s) => s.token !== token);
      writeStore(store);
    }
    clearSessionCookie(res);
    res.json({ message: 'Logged out successfully.' });
  });

  // Current user
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.authUser });
  });

  // List tasks + dashboard summary
  app.get('/api/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = readStore();
    const userTasks = store.tasks
      .filter((t) => t.userId === req.authUser!.id)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    res.json({
      tasks: userTasks,
      stats: computeStats(userTasks),
      todayDate: getTodayIso(),
    });
  });

  // Create task
  app.post('/api/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const dueDate = typeof req.body?.dueDate === 'string' ? req.body.dueDate.trim() : '';
    const priority = (req.body?.priority as TaskPriority) || 'Medium';
    const status = (req.body?.status as TaskStatus) || 'Pending';

    if (!title || title.length > 150) {
      res.status(400).json({ error: 'Task title is required (max 150 characters).' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      res.status(400).json({ error: 'Please select a valid due date (YYYY-MM-DD).' });
      return;
    }
    if (!VALID_PRIORITIES.has(priority)) {
      res.status(400).json({ error: 'Priority must be Low, Medium, or High.' });
      return;
    }
    if (!VALID_STATUSES.has(status)) {
      res.status(400).json({ error: 'Status must be Pending, In Progress, or Completed.' });
      return;
    }

    const store = readStore();
    const nowIso = new Date().toISOString();
    const newTask: StoredTask = {
      id: `tsk_${crypto.randomUUID().slice(0, 8)}`,
      userId: req.authUser!.id,
      title,
      description,
      dueDate,
      priority,
      status,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    store.tasks.push(newTask);
    writeStore(store);

    const userTasks = store.tasks.filter((t) => t.userId === req.authUser!.id);
    res.status(201).json({
      task: newTask,
      stats: computeStats(userTasks),
    });
  });

  // Update task
  app.put('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const taskId = req.params.id;
    const store = readStore();
    const idx = store.tasks.findIndex((t) => t.id === taskId && t.userId === req.authUser!.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const existing = store.tasks[idx];
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : existing.title;
    const description =
      typeof req.body?.description === 'string' ? req.body.description.trim() : existing.description;
    const dueDate = typeof req.body?.dueDate === 'string' ? req.body.dueDate.trim() : existing.dueDate;
    const priority = (req.body?.priority as TaskPriority) ?? existing.priority;
    const status = (req.body?.status as TaskStatus) ?? existing.status;

    if (!title || title.length > 150) {
      res.status(400).json({ error: 'Task title is required (max 150 characters).' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      res.status(400).json({ error: 'Please select a valid due date (YYYY-MM-DD).' });
      return;
    }
    if (!VALID_PRIORITIES.has(priority)) {
      res.status(400).json({ error: 'Priority must be Low, Medium, or High.' });
      return;
    }
    if (!VALID_STATUSES.has(status)) {
      res.status(400).json({ error: 'Status must be Pending, In Progress, or Completed.' });
      return;
    }

    const updated: StoredTask = {
      ...existing,
      title,
      description,
      dueDate,
      priority,
      status,
      updatedAt: new Date().toISOString(),
    };
    store.tasks[idx] = updated;
    writeStore(store);

    const userTasks = store.tasks.filter((t) => t.userId === req.authUser!.id);
    res.json({
      task: updated,
      stats: computeStats(userTasks),
    });
  });

  // Toggle completed
  app.patch('/api/tasks/:id/complete', requireAuth, (req: AuthenticatedRequest, res) => {
    const taskId = req.params.id;
    const store = readStore();
    const idx = store.tasks.findIndex((t) => t.id === taskId && t.userId === req.authUser!.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const existing = store.tasks[idx];
    const nextStatus: TaskStatus = existing.status === 'Completed' ? 'Pending' : 'Completed';
    const updated: StoredTask = {
      ...existing,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    store.tasks[idx] = updated;
    writeStore(store);

    const userTasks = store.tasks.filter((t) => t.userId === req.authUser!.id);
    res.json({
      task: updated,
      stats: computeStats(userTasks),
    });
  });

  // Delete task
  app.delete('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const taskId = req.params.id;
    const store = readStore();
    const exists = store.tasks.some((t) => t.id === taskId && t.userId === req.authUser!.id);
    if (!exists) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    store.tasks = store.tasks.filter((t) => !(t.id === taskId && t.userId === req.authUser!.id));
    writeStore(store);

    const userTasks = store.tasks.filter((t) => t.userId === req.authUser!.id);
    res.json({
      deletedId: taskId,
      stats: computeStats(userTasks),
    });
  });

  // Vite or static serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`TaskFlow server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TaskFlow server:', err);
  process.exit(1);
});
