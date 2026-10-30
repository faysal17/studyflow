# StudyFlow System Architecture & UI Design Guide

> **Strict styling rules & design constraints enforced universally across StudyFlow.**

---

## 1. Core Design Philosophy: "Linear & Things 3 Minimal"

- **Flat > Layered**:
  - Never nest card containers inside other card containers.
  - A list item is a single sleek row separated only by a clean hairline divider (`border-b border-[#222634]` or `divide-y divide-[#222634]`).
  - Eliminate floating card boxes and heavy outer container borders.
- **Data Density**:
  - Prioritize compact, highly legible typography and single-row density over giant margins and empty cavernous gaps.
  - Fluid desktop layout: `w-[260px]` fixed sidebar + `max-w-6xl` responsive content canvas.
- **Content-First**:
  - Eliminate redundant explanatory paragraphs, tips, repetitive labels, and verbose subtitles.
  - Every UI element serves an immediate, actionable study purpose.

---

## 2. Color & Surface Hierarchy (Tailwind Tokens)

| Role | Hex / Token | Usage |
| :--- | :--- | :--- |
| **Canvas Background** | `#0a0b0e` | Main page app canvas (calibrated deep zinc; never pure OLED black `#000000`). |
| **Surface / Modals** | `#12141a` | Fixed sidebar, modal windows, popover dropdowns, and card surfaces. |
| **Hover / Active** | `#1a1d26` | List item row hover, active sidebar pill, active filter badge. |
| **Hairline Borders** | `#222634` | 1px crisp borders (`border-[#222634]` or `rgba(255, 255, 255, 0.08)`). |
| **Primary Text** | `#f4f4f5` | Page headings, topic titles, active navigation labels (High contrast white). |
| **Secondary Meta** | `#a1a1aa` | Dates, subject counts, pass subtitles, table metadata (Soft silver). |
| **Muted / Inactive** | `#71717a` | Inactive icons, keyboard shortcut badges, placeholders (Never darker than zinc-500). |
| **Strikethrough Text** | `text-zinc-500 line-through` | Completed steps and mastered topics (remains fully legible). |

---

## 3. Components & UI Elements

### 3.1 Checkboxes
- **Custom 16px–18px Rounded Circles (`rounded-full`)**:
  - **Unchecked**: `w-[18px] h-[18px] rounded-full border border-zinc-600 bg-transparent hover:border-zinc-400 transition-colors`.
  - **Checked**: `bg-emerald-500 border-emerald-500 text-white` with a crisp, centered check icon (`stroke-[3]`).

### 3.2 Badges & Pills
- **Compact Height & Typography**:
  - Height: `h-5` or `h-5.5` (never bulky).
  - Typography: `text-[11px] font-medium tracking-normal`.
  - Tints: Always calibrated to **10% opacity background** and **20% opacity border**:
    - **Emerald (P2 Done / Today / Success)**: `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`
    - **Amber (Pass 2 / Tomorrow)**: `bg-amber-500/10 text-amber-400 border border-amber-500/20`
    - **Blue (Pass 1: Skim)**: `bg-blue-500/10 text-blue-400 border border-blue-500/20`
    - **Purple (Pass 3: Review)**: `bg-purple-500/10 text-purple-400 border border-purple-500/20`
    - **Rose (Overdue / Clear)**: `bg-rose-500/10 text-rose-400 border border-rose-500/20`

### 3.3 Buttons & Controls
- **Flat Minimal Controls**:
  - `bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 text-xs px-2.5 py-1 rounded-md border border-[#222634] transition-colors cursor-pointer`.
  - Avoid glowing neon gradients or heavy primary buttons unless confirming a primary modal action.

### 3.4 Form Inputs & Textareas
- **Surface-Integrated Inputs**:
  - Background: `#0a0b0e` (matching canvas) or `#12141a` (matching surface).
  - Border: Subtle 1px `#222634`.
  - Focus state: `focus:ring-1 focus:ring-zinc-500 outline-none`.
  - Placeholder: `placeholder:text-[#71717a]`.
  - Text: `text-[#f4f4f5] text-xs`.

---

## 4. Screen-by-Screen Architectural Implementation

1. **Today View (`TodayView.tsx`)**:
   - Flat single-row checklist for scheduled passes.
   - Circular checkbox checks off current pass and updates mastery.
   - Pass 2 rows expand to reveal 5 indented sub-steps without nested boxes.
2. **Tomorrow View (`TomorrowView.tsx`)**:
   - Single-row list of tomorrow's scheduled passes with quick date rescheduling.
3. **Upcoming View (`UpcomingView.tsx`)**:
   - Grouped cleanly by date using simple text headers and hairline dividers.
4. **Syllabus Backlog (`BacklogView.tsx`)**:
   - Textbook table-of-contents layout: topics are grouped naturally under collapsible Subject Section Headers.
   - Section headers feature subject name, subtle topic count, and a colored indicator dot.
   - Individual topic rows omit redundant inline subject badges (`showSubjectBadge={false}`).
   - Top controls keep only the unified Search bar and `+ Bulk Paste` button.
5. **Syllabus Coverage Matrix (`MatrixView.tsx`)**:
   - Executive bird's-eye view with seamless switcher between **High-Density Table View** and **Heatmap Progress Grid**.
   - **High-Density Table**: Clean column headers (`[Module & Topic]`, `[Pass 1: Skim]`, `[Pass 2: Deep Drill]`, `[Pass 3: Review]`, `[Status]`), collapsible subject bands with inline progress meters, and compact status pills (`✓ Read`, `3/5`, `—`).
   - **Heatmap Grid**: Subject cards with interactive, color-coded stage chips (Gray: Unstarted, Blue: P1 Done, Amber: P2 Drill, Emerald: Mastered) with floating tooltips.
   - Total progress is cleanly integrated into the header subtitle, eliminating oversized cards.
6. **3-Pass Scheduling Pop-up (`PerPassScheduleModal.tsx`)**:
   - Linear/Raycast compact popover capped at `max-w-md`.
   - 3 rows with `+ Schedule` or date trigger pills.
   - Instant presets dropdown: `[Today]`, `[Tomorrow]`, `[Next Week]`, and `[Custom Date]`.
