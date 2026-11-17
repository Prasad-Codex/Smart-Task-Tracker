export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type FilterView = 'all' | 'today' | 'Pending' | 'In Progress' | 'Completed';

export interface User {
  id: string;
  fullName: string;
  email: string;
}

export interface Task {
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

export interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  today: number;
}

export interface TaskInput {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
}
