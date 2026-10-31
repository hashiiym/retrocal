import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Plus, Check, ExternalLink, RefreshCw 
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, 
  parseISO, addWeeks, subWeeks 
} from 'date-fns';
import { sound } from '../utils/audio';

export default function CalendarDesk({
  tasks,
  googleEvents = [],
  activeView,
  setActiveView,
  selectedDate,
  onSelectDate,
  onQuickAddTaskOnDate,
  onOpenGoogleSync,
  onToggleTask,
  onEditTask,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDayObj, setSelectedDayObj] = useState(new Date());

  // Keep in sync with selectedDate prop
  React.useEffect(() => {
    if (selectedDate) {
      try {
        const parsed = parseISO(selectedDate);
        if (!isNaN(parsed.getTime())) {
          setSelectedDayObj(parsed);
        }
      } catch {}
    }
  }, [selectedDate]);

  // Navigation handlers
  const handlePrev = () => {
    sound.playClick();
    if (activeView === 'month') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else if (activeView === 'week') {
      const nextDay = subWeeks(selectedDayObj, 1);
      setSelectedDayObj(nextDay);
      onSelectDate(format(nextDay, 'yyyy-MM-dd'));
    } else {
      const nextDay = addDays(selectedDayObj, -1);
      setSelectedDayObj(nextDay);
      onSelectDate(format(nextDay, 'yyyy-MM-dd'));
    }
  };

  const handleNext = () => {
    sound.playClick();
    if (activeView === 'month') {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else if (activeView === 'week') {
      const nextDay = addWeeks(selectedDayObj, 1);
      setSelectedDayObj(nextDay);
      onSelectDate(format(nextDay, 'yyyy-MM-dd'));
    } else {
      const nextDay = addDays(selectedDayObj, 1);
      setSelectedDayObj(nextDay);
      onSelectDate(format(nextDay, 'yyyy-MM-dd'));
    }
  };

  const handleToday = () => {
    sound.playClick();
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDayObj(today);
    onSelectDate(format(today, 'yyyy-MM-dd'));
  };

  // Select a day
  const handleDayClick = (day) => {
    sound.playClick();
    setSelectedDayObj(day);
    const dateStr = format(day, 'yyyy-MM-dd');
    onSelectDate(dateStr);
  };

  // Combine tasks & Google Events for a specific date string
  const getItemsForDate = (dateStr) => {
    const dayTasks = tasks.filter(t => t.date === dateStr).map(t => ({ ...t, isTask: true }));
    const dayGCal = googleEvents.filter(e => e.date === dateStr).map(e => ({ ...e, isGCal: true }));
    return [...dayTasks, ...dayGCal];
  };

  // Header Title based on view
  const headerTitle = useMemo(() => {
    if (activeView === 'month') {
      return format(currentMonth, 'MMMM yyyy').toUpperCase();
    }
    if (activeView === 'week') {
      const weekStart = startOfWeek(selectedDayObj, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(selectedDayObj, { weekStartsOn: 0 });
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`.toUpperCase();
    }
    return format(selectedDayObj, 'EEEE, MMMM d, yyyy').toUpperCase();
  }, [activeView, currentMonth, selectedDayObj]);

  // MONTH VIEW MATRIX GENERATION
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // WEEK VIEW DAYS
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDayObj, { weekStartsOn: 0 });
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [selectedDayObj]);

  // DAILY VIEW HOURS (08:00 to 22:00)
  const dayHours = useMemo(() => {
    const hours = [];
    for (let i = 8; i <= 21; i++) {
      hours.push(String(i).padStart(2, '0') + ':00');
    }
    return hours;
  }, []);

  return (
    <div className="space-y-3 font-mono">
      
      {/* Calendar Controls Bar */}
      <div className="retro-box-sm p-2.5 bg-neutral-100 flex flex-col md:flex-row items-center justify-between gap-2 text-xs">
        
        {/* Left: View Switcher */}
        <div className="flex items-center gap-1 w-full md:w-auto">
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              onClick={() => { sound.playClick(); setActiveView(v); }}
              className={`px-2.5 py-1 text-[11px] font-pixel border border-black uppercase flex-1 md:flex-none ${activeView === v ? 'bg-black text-white font-bold' : 'bg-white hover:bg-neutral-200'}`}
            >
              {v === 'month' ? 'MONTH' : v === 'week' ? 'WEEK' : 'DAY'}
            </button>
          ))}
        </div>

        {/* Center: Title & Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="w-7 h-7 border border-black bg-white hover:bg-black hover:text-white flex items-center justify-center font-bold shadow-[1px_1px_0px_#000]"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-pixel text-[10px] shadow-[1px_1px_0px_#000]"
          >
            TODAY
          </button>

          <span className="font-pixel font-bold text-xs sm:text-sm px-2 text-center min-w-[170px]">
            {headerTitle}
          </span>

          <button
            onClick={handleNext}
            className="w-7 h-7 border border-black bg-white hover:bg-black hover:text-white flex items-center justify-center font-bold shadow-[1px_1px_0px_#000]"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Google Calendar Status & Connect */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { sound.playClick(); onOpenGoogleSync(); }}
            className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white text-[11px] font-mono flex items-center gap-1.5 shadow-[1px_1px_0px_#000]"
            title="Configure Google Calendar Integration"
          >
            <span className="w-2 h-2 rounded-full bg-black inline-block"></span>
            <span>G-CAL: {googleEvents.length} SYNCED</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: MONTHLY MATRIX */}
      {activeView === 'month' && (
        <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b-2 border-black bg-neutral-200 text-center font-pixel text-[10px] py-1.5 font-bold">
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          {/* Matrix Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-black">
            {monthDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDayObj);
              const isToday = isSameDay(day, new Date());
              const items = getItemsForDate(dateStr);
              const taskCount = items.filter(i => i.isTask).length;
              const gcalCount = items.filter(i => i.isGCal).length;

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[75px] sm:min-h-[95px] p-1 flex flex-col justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-neutral-100 ring-2 ring-black ring-inset' : 'hover:bg-neutral-50'
                  } ${!isCurrentMonth ? 'bg-neutral-50 opacity-40' : ''}`}
                >
                  {/* Date number header */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span 
                      className={`w-5 h-5 flex items-center justify-center font-mono font-bold ${
                        isToday ? 'bg-black text-white' : ''
                      }`}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Dot indicators */}
                    <div className="flex items-center gap-0.5">
                      {taskCount > 0 && (
                        <span className="text-[9px] font-pixel bg-black text-white px-1 leading-tight" title={`${taskCount} tasks`}>
                          {taskCount}T
                        </span>
                      )}
                      {gcalCount > 0 && (
                        <span className="text-[9px] font-pixel border border-black px-0.5 leading-tight" title={`${gcalCount} Google events`}>
                          G
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preview Items */}
                  <div className="space-y-0.5 mt-1 overflow-hidden flex-1">
                    {items.slice(0, 2).map((item, i) => (
                      <div
                        key={i}
                        className={`text-[9px] sm:text-[10px] truncate px-1 border border-black font-mono leading-tight ${
                          item.isGCal 
                            ? 'bg-neutral-100 italic border-dashed' 
                            : item.completed 
                            ? 'line-through text-neutral-400 bg-white' 
                            : 'bg-white font-medium'
                        }`}
                        title={item.title}
                      >
                        {item.isGCal ? `[G] ${item.title}` : `• ${item.title}`}
                      </div>
                    ))}
                    {items.length > 2 && (
                      <div className="text-[9px] font-mono text-neutral-600 pl-1">
                        +{items.length - 2} more...
                      </div>
                    )}
                  </div>

                  {/* Add task shortcut button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAddTaskOnDate(dateStr);
                    }}
                    className="self-end text-[9px] font-pixel border border-black px-1 opacity-0 hover:opacity-100 sm:group-hover:opacity-100 hover:bg-black hover:text-white"
                    title={`Add task on ${dateStr}`}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: WEEKLY VIEW (7-Column Schedule) */}
      {activeView === 'week' && (
        <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000] overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[700px] divide-x-2 divide-black">
            {weekDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDayObj);
              const items = getItemsForDate(dateStr);

              return (
                <div key={idx} className="flex flex-col min-h-[380px]">
                  {/* Column Header */}
                  <div 
                    onClick={() => handleDayClick(day)}
                    className={`p-2 border-b-2 border-black text-center cursor-pointer ${
                      isToday ? 'bg-black text-white' : isSelected ? 'bg-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200'
                    }`}
                  >
                    <div className="text-[10px] font-pixel font-bold uppercase">{format(day, 'EEE')}</div>
                    <div className="text-base font-mono font-bold">{format(day, 'd')}</div>
                  </div>

                  {/* Schedule items for this day */}
                  <div className="p-1.5 space-y-1.5 flex-1 overflow-y-auto bg-neutral-50">
                    {items.length === 0 ? (
                      <div className="text-center text-[10px] text-neutral-400 py-6 italic">
                        Empty
                      </div>
                    ) : (
                      items.map((item, i) => (
                        <div
                          key={i}
                          className={`p-1.5 border border-black text-xs font-mono shadow-[1px_1px_0px_#000] ${
                            item.isGCal 
                              ? 'bg-neutral-200 border-l-4 border-l-black' 
                              : item.completed 
                              ? 'bg-neutral-100 opacity-60 line-through' 
                              : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-neutral-600 mb-0.5">
                            <span className="font-bold">
                              {item.isGCal ? `G-CAL` : item.time || 'All Day'}
                            </span>
                            {item.isGCal && <span>{item.startTime}</span>}
                          </div>

                          <div className="font-bold text-[11px] leading-tight break-words">
                            {item.title}
                          </div>

                          {item.location && (
                            <div className="text-[9px] text-neutral-600 truncate mt-0.5">
                              📍 {item.location}
                            </div>
                          )}

                          {item.isTask && (
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-neutral-300">
                              <button
                                onClick={() => onToggleTask(item)}
                                className="text-[10px] font-pixel underline hover:bg-black hover:text-white px-1"
                              >
                                {item.completed ? '[DONE]' : '[COMPLETE]'}
                              </button>
                              <button
                                onClick={() => onEditTask(item)}
                                className="text-[10px] font-pixel hover:bg-black hover:text-white px-1"
                              >
                                EDIT
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add task quick button */}
                  <div className="p-1 border-t border-black bg-white text-center">
                    <button
                      onClick={() => onQuickAddTaskOnDate(dateStr)}
                      className="w-full text-[10px] font-pixel border border-black py-0.5 hover:bg-black hover:text-white"
                    >
                      + ADD
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: DAILY VIEW (Hourly Agenda Timeline) */}
      {activeView === 'day' && (
        <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
          {/* Day Banner */}
          <div className="bg-neutral-100 border-b-2 border-black p-3 flex items-center justify-between">
            <div>
              <h3 className="font-pixel text-sm font-bold">
                {format(selectedDayObj, 'EEEE, MMMM d, yyyy').toUpperCase()}
              </h3>
              <p className="text-xs font-mono text-neutral-600 mt-0.5">
                Total Agenda: {getItemsForDate(format(selectedDayObj, 'yyyy-MM-dd')).length} items scheduled
              </p>
            </div>
            <button
              onClick={() => onQuickAddTaskOnDate(format(selectedDayObj, 'yyyy-MM-dd'))}
              className="retro-btn px-3 py-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>SCHEDULE TASK</span>
            </button>
          </div>

          {/* Hourly Timeline */}
          <div className="divide-y divide-black max-h-[500px] overflow-y-auto">
            {dayHours.map((hourStr, idx) => {
              const dateStr = format(selectedDayObj, 'yyyy-MM-dd');
              const allDayItems = getItemsForDate(dateStr);
              
              // Find items matching this hour
              const hourItems = allDayItems.filter(item => {
                const itemTime = item.isGCal ? item.startTime : item.time;
                if (!itemTime) return false;
                const itemHour = itemTime.split(':')[0];
                const gridHour = hourStr.split(':')[0];
                return itemHour === gridHour;
              });

              return (
                <div key={idx} className="flex min-h-[50px] group hover:bg-neutral-50 transition-colors">
                  {/* Left Hour Column */}
                  <div className="w-16 sm:w-20 border-r-2 border-black p-2 font-mono text-xs font-bold bg-neutral-100 flex items-start justify-center flex-shrink-0 select-none">
                    {hourStr}
                  </div>

                  {/* Right Slot Items */}
                  <div className="flex-1 p-2 space-y-1 relative">
                    {hourItems.length === 0 ? (
                      <button
                        onClick={() => {
                          const dateStr = format(selectedDayObj, 'yyyy-MM-dd');
                          onQuickAddTaskOnDate(dateStr, hourStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[10px] font-pixel text-neutral-400 hover:text-black border border-dashed border-neutral-400 hover:border-black px-2 py-1 w-full text-left"
                      >
                        + Click to schedule at {hourStr}
                      </button>
                    ) : (
                      hourItems.map((item, i) => (
                        <div
                          key={i}
                          className={`p-2 border-2 border-black flex items-start justify-between gap-2 shadow-[2px_2px_0px_#000] ${
                            item.isGCal 
                              ? 'bg-neutral-100 border-l-8 border-l-black' 
                              : item.completed 
                              ? 'bg-neutral-50 opacity-60 line-through' 
                              : 'bg-white'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-pixel text-[9px] bg-black text-white px-1">
                                {item.isGCal ? 'GOOGLE CALENDAR' : 'RETRO TASK'}
                              </span>
                              <span className="font-mono text-xs font-bold">
                                {item.isGCal ? `${item.startTime} - ${item.endTime}` : item.time}
                              </span>
                            </div>

                            <div className="font-mono text-sm font-bold mt-1">
                              {item.title}
                            </div>

                            {item.description && (
                              <p className="text-xs text-neutral-600 mt-0.5">{item.description}</p>
                            )}

                            {item.location && (
                              <div className="text-xs text-neutral-700 mt-0.5">
                                📍 {item.location}
                              </div>
                            )}
                          </div>

                          {item.isTask && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onToggleTask(item)}
                                className="px-2 py-1 border border-black text-xs font-pixel bg-white hover:bg-black hover:text-white"
                              >
                                {item.completed ? 'UNDONE' : 'CHECK'}
                              </button>
                              <button
                                onClick={() => onEditTask(item)}
                                className="px-2 py-1 border border-black text-xs font-pixel bg-white hover:bg-black hover:text-white"
                              >
                                EDIT
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unified Legend Bar */}
      <div className="p-2 border border-black bg-white flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-black bg-white inline-block"></span>
            <span>RetroCal Task</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-black bg-neutral-300 inline-block"></span>
            <span>Google Calendar Sync Event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-black inline-block"></span>
            <span>Today's Date</span>
          </div>
        </div>

        <button
          onClick={() => { sound.playClick(); onOpenGoogleSync(); }}
          className="underline font-bold hover:bg-black hover:text-white px-1"
        >
          Manage Google Calendar Sync &gt;&gt;
        </button>
      </div>

    </div>
  );
}
