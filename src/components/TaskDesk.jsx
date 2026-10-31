import React, { useState, useMemo } from 'react';
import { 
  Plus, Check, Trash2, Edit3, Calendar as CalendarIcon, 
  Clock, Tag, AlertCircle, Filter, Search, Download, CheckSquare, Square
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';

const TAG_OPTIONS = ['WORK', 'DEV', 'LIFE', 'HEALTH', 'RETRO', 'URGENT'];
const PRIORITY_OPTIONS = [
  { value: 'LOW', label: '[!] LOW', color: 'bg-neutral-100 text-neutral-800' },
  { value: 'MEDIUM', label: '[!!] MED', color: 'bg-neutral-200 text-black font-bold' },
  { value: 'HIGH', label: '[!!!] HIGH', color: 'bg-black text-white font-bold' },
];

export default function TaskDesk({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onClearCompleted,
  onEditTask,
  selectedDate,
  onSelectDate,
}) {
  // Quick-add state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('10:00');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newTag, setNewTag] = useState('WORK');
  const [newReminder, setNewReminder] = useState('15m');
  const [isExpandedAdd, setIsExpandedAdd] = useState(false);

  // Filters state
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, TODAY, UPCOMING, OVERDUE, DONE
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('ALL');

  // Sync date when parent changes selectedDate
  React.useEffect(() => {
    if (selectedDate) {
      setNewDate(selectedDate);
    }
  }, [selectedDate]);

  // Handle Quick Add
  const handleCreate = (e) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    sound.playAdd();
    onAddTask({
      title: newTitle.trim(),
      date: newDate,
      time: newTime,
      priority: newPriority,
      tag: newTag,
      reminder: newReminder,
      notes: '',
    });

    setNewTitle('');
  };

  // Toggle Complete
  const handleToggle = (task) => {
    const nextCompleted = !task.completed;
    if (nextCompleted) {
      sound.playComplete();
      // Check if all tasks completed for celebration
      const pendingOthers = tasks.filter(t => t.id !== task.id && !t.completed);
      if (pendingOthers.length === 0) {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#000000', '#666666', '#ffffff']
        });
      }
    } else {
      sound.playUncomplete();
    }
    onUpdateTask(task.id, { completed: nextCompleted });
  };

  // Delete Task
  const handleDelete = (id) => {
    sound.playDelete();
    onDeleteTask(id);
  };

  // Filter calculations
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchNotes = (task.notes || '').toLowerCase().includes(q);
        const matchTag = (task.tag || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNotes && !matchTag) return false;
      }

      // Tag filter
      if (selectedTag !== 'ALL' && task.tag !== selectedTag) {
        return false;
      }

      // Tab filter
      if (activeTab === 'TODAY') {
        return task.date === todayStr;
      }
      if (activeTab === 'UPCOMING') {
        return task.date > todayStr;
      }
      if (activeTab === 'OVERDUE') {
        return task.date < todayStr && !task.completed;
      }
      if (activeTab === 'DONE') {
        return task.completed;
      }
      return true;
    });
  }, [tasks, searchQuery, selectedTag, activeTab, todayStr]);

  // Stats
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const percentDone = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Export tasks as JSON
  const handleExportJSON = () => {
    sound.playClick();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `retrocal_tasks_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4 font-mono">
      
      {/* Quick Add Section */}
      <form onSubmit={handleCreate} className="retro-box-sm p-3 bg-white space-y-2">
        <div className="text-[11px] font-pixel font-bold flex items-center justify-between border-b border-black pb-1">
          <span>&gt; QUICK-ADD TASK COMMAND</span>
          <button
            type="button"
            onClick={() => { sound.playClick(); setIsExpandedAdd(!isExpandedAdd); }}
            className="text-[10px] underline hover:bg-black hover:text-white px-1"
          >
            {isExpandedAdd ? '[- SIMPLE]' : '[+ MORE OPTIONS]'}
          </button>
        </div>

        {/* Title Input + Add button */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Type task description & press Enter..."
            className="flex-1 border-2 border-black px-2 py-1.5 text-xs sm:text-sm font-mono bg-white focus:outline-none focus:bg-neutral-50 shadow-[1px_1px_0px_#000]"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className={`retro-btn px-3 py-1.5 text-xs font-pixel ${!newTitle.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD</span>
          </button>
        </div>

        {/* Expanded options: Date, Time, Priority, Tag, Reminder */}
        <div className={`grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs ${isExpandedAdd ? 'block' : 'hidden sm:grid'}`}>
          {/* Date */}
          <div>
            <label className="text-[10px] block font-bold mb-0.5">DATE:</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                if (onSelectDate) onSelectDate(e.target.value);
              }}
              className="w-full border border-black px-1.5 py-1 text-xs bg-white shadow-[1px_1px_0px_#000]"
            />
          </div>

          {/* Time */}
          <div>
            <label className="text-[10px] block font-bold mb-0.5">TIME:</label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full border border-black px-1.5 py-1 text-xs bg-white shadow-[1px_1px_0px_#000]"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-[10px] block font-bold mb-0.5">PRIORITY:</label>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="w-full border border-black px-1 py-1 text-xs bg-white shadow-[1px_1px_0px_#000]"
            >
              <option value="LOW">[!] LOW</option>
              <option value="MEDIUM">[!!] MED</option>
              <option value="HIGH">[!!!] HIGH</option>
            </select>
          </div>

          {/* Tag */}
          <div>
            <label className="text-[10px] block font-bold mb-0.5">CATEGORY:</label>
            <select
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="w-full border border-black px-1 py-1 text-xs bg-white shadow-[1px_1px_0px_#000]"
            >
              {TAG_OPTIONS.map(tag => (
                <option key={tag} value={tag}>#{tag}</option>
              ))}
            </select>
          </div>

          {/* Reminder */}
          <div>
            <label className="text-[10px] block font-bold mb-0.5">ALERT:</label>
            <select
              value={newReminder}
              onChange={(e) => setNewReminder(e.target.value)}
              className="w-full border border-black px-1 py-1 text-xs bg-white shadow-[1px_1px_0px_#000]"
            >
              <option value="none">No Alert</option>
              <option value="at_time">At Time</option>
              <option value="5m">5m Before</option>
              <option value="15m">15m Before</option>
              <option value="1h">1h Before</option>
            </select>
          </div>
        </div>
      </form>

      {/* Progress & Stats Bar */}
      <div className="retro-box-sm p-2.5 bg-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="font-pixel text-[10px] whitespace-nowrap">PROGRESS:</span>
          {/* Retro ASCII Bar */}
          <div className="flex-1 sm:w-44 border border-black h-4 bg-white p-0.5 flex">
            <div 
              className="bg-black h-full transition-all duration-300" 
              style={{ width: `${percentDone}%` }}
            ></div>
          </div>
          <span className="font-mono text-[11px] font-bold">{percentDone}%</span>
        </div>

        <div className="text-[11px] font-mono flex items-center gap-3">
          <span>COMPLETED: <strong>{completedCount}</strong>/{totalCount}</span>
          <span className="text-neutral-400">|</span>
          <span>PENDING: <strong>{totalCount - completedCount}</strong></span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="space-y-2">
        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'TODAY', 'UPCOMING', 'OVERDUE', 'DONE'].map(tab => (
              <button
                key={tab}
                onClick={() => { sound.playClick(); setActiveTab(tab); }}
                className={`px-2.5 py-1 text-[11px] font-pixel border border-black transition-none whitespace-nowrap ${activeTab === tab ? 'bg-black text-white' : 'bg-white hover:bg-neutral-200'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full sm:w-48 border border-black px-2 py-1 text-xs bg-white pl-6"
            />
            <Search className="w-3 h-3 absolute left-2 top-2 text-neutral-500" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1 text-xs font-bold px-1 hover:bg-black hover:text-white"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-1 flex-wrap text-[10px]">
          <span className="font-bold mr-1">FILTER TAG:</span>
          <button
            onClick={() => { sound.playClick(); setSelectedTag('ALL'); }}
            className={`px-1.5 py-0.5 border border-black ${selectedTag === 'ALL' ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100'}`}
          >
            #ALL
          </button>
          {TAG_OPTIONS.map(tag => (
            <button
              key={tag}
              onClick={() => { sound.playClick(); setSelectedTag(tag); }}
              className={`px-1.5 py-0.5 border border-black ${selectedTag === tag ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100'}`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000] divide-y-2 divide-black min-h-[220px]">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 font-mono text-xs space-y-2">
            <div className="font-pixel text-sm">[ NO TASKS FOUND ]</div>
            <p>No chores or tasks match the active filters.</p>
            <p className="text-[10px] text-neutral-400">Use the quick-add command bar above to create a new task.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isToday = task.date === todayStr;
            const isOverdue = task.date < todayStr && !task.completed;

            return (
              <div
                key={task.id}
                className={`p-2.5 sm:p-3 flex items-start justify-between gap-3 transition-colors ${task.completed ? 'bg-neutral-50 opacity-75' : 'hover:bg-neutral-50'}`}
              >
                {/* Left: Checkbox & Content */}
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  {/* Retro Clickable Checkbox */}
                  <button
                    onClick={() => handleToggle(task)}
                    className="mt-0.5 w-5 h-5 border-2 border-black bg-white flex items-center justify-center font-pixel font-bold text-xs hover:bg-neutral-100 active:bg-black active:text-white flex-shrink-0 shadow-[1px_1px_0px_#000]"
                    title={task.completed ? "Mark incomplete" : "Mark complete"}
                  >
                    {task.completed ? (
                      <span className="text-black font-extrabold text-[12px] leading-none">X</span>
                    ) : (
                      <span className="opacity-0 hover:opacity-20 text-[10px]">·</span>
                    )}
                  </button>

                  {/* Task Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className={`text-xs sm:text-sm font-mono break-words ${task.completed ? 'line-through text-neutral-500' : 'font-semibold text-black'}`}
                      >
                        {task.title}
                      </span>
                    </div>

                    {/* Metadata Chips: Date, Time, Priority, Tag */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[10px]">
                      {/* Date Badge */}
                      <span className={`px-1.5 py-0.5 border border-black flex items-center gap-1 ${isOverdue ? 'bg-black text-white font-bold' : isToday ? 'bg-neutral-200 font-bold' : 'bg-white'}`}>
                        <CalendarIcon className="w-2.5 h-2.5" />
                        {isToday ? 'TODAY' : task.date}
                      </span>

                      {/* Time */}
                      {task.time && (
                        <span className="px-1.5 py-0.5 border border-black bg-white flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {task.time}
                        </span>
                      )}

                      {/* Priority */}
                      <span className={`px-1.5 py-0.5 border border-black ${task.priority === 'HIGH' ? 'bg-black text-white font-bold' : task.priority === 'MEDIUM' ? 'bg-neutral-100' : 'text-neutral-600'}`}>
                        {task.priority === 'HIGH' ? 'HIGH [!]' : task.priority === 'MEDIUM' ? 'MED' : 'LOW'}
                      </span>

                      {/* Tag */}
                      {task.tag && (
                        <span className="px-1.5 py-0.5 border border-black bg-white font-mono">
                          #{task.tag}
                        </span>
                      )}

                      {/* Reminder icon */}
                      {task.reminder && task.reminder !== 'none' && (
                        <span className="px-1 py-0.5 border border-black bg-white text-[9px]" title={`Reminder set: ${task.reminder}`}>
                          🔔 {task.reminder}
                        </span>
                      )}
                    </div>

                    {/* Notes if any */}
                    {task.notes && (
                      <p className="text-[11px] text-neutral-600 mt-1 italic font-mono border-l-2 border-black pl-2 py-0.5">
                        {task.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => { sound.playClick(); onEditTask(task); }}
                    className="p-1 border border-black bg-white hover:bg-black hover:text-white text-xs shadow-[1px_1px_0px_#000]"
                    title="Edit task details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1 border border-black bg-white hover:bg-black hover:text-white text-xs shadow-[1px_1px_0px_#000]"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Batch Actions Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <button
              onClick={() => { sound.playDelete(); onClearCompleted(); }}
              className="retro-btn px-2 py-1 text-[10px] font-pixel"
            >
              CLEAR COMPLETED ({completedCount})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white text-[11px] font-mono flex items-center gap-1 shadow-[1px_1px_0px_#000]"
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
