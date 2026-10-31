import React, { useState, useEffect } from 'react';
import RetroWindow from './RetroWindow';
import { sound } from '../utils/audio';

const TAG_OPTIONS = ['WORK', 'DEV', 'LIFE', 'HEALTH', 'RETRO', 'URGENT'];

export default function TaskModal({
  isOpen,
  onClose,
  task,
  onSave,
  defaultDate,
  defaultTime,
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [priority, setPriority] = useState('MEDIUM');
  const [tag, setTag] = useState('WORK');
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState('15m');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDate(task.date || '');
      setTime(task.time || '10:00');
      setPriority(task.priority || 'MEDIUM');
      setTag(task.tag || 'WORK');
      setNotes(task.notes || '');
      setReminder(task.reminder || 'none');
    } else {
      setTitle('');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setTime(defaultTime || '10:00');
      setPriority('MEDIUM');
      setTag('WORK');
      setNotes('');
      setReminder('15m');
    }
  }, [task, defaultDate, defaultTime, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    sound.playAdd();
    onSave({
      title: title.trim(),
      date,
      time,
      priority,
      tag,
      notes: notes.trim(),
      reminder,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
      <div className="w-full max-w-lg">
        <RetroWindow
          title={task ? 'EDIT TASK INSPECTOR' : 'NEW TASK RECORD'}
          subtitle="PROPERTIES"
          onClose={onClose}
          icon="📝"
        >
          <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
            {/* Title */}
            <div>
              <label className="block font-bold mb-1 font-pixel text-[11px]">
                TASK TITLE / DESCRIPTION:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Complete quarterly financial review"
                className="w-full border-2 border-black p-2 font-mono bg-white shadow-[1px_1px_0px_#000]"
                required
                autoFocus
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 font-pixel text-[10px]">
                  DATE (YYYY-MM-DD):
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border-2 border-black p-1.5 bg-white shadow-[1px_1px_0px_#000]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-1 font-pixel text-[10px]">
                  TIME (24-HOUR):
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full border-2 border-black p-1.5 bg-white shadow-[1px_1px_0px_#000]"
                />
              </div>
            </div>

            {/* Priority & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 font-pixel text-[10px]">
                  PRIORITY LEVEL:
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border-2 border-black p-1.5 bg-white shadow-[1px_1px_0px_#000]"
                >
                  <option value="LOW">[!] LOW</option>
                  <option value="MEDIUM">[!!] MEDIUM</option>
                  <option value="HIGH">[!!!] HIGH (CRITICAL)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 font-pixel text-[10px]">
                  TAG / CATEGORY (CUSTOM OR PRESET):
                </label>
                <input
                  type="text"
                  list="task-modal-tags"
                  value={tag}
                  onChange={(e) => setTag(e.target.value.toUpperCase().replace(/^#/, ''))}
                  placeholder="e.g. WORK, DEV, STUDY"
                  className="w-full border-2 border-black p-1.5 bg-white font-mono uppercase shadow-[1px_1px_0px_#000]"
                />
                <datalist id="task-modal-tags">
                  {TAG_OPTIONS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Reminder Alert Offset */}
            <div>
              <label className="block font-bold mb-1 font-pixel text-[10px]">
                NOTIFICATION REMINDER ALERT:
              </label>
              <select
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                className="w-full border-2 border-black p-1.5 bg-white shadow-[1px_1px_0px_#000]"
              >
                <option value="none">No Alert</option>
                <option value="at_time">At exact task time</option>
                <option value="5m">5 minutes before</option>
                <option value="15m">15 minutes before</option>
                <option value="30m">30 minutes before</option>
                <option value="1h">1 hour before</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-bold mb-1 font-pixel text-[10px]">
                NOTES / SUBTASKS:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional details, checklist, links..."
                className="w-full border-2 border-black p-2 font-mono bg-white shadow-[1px_1px_0px_#000]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-black">
              <button
                type="button"
                onClick={onClose}
                className="retro-btn px-3 py-1.5 text-xs"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="retro-btn-black px-4 py-1.5 text-xs"
              >
                {task ? 'SAVE CHANGES' : 'CREATE TASK'}
              </button>
            </div>
          </form>
        </RetroWindow>
      </div>
    </div>
  );
}
