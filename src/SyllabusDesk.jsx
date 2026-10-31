import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, CheckSquare, Square, FileUp, Download, Trash2, 
  Search, Plus, ChevronDown, ChevronRight, CheckCircle2, RotateCcw,
  Sparkles, RefreshCw, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import RetroWindow from './components/RetroWindow';
import { sound } from './utils/audio';
import { supabase } from './utils/storage';

// Default initial academic syllabus demonstration
export const INITIAL_SYLLABUS = [
  {
    id: 'syl-init-1',
    subject: 'COMPUTER ARCHITECTURE',
    module_name: 'Module 1: Processor Datapath & Control',
    topic: 'Single-Cycle vs Multi-Cycle Datapath Design',
    is_learned: true,
    is_revised: true,
  },
  {
    id: 'syl-init-2',
    subject: 'COMPUTER ARCHITECTURE',
    module_name: 'Module 1: Processor Datapath & Control',
    topic: 'ALU Control Logic & Microprogrammed Sequencers',
    is_learned: true,
    is_revised: false,
  },
  {
    id: 'syl-init-3',
    subject: 'COMPUTER ARCHITECTURE',
    module_name: 'Module 2: Pipelining & Hazards',
    topic: 'Structural, Data, and Control Hazard Classification',
    is_learned: true,
    is_revised: false,
  },
  {
    id: 'syl-init-4',
    subject: 'COMPUTER ARCHITECTURE',
    module_name: 'Module 2: Pipelining & Hazards',
    topic: 'Forwarding Paths & Branch Penalty Optimization',
    is_learned: false,
    is_revised: false,
  },
  {
    id: 'syl-init-5',
    subject: 'OPERATING SYSTEMS',
    module_name: 'Module 1: Process Synchronization',
    topic: 'Critical Section Problem & Peterson’s Algorithm',
    is_learned: true,
    is_revised: true,
  },
  {
    id: 'syl-init-6',
    subject: 'OPERATING SYSTEMS',
    module_name: 'Module 1: Process Synchronization',
    topic: 'Semaphores, Mutexes & Classic Synchronization Problems',
    is_learned: true,
    is_revised: false,
  },
  {
    id: 'syl-init-7',
    subject: 'OPERATING SYSTEMS',
    module_name: 'Module 2: Memory Management',
    topic: 'Multi-Level Paging, Segmentation & TLB Hit Rate',
    is_learned: false,
    is_revised: false,
  },
  {
    id: 'syl-init-8',
    subject: 'OPERATING SYSTEMS',
    module_name: 'Module 2: Memory Management',
    topic: 'Page Replacement Algorithms (LRU, Optimal, Clock)',
    is_learned: false,
    is_revised: false,
  },
  {
    id: 'syl-init-9',
    subject: 'DATABASE SYSTEMS',
    module_name: 'Module 1: Relational Normalization',
    topic: 'Functional Dependencies & Normal Forms (1NF to BCNF)',
    is_learned: true,
    is_revised: false,
  },
  {
    id: 'syl-init-10',
    subject: 'DATABASE SYSTEMS',
    module_name: 'Module 2: Transaction Processing',
    topic: 'ACID Properties, Conflict Serializability & 2PL',
    is_learned: false,
    is_revised: false,
  },
];

const LOCAL_STORAGE_KEY = 'retrocal_syllabus_v1';

