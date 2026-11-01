import React, { useState, useEffect, useRef } from 'react';
import { supabase, storage, normalizeTag } from './utils/storage';
import { sound } from './utils/audio';
import { Send, Terminal, Trash2 } from 'lucide-react';

/**
 * Fetches and minifies the user's task and syllabus context to prevent 413 token overflow.
 * - Filters tasks to pending within next 7 days, capped at 25 items.
 * - Formats tasks as: ${t.date} ${t.time} | ${t.priority} | ${t.tag} | ${t.title}
 * - Replaces full syllabus array with a high-level subject progress summary.
 */
async function fetchMinifiedContext() {
  let allTasks = [];
  let allSyllabus = [];

  try {
    let userId = null;
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
      } catch (err) {
        console.warn('Supabase auth session read error:', err);
      }
    }

    // 1. Fetch pending tasks from Supabase
    if (supabase) {
      try {
        let taskQuery = supabase
          .from('tasks')
          .select('title, date, time, priority, tag, completed')
          .eq('completed', false);

        if (userId) {
          taskQuery = taskQuery.eq('user_id', userId);
        }

        const { data, error } = await taskQuery;
        if (!error && Array.isArray(data) && data.length > 0) {
          allTasks = data;
        }
      } catch (err) {
        console.warn('Supabase tasks fetch error:', err);
      }
    }

    // Fallback to local storage tasks if Supabase query returned no items
    if (allTasks.length === 0) {
      const localTasks = storage.getTasks() || [];
      allTasks = localTasks
        .filter(t => !t.completed)
        .map(t => ({
          title: t.title,
          date: t.date,
          time: t.time,
          priority: t.priority,
          tag: t.tag,
          completed: false,
        }));
    }

    // 2. Fetch syllabus items from Supabase for high-level progress summary
    if (supabase) {
      try {
        let sylQuery = supabase
          .from('syllabus')
          .select('subject, is_learned');

        if (userId) {
          sylQuery = sylQuery.eq('user_id', userId);
        }

        const { data, error } = await sylQuery;
        if (!error && Array.isArray(data) && data.length > 0) {
          allSyllabus = data;
        }
      } catch (err) {
        console.warn('Supabase syllabus fetch error:', err);
      }
    }

    // Fallback to local storage syllabus if Supabase query returned no items
    if (allSyllabus.length === 0) {
      try {
        const saved = localStorage.getItem('retrocal_syllabus_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            allSyllabus = parsed;
          }
        }
      } catch (err) {
        console.warn('Local storage syllabus fallback error:', err);
      }
    }
  } catch (err) {
    console.error('Failed to compile minified context:', err);
  }

  // Filter pending tasks for the next 7 days, max 25 items
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const filteredTasks = allTasks
    .filter(t => !t.completed && (!t.date || t.date <= maxDate))
    .sort((a, b) => {
      const dateA = a.date || today;
      const dateB = b.date || today;
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.time || '').localeCompare(b.time || '');
    })
    .slice(0, 25);

  // Minify tasks to compact string: ${t.date} ${t.time} | ${t.priority} | ${t.tag} | ${t.title}
  const minifiedTasksText = filteredTasks.length > 0
    ? filteredTasks
        .map(t => `${t.date || today} ${t.time || '10:00'} | ${t.priority || 'MEDIUM'} | ${t.tag || '#WORK'} | ${t.title}`)
        .join('\n')
    : 'NO PENDING TASKS FOR NEXT 7 DAYS.';

  // High-level syllabus progress summary grouped by subject (is_learned vs total)
  const syllabusBySubject = {};
  allSyllabus.forEach(item => {
    const subj = (item.subject || 'GENERAL STUDIES').toUpperCase().trim();
    if (!syllabusBySubject[subj]) {
      syllabusBySubject[subj] = { total: 0, learned: 0 };
    }
    syllabusBySubject[subj].total += 1;
    if (item.is_learned) syllabusBySubject[subj].learned += 1;
  });

  const syllabusSummaryText = Object.keys(syllabusBySubject).length > 0
    ? Object.entries(syllabusBySubject)
        .map(([subj, counts]) => `${subj}: ${counts.learned}/${counts.total} topics learned (${Math.round((counts.learned / counts.total) * 100)}%)`)
        .join('\n')
    : 'NO SYLLABUS TOPICS LOGGED.';

  // Combined compact plaintext format
  const compressedContext = `[PENDING TASKS (NEXT 7 DAYS, MAX 25)]:
${minifiedTasksText}

[SYLLABUS PROGRESS SUMMARY BY SUBJECT]:
${syllabusSummaryText}`;

  return {
    compressedContext,
    stats: {
      tasks: filteredTasks.length,
      subjects: Object.keys(syllabusBySubject).length,
      totalTopics: allSyllabus.length,
    },
  };
}

