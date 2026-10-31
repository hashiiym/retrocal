# RetroCal Task Manager (v1.0)

A minimalist, retro-styled web application combining daily task management with a comprehensive multi-view calendar (Day/Week/Month) and cloud sync, built with a strict monochrome black-and-white aesthetic inspired by classic Macintosh System 6/7 and MS-DOS.

![RetroCal Workstation](https://raw.githubusercontent.com/placeholder-retrocal.png)

---

## ⚡ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4
- **Retro Design System**: Strict 1-bit Monochrome, Classic Mac OS Pinstriped Window Headers, Dithered Desktop Canvas, Pixel Fonts (`Press Start 2P`, `Silkscreen`, `VT323`, `Space Mono`)
- **Audio Synthesizer**: Web Audio API (procedural 8-bit square & triangle wave sound effects)
- **Backend & Real-Time Sync**: Supabase (PostgreSQL Realtime WebSocket sync) + LocalStorage + HTML5 `BroadcastChannel` (cross-tab multi-device sync)
- **Calendar & Third-Party**: Google Calendar REST API v3 (OAuth 2.0) & iCal (`.ics`) Parser
- **Notifications**: Web Push API & HTML5 Browser Notification API

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Dev Server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## 🔌 Which APIs are Required?

To run RetroCal in full production, the following **6 APIs** are required:

| # | Required API | Provider | Purpose | Key Endpoints / Protocols |
|---|-------------|----------|---------|---------------------------|
| 1 | **User Authentication API** | Supabase Auth / Firebase Auth | Secure signup, login, session JWTs, and Google OAuth | `POST /auth/v1/signup`<br>`POST /auth/v1/token`<br>`GET /auth/v1/authorize?provider=google` |
| 2 | **Real-Time Database Sync API** | Supabase Realtime (PostgreSQL) / Firestore | Instant bi-directional multi-device sync between mobile & desktop | `wss://<project>.supabase.co/realtime/v1/websocket`<br>`GET /rest/v1/tasks`<br>`POST /rest/v1/tasks`<br>`PATCH /rest/v1/tasks?id=eq.<id>` |
| 3 | **Google Calendar REST API v3** | Google Cloud Platform (GCP) | Fetch user Google Calendar meetings and overlay on RetroCal agenda | `GET https://www.googleapis.com/calendar/v3/calendars/primary/events` |
| 4 | **Web Push API / Service Worker** | W3C Web Push / FCM / Mozilla | Background push notifications when app is closed | `PushManager.subscribe()`<br>`POST https://fcm.googleapis.com/fcm/send` (VAPID RFC 8292) |
| 5 | **HTML5 Notification API** | Browser Native | Display native push notifications on desktop/mobile | `Notification.requestPermission()`<br>`new Notification(title, options)` |
| 6 | **Web Audio API** | Browser Native | Synthesizes retro 8-bit sound effects procedurally | `new AudioContext()`<br>`ctx.createOscillator()` |

---

## ⚙️ Environment Variables (`.env`)

```env
# 1. Supabase Cloud Database & Auth API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# 2. Google Calendar API (via OAuth 2.0)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSy...

# 3. Web Push API (VAPID Keys for Server-Side Push)
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@retrocal.io
```

---

## 🗄️ Supabase PostgreSQL Schema

Run this in your Supabase SQL Editor to enable real-time sync with Row Level Security:

```sql
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

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access" ON public.tasks FOR ALL USING (true);

-- Enable Realtime Sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
```
