// Storage, BroadcastChannel multi-device/multi-tab sync, and Supabase integration
import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'retrocal_tasks_v1';
const USER_KEY = 'retrocal_auth_user';

// Read Supabase credentials from Vite environment variables
const SUPABASE_ENV_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ENV_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// BroadcastChannel for instant real-time synchronization across browser tabs/windows
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('retrocal_sync_channel')
  : null;

// Initial sample tasks
export const INITIAL_TASKS = [
  {
    id: 'task-1',
    title: 'Design classic Macintosh black & white UI',
    completed: true,
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    priority: 'HIGH',
    tag: 'DESIGN',
    notes: 'Strict monochrome 1-bit palette with dithered desk pattern.',
    reminder: '15m',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'task-2',
    title: 'Implement Multi-View Calendar (Day / Week / Month)',
    completed: true,
    date: new Date().toISOString().split('T')[0],
    time: '11:30',
    priority: 'HIGH',
    tag: 'DEV',
    notes: 'Toggle between Daily agenda, Weekly 7-day view, and Monthly matrix.',
    reminder: 'at_time',
    createdAt: Date.now() - 1800000,
  },
  {
    id: 'task-3',
    title: 'Configure Google Calendar API & OAuth synchronization',
    completed: false,
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    priority: 'MEDIUM',
    tag: 'INTEGRATION',
    notes: 'Fetch external Google Calendar events alongside RetroCal tasks.',
    reminder: '15m',
    createdAt: Date.now() - 900000,
  },
  {
    id: 'task-4',
    title: 'Test Web Push Notification alert & 8-bit sound alarm',
    completed: false,
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    time: '10:00',
    priority: 'HIGH',
    tag: 'ALERTS',
    notes: 'Confirm browser notification fires with retro audio beep.',
    reminder: '5m',
    createdAt: Date.now() - 600000,
  },
  {
    id: 'task-5',
    title: 'Sync database across desktop and mobile devices',
    completed: false,
    date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], // +2 days
    time: '16:30',
    priority: 'LOW',
    tag: 'CLOUD',
    notes: 'Connect Supabase PostgreSQL or Firebase for live multi-device sync.',
    reminder: '1h',
    createdAt: Date.now() - 300000,
  }
];

export class StorageManager {
  constructor() {
    this.listeners = new Set();
    this.supabase = null;
    this.initSupabase();

    if (syncChannel) {
      syncChannel.onmessage = (event) => {
        if (event.data?.type === 'TASKS_UPDATED') {
          this.notifyListeners(event.data.tasks, false);
        }
      };
    }
  }

  // Subscribe to task updates
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(tasks, broadcast = true) {
    this.listeners.forEach(cb => cb(tasks));
    if (broadcast && syncChannel) {
      try {
        syncChannel.postMessage({ type: 'TASKS_UPDATED', tasks });
      } catch {
        // BroadcastChannel error fallback
      }
    }
  }

  // Supabase client initialization using Vite environment variables
  initSupabase() {
    try {
      if (SUPABASE_ENV_URL && SUPABASE_ENV_ANON_KEY) {
        this.supabase = createClient(SUPABASE_ENV_URL, SUPABASE_ENV_ANON_KEY);
        this.setupSupabaseSubscription();
        this.fetchFromSupabase();
      }
    } catch (e) {
      console.warn('Supabase env init error:', e);
    }
  }

  isSupabaseConfigured() {
    return Boolean(SUPABASE_ENV_URL && SUPABASE_ENV_ANON_KEY && this.supabase);
  }

  getSupabaseEnvStatus() {
    return {
      hasUrl: Boolean(SUPABASE_ENV_URL),
      hasKey: Boolean(SUPABASE_ENV_ANON_KEY),
      connected: this.isSupabaseConfigured(),
      url: SUPABASE_ENV_URL ? SUPABASE_ENV_URL.substring(0, 20) + '...' : null,
    };
  }

  setupSupabaseSubscription() {
    if (!this.supabase) return;
    try {
      this.supabase
        .channel('public:tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
          this.fetchFromSupabase();
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }
  }

  async fetchFromSupabase() {
    if (!this.supabase) return null;
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        this.notifyListeners(data, true);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch tasks from Supabase:', err);
    }
    return null;
  }

  // Local storage CRUD
  getTasks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TASKS));
        return INITIAL_TASKS;
      }
      return JSON.parse(saved);
    } catch {
      return INITIAL_TASKS;
    }
  }

  saveTasks(tasks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      this.notifyListeners(tasks, true);

      // Async sync to Supabase if configured
      if (this.supabase) {
        this.syncAllToSupabase(tasks);
      }
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  async syncAllToSupabase(tasks) {
    if (!this.supabase) return;
    try {
      const { error } = await this.supabase.from('tasks').upsert(tasks);
      if (error) console.warn('Supabase sync error:', error);
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }

  addTask(task) {
    const current = this.getTasks();
    const newTask = {
      ...task,
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: Date.now(),
      completed: false,
    };
    const updated = [newTask, ...current];
    this.saveTasks(updated);
    return newTask;
  }

  // Batch append tasks (e.g. from CSV import)
  addTasks(newTasksArray) {
    if (!Array.isArray(newTasksArray) || newTasksArray.length === 0) return [];
    const current = this.getTasks();
    const formatted = newTasksArray.map((t, idx) => ({
      ...t,
      id: t.id || ('task-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 4)),
      createdAt: t.createdAt || (Date.now() + idx),
      completed: Boolean(t.completed),
      tag: t.tag || 'CSV',
      reminder: t.reminder || '15m',
      notes: t.notes || '',
    }));
    const updated = [...formatted, ...current];
    this.saveTasks(updated);
    return formatted;
  }

  updateTask(id, updates) {
    const current = this.getTasks();
    const updated = current.map(t => t.id === id ? { ...t, ...updates } : t);
    this.saveTasks(updated);
    return updated.find(t => t.id === id);
  }

  deleteTask(id) {
    const current = this.getTasks();
    const updated = current.filter(t => t.id !== id);
    this.saveTasks(updated);
    if (this.supabase) {
      this.supabase.from('tasks').delete().eq('id', id).then();
    }
  }

  clearCompleted() {
    const current = this.getTasks();
    const updated = current.filter(t => !t.completed);
    this.saveTasks(updated);
  }

  resetToDemo() {
    this.saveTasks(INITIAL_TASKS);
  }

  // Auth user state
  getUser() {
    try {
      const saved = localStorage.getItem(USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default demo user
    return {
      id: 'demo-user-retro',
      email: 'retro_user@sys6.os',
      name: 'Retro Operator',
      isDemo: true,
      lastSync: new Date().toLocaleTimeString(),
    };
  }

  setUser(user) {
    if (!user) {
      localStorage.removeItem(USER_KEY);
    } else {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }
}

export const storage = new StorageManager();