const INITIAL_MESSAGES = [
  {
    id: 'msg-init-1',
    role: 'system',
    text: 'RETROCAL AI TERMINAL v1.0 [GROQ LLAMA-3.3-70B-VERSATILE]\nONLINE. Connected to local workstation context.\nAsk me to optimize your study schedule, sequence high-priority tasks, or recommend syllabus review topics.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

export default function ChatDesk({ isOpen, onClose, setTasks }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextStats, setContextStats] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll terminal output to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
      // Preload context stats
      fetchMinifiedContext().then(ctx => {
        setContextStats(ctx.stats);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isLoading) return;

    sound.playClick();

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: 'msg-' + Date.now(),
      role: 'user',
      text: prompt,
      time: timestamp,
    };

    // a. Append user message to local chat UI
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // b. Fetch minified upcoming tasks (7 days, max 25) & syllabus progress summary
      const contextInfo = await fetchMinifiedContext();
      setContextStats(contextInfo.stats);

      // c. Send POST request to /api/chat with compressed plaintext contextData
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: prompt,
          contextData: contextInfo.compressedContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to reach AI endpoint`);
      }

      // Check if Groq AI returned a tool action
      if (data.type === 'action' && data.action === 'create_task') {
        const payload = data.payload || {};
        const taskTitle = payload.title || 'Untitled Task';

        // Retrieve active user's auth.uid() from Supabase session
        let activeUserId = null;
        if (supabase) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            activeUserId = sessionData?.session?.user?.id || null;
          } catch (authErr) {
            console.warn('Error fetching active auth session:', authErr);
          }
        }

        const newTaskRecord = {
          id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          title: taskTitle,
          date: payload.date || new Date().toISOString().split('T')[0],
          time: payload.time || '10:00',
          priority: payload.priority || 'MEDIUM',
          tag: normalizeTag(payload.tag || '#STUDY'),
          notes: payload.notes || '',
          reminder: payload.reminder || '15m',
          completed: false,
          createdAt: Date.now(),
          user_id: activeUserId,
        };

        // Execute Supabase insert into tasks table using active user's auth.uid()
        if (supabase && activeUserId) {
          const { error: insertError } = await supabase
            .from('tasks')
            .insert([newTaskRecord]);

          if (insertError) {
            console.error('Supabase task insert error:', insertError);
          }
        }

        // Persist to storage manager for multi-tab sync & offline durability
        storage.addTask(newTaskRecord);

        // Update local React tasks state so the dashboard reflects the new item immediately
        if (typeof setTasks === 'function') {
          setTasks(prev => {
            const list = Array.isArray(prev) ? prev : [];
            const filtered = list.filter(t => t.id !== newTaskRecord.id);
            return [newTaskRecord, ...filtered];
          });
        }

        // Append system confirmation message to chat history
        const systemMsg = {
          id: 'msg-task-created-' + Date.now(),
          role: 'system',
          text: `✅ Task created: [${taskTitle}]\n📅 Date: ${newTaskRecord.date} | ⏰ Time: ${newTaskRecord.time} | ⚡ Priority: ${newTaskRecord.priority} | 🏷️ Tag: ${newTaskRecord.tag}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => [...prev, systemMsg]);
        sound.playBeep?.();
      } else {
        // Standard text response (data.type === 'message' or fallback reply)
        const textContent = data.text || data.reply || 'NO DATA RETURNED FROM GROQ MAINFRAME.';
        const aiMsg = {
          id: 'msg-ai-' + Date.now(),
          role: 'assistant',
          text: textContent,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => [...prev, aiMsg]);
        sound.playBeep?.();
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = {
        id: 'msg-err-' + Date.now(),
        role: 'error',
        text: `[SYSTEM ALERT] ${err.message || 'Execution error communicating with Groq Core.'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  const handleClearHistory = () => {
    sound.playClick();
    setMessages([
      {
        id: 'msg-init-' + Date.now(),
        role: 'system',
        text: 'TERMINAL MEMORY PURGED. CONTEXT BUFFERS REINITIALIZED.\nReady for next operator prompt.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const quickPrompts = [
    'Add task: Revise Calculus tomorrow 10AM HIGH priority #STUDY',
    'How should I prioritize my incomplete tasks for today?',
    'Recommend the next syllabus topic I need to learn.',
    'Build a 2-hour Pomodoro study schedule for my pending items.',
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-[1px] select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl h-[88vh] max-h-[780px] flex flex-col font-mono animate-in fade-in zoom-in-95 duration-100 shadow-[8px_8px_0px_#000]">
        
        {/* Terminal Header Bar */}
        <div className="border-2 border-black bg-black text-white px-3 py-2 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-white border border-black inline-block"></span>
            <span className="font-pixel text-xs sm:text-sm tracking-wider font-bold">
              [&gt;] AI TERMINAL // GROQ-LLAMA-3.3-70B
            </span>
            <span className="hidden sm:inline text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 border border-neutral-600">
              TASK MANAGER
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearHistory}
              className="px-1.5 py-0.5 border border-neutral-500 bg-neutral-900 hover:bg-white hover:text-black text-[10px] flex items-center gap-1 cursor-pointer"
              title="Clear terminal buffer"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">CLR</span>
            </button>
            <button
              onClick={() => { sound.playClick(); onClose(); }}
              className="w-5 h-5 bg-white text-black hover:bg-neutral-300 border border-black flex items-center justify-center font-pixel text-xs font-bold cursor-pointer"
              title="Close Terminal Overlay"
            >
              ×
            </button>
          </div>
        </div>

        {/* Terminal Subheader Context Bar */}
        <div className="border-x-2 border-b-2 border-black bg-neutral-900 text-neutral-300 px-3 py-1 text-[11px] flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-green-400 font-bold">READY</span>
            <span className="text-neutral-500">|</span>
            <span>MODEL: llama-3.3-70b-versatile</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
            {contextStats ? (
              <span>
                LIVE CONTEXT: <strong className="text-white">{contextStats.tasks}</strong> TASKS (7D), <strong className="text-white">{contextStats.subjects}</strong> SUBJECTS
              </span>
            ) : (
              <span>FETCHING CONTEXT BUFFERS...</span>
            )}
          </div>
        </div>

        {/* Terminal Screen Body */}
        <div className="flex-1 bg-neutral-950 border-x-2 border-black p-3 sm:p-4 overflow-y-auto space-y-3 text-xs sm:text-sm select-text crt-effect">
          
          {messages.map((msg) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="p-2 border border-neutral-700 bg-neutral-900/80 text-neutral-300">
                  <div className="text-[10px] text-neutral-500 font-pixel mb-1 flex items-center justify-between">
                    <span>// SYSTEM CONSOLE</span>
                    <span>{msg.time}</span>
                  </div>
                  <pre className="font-mono whitespace-pre-wrap text-neutral-300 leading-relaxed text-xs">
                    {msg.text}
                  </pre>
                </div>
              );
            }

            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex flex-col items-end">
                  <div className="max-w-[85%] border-2 border-white bg-white text-black p-2.5 shadow-[3px_3px_0px_#555]">
                    <div className="text-[10px] font-bold font-pixel mb-1 flex items-center justify-between gap-4 text-neutral-700">
                      <span>OPERATOR &gt;&gt;</span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="font-mono whitespace-pre-wrap break-words leading-relaxed font-semibold">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            }

            if (msg.role === 'error') {
              return (
                <div key={msg.id} className="border-2 border-red-500 bg-red-950/60 text-red-200 p-2.5">
                  <div className="text-[10px] font-pixel text-red-400 mb-1 flex items-center justify-between">
                    <span>[!] RUNTIME EXCEPTION</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="font-mono whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                </div>
              );
            }

            // Assistant Response
            return (
              <div key={msg.id} className="flex flex-col items-start">
                <div className="max-w-[92%] border-2 border-neutral-600 bg-black text-green-400 p-3 shadow-[3px_3px_0px_#222]">
                  <div className="text-[10px] font-pixel text-neutral-400 mb-1.5 flex items-center justify-between border-b border-neutral-800 pb-1">
                    <span className="flex items-center gap-1 text-green-300">
                      <Terminal className="w-3 h-3" />
                      <span>GROQ AI &gt;&gt;</span>
                    </span>
                    <span className="text-neutral-500">{msg.time}</span>
                  </div>
                  <div className="font-mono whitespace-pre-wrap break-words leading-relaxed text-neutral-100 text-xs sm:text-[13px]">
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator with blinking cursor */}
          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="border border-green-500/50 bg-black/80 px-3 py-2 text-green-400 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 bg-green-400 animate-pulse"></span>
                <span className="font-mono text-xs">
                  COMPUTING OPTIMAL SCHEDULE WITH GROQ LLAMA-3.3-70B
                </span>
                <span className="inline-block animate-pulse font-bold text-base text-green-400">_</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="border-x-2 border-black bg-neutral-900 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto text-[11px] select-none">
          <span className="text-neutral-500 font-pixel text-[9px] shrink-0">QUICK:</span>
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="px-2 py-0.5 border border-neutral-700 bg-neutral-800 hover:bg-neutral-200 hover:text-black text-neutral-300 text-[10px] shrink-0 cursor-pointer disabled:opacity-40 transition-none"
            >
              &gt; {q.length > 36 ? q.substring(0, 36) + '...' : q}
            </button>
          ))}
        </div>

        {/* Input Form with Retro Block Cursor Prompt */}
        <form 
          onSubmit={handleSubmit}
          className="border-2 border-black bg-white p-2 flex items-center gap-2"
        >
          <div className="flex items-center gap-1 text-black font-pixel text-xs shrink-0 select-none px-1">
            <span>&gt;</span>
          </div>
          
          <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isLoading ? 'Awaiting LLM response...' : 'Type query (e.g., "Schedule my high priority tasks today")...'}
              disabled={isLoading}
              className="w-full bg-transparent text-black font-mono text-xs sm:text-sm py-1.5 px-1 outline-none border-b-2 border-black focus:border-neutral-700 placeholder:text-neutral-400"
            />
            {/* Blinking block cursor at end if empty */}
            {!inputText && !isLoading && (
              <span className="absolute left-[380px] hidden md:inline-block w-2 h-4 bg-black animate-pulse pointer-events-none"></span>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="px-3 py-1.5 border-2 border-black bg-black text-white hover:bg-neutral-800 disabled:opacity-40 font-pixel text-xs flex items-center gap-1 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
          >
            <span>SEND</span>
            <Send className="w-3 h-3" />
          </button>
        </form>

      </div>
    </div>
  );
}
