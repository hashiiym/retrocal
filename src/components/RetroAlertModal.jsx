import React from 'react';
import RetroWindow from './RetroWindow';
import { sound } from '../utils/audio';
import { Bell, Check, Clock } from 'lucide-react';

export default function RetroAlertModal({ alert, onClose, onCompleteTask }) {
  if (!alert) return null;

  const handleComplete = () => {
    sound.playComplete();
    if (alert.task && onCompleteTask) {
      onCompleteTask(alert.task.id);
    }
    onClose();
  };

  const handleSnooze = () => {
    sound.playClick();
    alert('Task reminder snoozed for 5 minutes.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 animate-pulse-once">
      <div className="w-full max-w-md">
        <RetroWindow
          title="SYSTEM ALERT: REMINDER"
          subtitle="URGENT"
          onClose={onClose}
          icon="🔔"
        >
          <div className="space-y-4 font-mono text-xs">
            {/* Alert box */}
            <div className="border-2 border-black p-4 bg-white space-y-3 shadow-[3px_3px_0px_#000]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border-2 border-black bg-black text-white flex items-center justify-center font-pixel text-lg font-bold flex-shrink-0 animate-bounce">
                  !
                </div>
                <div>
                  <h4 className="font-pixel text-xs font-bold uppercase">
                    {alert.title || 'TASK REMINDER'}
                  </h4>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                    ALARM FIRED AT: {alert.timestamp}
                  </p>
                </div>
              </div>

              <div className="p-3 border border-black bg-neutral-100 font-mono text-sm font-bold">
                {alert.message}
              </div>

              {alert.task && (
                <div className="text-[11px] text-neutral-700 flex items-center gap-2">
                  <span>TAG: #{alert.task.tag}</span>
                  <span>|</span>
                  <span>PRIORITY: {alert.task.priority}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleSnooze}
                className="retro-btn px-3 py-1.5 text-xs font-pixel flex items-center gap-1"
              >
                <Clock className="w-3 h-3" />
                <span>SNOOZE 5M</span>
              </button>

              <button
                onClick={handleComplete}
                className="retro-btn-black px-4 py-1.5 text-xs font-pixel flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>MARK COMPLETE</span>
              </button>
            </div>
          </div>
        </RetroWindow>
      </div>
    </div>
  );
}
