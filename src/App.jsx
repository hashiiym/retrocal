import React, { useState, useEffect } from 'react';
import RetroMenuBar from './components/RetroMenuBar';
import RetroWindow from './components/RetroWindow';
import TaskDesk from './components/TaskDesk';
import CalendarDesk from './components/CalendarDesk';
import TaskModal from './components/TaskModal';
import AuthModal from './components/AuthModal';
import GoogleSyncModal from './components/GoogleSyncModal';
import ApiGuideModal from './components/ApiGuideModal';
import RetroAlertModal from './components/RetroAlertModal';
import HelpModal from './components/HelpModal';
import RetroPomodoro from './RetroPomodoro';
import SyllabusDesk from './SyllabusDesk';
import { storage } from './utils/storage';
import { notifications } from './utils/notifications';
import { googleCalendar } from './utils/googleCalendar';
import { sound } from './utils/audio';
import { CheckSquare, Calendar as CalendarIcon, Cpu, HelpCircle, Layers } from 'lucide-react';

export default function App() {
  // Application State
  const [tasks, setTasks] = useState(() => storage.getTasks());
  const [googleEvents, setGoogleEvents] = useState(() => googleCalendar.getEvents());
  const [user, setUser] = useState(() => storage.getUser());
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeCalendarView, setActiveCalendarView] = useState('month'); // 'month', 'week', 'day'
  const [activeDeskTab, setActiveDeskTab] = useState('dual'); // 'dual', 'tasks', 'calendar'
  const [isInverted, setIsInverted] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(notifications.permission);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [modalDefaultTime, setModalDefaultTime] = useState('10:00');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState(false);
  const [isApiGuideModalOpen, setIsApiGuideModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);

  // Draggable Pomodoro Flip Clock popup state
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [pomodoroTimeStr, setPomodoroTimeStr] = useState('25:00');
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);

  // Academic Syllabus Desk overlay/modal state
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);

  // Initialize storage listeners & real-time sync
  useEffect(() => {
    const unsubTasks = storage.subscribe((updatedTasks) => {
      setTasks(updatedTasks);
    });

    const unsubGCal = googleCalendar.subscribe((evts) => {
      setGoogleEvents(evts);
    });

    const unsubAlerts = notifications.onAlert((alertObj) => {
      setCurrentAlert(alertObj);
    });

    // Start background task reminder checker
    notifications.startTaskReminderCheck(() => storage.getTasks());

    return () => {
      unsubTasks();
      unsubGCal();
      unsubAlerts();
      notifications.stopTaskReminderCheck();
    };
  }, []);

  // Request browser push notification
  const handleRequestNotification = async () => {
    const result = await notifications.requestPermission();
    setNotificationPermission(result);
  };

  // Task Operations
  const handleAddTask = (taskData) => {
    storage.addTask(taskData);
  };

  const handleUpdateTask = (id, updates) => {
    storage.updateTask(id, updates);
  };

  const handleDeleteTask = (id) => {
    storage.deleteTask(id);
  };

  const handleClearCompleted = () => {
    storage.clearCompleted();
  };

  const handleImportTasks = (newTasks) => {
    storage.addTasks(newTasks);
  };

  const handleOpenEditTask = (task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleQuickAddTaskOnDate = (dateStr, timeStr = '10:00') => {
    setSelectedDate(dateStr);
    setModalDefaultTime(timeStr);
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleSaveModalTask = (taskData) => {
    if (editingTask) {
      storage.updateTask(editingTask.id, taskData);
    } else {
      storage.addTask(taskData);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col retro-desktop-bg ${isInverted ? 'inverted' : ''}`}>
      {/* Top Retro Menu Bar */}
      <RetroMenuBar
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenGoogleSync={() => setIsGoogleSyncModalOpen(true)}
        onOpenApiGuide={() => setIsApiGuideModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onToggleInvert={() => setIsInverted(!isInverted)}
        isInverted={isInverted}
        activeView={activeCalendarView}
        setActiveView={setActiveCalendarView}
        notificationPermission={notificationPermission}
        onRequestNotification={handleRequestNotification}
        user={user}
        isGCalConnected={googleCalendar.connected}
        isPomodoroOpen={isPomodoroOpen}
        onTogglePomodoro={() => setIsPomodoroOpen(!isPomodoroOpen)}
        pomodoroTimeStr={pomodoroTimeStr}
        isPomodoroRunning={isPomodoroRunning}
        isSyllabusOpen={isSyllabusOpen}
        onToggleSyllabus={() => setIsSyllabusOpen(!isSyllabusOpen)}
      />

      {/* Draggable Retro Pomodoro Flip Clock Window */}
      <RetroPomodoro
        isOpen={isPomodoroOpen}
        onClose={() => setIsPomodoroOpen(false)}
        onTimerTick={(timeStr, running) => {
          setPomodoroTimeStr(timeStr);
          setIsPomodoroRunning(running);
        }}
      />

      {/* Main Workspace Desktop Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 space-y-4">
        
        {/* Workspace Desktop Header & Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-2 border-black bg-white p-2.5 shadow-[3px_3px_0px_#000]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-xs sm:text-sm font-bold">
                RETROCAL DESK WORKSTATION
              </span>
              <span className="text-[10px] bg-black text-white px-1.5 py-0.5 font-mono">
                B&W MONOCHROME
              </span>
            </div>
            <p className="text-[11px] font-mono text-neutral-600 mt-0.5">
              Distraction-free productivity with cloud sync & external calendar overlay.
            </p>
          </div>

          {/* Desktop Layout Toggles: Dual Split, Tasks Only, Calendar Only */}
          <div className="flex items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => { sound.playClick(); setActiveDeskTab('dual'); }}
              className={`px-2 py-1 text-[11px] font-pixel border border-black flex-1 sm:flex-none ${activeDeskTab === 'dual' ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100'}`}
              title="Dual split desk view"
            >
              DUAL SPLIT
            </button>
            <button
              onClick={() => { sound.playClick(); setActiveDeskTab('tasks'); }}
              className={`px-2 py-1 text-[11px] font-pixel border border-black flex-1 sm:flex-none ${activeDeskTab === 'tasks' ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100'}`}
              title="To-Do List focus"
            >
              TASKS
            </button>
            <button
              onClick={() => { sound.playClick(); setActiveDeskTab('calendar'); }}
              className={`px-2 py-1 text-[11px] font-pixel border border-black flex-1 sm:flex-none ${activeDeskTab === 'calendar' ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100'}`}
              title="Visual Calendar focus"
            >
              CALENDAR
            </button>
            <div className="h-4 border-l border-black mx-0.5 hidden sm:inline-block"></div>
            <button
              onClick={() => { sound.playClick(); setIsSyllabusOpen(!isSyllabusOpen); }}
              className={`px-2 py-1 text-[11px] font-pixel border border-black flex items-center gap-1.5 shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] ${
                isSyllabusOpen ? 'bg-black text-white font-bold' : 'bg-white hover:bg-black hover:text-white'
              }`}
              title="Academic Syllabus & Revision Tracker"
            >
              <span>📚</span>
              <span>SYLLABUS</span>
            </button>
          </div>
        </div>

        {/* Windows Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* WINDOW 1: TO-DO TASK MANAGEMENT (Width: 5 cols in dual or 12 in tasks-only) */}
          {(activeDeskTab === 'dual' || activeDeskTab === 'tasks') && (
            <div className={`${activeDeskTab === 'dual' ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
              <RetroWindow
                title="TASK DESK & TO-DO"
                subtitle={`${tasks.filter(t => !t.completed).length} PENDING`}
                icon="☑"
                statusText={`TASKS FILE: ${tasks.length} RECORDS | SYNC: ONLINE`}
                headerActions={
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setModalDefaultTime('10:00');
                      setIsTaskModalOpen(true);
                    }}
                    className="retro-btn px-2 py-0.5 text-[9px] font-pixel"
                    title="Detailed Task Creator"
                  >
                    + NEW
                  </button>
                }
              >
                <TaskDesk
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onImportTasks={handleImportTasks}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onClearCompleted={handleClearCompleted}
                  onEditTask={handleOpenEditTask}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              </RetroWindow>
            </div>
          )}

          {/* WINDOW 2: VISUAL CALENDAR (Width: 7 cols in dual or 12 in cal-only) */}
          {(activeDeskTab === 'dual' || activeDeskTab === 'calendar') && (
            <div className={`${activeDeskTab === 'dual' ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
              <RetroWindow
                title="CALENDAR DESK"
                subtitle={activeCalendarView.toUpperCase()}
                icon="📅"
                statusText={`SELECTED DATE: ${selectedDate} | G-CAL: ${googleEvents.length} EVENTS`}
                headerActions={
                  <button
                    onClick={() => setIsGoogleSyncModalOpen(true)}
                    className="retro-btn px-2 py-0.5 text-[9px] font-pixel"
                    title="Google Calendar API Manager"
                  >
                    GOOGLE SYNC
                  </button>
                }
              >
                <CalendarDesk
                  tasks={tasks}
                  googleEvents={googleEvents}
                  activeView={activeCalendarView}
                  setActiveView={setActiveCalendarView}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onQuickAddTaskOnDate={handleQuickAddTaskOnDate}
                  onOpenGoogleSync={() => setIsGoogleSyncModalOpen(true)}
                  onToggleTask={(task) => {
                    handleUpdateTask(task.id, { completed: !task.completed });
                  }}
                  onEditTask={handleOpenEditTask}
                />
              </RetroWindow>
            </div>
          )}

        </div>

        {/* Bottom System Info & Architecture Banner */}
        <div className="border-2 border-black bg-white p-3 shadow-[2px_2px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[11px] font-bold">&gt; PRD COMPLIANCE SPECIFICATION</span>
              <span className="border border-black px-1 text-[10px] bg-neutral-100 font-bold">STRICT B&W</span>
            </div>
            <p className="text-[11px] text-neutral-600">
              Supabase/Firebase multi-device sync ready · Google Calendar REST API v3 connected · Web Push reminders active.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { sound.playClick(); setIsApiGuideModalOpen(true); }}
              className="retro-btn px-3 py-1 text-xs font-pixel flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>WHICH APIS ARE REQUIRED?</span>
            </button>
            <button
              onClick={() => { sound.playClick(); setIsHelpModalOpen(true); }}
              className="px-3 py-1 border border-black bg-neutral-100 hover:bg-black hover:text-white text-xs font-mono"
            >
              ABOUT / HELP
            </button>
          </div>
        </div>

      </main>

      {/* Retro Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={editingTask}
        onSave={handleSaveModalTask}
        defaultDate={selectedDate}
        defaultTime={modalDefaultTime}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        onUpdateUser={setUser}
      />

      <GoogleSyncModal
        isOpen={isGoogleSyncModalOpen}
        onClose={() => setIsGoogleSyncModalOpen(false)}
        onRefresh={() => setGoogleEvents(googleCalendar.getEvents())}
      />

      <ApiGuideModal
        isOpen={isApiGuideModalOpen}
        onClose={() => setIsApiGuideModalOpen(false)}
      />

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        onOpenApiGuide={() => setIsApiGuideModalOpen(true)}
      />

      <RetroAlertModal
        alert={currentAlert}
        onClose={() => setCurrentAlert(null)}
        onCompleteTask={(taskId) => {
          handleUpdateTask(taskId, { completed: true });
        }}
      />

      {/* Academic Syllabus Desk Modal Overlay */}
      <SyllabusDesk
        isOpen={isSyllabusOpen}
        onClose={() => setIsSyllabusOpen(false)}
      />
    </div>
  );
}
