import React, { useState } from 'react';
import RetroWindow from './RetroWindow';
import { googleCalendar } from '../utils/googleCalendar';
import { sound } from '../utils/audio';
import { Calendar, Upload, Key, CheckCircle, RefreshCw } from 'lucide-react';

export default function GoogleSyncModal({ isOpen, onClose, onRefresh }) {
  const [enabled, setEnabled] = useState(googleCalendar.enabled);
  const [importStatus, setImportStatus] = useState('');
  const envStatus = googleCalendar.getEnvStatus();

  if (!isOpen) return null;

  const handleToggle = () => {
    sound.playClick();
    googleCalendar.toggleEnabled();
    setEnabled(!enabled);
    if (onRefresh) onRefresh();
  };

  const handleLoadDemo = () => {
    sound.playClick();
    googleCalendar.connectDemoEvents();
    setEnabled(true);
    setImportStatus('Loaded 4 demo Google Calendar meetings (Team Sync, Sprint Demo, etc.)');
    if (onRefresh) onRefresh();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sound.playAdd();
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      if (typeof content === 'string') {
        const count = googleCalendar.importICS(content);
        setImportStatus(`Successfully imported ${count} events from ${file.name}!`);
        if (onRefresh) onRefresh();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
      <div className="w-full max-w-lg">
        <RetroWindow
          title="GOOGLE CALENDAR INTEGRATION"
          subtitle="EXTERNAL API"
          onClose={onClose}
          icon="📅"
        >
          <div className="space-y-4 font-mono text-xs">
            
            {/* Status bar & toggle */}
            <div className="border-2 border-black p-3 bg-neutral-100 flex items-center justify-between">
              <div>
                <span className="font-pixel text-[11px] block font-bold">UNIFIED CALENDAR VIEW</span>
                <span className="text-[11px] text-neutral-600">
                  Display Google events alongside RetroCal to-dos.
                </span>
              </div>
              <button
                onClick={handleToggle}
                className={`px-3 py-1 text-xs font-pixel border border-black ${enabled ? 'bg-black text-white font-bold' : 'bg-white hover:bg-neutral-200'}`}
              >
                {enabled ? 'ENABLED [ON]' : 'DISABLED [OFF]'}
              </button>
            </div>

            {importStatus && (
              <div className="p-2 border border-black bg-neutral-50 text-[11px] font-bold text-black flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {/* Option 1: Instant Demo Data */}
            <div className="border border-black p-3 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[10px] font-bold">1. SAMPLE CALENDAR EVENTS</span>
                <button
                  onClick={handleLoadDemo}
                  className="retro-btn px-2 py-0.5 text-[10px]"
                >
                  LOAD DEMO MEETINGS
                </button>
              </div>
              <p className="text-[11px] text-neutral-600">
                Populates your calendar with realistic Google Meet & client meetings so you can immediately test the unified day/week/month schedule.
              </p>
            </div>

            {/* Option 2: Import .ICS file or paste iCal */}
            <div className="border border-black p-3 bg-white space-y-2">
              <span className="font-pixel text-[10px] block font-bold">2. IMPORT .ICS / CALENDAR FILE</span>
              <p className="text-[11px] text-neutral-600">
                Export your Google Calendar or Apple Calendar as a <code className="bg-neutral-200 px-1">.ics</code> file and upload it directly:
              </p>
              
              <div className="flex items-center gap-2">
                <label className="retro-btn px-3 py-1 text-[11px] cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>CHOOSE .ICS FILE</span>
                  <input
                    type="file"
                    accept=".ics,text/calendar"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[10px] text-neutral-500">Supports standard iCal (.ics) exports</span>
              </div>
            </div>

            {/* Option 3: Environment Variable Status (Replaces manual key inputs) */}
            <div className="border border-black p-3 bg-neutral-50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[10px] font-bold">3. GOOGLE API ENVIRONMENT STATUS (.env)</span>
                <span className={`px-1.5 py-0.5 text-[9px] font-pixel border border-black ${envStatus.connected ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                  {envStatus.connected ? 'ENV ACTIVE' : 'NO ENV KEYS'}
                </span>
              </div>

              <div className="text-[11px] space-y-1 text-neutral-700">
                <div className="flex items-center justify-between">
                  <span>VITE_GOOGLE_CLIENT_ID:</span>
                  <span className="font-mono">{envStatus.hasClientId ? 'CONFIGURED' : 'NOT SET'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>VITE_GOOGLE_API_KEY:</span>
                  <span className="font-mono">{envStatus.hasApiKey ? 'CONFIGURED' : 'NOT SET'}</span>
                </div>
              </div>

              <p className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-300">
                Google Calendar credentials are now initialized via environment variables. Set them in your <code className="bg-neutral-100 px-1">.env</code> file.
              </p>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="retro-btn px-4 py-1 text-xs"
              >
                DONE
              </button>
            </div>

          </div>
        </RetroWindow>
      </div>
    </div>
  );
}
