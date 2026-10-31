import React, { useState } from 'react';
import RetroWindow from './RetroWindow';
import { sound } from '../utils/audio';
import { Cpu, Copy, Check, ExternalLink, Shield, Database, Calendar, Bell, Radio } from 'lucide-react';

const API_LIST = [
  {
    id: 'auth',
    name: '1. User Authentication API',
    provider: 'Supabase Auth or Firebase Authentication',
    icon: <Shield className="w-4 h-4" />,
    purpose: 'User registration, login, JWT token generation, session refresh, and Google OAuth 2.0 sign-in across desktop & mobile.',
    endpoints: [
      { method: 'POST', path: '/auth/v1/signup', desc: 'Create user with email/password' },
      { method: 'POST', path: '/auth/v1/token?grant_type=password', desc: 'Exchange credentials for JWT' },
      { method: 'GET', path: '/auth/v1/authorize?provider=google', desc: 'Initiate Google OAuth 2.0 flow' },
    ],
    envVars: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    notes: 'Provides secure JWT session management with zero custom backend maintenance.'
  },
  {
    id: 'realtime',
    name: '2. Real-Time Cloud Database Sync API',
    provider: 'Supabase Realtime (PostgreSQL) or Firebase Firestore',
    icon: <Database className="w-4 h-4" />,
    purpose: 'Bi-directional real-time synchronization. Immediately propagates task creation, updates, and checkbox completions between mobile and desktop clients without manual refresh.',
    endpoints: [
      { method: 'WSS', path: 'wss://<project>.supabase.co/realtime/v1/websocket', desc: 'WebSocket live postgres changes' },
      { method: 'GET', path: '/rest/v1/tasks?select=*&order=createdAt.desc', desc: 'Fetch all tasks for user' },
      { method: 'POST', path: '/rest/v1/tasks', desc: 'Insert or upsert task record' },
      { method: 'PATCH', path: '/rest/v1/tasks?id=eq.<id>', desc: 'Update task or toggle completed status' },
      { method: 'DELETE', path: '/rest/v1/tasks?id=eq.<id>', desc: 'Delete task record' },
    ],
    envVars: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    notes: 'Listens to postgres_changes events on public:tasks table via WebSockets.'
  },
  {
    id: 'gcal',
    name: '3. Google Calendar REST API v3',
    provider: 'Google Cloud Platform (GCP)',
    icon: <Calendar className="w-4 h-4" />,
    purpose: 'Fetches existing Google Calendar meetings, calls, and events to display alongside native RetroCal tasks in Daily, Weekly, and Monthly views.',
    endpoints: [
      { method: 'GET', path: 'https://www.googleapis.com/calendar/v3/calendars/primary/events', desc: 'List scheduled calendar events' },
      { method: 'GET', path: 'https://www.googleapis.com/calendar/v3/users/me/calendarList', desc: 'Get list of user calendars' },
    ],
    oauthScope: 'https://www.googleapis.com/auth/calendar.events.readonly',
    envVars: ['VITE_GOOGLE_CLIENT_ID', 'VITE_GOOGLE_API_KEY'],
    notes: 'Requires Google Cloud Console project with Calendar API enabled and OAuth consent screen.'
  },
  {
    id: 'webpush',
    name: '4. Web Push Protocol & Service Worker API',
    provider: 'W3C Web Push Standard / FCM / Browser Push Service',
    icon: <Radio className="w-4 h-4" />,
    purpose: 'Enables background push notifications even when the web application is minimized or closed.',
    endpoints: [
      { method: 'PUSH', path: 'PushManager.subscribe({ userVisibleOnly: true, applicationServerKey })', desc: 'Browser subscription' },
      { method: 'POST', path: 'https://fcm.googleapis.com/fcm/send (or web-push VAPID endpoint)', desc: 'Backend push dispatch' },
    ],
    envVars: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'],
    notes: 'Uses RFC 8292 VAPID encryption keys. Supported on all modern Chromium, Safari, and Firefox browsers.'
  },
  {
    id: 'notif',
    name: '5. HTML5 Notification API',
    provider: 'W3C Browser Client API',
    icon: <Bell className="w-4 h-4" />,
    purpose: 'Displays native desktop/mobile push alert banners when task reminder triggers occur.',
    endpoints: [
      { method: 'JS', path: 'Notification.requestPermission()', desc: 'Prompt user for push permission' },
      { method: 'JS', path: 'new Notification(title, { body, icon })', desc: 'Display native notification' },
    ],
    envVars: ['None (Browser Native)'],
    notes: 'Included in RetroCal out of the box with permission requester in the top menu.'
  },
  {
    id: 'audio',
    name: '6. Web Audio API',
    provider: 'W3C Browser Audio Context',
    icon: <Cpu className="w-4 h-4" />,
    purpose: 'Synthesizes authentic 8-bit retro sound effects (chimes, clicks, alerts) procedurally without external MP3 audio file downloads.',
    endpoints: [
      { method: 'JS', path: 'new AudioContext().createOscillator()', desc: 'Generate square/triangle waves' },
      { method: 'JS', path: 'ctx.createGain()', desc: 'Envelopes and volume ramps' },
    ],
    envVars: ['None (Browser Native)'],
    notes: 'Fully functional in RetroCal with procedural square wave oscillators.'
  }
];

