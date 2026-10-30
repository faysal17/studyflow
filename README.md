# StudyFlow — Two-Tier Study Architecture for Competitive Exam Prep (BCS)

**StudyFlow** is a high-performance, distraction-free Progressive Web App (PWA) built specifically for rigorous competitive exam preparation (such as Bangladesh Civil Service - BCS Preliminary & Written).

It enforces a strict two-tier study architecture that separates long-term syllabus backlog management from high-focus daily sprint execution.

---

## 🏛️ The Two-Tier Architecture

### 1. Permanent "Syllabus Backlog"
- **Zero Stress**: Dump your entire 200+ topic syllabus without cluttering your daily view.
- **Bulk Fast-Capture**: Multi-line paste area where you can paste 20 topics from a syllabus book or PDF in 5 seconds.
- **Subject Matrix**: Real-time counter of topics per subject grouped into `[Backlog]` vs `[In Sprint]` vs `[Completed]`.
- **One-Click Sprint Assignment**: Add or remove topics from the current weekly sprint with a single click.

### 2. "Active Weekly Sprint Board"
- **Distraction-Free**: During the week, you **never** see the overwhelming backlog. You only see active topics in the sprint queue.
- **Target Capacity Widget**: Balances your study load by week:
  - **4 Memorize Topics** (Weekday: Sunday–Thursday)
  - **2 Think Topics** (Weekend: Friday–Saturday)
- **Weekend Review & Reordering**: Up/down prioritization controls for sprint topics.
- **Complete / Roll Over Week Action**:
  - Archives fully completed topics with permanent historical sprint tags.
  - Prompts whether to roll incomplete topics into the upcoming sprint week (e.g. `2026-W45`) or push them back to backlog.

---

## ⚡ The 5-Step Pipeline (Every Topic)

Every single topic in StudyFlow automatically receives a 5-step progress pipeline tailored to competitive study workflows:

| Step | Action | Execution Context | Automatic Behavior |
|---|---|---|---|
| **Step 1** | Study the book | `@desk` | Core textbook reading & milestone notation |
| **Step 2** | Solve book questions | `@desk` | Chapter-end & previous year BCS questions |
| **Step 3** | Create Anki cards from topic | `@office` | Micro-break card drafting |
| **Step 4** | Practice Anki recall | `@commute` / `@office` | Spaced repetition mobile recall |
| **Step 5** | Benchmark on LiveMCQ | `@office` | **Triggers automatic Topic status: Completed** |

---

## 🎯 Execution HUD (Daily Context Switcher)

Switch daily study modes using number keys `1`–`4`:

### 1. 🏠 Desk / Deep Work Mode
- **Day-Aware Auto Pivot**:
  - **Sun–Thu (Weekday)**: Automatically highlights **Step 1 & Step 2** for sprint topics with `memorize` labels (Bangla Literature, English Literature, Bangladesh Affairs, International Affairs, Geography, Science).
  - **Fri–Sat (Weekend)**: Automatically highlights **Step 1 & Step 2** for sprint topics with `think` labels (Mathematics, Mental Ability, Bangla Grammar, English Grammar, Ethics).
  - **Manual Override**: Easily switch between Auto, Force Memorize, and Force Think.
- **Integrated Focus Timer**: 25-minute Pomodoro, 50-minute Deep Work, and Stopwatch with crisp Web Audio chimes.

### 2. 🏢 Office Mode
- Shows active **Step 3** (Make Anki cards) and **Step 5** (LiveMCQ drills) for sprint topics.
- **Missed Question Scratchpad**:
  - Paste errors made during LiveMCQ mock tests (`Question? Answer`, `Question [tab] Answer`, or `Q: ... \n A: ...`).
  - **1-Click "Copy as Anki TSV"**: Generates clean `Front [tab] Back` format copied to clipboard, ready to import directly into Anki Desktop/Web!
  - Stores all missed questions locally in IndexedDB with TSV file download support.

### 3. 🚌 Commute Mode
- Single-thumb ergonomics: Large tactile tap targets positioned for one-handed mobile use.
- Displays **Step 4** (Anki recall) checklist.
- **Persistent Daily Vocabulary Tracker**:
  - Dedicated counters for **Bangla Vocab** and **English Vocab** with `+1` and `+5` quick-review buttons.
  - Micro spaced-repetition drill cards with tap-to-reveal translation & meaning.
  - Quick-add modal for new vocabulary words.

### 4. 🗺️ Coverage & Retrospective
- **Permanent Audit Log**: Completed topics are **never** erased.
- **Visual Syllabus Matrix**: All topics color-coded:
  - ⬜ **Gray**: Unassigned Backlog
  - 🟨 **Yellow**: In Active Sprint
  - 🟩 **Green**: Completed & Benchmarked
- **Sprint Velocity History**: Retrospective log tracking velocity and notes across completed weeks.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `N` | Open Fast-Capture / Add Topic modal |
| `1` | Switch to Execution HUD |
| `2` | Switch to Weekly Sprint Planner |
| `3` | Switch to Syllabus Backlog |
| `4` | Switch to Coverage Matrix & Retrospective |
| `Escape` | Close active modals / blur inputs |

---

## 💾 Local-First Persistence & Supabase Sync

- **Zero-Config Offline**: Powered by **Dexie.js (IndexedDB)**. Works instantly offline with zero setup.
- **Full Schema Versioning & Auto-Migration**: Seeded out of the box with the 11 competitive exam subject labels and sample topics.
- **JSON Backup & Restore**: 1-click export of the entire database to a JSON file and instant file-based restore.
- **Future Supabase Sync Hooks**:
  - Configurable Project URL & Anon Public API Key in Settings modal.
  - Built-in endpoint health test and synchronization adapter (`src/services/syncService.ts`).

---

## 🛠️ Development & Production

```bash
# Install dependencies
npm install

# Run Vite development server
npm run dev

# Build for production (TypeScript + Vite PWA bundle)
npm run build

# Preview production PWA build
npm run preview
```
