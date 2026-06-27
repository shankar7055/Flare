# Flare — Proactive AI Agentic Scheduler & Deadline Emergency Manager

Flare is a premium AI productivity assistant built for the Coding Ninjas x Google for Developers Vibe2Ship hackathon. It features a Node.js/TypeScript/Prisma backend alongside a luxury React/TailwindCSS/Framer Motion frontend.

Unlike standard chatbots or static reminder apps, Flare proactively perceives task/calendar states, reasons via AI function calling, takes real-world actions (calendar scheduling, notifications, subtask breakdowns), observes outcomes, and automatically triggers **Rescue Mode** for pending, un-started tasks that are dangerously close to their deadlines.

---

## Redesigned Luxury Landing & Auth Page
Flare features a premium, warm luxury design inspired by Linear, Notion, Raycast, and Wispr Flow:
- **Split Hero Layout:** Left side displays Flare's value proposition, key feature bullets, and floating glass cards animating calendar updates and deadline rescues. Right side houses the secure auth card.
- **Warm Luxury Palette:** styled with soft cream (`#F8F6F1`), ivory (`#FFFCF8`), primary sage green (`#6D8367`), and warm borders (`#E9E4DB`).
- **Seamless Account Creation:** Dynamic signup toggle built into the login portal. Users are instantly logged in upon account registration.
- **Instant Demo Access:** Includes a quick access bypass button for hackathon judges that seeds preset tasks/schedules.

---

## Features

- **Proactive Agent Sweeps**: Background scheduler running periodically (via `node-cron`) to tick the agent's cycle.
- **Rescue Mode**: Automatic detection of tasks with:
  - `status == 'pending'`
  - No active calendar schedule slot or started flag
  - Time remaining until deadline is `<= max(2 hours, task.estimated_minutes)`
- **Manual Tool Calling Loop**: Full custom orchestration loop (up to 6 iterations) using LLM function calling to execute complex scheduling logic.
- **Robust Google Calendar OAuth Integration**:
  - Offline access requesting refresh tokens.
  - Automatic credentials token refreshing.
  - Graceful fallback: falls back to SQLite db-based conflict checking if Google Calendar isn't connected.
- **10 Core AI Tools**: `get_tasks`, `create_task`, `break_down_task`, `check_calendar_conflicts`, `schedule_task`, `send_notification` (with 30-min duplicate cooldown protection), `escalate_task`, `generate_rescue_plan`, `get_user_patterns`, and `log_user_feedback`.
- **Express / Prisma ORM / SQLite support**.

---

## Tech Stack

### Backend
- **Node.js (v18+) & TypeScript**
- **Express** (HTTP routes)
- **Prisma ORM** (default with SQLite)
- **node-cron** (for periodic background sweeps)
- **Groq API / Gemini API** (primary model & fallback options)
- **googleapis** (for Google Calendar OAuth & API)
- **Nodemailer** (for email alerts)

### Frontend
- **React (Vite) & TypeScript**
- **TailwindCSS** (Vanilla CSS variables styling system)
- **Framer Motion** (Spring physics, floating layouts, and stagger fade transitions)
- **Lucide React** (Modern clean vector iconography)
- **React Query** (Query caching and state management)

---

## Setup Instructions

### 1. Configure the environment

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Open `.env` and fill in the parameters:
- `LLM_PROVIDER`: Set to `groq` or `gemini`.
- `GROQ_API_KEY`: Your Groq API key (if using Groq).
- `GEMINI_API_KEY`: Your Google AI Studio Gemini API Key (if using Gemini).
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Your Google Developer Console OAuth credentials.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` & `SMTP_PASSWORD`: Your email server credentials.

> [!NOTE]
> If Google Calendar API credentials are left blank, the app will run successfully and seamlessly fall back to database-based scheduling simulations.

### 2. Initialize Database & Seed Demo Data

From the root project directory:

```bash
npm install
npx prisma db push
npx prisma db seed
```

This registers:
- A demo user: `demo@lifesaver.ai` (Password: `Password123`)
- A normal task: **"Prepare Status Slide"** (deadline in 2 days)
- An urgent task in Rescue territory: **"Submit Hackathon Backend Project"** (estimated 120 minutes, deadline in 1 hour)

---

## Running the Application

### Start the Backend Server
Start the Express application:

```bash
npm run dev
```
The server will start at `http://localhost:8000`.

### Start the Frontend Client
Navigate to the `frontend` folder and start the dev server:

```bash
cd frontend
npm install
npm run dev
```
The client will start at `http://localhost:5173`.

---

## Live Demo Guide

To walk through a live demo of the agent:

### 1. Log in or Sign up
Open `http://localhost:5173`, click **Try the live demo**, toggle to **Sign up** to register a new profile, or log in as the default user (`demo@lifesaver.ai` / `Password123`) using the premium Warm Luxury login screen.

### 2. Auto-prioritize Tasks
Once logged in, click the **Schedule** tab. Notice that the view automatically scrolls to align and highlight your current hour slot of the day.

### 3. Manually Trigger a Sweep
From the dashboard, click **Trigger Sweep** to see the agent query your pending assignments, evaluate conflicts in Google Calendar, and schedule them.

### 4. View Agent Activity Logs
Click on any task's **Auto Plan** card or open the **Runs** modal to view the step-by-step reasoning trace of the agent (e.g., calling tools, checking overlaps, and generating notifications).