export default function ApiGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('all');
  const [copiedEnv, setCopiedEnv] = useState(false);

  if (!isOpen) return null;

  const envContent = `# RetroCal Task Manager — Required Environment Variables (.env)

# 1. Supabase Backend & Auth API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# 2. Google Calendar API (via OAuth 2.0)
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSy...

# 3. Web Push API (VAPID Keys for Background Push)
VITE_VAPID_PUBLIC_KEY=BC...
VAPID_PRIVATE_KEY=your-private-vapid-key
VAPID_SUBJECT=mailto:admin@retrocal.io
`;

  const copyEnv = () => {
    sound.playClick();
    navigator.clipboard.writeText(envContent);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <RetroWindow
          title="REQUIRED APIS SPECIFICATION"
          subtitle="PRD SYSTEM ARCHITECTURE"
          onClose={onClose}
          icon="⚡"
          className="flex-1 overflow-hidden"
        >
          <div className="space-y-4 font-mono text-xs overflow-y-auto max-h-[75vh] pr-1">
            
            {/* Summary Box */}
            <div className="border-2 border-black p-3 bg-neutral-100">
              <h3 className="font-pixel text-[11px] font-bold">
                PRD API ARCHITECTURE SUMMARY
              </h3>
              <p className="mt-1 text-[11px] text-neutral-700 leading-relaxed">
                To run RetroCal in full production with multi-device real-time sync, Google Calendar overlay, and background push notifications, the following <strong>6 key APIs</strong> are required:
              </p>
            </div>

            {/* List of APIs */}
            <div className="space-y-3">
              {API_LIST.map((api) => (
                <div key={api.id} className="border-2 border-black p-3 bg-white shadow-[2px_2px_0px_#000] space-y-2">
                  <div className="flex items-center justify-between border-b border-black pb-1.5 flex-wrap gap-1">
                    <div className="flex items-center gap-1.5 font-pixel text-xs font-bold">
                      {api.icon}
                      <span>{api.name}</span>
                    </div>
                    <span className="text-[10px] bg-black text-white px-1.5 py-0.5 font-mono">
                      {api.provider}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-800 leading-normal">
                    {api.purpose}
                  </p>

                  {/* Endpoints Table */}
                  <div className="border border-black bg-neutral-50 overflow-x-auto">
                    <div className="bg-neutral-200 px-2 py-0.5 font-pixel text-[9px] font-bold border-b border-black">
                      HTTP / WS ENDPOINTS
                    </div>
                    <div className="divide-y divide-neutral-300">
                      {api.endpoints.map((ep, i) => (
                        <div key={i} className="px-2 py-1 text-[10px] flex items-center justify-between gap-2">
                          <span className="font-bold font-mono px-1 bg-white border border-black text-[9px]">
                            {ep.method}
                          </span>
                          <span className="font-mono flex-1 truncate text-neutral-800">
                            {ep.path}
                          </span>
                          <span className="text-[9px] text-neutral-500 whitespace-nowrap hidden sm:inline">
                            {ep.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes / Env */}
                  <div className="flex items-center justify-between text-[10px] text-neutral-600 flex-wrap gap-1">
                    <div>
                      <strong>CONFIG:</strong> {api.envVars.join(', ')}
                    </div>
                    <div className="italic">
                      {api.notes}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* .env template */}
            <div className="border-2 border-black p-3 bg-neutral-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[10px] font-bold">
                  PRODUCTION .ENV TEMPLATE
                </span>
                <button
                  onClick={copyEnv}
                  className="retro-btn px-2 py-0.5 text-[10px] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedEnv ? 'COPIED!' : 'COPY .ENV'}</span>
                </button>
              </div>

              <pre className="p-2 border border-black bg-black text-white text-[10px] font-mono overflow-x-auto whitespace-pre">
                {envContent}
              </pre>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="retro-btn-black px-4 py-1.5 text-xs font-pixel"
              >
                CLOSE SPECIFICATION
              </button>
            </div>

          </div>
        </RetroWindow>
      </div>
    </div>
  );
}
