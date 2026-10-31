import React, { useState } from 'react';
import RetroWindow from './RetroWindow';
import { googleCalendar } from '../utils/googleCalendar';
import { sound } from '../utils/audio';
import { Calendar, Upload, Key, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

export default function GoogleSyncModal({ isOpen, onClose, onRefresh }) {
  const config = googleCalendar.getConfig();
  const [enabled, setEnabled] = useState(config.enabled);
  const [clientId, setClientId] = useState(config.clientId || '');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [icsInput, setIcsInput] = useState('');
  const [importStatus, setImportStatus] = useState('');

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

  const handleImportIcs = (e) => {
    e.preventDefault();
    if (!icsInput.trim()) return;
    sound.playAdd();
    const count = googleCalendar.importICS(icsInput);
    if (count > 0) {
      setImportStatus(`Successfully imported ${count} events from iCal data!`);
      setIcsInput('');
      if (onRefresh) onRefresh();
    } else {
      setImportStatus('Could not find valid VEVENT records in provided iCal string.');
    }
  };

  const handleSaveApiKeys = (e) => {
    e.preventDefault();
    sound.playClick();
    googleCalendar.saveConfig({ clientId: clientId.trim(), apiKey: apiKey.trim(), connected: true });
    setImportStatus('Google Cloud API configuration saved.');
    if (onRefresh) onRefresh();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
                <span className="font-pixel text-[10px] font-bold">1. INSTANT DEMO EVENTS</span>
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
                <span className="text-[10px] text-neutral-500">Supports all standard iCal exports</span>
              </div>
            </div>

            {/* Option 3: Live Google Cloud OAuth API Key */}
            <form onSubmit={handleSaveApiKeys} className="border border-black p-3 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[10px] font-bold">3. LIVE GOOGLE CALENDAR REST API V3</span>
                <span className="text-[9px] bg-neutral-200 px-1 border border-black">OAUTH 2.0</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold mb-0.5">GOOGLE OAUTH CLIENT ID:</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="w-full border border-black p-1 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold mb-0.5">GOOGLE API KEY (CALENDAR V3):</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full border border-black p-1 text-xs bg-white"
                />
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  className="retro-btn-black px-3 py-1 text-xs"
                >
                  SAVE GCP CREDENTIALS
                </button>
              </div>
            </form>

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
