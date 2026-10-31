import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, Check, Trash2, Edit3, Calendar as CalendarIcon, 
  Clock, Tag, AlertCircle, Filter, Search, Download, 
  CheckSquare, Square, FileUp, CheckCircle2, Tag as TagIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from './utils/audio';
import { storage, supabase } from './utils/storage';

const TAG_OPTIONS = ['WORK', 'DEV', 'LIFE', 'HEALTH', 'RETRO', 'URGENT', 'CSV'];
const PRIORITY_OPTIONS = [
  { value: 'LOW', label: '[!] LOW', color: 'bg-neutral-100 text-neutral-800' },
  { value: 'MEDIUM', label: '[!!] MED', color: 'bg-neutral-200 text-black font-bold' },
  { value: 'HIGH', label: '[!!!] HIGH', color: 'bg-black text-white font-bold' },
];

// Priority rank for secondary sort ('HIGH' > 'MEDIUM' > 'LOW')
const PRIORITY_ORDER = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export default function TaskDesk({
  tasks,
  onAddTask,
  onImportTasks,
  onUpdateTask,
  onDeleteTask,
  onToggleTask,
  onClearCompleted,
  onOpenEdit,
  selectedCategory,
  onSelectCategory,
  currentFilter,
  onSelectFilter,
}) {
  // Quick-Add Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('10:00');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newTag, setNewTag] = useState('WORK');
  const [newReminder, setNewReminder] = useState('15m');
  const [showAdvancedAdd, setShowAdvancedAdd] = useState(false);

  // Search & Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('ALL');
  const [viewFilter, setViewFilter] = useState('all'); // 'all', 'today', 'upcoming', 'overdue'
  
  // Realtime Supabase Auth state for RLS user_id filtering
  const [authUser, setAuthUser] = useState(null);

  // CSV Import state & feedback
  const [csvStatusMessage, setCsvStatusMessage] = useState('');
  
  // Hidden file input reference for CSV import
  const fileInputRef = useRef(null);

  // Dynamic tags computed from preset options and all existing task custom tags
  const allAvailableTags = useMemo(() => {
    const customTags = tasks.map(t => t.tag?.toUpperCase()).filter(Boolean);
    return Array.from(new Set([...TAG_OPTIONS, ...customTags]));
  }, [tasks]);

  // Monitor Supabase session and fetch user-specific tasks on auth load
  useEffect(() => {
    if (!supabase) return;

    // 1. Fetch current active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user || null;
      setAuthUser(currentUser);
      if (currentUser?.id) {
        fetchUserTasks(currentUser.id);
      }
    });

    // 2. Subscribe to auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setAuthUser(currentUser);
      if (currentUser?.id) {
        fetchUserTasks(currentUser.id);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Fetch only the authenticated user's tasks using .eq('user_id', user.id)
  const fetchUserTasks = async (userId) => {
    if (!supabase || !userId) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Supabase fetch tasks error:', error);
        return;
      }

      if (data && onImportTasks) {
        onImportTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch user tasks from Supabase:', err);
    }
  };

  // Quick Add Task Form Submit Handler
  const handleQuickAdd = async (e) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    sound.playAdd();

    // Fetch the current authenticated user's session
    let userId = authUser?.id;
    if (supabase && !userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }

    const cleanTag = newTag ? newTag.trim().replace(/^#/, '').toUpperCase() : 'WORK';

    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: newTitle.trim(),
      date: newDate,
      time: newTime,
      priority: newPriority,
      tag: cleanTag,
      reminder: newReminder,
      notes: '',
      completed: false,
      createdAt: Date.now(),
      user_id: userId || null, // Appended user_id
    };

    // Insert task into Supabase tasks table with user_id
    if (supabase && userId) {
      try {
        const { error } = await supabase.from('tasks').insert([newTask]);
        if (error) {
          console.error('Supabase task insert error:', error);
        }
      } catch (err) {
        console.error('Failed to insert task to Supabase:', err);
      }
    }

    onAddTask(newTask);
    setNewTitle('');
  };

  // CSV Import: Trigger hidden file input
  const handleTriggerCsvInput = () => {
    sound.playClick();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // CSV Parsing Logic via FileReader with user_id attached
  const handleFileUpload = async (e) => {
    const file = e?.target?.files?.[0] || (e instanceof File ? e : null);
    if (!file) return;

    // Fetch current user session
    let userId = authUser?.id;
    if (supabase && !userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (!text || typeof text !== 'string') return;

        const lines = text.split(/\r\n|\n|\r/).map(line => line.trim()).filter(Boolean);
        if (lines.length === 0) {
          setCsvStatusMessage('CSV file is empty.');
          return;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const newTasks = [];

        // Check header row for dynamic column positions
        let headerColMap = null;
        if (lines.length > 0) {
          const firstLineCols = lines[0].split(',').map(c => c.trim().toLowerCase().replace(/^["']|["']$/g, ''));
          if (firstLineCols.some(c => c.includes('desc') || c.includes('title') || c.includes('task'))) {
            headerColMap = {
              desc: firstLineCols.findIndex(c => c.includes('desc') || c.includes('title') || c.includes('task')),
              date: firstLineCols.findIndex(c => c.includes('date')),
              time: firstLineCols.findIndex(c => c.includes('time')),
              priority: firstLineCols.findIndex(c => c.includes('prior')),
              category: firstLineCols.findIndex(c => c.includes('cat') || c.includes('tag') || c.includes('course') || c.includes('subject')),
            };
          }
        }

        // Custom given category from Quick-Add bar if CSV row has no category
        const customFallbackCategory = (newTag && newTag.trim() ? newTag.trim() : (activeTag !== 'ALL' ? activeTag : 'WORK')).replace(/^#/, '').toUpperCase();

        lines.forEach((line, index) => {
          // Destructure 5 variables from the CSV row: [description, date, time, priority, category]
          const [description, date, time, priority, category] = line
            .split(',')
            .map(col => col.trim().replace(/^["']|["']$/g, ''));

          if (!description) return;

          // Skip header row
          if (index === 0 && (
            description.toLowerCase().includes('description') ||
            description.toLowerCase().includes('title') ||
            description.toLowerCase().includes('task')
          )) {
            return;
          }

          // Check if header mapped category from a different column
          let rowCategory = category;
          if ((!rowCategory || !rowCategory.trim()) && headerColMap && headerColMap.category !== -1) {
            const rawCols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
            rowCategory = rawCols[headerColMap.category];
          }

          let formattedDate = date || todayStr;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
            const parsed = new Date(formattedDate);
            formattedDate = !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : todayStr;
          }

          let formattedTime = time || '10:00';
          if (!/^\d{1,2}:\d{2}$/.test(formattedTime)) {
            formattedTime = '10:00';
          }
          if (formattedTime.length === 4) formattedTime = '0' + formattedTime;

          let rawPriority = (priority || 'MEDIUM').toUpperCase();
          let formattedPriority = 'MEDIUM';
          if (rawPriority.includes('HIGH') || rawPriority.includes('1') || rawPriority.includes('!')) {
            formattedPriority = 'HIGH';
          } else if (rawPriority.includes('LOW') || rawPriority.includes('3')) {
            formattedPriority = 'LOW';
          }

          // Clean custom category
          const cleanCustomCat = (rowCategory && rowCategory.trim()) ? rowCategory.trim().replace(/^#/, '').toUpperCase() : '';

          // Construct task object: strictly map description -> title, category -> tag, completed -> false, user_id
          const taskObj = {
            id: 'task-csv-' + Date.now() + '-' + index + '-' + Math.random().toString(36).substr(2, 4),
            title: description,
            tag: category ? (cleanCustomCat || customFallbackCategory) : customFallbackCategory,
            date: formattedDate,
            time: formattedTime,
            priority: formattedPriority,
            completed: false,
            user_id: userId || null,
            notes: 'Imported from CSV',
            reminder: '15m',
            createdAt: Date.now() + index,
          };

          newTasks.push(taskObj);
        });

        if (newTasks.length > 0) {
          sound.playAdd();

          // Insert into Supabase tasks table with user_id payload
          if (supabase && userId) {
            try {
              const { error } = await supabase.from('tasks').insert(newTasks);
              if (error) console.error('Supabase CSV insert error:', error);
            } catch (err) {
              console.error('Supabase CSV insert failed:', err);
            }
          }

          if (onImportTasks) {
            onImportTasks(newTasks);
          } else {
            storage.addTasks(newTasks);
          }

          const appliedTag = newTasks[0].tag;
          setCsvStatusMessage(`SUCCESS: Imported ${newTasks.length} tasks under category #${appliedTag}!`);
          setTimeout(() => setCsvStatusMessage(''), 5000);
        } else {
          setCsvStatusMessage('No valid task rows could be parsed from the CSV file.');
        }
      } catch (err) {
        console.error('CSV parse error:', err);
        setCsvStatusMessage('Error parsing CSV file format.');
      }
    };

    reader.readAsText(file);
  };

  const handleCsvUpload = handleFileUpload;

  // Batch retag tasks (e.g. to fix tasks currently tagged #CSV to a custom category like PCECT303 or STUDY)
  const handleRetagCsvTasks = async () => {
    const targetTag = prompt('Enter custom category/tag for these tasks (e.g. PCECT303, STUDY, WORK):', newTag || 'STUDY');
    if (!targetTag || !targetTag.trim()) return;
    const cleanTag = targetTag.trim().replace(/^#/, '').toUpperCase();

    // Determine tasks to re-tag: tasks with current active tag or tasks tagged CSV
    const tasksToRetag = activeTag !== 'ALL' 
      ? tasks.filter(t => (t.tag || '').toUpperCase() === activeTag.toUpperCase())
      : tasks.filter(t => (t.tag || '').toUpperCase() === 'CSV');

    if (tasksToRetag.length === 0) {
      alert(`No tasks found with tag #${activeTag !== 'ALL' ? activeTag : 'CSV'}.`);
      return;
    }

    sound.playAdd();

    if (supabase) {
      try {
        const ids = tasksToRetag.map(t => t.id);
        await supabase.from('tasks').update({ tag: cleanTag }).in('id', ids);
      } catch (e) {
        console.error('Failed to update tags in Supabase:', e);
      }
    }

    tasksToRetag.forEach(t => {
      onUpdateTask(t.id, { tag: cleanTag });
    });

    setActiveTag(cleanTag);
    setCsvStatusMessage(`SUCCESS: Retagged ${tasksToRetag.length} tasks to #${cleanTag}!`);
    setTimeout(() => setCsvStatusMessage(''), 5000);
  };

  // Toggle Complete
  const handleToggle = async (task) => {
    const nextCompleted = !task.completed;
    if (nextCompleted) {
      sound.playComplete();
      const pendingOthers = tasks.filter(t => t.id !== task.id && !t.completed);
      if (pendingOthers.length === 0) {
        sound.playCelebration();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#000000', '#666666', '#ffffff'],
        });
      }
    } else {
      sound.playClick();
    }

    // Sync toggle status to Supabase
    if (supabase) {
      try {
        await supabase
          .from('tasks')
          .update({ completed: nextCompleted })
          .eq('id', task.id);
      } catch (err) {
        console.error('Supabase update failed:', err);
      }
    }

    onUpdateTask(task.id, { completed: nextCompleted });
  };

  // Delete Task
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    sound.playDelete();

    // Sync delete to Supabase
    if (supabase) {
      try {
        await supabase
          .from('tasks')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.error('Supabase delete failed:', err);
      }
    }

    onDeleteTask(id);
  };

  // Filter tasks based on search, category and view filter
  const filteredTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    return tasks.filter(task => {
      // Search text match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (task.title || '').toLowerCase().includes(q);
        const matchNotes = (task.notes || '').toLowerCase().includes(q);
        const matchTag = (task.tag || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNotes && !matchTag) return false;
      }

      // Tag filter
      if (activeTag !== 'ALL') {
        if ((task.tag || '').toUpperCase() !== activeTag.toUpperCase()) return false;
      }

      // View Filter
      if (viewFilter === 'today') {
        if (task.date !== today) return false;
      } else if (viewFilter === 'upcoming') {
        if (task.date <= today) return false;
      } else if (viewFilter === 'overdue') {
        if (task.date >= today || task.completed) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, activeTag, viewFilter]);

  // Multi-level sort:
  // 1. Sort chronologically in ascending order by task.date
  // 2. For identical dates, secondary sort by priority descending ('HIGH' > 'MEDIUM' > 'LOW')
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // 1. Primary Sort: Date ascending (earliest upcoming dates at the top)
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      // 2. Secondary Sort: Priority descending ('HIGH' > 'MEDIUM' > 'LOW')
      const rankA = PRIORITY_ORDER[(a.priority || '').toUpperCase()] || 0;
      const rankB = PRIORITY_ORDER[(b.priority || '').toUpperCase()] || 0;
      if (rankA !== rankB) {
        return rankB - rankA; // Higher rank first
      }

      // 3. Optional tie-breaker: Time ascending
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [filteredTasks]);

  // Task Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, percentage };
  }, [tasks]);

  // Export tasks as JSON backup
  const handleExportJson = () => {
    sound.playClick();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const todayStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("download", `retrocal_tasks_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4 font-mono">
      
      {/* Hidden File Input for CSV Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* CSV Status Feedback Banner */}
      {csvStatusMessage && (
        <div className="p-2 border-2 border-black bg-neutral-100 text-xs font-mono font-bold flex items-center gap-2 shadow-[2px_2px_0px_#000]">
          <span className="w-2.5 h-2.5 bg-black inline-block"></span>
          <span>{csvStatusMessage}</span>
        </div>
      )}

      {/* Quick Add Bar / Command Line */}
      <div className="border-2 border-black p-3 bg-white shadow-[3px_3px_0px_#000]">
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-black">
          <span className="font-pixel text-xs tracking-wider font-bold">
            &gt; QUICK-ADD TASK COMMAND
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerCsvInput}
              className="px-2 py-0.5 border border-black text-[10px] font-pixel bg-white hover:bg-black hover:text-white flex items-center gap-1 shadow-[1px_1px_0px_#000]"
              title="Import tasks from a CSV file"
            >
              <FileUp className="w-3 h-3" />
              <span>[+] IMPORT CSV</span>
            </button>
            <button
              onClick={() => setShowAdvancedAdd(!showAdvancedAdd)}
              className="text-[10px] font-pixel px-1.5 py-0.5 border border-black hover:bg-black hover:text-white"
            >
              {showAdvancedAdd ? '[- LESS]' : '[+ MORE OPTIONS]'}
            </button>
          </div>
        </div>

        <form onSubmit={handleQuickAdd} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type task description & press Enter..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 border-2 border-black px-2 py-1.5 text-xs font-mono bg-white focus:bg-neutral-50 outline-none"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-white border-2 border-black font-pixel text-xs font-bold hover:bg-black hover:text-white shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
            >
              + ADD
            </button>
          </div>

          {/* Quick task metadata inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
            <div>
              <label className="block text-[10px] text-neutral-600 font-pixel">DATE:</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full border border-black px-1.5 py-1 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-600 font-pixel">TIME:</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full border border-black px-1.5 py-1 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-600 font-pixel">PRIORITY:</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full border border-black px-1 py-1 text-xs bg-white font-mono"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-neutral-600 font-pixel">CATEGORY / TAG:</label>
              <input
                type="text"
                list="quick-add-tags"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value.toUpperCase().replace(/^#/, ''))}
                placeholder="e.g. WORK"
                className="w-full border border-black px-1.5 py-1 text-xs bg-white font-mono uppercase"
              />
              <datalist id="quick-add-tags">
                {allAvailableTags.map((t) => (
                  <option key={t} value={t}>#{t}</option>
                ))}
              </datalist>
            </div>
          </div>

          {showAdvancedAdd && (
            <div className="pt-2 border-t border-dashed border-black flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-pixel">REMINDER ALERT:</span>
                <select
                  value={newReminder}
                  onChange={(e) => setNewReminder(e.target.value)}
                  className="border border-black px-1 py-0.5 text-xs bg-white font-mono"
                >
                  <option value="none">None</option>
                  <option value="at_time">At time of task</option>
                  <option value="5m">5 mins before</option>
                  <option value="15m">15 mins before</option>
                  <option value="30m">30 mins before</option>
                  <option value="1h">1 hour before</option>
                </select>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Productivity Progress Bar */}
      <div className="border-2 border-black p-2 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-pixel text-[10px]">PROGRESS:</span>
          <div className="flex-1 bg-neutral-200 border border-black h-4 p-0.5 max-w-xs">
            <div
              className="bg-black h-full transition-all duration-300"
              style={{ width: `${stats.percentage}%` }}
            ></div>
          </div>
          <span className="font-pixel text-[10px]">{stats.percentage}%</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span>COMPLETED: <strong>{stats.completed}/{stats.total}</strong></span>
          <span className="border-l border-black pl-4">PENDING: <strong>{stats.pending}</strong></span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Quick View Filter Buttons */}
          <div className="flex items-center border border-black bg-white">
            {['all', 'today', 'upcoming', 'overdue'].map((f) => (
              <button
                key={f}
                onClick={() => { sound.playClick(); setViewFilter(f); }}
                className={`px-2 py-1 text-[10px] font-pixel uppercase ${viewFilter === f ? 'bg-black text-white' : 'hover:bg-neutral-100'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-black pl-7 pr-2 py-1 text-xs bg-white outline-none"
            />
          </div>
        </div>

        {/* Category Tag Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-pixel text-neutral-600 mr-1 flex-shrink-0">FILTER TAG:</span>
          {['ALL', ...allAvailableTags].map((tag) => (
            <button
              key={tag}
              onClick={() => { sound.playClick(); setActiveTag(tag); }}
              className={`px-1.5 py-0.5 border text-[10px] font-mono flex-shrink-0 ${
                activeTag === tag
                  ? 'bg-black text-white border-black font-bold'
                  : 'bg-white border-black hover:bg-neutral-100'
              }`}
            >
              #{tag}
            </button>
          ))}
          {/* Retag / Change Category Button if tasks are tagged #CSV */}
          {tasks.some(t => (t.tag || '').toUpperCase() === 'CSV') && (
            <button
              onClick={handleRetagCsvTasks}
              className="px-2 py-0.5 border border-black bg-neutral-200 hover:bg-black hover:text-white font-pixel text-[9px] flex-shrink-0 ml-1 shadow-[1px_1px_0px_#000]"
              title="Change all #CSV tasks to your custom category (e.g. PCECT303 or STUDY)"
            >
              [RETAG #CSV TASKS]
            </button>
          )}
        </div>
      </div>

      {/* Task Item List */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {sortedTasks.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-black bg-white space-y-2">
            <CheckSquare className="w-8 h-8 mx-auto opacity-30" />
            <p className="font-pixel text-xs text-neutral-600">NO TASKS FOUND</p>
            <p className="text-[10px] text-neutral-400">Use the quick-add bar above or import tasks via CSV.</p>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const isToday = task.date === new Date().toISOString().split('T')[0];
            const isOverdue = task.date < new Date().toISOString().split('T')[0] && !task.completed;

            return (
              <div
                key={task.id}
                className={`border-2 border-black p-2.5 bg-white transition-none shadow-[2px_2px_0px_#000] flex items-start gap-2.5 ${
                  task.completed ? 'opacity-50 bg-neutral-50' : ''
                }`}
              >
                {/* 1-bit Checkbox */}
                <button
                  onClick={() => handleToggle(task)}
                  className="mt-0.5 w-4 h-4 border-2 border-black bg-white flex items-center justify-center flex-shrink-0 hover:bg-neutral-200 active:scale-95"
                  title={task.completed ? "Mark as pending" : "Mark as completed"}
                >
                  {task.completed ? (
                    <span className="font-pixel text-[10px] leading-none">✕</span>
                  ) : null}
                </button>

                {/* Task Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-mono font-bold break-words ${task.completed ? 'line-through text-neutral-500' : ''}`}>
                      {task.title}
                    </span>
                  </div>

                  {/* Badges: Date, Time, Priority, Tag, Reminder */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                    {/* Date Badge */}
                    <span className={`px-1 py-0.2 border border-black flex items-center gap-0.5 ${
                      isToday ? 'bg-black text-white font-bold' : isOverdue ? 'bg-neutral-300 text-black font-bold' : 'bg-neutral-100'
                    }`}>
                      <CalendarIcon className="w-2.5 h-2.5" />
                      <span>{isToday ? 'TODAY' : task.date}</span>
                    </span>

                    {/* Time Badge */}
                    {task.time && (
                      <span className="px-1 py-0.2 border border-black bg-neutral-100 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{task.time}</span>
                      </span>
                    )}

                    {/* Priority Badge */}
                    <span className={`px-1 py-0.2 border border-black font-pixel text-[9px] ${
                      task.priority === 'HIGH' ? 'bg-black text-white font-bold' :
                      task.priority === 'MEDIUM' ? 'bg-neutral-200 text-black font-bold' :
                      'bg-white text-neutral-700'
                    }`}>
                      {task.priority || 'MED'} [{task.priority === 'HIGH' ? '!' : task.priority === 'MEDIUM' ? '!' : '!'}]
                    </span>

                    {/* Tag Badge */}
                    {task.tag && (
                      <span className="px-1 py-0.2 border border-black bg-white font-bold">
                        #{task.tag}
                      </span>
                    )}

                    {/* Reminder Badge */}
                    {task.reminder && task.reminder !== 'none' && (
                      <span className="px-1 py-0.2 border border-black bg-neutral-100 flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5 text-neutral-600" />
                        <span>{task.reminder}</span>
                      </span>
                    )}
                  </div>

                  {/* Notes snippet if present */}
                  {task.notes && (
                    <p className="text-[10px] text-neutral-600 font-mono italic truncate">
                      {task.notes}
                    </p>
                  )}
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => { sound.playClick(); onOpenEdit(task); }}
                    className="p-1 border border-black hover:bg-black hover:text-white"
                    title="Edit task details"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(task.id, e)}
                    className="p-1 border border-black hover:bg-black hover:text-white"
                    title="Delete task"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desk Bottom Bar: Bulk Actions & JSON Export */}
      <div className="pt-2 border-t border-black flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          {stats.completed > 0 && (
            <button
              onClick={() => { sound.playDelete(); onClearCompleted(); }}
              className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-pixel text-[10px] flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>CLEAR COMPLETED ({stats.completed})</span>
            </button>
          )}
        </div>

        {/* CSV Import & Export Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleTriggerCsvInput}
            className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-pixel text-[10px] flex items-center gap-1"
            title="Import tasks from a CSV file (Description,Date,Time,Priority,Category)"
          >
            <FileUp className="w-3 h-3" />
            <span>[+] IMPORT CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-pixel text-[10px] flex items-center gap-1"
            title="Export tasks to JSON backup"
          >
            <Download className="w-3 h-3" />
            <span>EXPORT JSON</span>
          </button>
        </div>
      </div>

    </div>
  );
}
