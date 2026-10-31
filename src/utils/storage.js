// Storage, BroadcastChannel multi-device/multi-tab sync, and Supabase integration
import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'retrocal_tasks_v1';
const USER_KEY = 'retrocal_auth_user';

// Read Supabase credentials from Vite environment variables
const SUPABASE_ENV_URL = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_SUPABASE_URL : undefined;
const SUPABASE_ENV_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined;

// Single shared Supabase client instance
export const supabase = (SUPABASE_ENV_URL && SUPABASE_ENV_ANON_KEY)
  ? createClient(SUPABASE_ENV_URL, SUPABASE_ENV_ANON_KEY)
  : null;

// Auth helper functions
export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase is not configured. Check environment variables.');
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
}

export async function signOut() {
  if (!supabase) return;
  return await supabase.auth.signOut();
}

// BroadcastChannel for instant real-time synchronization across browser tabs/windows
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('retrocal_sync_channel')
  : null;

// Helper to normalize tag formatting (#TAG vs TAG)
export const normalizeTag = (t) => (t ? (t.startsWith('#') ? t.toUpperCase() : `#${t.toUpperCase()}`) : '#WORK');

// Initial sample tasks
export const INITIAL_TASKS = [
  {
    id: 'task-1',
    title: 'Design classic Macintosh black & white UI',
    completed: true,
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    priority: 'HIGH',
    tag: '#DESIGN',
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
    tag: '#DEV',
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
    tag: '#INTEGRATION',
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
    tag: '#ALERTS',
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
    tag: '#CLOUD',
    notes: 'Connect Supabase PostgreSQL or Firebase for live multi-device sync.',
    reminder: '1h',
    createdAt: Date.now() - 300000,
  }
];

export class StorageManager {
  constructor() {
    this.listeners = new Set();
    this.supabase = supabase;
    this.currentUserId = null;
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
  async initSupabase() {
    if (!this.supabase) return;
    try {
      // Get current auth session
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session?.user) {
        this.currentUserId = session.user.id;
        this.fetchFromSupabase(this.currentUserId);
      }

      // Listen for auth state changes
      this.supabase.auth.onAuthStateChange((event, session) => {
        this.currentUserId = session?.user?.id || null;
        if (this.currentUserId) {
          this.fetchFromSupabase(this.currentUserId);
        }
      });

      this.setupSupabaseSubscription();
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
          if (this.currentUserId) {
            this.fetchFromSupabase(this.currentUserId);
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }
  }

  async fetchFromSupabase(userId) {
    if (!this.supabase) return null;
    try {
      let query = this.supabase
        .from('tasks')
        .select('*')
        .order('createdAt', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      const taskList = (data || []).map(t => ({
        ...t,
        tag: normalizeTag(t.tag),
      }));
      // Overwrite localStorage cache cleanly with Supabase array rather than merging
      localStorage.setItem(STORAGE_KEY, JSON.stringify(taskList));
      this.notifyListeners(taskList, true);
      return taskList;
    } catch (err) {
      console.error('Failed to fetch tasks from Supabase:', err);
    }
    return null;
  }

  // Local storage CRUD
  getTasks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(t => ({ ...t, tag: normalizeTag(t.tag) }));
        }
      }
      // If user is logged in, Supabase is single source of truth - do not merge with sample tasks
      if (this.currentUserId) {
        return [];
      }
      const initialWithTags = INITIAL_TASKS.map(t => ({ ...t, tag: normalizeTag(t.tag) }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialWithTags));
      return initialWithTags;
    } catch {
      return this.currentUserId ? [] : INITIAL_TASKS.map(t => ({ ...t, tag: normalizeTag(t.tag) }));
    }
  }

  saveTasks(tasks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      this.notifyListeners(tasks, true);
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
      id: task.id || ('task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
      tag: normalizeTag(task.tag),
      createdAt: task.createdAt || Date.now(),
      completed: Boolean(task.completed),
    };
    const filtered = current.filter(t => t.id !== newTask.id);
    const updated = [newTask, ...filtered];
    this.saveTasks(updated);
    return newTask;
  }

  // Batch append tasks (e.g. from CSV import) with clean deduplication
  addTasks(newTasksArray) {
    if (!Array.isArray(newTasksArray) || newTasksArray.length === 0) return [];
    const current = this.getTasks();
    const formatted = newTasksArray.map((t, idx) => ({
      ...t,
      id: t.id || ('task-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 4)),
      createdAt: t.createdAt || (Date.now() + idx),
      completed: Boolean(t.completed),
      tag: normalizeTag(t.tag),
      reminder: t.reminder || '15m',
      notes: t.notes || '',
    }));
    // Clean deduplication by id so tasks are never doubled
    const newIds = new Set(formatted.map(t => t.id));
    const filteredCurrent = current.filter(t => !newIds.has(t.id));
    const updated = [...formatted, ...filteredCurrent];
    this.saveTasks(updated);
    return formatted;
  }

  async updateTask(id, updates) {
    const current = this.getTasks();
    const updated = current.map(t => t.id === id ? { ...t, ...updates } : t);
    this.saveTasks(updated);

    if (this.supabase) {
      try {
        await this.supabase.from('tasks').update(updates).eq('id', id);
      } catch (err) {
        console.warn('Supabase update error:', err);
      }
    }

    return updated.find(t => t.id === id);
  }

  async deleteTask(id) {
    const current = this.getTasks();
    const updated = current.filter(t => t.id !== id);
    this.saveTasks(updated);

    if (this.supabase) {
      try {
        await this.supabase.from('tasks').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete error:', err);
      }
    }
  }

  async clearCompleted() {
    const current = this.getTasks();
    const completedIds = current.filter(t => t.completed).map(t => t.id);
    const updated = current.filter(t => !t.completed);
    this.saveTasks(updated);

    if (this.supabase && completedIds.length > 0) {
      try {
        await this.supabase.from('tasks').delete().in('id', completedIds);
      } catch (err) {
        console.warn('Supabase delete completed error:', err);
      }
    }
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
