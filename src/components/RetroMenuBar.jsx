import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Bell, BellOff, Sun, Moon, Cpu, Calendar, Shield, HelpCircle, LogIn, LogOut } from 'lucide-react';
import { sound } from '../utils/audio';
import { supabase, signInWithGoogle, signOut } from '../utils/storage';

export default function RetroMenuBar({
  onOpenAuth,
  onOpenGoogleSync,
  onOpenApiGuide,
  onOpenHelp,
  onToggleInvert,
  isInverted,
  activeFilter,
  setActiveFilter,
  activeView,
  setActiveView,
  notificationPermission,
  onRequestNotification,
  user,
  isGCalConnected,
}) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [activeMenu, setActiveMenu] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);

  // Live retro clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString());
      setDateStr(now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Supabase Auth session listener
  useEffect(() => {
    if (!supabase) return;

    // Fetch active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user || null);
    });

    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const toggleSound = () => {
    const val = sound.toggle();
    setSoundEnabled(val);
  };

  // Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    sound.playClick();
    if (!supabase) {
      alert('Supabase is not configured. Check your environment variables.');
      return;
    }
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err) {
      console.error('Google Sign In Error:', err);
      alert('Google Sign-In Error: ' + err.message);
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    sound.playClick();
    if (!supabase) return;
    try {
      await signOut();
      setSessionUser(null);
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  };

  // Close dropdown menu on outside click
  useEffect(() => {
    const close = () => setActiveMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const handleMenuClick = (e, menuName) => {
    e.stopPropagation();
    sound.playClick();
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  return (
    <header className="w-full bg-white border-b-2 border-black text-xs font-mono select-none sticky top-0 z-50 shadow-[0_2px_0px_#000]">
      <div className="max-w-7xl mx-auto px-2 py-1 flex items-center justify-between gap-2 flex-wrap">
        
        {/* Left: Classic Mac Apple/Retro logo & Menus */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {/* Logo badge */}
          <div 
            onClick={() => onOpenHelp()}
            className="flex items-center gap-1 px-1.5 py-0.5 bg-black text-white font-pixel cursor-pointer hover:bg-neutral-800 tracking-wider text-[11px]"
            title="About RetroCal"
          >
            <span>■</span>
            <span>RetroCal</span>
            <span className="text-[9px] bg-white text-black px-1 font-bold">v1.0</span>
          </div>

          {/* Menu Dropdowns */}
          <div className="relative">
            <button 
              onClick={(e) => handleMenuClick(e, 'file')}
              className={`px-2 py-0.5 hover:bg-black hover:text-white transition-none ${activeMenu === 'file' ? 'bg-black text-white' : ''}`}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white border-2 border-black shadow-[3px_3px_0px_#000] z-50 py-1 text-xs font-mono">
                <button 
                  onClick={() => { onOpenAuth(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1 hover:bg-black hover:text-white flex items-center justify-between"
                >
                  <span>Cloud Account / Sync</span>
                  <span className="text-[10px] opacity-70">⌘S</span>
                </button>
                <button 
                  onClick={() => { onOpenGoogleSync(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1 hover:bg-black hover:text-white flex items-center justify-between"
                >
                  <span>Google Calendar API</span>
                  <span className="text-[10px] opacity-70">⌘G</span>
                </button>
                <div className="border-t border-black my-1"></div>
                <button 
                  onClick={() => { onOpenApiGuide(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1 hover:bg-black hover:text-white flex items-center justify-between font-bold"
                >
                  <span>Required APIs Doc</span>
                  <span className="text-[10px] opacity-70">⌘A</span>
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={(e) => handleMenuClick(e, 'view')}
              className={`px-2 py-0.5 hover:bg-black hover:text-white transition-none ${activeMenu === 'view' ? 'bg-black text-white' : ''}`}
            >
              View
            </button>
            {activeMenu === 'view' && (
              <div className="absolute left-0 top-full mt-1 w-44 bg-white border-2 border-black shadow-[3px_3px_0px_#000] z-50 py-1 text-xs font-mono">
                <button 
                  onClick={() => { setActiveView('month'); setActiveMenu(null); }}
                  className={`w-full text-left px-3 py-1 hover:bg-black hover:text-white flex items-center justify-between ${activeView === 'month' ? 'font-bold underline' : ''}`}
                >
                  <span>Month Matrix</span>
                  <span>{activeView === 'month' ? '✓' : ''}</span>
                </button>
                <button 
                  onClick={() => { setActiveView('week'); setActiveMenu(null); }}
                  className={`w-full text-left px-3 py-1 hover:bg-black hover:text-white flex items-center justify-between ${activeView === 'week' ? 'font-bold underline' : ''}`}
                >
                  <span>Week Grid</span>
                  <span>{activeView === 'week' ? '✓' : ''}</span>
                </button>
                <button 
                  onClick={() => { setActiveView('day'); setActiveMenu(null); }}
                  className={`w-full text-left px-3 py-1 hover:bg-black hover:text-white flex items-center justify-between ${activeView === 'day' ? 'font-bold underline' : ''}`}
                >
                  <span>Daily Agenda</span>
                  <span>{activeView === 'day' ? '✓' : ''}</span>
                </button>
                <div className="border-t border-black my-1"></div>
                <button 
                  onClick={() => { onToggleInvert(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1 hover:bg-black hover:text-white"
                >
                  <span>{isInverted ? 'Light Screen (Mac)' : 'Invert Screen (DOS)'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick API Guide direct button */}
          <button 
            onClick={() => { sound.playClick(); onOpenApiGuide(); }}
            className="px-2 py-0.5 border border-black bg-white hover:bg-black hover:text-white font-bold flex items-center gap-1"
            title="Inspect required APIs as requested in PRD"
          >
            <Cpu className="w-3 h-3" />
            <span className="hidden sm:inline">APIs Required</span>
            <span className="sm:hidden">APIs</span>
          </button>
        </div>

        {/* Right: Controls, Auth UI & Live Clock */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Sound FX Button */}
          <button
            onClick={() => { sound.playClick(); toggleSound(); }}
            className={`px-1.5 py-0.5 border border-black flex items-center gap-1 font-pixel text-[10px] ${soundEnabled ? 'bg-white hover:bg-black hover:text-white' : 'bg-neutral-200 text-neutral-600'}`}
            title="Toggle 8-bit retro sound synthesizer"
          >
            {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            <span className="hidden md:inline">{soundEnabled ? 'SND:ON' : 'SND:OFF'}</span>
          </button>

          {/* Browser Notifications Bell */}
          <button
            onClick={() => { sound.playClick(); onRequestNotification(); }}
            className={`px-1.5 py-0.5 border border-black flex items-center gap-1 font-pixel text-[10px] ${notificationPermission === 'granted' ? 'bg-black text-white' : 'bg-white hover:bg-black hover:text-white'}`}
            title={notificationPermission === 'granted' ? 'Push Notifications Active' : 'Click to enable Web Notifications'}
          >
            {notificationPermission === 'granted' ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            <span className="hidden md:inline">{notificationPermission === 'granted' ? 'NOTIF:ACTIVE' : 'NOTIF:OFF'}</span>
          </button>

          {/* Invert Screen (Light Mac / Dark DOS) */}
          <button
            onClick={() => { sound.playClick(); onToggleInvert(); }}
            className="px-1.5 py-0.5 border border-black bg-white hover:bg-black hover:text-white font-pixel text-[10px] flex items-center gap-1"
            title="Invert Display Colors"
          >
            {isInverted ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            <span className="hidden lg:inline">{isInverted ? 'LIGHT' : 'DARK'}</span>
          </button>

          {/* Supabase Authentication UI: Google Sign In / User Email & Sign Out */}
          {sessionUser ? (
            <div className="flex items-center gap-1">
              <div
                onClick={() => { sound.playClick(); onOpenAuth(); }}
                className="px-2 py-0.5 border border-black bg-neutral-100 hover:bg-neutral-200 flex items-center gap-1.5 cursor-pointer text-[11px] shadow-[1px_1px_0px_#000]"
                title={`Authenticated as ${sessionUser.email}`}
              >
                <span className="w-2 h-2 rounded-full border border-black bg-green-500 inline-block"></span>
                <span className="max-w-[120px] sm:max-w-[180px] truncate font-bold">{sessionUser.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-1.5 py-0.5 border border-black bg-white hover:bg-black hover:text-white font-pixel text-[9px] shadow-[1px_1px_0px_#000]"
                title="Sign out of account"
              >
                [SIGN OUT]
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="px-2 py-0.5 border-2 border-black bg-white hover:bg-black hover:text-white font-pixel text-[10px] flex items-center gap-1 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
              title="Sign in with Google via Supabase Authentication"
            >
              <span>[SIGN IN WITH GOOGLE]</span>
            </button>
          )}

          {/* Digital Clock */}
          <div className="border border-black px-2 py-0.5 bg-white font-term text-sm tracking-widest font-bold">
            <span className="hidden sm:inline mr-1 opacity-70">{dateStr}</span>
            <span>{timeStr}</span>
          </div>
        </div>

      </div>
    </header>
  );
}
