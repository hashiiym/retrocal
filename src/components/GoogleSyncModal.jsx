import React, { useState } from 'react';
import RetroWindow from './RetroWindow';
import { googleCalendar } from '../utils/googleCalendar';
import { sound } from '../utils/audio';
import { Calendar, Upload, Key, CheckCircle, AlertCircle, RefreshCw, LogIn } from 'lucide-react';

export default function GoogleSyncModal({ isOpen, onClose, onRefresh }) {
  const [enabled, setEnabled] = useState(googleCalendar.enabled);
  const [importStatus, setImportStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const envStatus = googleCalendar.getEnvStatus();

  if (!isOpen) return null;

  const handleToggle = () => {
    sound.playClick();
    googleCalendar.toggleEnabled();
    setEnabled(!enabled);
    if (onRefresh) onRefresh();
  };

  const handleLiveGoogleOAuth = () => {
    sound.playClick();
    setIsSyncing(true);
    setErrorMessage('');
    setImportStatus('');

    googleCalendar.requestGoogleAuthAndSync(
      (count) => {
        setIsSyncing(false);
        sound.playComplete();
        setImportStatus(`LIVE SYNC SUCCESS: Loaded ${count} events from your Google Calendar!`);
        setEnabled(true);
        if (onRefresh) onRefresh();
      },
      (error) => {
        setIsSyncing(false);
        sound.playDelete();
        setErrorMessage(error);
      }
    );
  };

  const handleLoadDemo = () => {
    sound.playClick();
    googleCalendar.connectDemoEvents();
    setEnabled(true);
    setImportStatus('Loaded 4 sample Google Calendar meetings (Team Sync, Sprint Demo, etc.)');
    setErrorMessage('');
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
        setErrorMessage('');
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
                  {enabled ? 'Google events are visible in calendar' : 'Google events are currently hidden'}
                </span>
              </div>
              <button
                onClick={handleToggle}
                className={`px-3 py-1 text-xs font-pixel border border-black ${enabled ? 'bg-black text-white font-bold' : 'bg-white hover:bg-neutral-200'}`}
              >
                {enabled ? 'SHOWN [ON]' : 'HIDDEN [OFF]'}
              </button>
            </div>

            {/* Success notification */}
            {importStatus && (
              <div className="p-2 border border-black bg-neutral-50 text-[11px] font-bold text-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000]">
                <CheckCircle className="w-4 h-4 flex-shrink-0 text-black" />
                <span>{importStatus}</span>
              </div>
            )}

            {/* Error notification */}
            {errorMessage && (
              <div className="p-2 border-2 border-black bg-white text-[11px] font-bold text-black space-y-1 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-1.5 text-black font-pixel text-[10px]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>OAUTH CONFIGURATION NOTICE</span>
                </div>
                <p className="text-[10px] text-neutral-700 font-mono font-normal">
                  {errorMessage}
                </p>
                <p className="text-[9px] text-neutral-500 font-mono italic">
                  Tip: In Google Cloud Console &gt; Credentials &gt; OAuth 2.0 Client, add <code>http://localhost:5173</code> and your Vercel URL to "Authorized JavaScript origins".
                </p>
              </div>
            )}

            {/* Option 1: Live Google Account OAuth Login Button */}
            <div className="border-2 border-black p-3 bg-white space-y-2 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[10px] font-bold">1. LIVE GOOGLE ACCOUNT SYNC</span>
                <span className="text-[9px] bg-black text-white px-1 font-mono">OAUTH 2.0</span>
              </div>
              
              <p className="text-[11px] text-neutral-600">
                Sign in with Google to fetch your actual upcoming calendar meetings into RetroCal.
              </p>

              <button
                type="button"
                onClick={handleLiveGoogleOAuth}
                disabled={isSyncing}
                className="w-full py-2 border-2 border-black bg-white hover:bg-neutral-100 flex items-center justify-center gap-2 font-pixel text-[11px] shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSyncing ? 'CONNECTING TO GOOGLE...' : 'SIGN IN & SYNC GOOGLE CALENDAR'}</span>
              </button>
            </div>

            {/* Option 2: Sample Meetings (Zero-config instant check) */}
            <div className="border border-black p-3 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[10px] font-bold">2. SAMPLE GOOGLE MEETINGS</span>
                <button
                  onClick={handleLoadDemo}
                  className="retro-btn px-2 py-0.5 text-[10px]"
                >
                  LOAD SAMPLE EVENTS
                </button>
              </div>
              <p className="text-[11px] text-neutral-600">
                Populates your calendar with realistic sample meetings (Team Sync, Sprint Demo) so you can immediately see the unified schedule.
              </p>
            </div>

            {/* Option 3: Import .ICS file */}
            <div className="border border-black p-3 bg-white space-y-2">
              <span className="font-pixel text-[10px] block font-bold">3. IMPORT .ICS FILE (OFFLINE EXPORT)</span>
              <p className="text-[11px] text-neutral-600">
                Export any Google or Apple Calendar to an <code className="bg-neutral-200 px-1">.ics</code> file and load it directly:
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
                <span className="text-[10px] text-neutral-500">Instant local import</span>
              </div>
            </div>

            {/* Environment Variable Status */}
            <div className="border border-black p-2.5 bg-neutral-100 space-y-1 text-[11px]">
              <div className="flex items-center justify-between font-bold text-[10px] font-pixel">
                <span>GOOGLE CLIENT ID (.env):</span>
                <span>{envStatus.hasClientId ? 'CONFIGURED' : 'NOT SET'}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-600 text-[10px]">
                <span>Status:</span>
                <span>{envStatus.connected ? '🟢 Credentials Active' : '⚪ Missing Credentials'}</span>
              </div>
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