export default function SyllabusDesk({ isOpen, onClose }) {
  const [syllabusItems, setSyllabusItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL', 'LEARNED', 'UNLEARNED', 'REVISED'
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [collapsedSubjects, setCollapsedSubjects] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);

  // New topic form state
  const [newSubject, setNewSubject] = useState('');
  const [newModule, setNewModule] = useState('');
  const [newTopic, setNewTopic] = useState('');

  // Hidden file input for CSV Import
  const fileInputRef = useRef(null);

  // Load syllabus data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchSyllabus = async () => {
      setIsLoading(true);
      try {
        let userId = authUser?.id;
        if (supabase && !userId) {
          const { data: { session } } = await supabase.auth.getSession();
          userId = session?.user?.id;
          setAuthUser(session?.user || null);
        }

        if (supabase) {
          let query = supabase
            .from('syllabus')
            .select('*')
            .order('subject', { ascending: true })
            .order('module_name', { ascending: true });

          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data, error } = await query;
          if (!error && Array.isArray(data) && data.length > 0) {
            setSyllabusItems(data);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
            setIsLoading(false);
            return;
          }
        }

        // Offline / initial fallback
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSyllabusItems(parsed);
              setIsLoading(false);
              return;
            }
          } catch {
            // parse error fallback
          }
        }

        // Default initial syllabus demonstration
        setSyllabusItems(INITIAL_SYLLABUS);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SYLLABUS));
      } catch (err) {
        console.warn('Syllabus load error:', err);
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          try { setSyllabusItems(JSON.parse(saved)); } catch {}
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSyllabus();
  }, [isOpen]);

  // Listen to Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Save changes to local storage & notify
  const updateLocalAndState = (updatedList) => {
    setSyllabusItems(updatedList);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  };

  // Toggle Learned status
  const handleToggleLearned = async (item) => {
    const nextLearned = !item.is_learned;
    if (nextLearned) {
      sound.playComplete();
      // Check if item also revised to trigger celebration
      if (item.is_revised) {
        sound.playCelebration();
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#000000', '#666666', '#ffffff']
        });
      }
    } else {
      sound.playClick();
    }

    const updated = syllabusItems.map(s => 
      s.id === item.id ? { ...s, is_learned: nextLearned } : s
    );
    updateLocalAndState(updated);

    if (supabase) {
      try {
        await supabase
          .from('syllabus')
          .update({ is_learned: nextLearned })
          .eq('id', item.id);
      } catch (err) {
        console.error('Supabase syllabus update error:', err);
      }
    }
  };

  // Toggle Revised status
  const handleToggleRevised = async (item) => {
    const nextRevised = !item.is_revised;
    if (nextRevised) {
      sound.playComplete();
      if (item.is_learned) {
        sound.playCelebration();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#000000', '#666666', '#ffffff']
        });
      }
    } else {
      sound.playClick();
    }

    const updated = syllabusItems.map(s => 
      s.id === item.id ? { ...s, is_revised: nextRevised } : s
    );
    updateLocalAndState(updated);

    if (supabase) {
      try {
        await supabase
          .from('syllabus')
          .update({ is_revised: nextRevised })
          .eq('id', item.id);
      } catch (err) {
        console.error('Supabase syllabus update error:', err);
      }
    }
  };

  // Delete individual topic
  const handleDeleteTopic = async (id, e) => {
    if (e) e.stopPropagation();
    sound.playDelete();

    const updated = syllabusItems.filter(s => s.id !== id);
    updateLocalAndState(updated);

    if (supabase) {
      try {
        await supabase.from('syllabus').delete().eq('id', id);
      } catch (err) {
        console.error('Supabase syllabus delete error:', err);
      }
    }
  };

  // Dedicated CSV Import Function: reads Subject, Module, Topic
  const handleCsvImport = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    sound.playAdd();

    let userId = authUser?.id;
    if (supabase && !userId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      } catch {}
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (!text || typeof text !== 'string') return;

        const lines = text.split(/\r\n|\n|\r/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
          setFeedbackMessage('CSV file is empty.');
          return;
        }

        // Determine column indexes if header exists
        let subjectIdx = 0;
        let moduleIdx = 1;
        let topicIdx = 2;

        const headerCols = lines[0].split(',').map(c => c.trim().toLowerCase().replace(/^["']|["']$/g, ''));
        const hasHeader = headerCols.some(c => 
          c.includes('subj') || c.includes('mod') || c.includes('top')
        );

        if (hasHeader) {
          const sIdx = headerCols.findIndex(c => c.includes('subj') || c.includes('course'));
          const mIdx = headerCols.findIndex(c => c.includes('mod') || c.includes('unit') || c.includes('chap'));
          const tIdx = headerCols.findIndex(c => c.includes('top') || c.includes('title') || c.includes('lesson'));

          if (sIdx !== -1) subjectIdx = sIdx;
          if (mIdx !== -1) moduleIdx = mIdx;
          if (tIdx !== -1) topicIdx = tIdx;
        }

        const newRecords = [];
        const startIndex = hasHeader ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length < 2) continue;

          const rawSubject = cols[subjectIdx] || 'GENERAL STUDIES';
          const rawModule = cols[moduleIdx] || 'Module 1: Fundamentals';
          const rawTopic = cols[topicIdx] || (cols.length > 2 ? cols[2] : cols[1]);

          if (!rawTopic || !rawTopic.trim()) continue;

          newRecords.push({
            id: 'syl-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 4),
            user_id: userId || null,
            subject: rawSubject.trim().toUpperCase(),
            module_name: rawModule.trim(),
            topic: rawTopic.trim(),
            is_learned: false, // strictly false as required
            is_revised: false, // strictly false as required
          });
        }

        if (newRecords.length > 0) {
          sound.playComplete();

          // Insert into Supabase table named 'syllabus'
          if (supabase) {
            try {
              const { error } = await supabase.from('syllabus').insert(newRecords);
              if (error) console.error('Supabase syllabus import error:', error);
            } catch (err) {
              console.error('Failed to insert syllabus records into Supabase:', err);
            }
          }

          // Combine with existing syllabus records avoiding exact duplicate topics
          const existingKeys = new Set(syllabusItems.map(s => `${s.subject}|${s.module_name}|${s.topic}`.toLowerCase()));
          const uniqueNew = newRecords.filter(r => !existingKeys.has(`${r.subject}|${r.module_name}|${r.topic}`.toLowerCase()));

          const updatedList = [...syllabusItems, ...(uniqueNew.length > 0 ? uniqueNew : newRecords)];
          updateLocalAndState(updatedList);

          const subjectCount = new Set(newRecords.map(r => r.subject)).size;
          setFeedbackMessage(`SUCCESS: Imported ${newRecords.length} syllabus topics across ${subjectCount} subjects!`);
          setTimeout(() => setFeedbackMessage(''), 6000);
        } else {
          setFeedbackMessage('No valid topics parsed from CSV. Expected columns: Subject, Module, Topic.');
        }
      } catch (err) {
        console.error('CSV Parsing error:', err);
        setFeedbackMessage('Error parsing syllabus CSV file format.');
      }
    };

    reader.readAsText(file);
  };

  // Manual Add Form Submit
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    sound.playAdd();

    let userId = authUser?.id;
    if (supabase && !userId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      } catch {}
    }

    const newRecord = {
      id: 'syl-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      user_id: userId || null,
      subject: (newSubject.trim() || 'GENERAL STUDIES').toUpperCase(),
      module_name: newModule.trim() || 'Module 1: Core Concepts',
      topic: newTopic.trim(),
      is_learned: false,
      is_revised: false,
    };

    if (supabase) {
      try {
        await supabase.from('syllabus').insert([newRecord]);
      } catch (err) {
        console.error('Supabase topic insert error:', err);
      }
    }

    const updated = [...syllabusItems, newRecord];
    updateLocalAndState(updated);

    setNewTopic('');
    setFeedbackMessage(`ADDED: "${newRecord.topic}" under ${newRecord.subject}!`);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    sound.playClick();
    const csvContent = 
