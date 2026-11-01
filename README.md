# RetroCal Task Manager (v1.0)

A minimalist, retro-styled web workstation combining daily task management with a multi-view calendar (Day/Week/Month), academic syllabus & revision tracker, draggable Pomodoro flip clock, and an integrated **AI Task Manager Terminal powered by Groq Function Calling**. Built with a strict monochrome black-and-white aesthetic inspired by classic Macintosh System 6/7 and MS-DOS.

---

## ⚡ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons
- **AI Core**: Groq Cloud SDK (`groq-sdk`), targeting `llama-3.3-70b-versatile` with Function Calling / Tool Use
- **Retro Design System**: Strict 1-bit Monochrome, CRT scanline effects, Classic Mac OS Pinstriped Window Headers, Dithered Desktop Canvas, Pixel Fonts (`Space Mono`, `Pixel`)
- **Audio Synthesizer**: Web Audio API (procedural 8-bit square & triangle wave sound effects)
- **Backend & Real-Time Sync**: Supabase (PostgreSQL Realtime WebSocket sync) + LocalStorage + HTML5 `BroadcastChannel` (cross-tab multi-device sync)
- **Calendar & Third-Party**: Google Calendar REST API v3 (OAuth 2.0) & iCal (`.ics`) Parser
- **Notifications**: Web Push API & HTML5 Browser Notification API

---

## 🤖 New Feature: AI Terminal Task Manager (`[>] AI TERMINAL`)

The AI Terminal is a retro CRT overlay that acts as an intelligent study companion and task dispatcher:

1. **Secure Serverless LLM Endpoint (`api/chat.js`)**:
   - Serverless route running on Vercel Node runtime and Vite dev middleware.
   - Secures `GROQ_API_KEY` in environment variables without exposing secrets to the browser.
   - Injects the authenticated user's incomplete `tasks` and `syllabus` items directly into the system prompt context.

2. **Automated Task Creation via Groq Function Calling**:
   - Defines a `create_task` tool schema specifying `title`, `date` (YYYY-MM-DD), `time` (HH:MM), `priority` (`HIGH`/`MEDIUM`/`LOW`), and `tag` (e.g. `#STUDY`).
   - When the user asks to add or schedule tasks (e.g., *"Schedule Biology revision tomorrow at 4 PM with HIGH priority tagged #EXAM"*), Groq invokes `create_task`.
   - The frontend parses the action payload, inserts the record into Supabase `tasks` under the active user's `auth.uid()`, syncs local state instantly, and prints a retro system confirmation message:
     ```text
     ✅ Task created: [Review Biology notes]
     📅 Date: 2026-11-02 | ⏰ Time: 16:00 | ⚡ Priority: HIGH | 🏷️ Tag: #EXAM
     ```

3. **Retro Terminal Overlay (`src/ChatDesk.jsx`)**:
   - Monochrome high-contrast window with CRT scanlines, live context counters, and blinking block cursor.
   - Quick-action suggestion chips for one-click prompts.
   - Direct launch button `[>] AI TERMINAL` in both the top RetroMenuBar and workspace desktop header.

---

## 📚 New Feature: Academic Syllabus Desk (`📚 SYLLABUS`)

- **Topic & Revision Tracking**: Tracks academic syllabus items with dual progress status: `is_learned` and `is_revised`.
- **Hierarchical Tree View**: Automatically groups items by **Subject** → **Module** → **Topic**.
- **CSV Bulk Import & Export**: Import your entire syllabus from a CSV file or download a starter template.
- **Supabase Cloud Sync**: Stores topics in PostgreSQL with row-level security per user.

---

## 🍅 New Feature: Draggable Pomodoro Flip Clock (`🍅 POMODORO`)

- **Draggable Retro Window**: Floating, draggable flip-clock timer popup.
- **Customizable Intervals**: Work session (25m), Short Break (5m), Long Break (15m).
- **Audio Chimes**: Procedural 8-bit bell notifications on timer completion.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and supply your credentials:
```bash
cp .env.example .env
```

### 3. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### 4. Production Build
```bash
npm run build
npm run preview
```

---

## 🔌 Required APIs & Services

| # | Required API | Provider | Purpose | Key Endpoints / Protocols |
|---|-------------|----------|---------|---------------------------|
| 1 | **Groq Cloud AI API** | Groq (`groq-sdk`) | LLM schedule optimization & autonomous task creation tool calling | `POST https://api.groq.com/openai/v1/chat/completions` (model: `llama-3.3-70b-versatile`) |
| 2 | **User Authentication API** | Supabase Auth | Secure signup, login, session JWTs, and Google OAuth | `POST /auth/v1/signup`<br>`POST /auth/v1/token`<br>`GET /auth/v1/authorize?provider=google` |
| 3 | **Real-Time Database Sync API** | Supabase Realtime (PostgreSQL) | Instant bi-directional multi-device sync for `tasks` and `syllabus` | `wss://<project>.supabase.co/realtime/v1/websocket`<br>`GET/POST/PATCH /rest/v1/tasks`<br>`GET/POST/PATCH /rest/v1/syllabus` |
| 4 | **Google Calendar REST API v3** | Google Cloud Platform (GCP) | Fetch external meetings and overlay on RetroCal calendar | `GET https://www.googleapis.com/calendar/v3/calendars/primary/events` |
| 5 | **Web Push API / Service Worker** | W3C Web Push / FCM | Background push reminders for impending task deadlines | `PushManager.subscribe()`<br>`POST https://fcm.googleapis.com/fcm/send` |
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

# 3. Groq Cloud AI API (Server-Side)
GROQ_API_KEY=gsk_your_groq_api_key_here
```

---

## 🗄️ Supabase PostgreSQL Database Schema

Run the following SQL in your Supabase SQL Editor to set up the `tasks` and `syllabus` tables with Row Level Security:

```sql
-- ==========================================
-- 1. TASKS TABLE (with User Isolation & RLS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Users can select own tasks" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks (user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- =============================================
-- 2. SYLLABUS TABLE (Academic Tracker with RLS)
-- =============================================
CREATE TABLE IF NOT EXISTS public.syllabus (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  module_name TEXT NOT NULL,
  topic TEXT NOT NULL,
  is_learned BOOLEAN DEFAULT FALSE,
  is_revised BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.syllabus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own syllabus" ON public.syllabus;
DROP POLICY IF EXISTS "Users can insert own syllabus" ON public.syllabus;
DROP POLICY IF EXISTS "Users can update own syllabus" ON public.syllabus;
DROP POLICY IF EXISTS "Users can delete own syllabus" ON public.syllabus;

CREATE POLICY "Users can select own syllabus" ON public.syllabus FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own syllabus" ON public.syllabus FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own syllabus" ON public.syllabus FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own syllabus" ON public.syllabus FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_syllabus_user_id ON public.syllabus (user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.syllabus;
```
