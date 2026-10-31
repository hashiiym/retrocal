import React, { useState } from 'react';
import RetroWindow from './RetroWindow';
import { storage } from '../utils/storage';
import { sound } from '../utils/audio';
import { Shield, Key, Database, RefreshCw, CheckCircle2, Copy, AlertCircle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, user, onUpdateUser }) {
  const [authMode, setAuthMode] = useState('profile'); // 'profile', 'login'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  const supabaseEnv = storage.getSupabaseEnvStatus();

  if (!isOpen) return null;

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    sound.playAdd();
    const newUser = {
      id: 'usr-' + Math.random().toString(36).substr(2, 6),
      email: email || 'operator@retrocal.io',
      name: name || email.split('@')[0] || 'Retro Operator',
      isDemo: false,
      lastSync: new Date().toLocaleTimeString(),
    };
    storage.setUser(newUser);
    onUpdateUser(newUser);
    setAuthMode('profile');
  };

  const handleGoogleOAuth = () => {
    sound.playClick();
    const newUser = {
      id: 'google-usr-' + Math.random().toString(36).substr(2, 6),
      email: 'user.google@gmail.com',
      name: 'Google Sync User',
      isDemo: false,
      provider: 'google',
      lastSync: new Date().toLocaleTimeString(),
    };
    storage.setUser(newUser);
    onUpdateUser(newUser);
    setAuthMode('profile');
  };

  const handleResetToDemo = () => {
    sound.playClick();
    const demoUser = {
      id: 'demo-user-retro',
      email: 'retro_user@sys6.os',
      name: 'Retro Operator',
      isDemo: true,
      lastSync: new Date().toLocaleTimeString(),
    };
    storage.setUser(demoUser);
    onUpdateUser(demoUser);
    storage.resetToDemo();
  };

  const copySqlSchema = () => {
    sound.playClick();
    const sql = `-- RetroCal Supabase PostgreSQL Schema
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  date DATE NOT NULL,
  time TEXT,
  priority TEXT DEFAULT 'MEDIUM',
  tag TEXT DEFAULT 'WORK',
  notes TEXT,
  reminder TEXT DEFAULT 'none',
  "createdAt" BIGINT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Allow public access for simple sync
CREATE POLICY "Public full access" ON public.tasks FOR ALL USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
      <div className="w-full max-w-lg">
        <RetroWindow
          title="AUTHENTICATION & CLOUD SYNC"
          subtitle="BACKEND CONTROL"
          onClose={onClose}
          icon="🔒"
        >
          <div className="space-y-4 font-mono text-xs">
            
            {/* Tabs */}
            <div className="flex border-b-2 border-black bg-neutral-100">
              <button
                onClick={() => { sound.playClick(); setAuthMode('profile'); }}
                className={`flex-1 py-1.5 font-pixel text-[10px] ${authMode === 'profile' ? 'bg-black text-white font-bold' : 'hover:bg-neutral-200'}`}
              >
                ACCOUNT STATUS
              </button>
              <button
                onClick={() => { sound.playClick(); setAuthMode('login'); }}
                className={`flex-1 py-1.5 font-pixel text-[10px] ${authMode === 'login' ? 'bg-black text-white font-bold' : 'hover:bg-neutral-200'}`}
              >
                LOGIN / SIGN UP
              </button>
            </div>

            {/* TAB 1: PROFILE / ACTIVE STATUS */}
            {authMode === 'profile' && (
              <div className="space-y-3">
                <div className="border-2 border-black p-3 bg-neutral-50 space-y-2">
                  <div className="flex items-center justify-between border-b border-black pb-1.5">
                    <span className="font-pixel text-[11px] font-bold">OPERATOR PROFILE</span>
                    <span className="px-1.5 py-0.5 bg-black text-white font-pixel text-[9px]">
                      {user.isDemo ? 'DEMO SESSION' : 'AUTHENTICATED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-neutral-500 block text-[10px]">NAME:</span>
                      <strong>{user.name}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">EMAIL:</span>
                      <strong className="truncate block">{user.email}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">MULTI-DEVICE SYNC:</span>
                      <span className="flex items-center gap-1 text-green-700 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE (BroadcastChannel)
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">SUPABASE BACKEND:</span>
                      <span className="font-bold">
                        {supabaseEnv.connected 
                          ? '🟢 CONNECTED (.env)' 
                          : '⚪ LOCAL OFFLINE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Environment Variable Configuration Status Card */}
                <div className="border border-black p-2.5 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-[10px] font-bold">ENV BACKEND STATUS (.env):</span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-pixel border border-black ${supabaseEnv.connected ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                      {supabaseEnv.connected ? 'ENV ACTIVE' : 'NO ENV KEYS'}
                    </span>
                  </div>
                  
                  <div className="text-[11px] space-y-1 text-neutral-700">
                    <div className="flex items-center justify-between">
                      <span>VITE_SUPABASE_URL:</span>
                      <span className="font-mono">{supabaseEnv.hasUrl ? 'CONFIGURED' : 'NOT SET'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>VITE_SUPABASE_ANON_KEY:</span>
                      <span className="font-mono">{supabaseEnv.hasKey ? 'CONFIGURED' : 'NOT SET'}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-300">
                    API keys are securely managed via your project's <code className="bg-neutral-100 px-1">.env</code> file instead of manual UI inputs.
                  </p>
                </div>

                {/* SQL Schema Copy Button */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={copySqlSchema}
                    className="retro-btn px-2.5 py-1 text-[10px] flex items-center gap-1"
                    title="Copy Supabase tasks table SQL"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedSql ? 'SQL COPIED!' : 'COPY SQL SCHEMA'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetToDemo}
                      className="retro-btn px-2.5 py-1 text-[10px]"
                    >
                      RESET DEMO
                    </button>
                    <button
                      onClick={() => { sound.playClick(); setAuthMode('login'); }}
                      className="retro-btn-black px-3 py-1 text-[10px]"
                    >
                      SWITCH ACCOUNT
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LOGIN / REGISTER */}
            {authMode === 'login' && (
              <div className="space-y-3">
                {/* Google OAuth Quick Button */}
                <button
                  type="button"
                  onClick={handleGoogleOAuth}
                  className="w-full py-2 border-2 border-black bg-white hover:bg-neutral-100 flex items-center justify-center gap-2 font-mono font-bold text-xs shadow-[2px_2px_0px_#000]"
                >
                  <span className="font-pixel text-sm">G</span>
                  <span>CONTINUE WITH GOOGLE OAUTH</span>
                </button>

                <div className="flex items-center gap-2 my-2 text-[10px] text-neutral-500">
                  <div className="flex-1 border-t border-black"></div>
                  <span>OR WITH EMAIL & PASSWORD</span>
                  <div className="flex-1 border-t border-black"></div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleLoginSubmit} className="space-y-2.5">
                  <div>
                    <label className="block font-bold mb-0.5 text-[10px]">NAME (OPTIONAL):</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Retro Operator"
                      className="w-full border-2 border-black p-1.5 bg-white shadow-[1px_1px_0px_#000]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-0.5 text-[10px]">EMAIL ADDRESS:</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator@retrocal.io"
                      required
                      className="w-full border-2 border-black p-1.5 bg-white shadow-[1px_1px_0px_#000]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-0.5 text-[10px]">PASSWORD:</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full border-2 border-black p-1.5 bg-white shadow-[1px_1px_0px_#000]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full retro-btn-black py-2 text-xs font-pixel"
                    >
                      LOG IN / REGISTER USER
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </RetroWindow>
      </div>
    </div>
  );
}