`Subject,Module,Topic
Computer Architecture,Module 1: Instruction Set Architectures,RISC vs CISC Principles
Computer Architecture,Module 1: Instruction Set Architectures,MIPS Register Formats and Addressing Modes
Computer Architecture,Module 2: Pipelining Hazards,Data Hazards and Forwarding Unit Logic
Operating Systems,Module 1: Concurrency and Deadlocks,Banker's Algorithm for Deadlock Avoidance
Operating Systems,Module 2: Memory Management,Inverted Page Tables and Translation Lookaside Buffers
Database Systems,Module 1: Normalization,Lossless Decomposition and Dependency Preservation`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'retrocal_syllabus_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Wipe All Syllabus Data
  const handleWipeSyllabus = async () => {
    const confirmed = window.confirm('Are you sure you want to wipe all academic syllabus records?');
    if (!confirmed) return;

    sound.playDelete();

    let userId = authUser?.id;
    if (supabase && userId) {
      try {
        await supabase.from('syllabus').delete().eq('user_id', userId);
      } catch (err) {
        console.error('Supabase wipe error:', err);
      }
    }

    updateLocalAndState([]);
    setFeedbackMessage('All syllabus records wiped.');
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  // Restore Default Sample Syllabus
  const handleRestoreSample = () => {
    sound.playClick();
    updateLocalAndState(INITIAL_SYLLABUS);
    setFeedbackMessage('Loaded default syllabus demo.');
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  // Toggle Collapse Subject
  const toggleSubject = (subject) => {
    sound.playClick();
    setCollapsedSubjects(prev => ({
      ...prev,
      [subject]: !prev[subject],
    }));
  };

  // Filtered syllabus items based on search and status filter
  const filteredList = useMemo(() => {
    return syllabusItems.filter(item => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inSubj = (item.subject || '').toLowerCase().includes(q);
        const inMod = (item.module_name || '').toLowerCase().includes(q);
        const inTopic = (item.topic || '').toLowerCase().includes(q);
        if (!inSubj && !inMod && !inTopic) return false;
      }

      // Status filter
      if (filterMode === 'LEARNED') {
        if (!item.is_learned) return false;
      } else if (filterMode === 'UNLEARNED') {
        if (item.is_learned) return false;
      } else if (filterMode === 'REVISED') {
        if (!item.is_revised) return false;
      } else if (filterMode === 'NEED_REVISION') {
        if (!item.is_learned || item.is_revised) return false;
      }

      return true;
    });
  }, [syllabusItems, searchQuery, filterMode]);

  // Group visually by Subject, then Module
  const groupedData = useMemo(() => {
    const map = {};
    filteredList.forEach(item => {
      const subj = (item.subject || 'GENERAL STUDIES').trim();
      const mod = (item.module_name || 'Module 1: General').trim();
      if (!map[subj]) map[subj] = {};
      if (!map[subj][mod]) map[subj][mod] = [];
      map[subj][mod].push(item);
    });
    return map;
  }, [filteredList]);

  // Global Progress Statistics
  const totalTopics = syllabusItems.length;
  const learnedCount = syllabusItems.filter(s => s.is_learned).length;
  const revisedCount = syllabusItems.filter(s => s.is_revised).length;
  const learnedPct = totalTopics > 0 ? Math.round((learnedCount / totalTopics) * 100) : 0;
  const revisedPct = totalTopics > 0 ? Math.round((revisedCount / totalTopics) * 100) : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-[1px] select-none">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-100">
        <RetroWindow
          title="SYLLABUS DESK"
          subtitle="ACADEMIC TRACKER"
          icon="📚"
          onClose={onClose}
          statusText={`TOTAL: ${totalTopics} TOPICS | LEARNED: ${learnedCount}/${totalTopics} (${learnedPct}%) | REVISED: ${revisedCount}/${totalTopics} (${revisedPct}%)`}
          className="flex-1 flex flex-col overflow-hidden shadow-[6px_6px_0px_#000]"
          headerActions={
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  sound.playClick();
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                    fileInputRef.current.click();
                  }
                }}
                className="px-2 py-0.5 border border-black bg-white hover:bg-black hover:text-white font-pixel text-[10px] flex items-center gap-1 shadow-[1px_1px_0px_#000]"
                title="Import topics from Subject, Module, Topic CSV"
              >
                <FileUp className="w-3 h-3" />
                <span>[+] CSV</span>
              </button>
            </div>
          }
        >
          {/* Hidden File Input for CSV Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            className="hidden"
          />

          <div className="p-3 space-y-3 flex-1 overflow-y-auto font-mono text-xs bg-neutral-50">
            
            {/* Feedback Banner */}
            {feedbackMessage && (
              <div className="p-2 border-2 border-black bg-neutral-200 text-black font-pixel text-[11px] font-bold flex items-center justify-between shadow-[2px_2px_0px_#000]">
                <span>&gt; {feedbackMessage}</span>
                <button onClick={() => setFeedbackMessage('')} className="font-pixel text-[10px] hover:underline">[X]</button>
              </div>
            )}

            {/* Overall Syllabus Progress Dashboard Card */}
            <div className="border-2 border-black bg-white p-3 shadow-[3px_3px_0px_#000]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black">
                <div>
                  <h3 className="font-pixel text-xs font-bold flex items-center gap-2">
                    <span>ACADEMIC REVISION MATRIX</span>
                    <span className="text-[10px] bg-black text-white px-1.5 py-0.2 font-mono">2-STEP CHECK</span>
                  </h3>
                  <p className="text-[10px] text-neutral-600 mt-0.5">
                    Track topic mastery: mark <strong>[X] LRN</strong> when studied, and <strong>[X] REV</strong> when reviewed before exams.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-2 py-1 border border-black font-pixel text-[10px] bg-white hover:bg-black hover:text-white flex items-center gap-1 shadow-[1px_1px_0px_#000]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showAddForm ? '[- HIDE FORM]' : '[+ NEW TOPIC]'}</span>
                  </button>
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-2 py-1 border border-black font-pixel text-[10px] bg-white hover:bg-neutral-100 flex items-center gap-1 shadow-[1px_1px_0px_#000]"
                    title="Download template CSV (Subject, Module, Topic)"
                  >
                    <Download className="w-3 h-3" />
                    <span>TEMPLATE</span>
                  </button>
                  <button
                    onClick={handleWipeSyllabus}
                    className="px-2 py-1 border border-black font-pixel text-[10px] bg-white hover:bg-black hover:text-white flex items-center gap-1 shadow-[1px_1px_0px_#000]"
                    title="Wipe syllabus records"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>WIPE</span>
                  </button>
                </div>
              </div>

              {/* Dual Progress Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
                {/* Step 1: Learned Bar */}
                <div className="border border-black p-2 bg-neutral-50">
                  <div className="flex items-center justify-between font-pixel text-[10px] mb-1">
                    <span>STEP 1: LEARNED [LRN]</span>
                    <span className="font-mono font-bold">{learnedCount}/{totalTopics} ({learnedPct}%)</span>
                  </div>
                  <div className="w-full bg-neutral-200 border border-black h-3.5 p-0.5">
                    <div
                      className="bg-black h-full transition-all duration-300"
                      style={{ width: `${learnedPct}%` }}
                    ></div>
                  </div>
                </div>

                {/* Step 2: Revised Bar */}
                <div className="border border-black p-2 bg-neutral-50">
                  <div className="flex items-center justify-between font-pixel text-[10px] mb-1">
                    <span>STEP 2: REVISED [REV]</span>
                    <span className="font-mono font-bold">{revisedCount}/{totalTopics} ({revisedPct}%)</span>
                  </div>
                  <div className="w-full bg-neutral-200 border border-black h-3.5 p-0.5">
                    <div
                      className="bg-black h-full transition-all duration-300"
                      style={{ width: `${revisedPct}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Add Form Drawer */}
            {showAddForm && (
              <form onSubmit={handleQuickAdd} className="border-2 border-black bg-white p-3 space-y-2 shadow-[3px_3px_0px_#000] animate-in fade-in duration-100">
                <div className="font-pixel text-[11px] font-bold border-b border-black pb-1">
                  &gt; ADD SYLLABUS TOPIC RECORD
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-pixel text-neutral-600 mb-0.5">SUBJECT:</label>
                    <input
                      type="text"
                      placeholder="e.g. COMPUTER NETWORKS"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full border border-black px-2 py-1 text-xs bg-white uppercase font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-pixel text-neutral-600 mb-0.5">MODULE / UNIT:</label>
                    <input
                      type="text"
                      placeholder="e.g. Module 1: Physical Layer"
                      value={newModule}
                      onChange={(e) => setNewModule(e.target.value)}
                      className="w-full border border-black px-2 py-1 text-xs bg-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-pixel text-neutral-600 mb-0.5">TOPIC DESCRIPTION:</label>
                    <input
                      type="text"
                      placeholder="e.g. Shannon Capacity & Nyquist Theorem"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      className="w-full border border-black px-2 py-1 text-xs bg-white font-mono"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1 border border-black text-xs font-pixel bg-white hover:bg-neutral-100"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 border border-black text-xs font-pixel bg-black text-white hover:bg-neutral-800 shadow-[1px_1px_0px_#000]"
                  >
                    + ADD TOPIC
                  </button>
                </div>
              </form>
            )}

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border border-black bg-white p-2">
              {/* Quick Status Filters */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-pixel text-[10px] mr-1 text-neutral-600">FILTER:</span>
                {[
                  { id: 'ALL', label: 'ALL' },
                  { id: 'UNLEARNED', label: 'PENDING' },
                  { id: 'LEARNED', label: 'LEARNED' },
                  { id: 'NEED_REVISION', label: 'NEEDS REV' },
                  { id: 'REVISED', label: 'REVISED' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => { sound.playClick(); setFilterMode(f.id); }}
                    className={`px-2 py-0.5 text-[10px] font-pixel border border-black ${filterMode === f.id ? 'bg-black text-white font-bold' : 'bg-white hover:bg-neutral-100'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search subject, module, topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-black pl-7 pr-2 py-1 text-xs bg-white outline-none font-mono"
                />
              </div>
            </div>

            {/* Grouped Syllabus Tree View */}
            {Object.keys(groupedData).length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-black bg-white space-y-3">
                <BookOpen className="w-8 h-8 mx-auto opacity-30" />
                <p className="font-pixel text-xs text-neutral-700">NO SYLLABUS TOPICS FOUND</p>
                <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
                  Import a 3-column CSV file containing <strong>Subject, Module, Topic</strong> or load our default academic demonstration.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={handleRestoreSample}
                    className="px-3 py-1 border border-black font-pixel text-xs bg-black text-white hover:bg-neutral-800 shadow-[2px_2px_0px_#000]"
                  >
                    [LOAD SAMPLE SYLLABUS]
                  </button>
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                        fileInputRef.current.click();
                      }
                    }}
                    className="px-3 py-1 border border-black font-pixel text-xs bg-white hover:bg-neutral-100 shadow-[2px_2px_0px_#000]"
                  >
                    [+] IMPORT CSV
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedData).map(([subject, modulesMap]) => {
                  const isCollapsed = Boolean(collapsedSubjects[subject]);
                  
                  // Calculate subject-level statistics
                  const subjectAllItems = syllabusItems.filter(s => (s.subject || '').toUpperCase() === subject.toUpperCase());
                  const subjectTotal = subjectAllItems.length;
                  const subjectLearned = subjectAllItems.filter(s => s.is_learned).length;
                  const subjectRevised = subjectAllItems.filter(s => s.is_revised).length;
                  const subjLearnedPct = subjectTotal > 0 ? Math.round((subjectLearned / subjectTotal) * 100) : 0;
                  const subjRevisedPct = subjectTotal > 0 ? Math.round((subjectRevised / subjectTotal) * 100) : 0;

                  return (
                    <div key={subject} className="border-2 border-black bg-white shadow-[3px_3px_0px_#000] overflow-hidden">
                      {/* Subject Header Banner */}
                      <div
                        onClick={() => toggleSubject(subject)}
                        className="bg-black text-white px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-neutral-900 select-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-pixel text-sm">{isCollapsed ? '▶' : '▼'}</span>
                          <span className="font-pixel text-xs sm:text-sm font-bold tracking-wider">
                            📚 {subject}
                          </span>
                          <span className="text-[10px] bg-white text-black px-1.5 py-0.2 font-mono font-bold">
                            {subjectTotal} TOPICS
                          </span>
                        </div>

                        {/* Subject Progress Badges */}
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className={`px-1.5 py-0.5 border border-white ${subjLearnedPct === 100 ? 'bg-white text-black font-bold' : 'bg-neutral-800 text-white'}`}>
                            LRN: {subjectLearned}/{subjectTotal} ({subjLearnedPct}%)
                          </span>
                          <span className={`px-1.5 py-0.5 border border-white ${subjRevisedPct === 100 ? 'bg-white text-black font-bold' : 'bg-neutral-800 text-white'}`}>
                            REV: {subjectRevised}/{subjectTotal} ({subjRevisedPct}%)
                          </span>
                        </div>
                      </div>

                      {/* Subject Body with Modules */}
                      {!isCollapsed && (
                        <div className="divide-y divide-black">
                          {Object.entries(modulesMap).map(([moduleName, topics]) => (
                            <div key={moduleName} className="bg-white">
                              {/* Module Header Bar */}
                              <div className="bg-neutral-100 px-3 py-1.5 font-pixel text-xs font-bold flex items-center justify-between border-b border-neutral-300">
                                <div className="flex items-center gap-1.5 text-neutral-800">
                                  <span>📁</span>
                                  <span>{moduleName}</span>
                                </div>
                                <span className="text-[10px] font-mono text-neutral-600 font-normal">
                                  {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
                                </span>
                              </div>

                              {/* Topics Table List */}
                              <div className="divide-y divide-neutral-200">
                                {topics.map((item, idx) => {
                                  const isMastered = item.is_learned && item.is_revised;

                                  return (
                                    <div
                                      key={item.id || idx}
                                      className={`px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono transition-none ${isMastered ? 'bg-neutral-50/70' : 'hover:bg-neutral-50'}`}
                                    >
                                      {/* Topic Title */}
                                      <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <span className="text-neutral-400 font-pixel text-[10px] mt-0.5 select-none">
                                          {idx + 1}.
                                        </span>
                                        <span className={`flex-1 break-words ${isMastered ? 'line-through text-neutral-500 font-normal' : 'text-black font-medium'}`}>
                                          {item.topic}
                                        </span>
                                        {isMastered && (
                                          <span className="text-[9px] font-pixel bg-black text-white px-1 py-0.2 shrink-0">
                                            [MASTERED ✓]
                                          </span>
                                        )}
                                      </div>

                                      {/* Dual Checkboxes: [ ] LRN and [ ] REV */}
                                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        {/* Checkbox 1: Learned [LRN] */}
                                        <button
                                          type="button"
                                          onClick={() => handleToggleLearned(item)}
                                          className={`px-2 py-0.5 border border-black font-pixel text-[10px] flex items-center gap-1 shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-none ${
                                            item.is_learned 
                                              ? 'bg-black text-white font-bold' 
                                              : 'bg-white hover:bg-neutral-100 text-black'
                                          }`}
                                          title={item.is_learned ? "Mark as unlearned" : "Mark as learned"}
                                        >
                                          <span>{item.is_learned ? '[X]' : '[ ]'}</span>
                                          <span>LRN</span>
                                        </button>

                                        {/* Checkbox 2: Revised [REV] */}
                                        <button
                                          type="button"
                                          onClick={() => handleToggleRevised(item)}
                                          className={`px-2 py-0.5 border border-black font-pixel text-[10px] flex items-center gap-1 shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-none ${
                                            item.is_revised 
                                              ? 'bg-black text-white font-bold' 
                                              : 'bg-white hover:bg-neutral-100 text-black'
                                          }`}
                                          title={item.is_revised ? "Mark as unrevised" : "Mark as revised"}
                                        >
                                          <span>{item.is_revised ? '[X]' : '[ ]'}</span>
                                          <span>REV</span>
                                        </button>

                                        {/* Optional Delete Topic Button */}
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteTopic(item.id, e)}
                                          className="text-neutral-400 hover:text-black p-0.5 hover:bg-neutral-200 border border-transparent hover:border-black"
                                          title="Delete topic"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </RetroWindow>
      </div>
    </div>
  );
}
