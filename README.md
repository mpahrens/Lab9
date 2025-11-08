# Course Preferences Prototype (Hi‑Fi)

Mobile-first, single-page prototype for selecting and ranking courses and sections.

## Overview
- Fixed top bar with Back (disabled), Filter, and Save.
- Scrollable list of course cards. Each shows course code (DEPT####-X##), info button, and a selection control.
- Info button opens a modal with course name and catalog description.
- Filter button opens a modal with:
  - Only show selected courses
  - Show/hide graduate courses (≥ 5000 level)
  - Numeric range for course numbers
- Section-level controls under each card to prefer or exclude specific professors.

## Interactions
- Course control (right side of the card)
  - 1 tap: becomes a green check ✔ and qualifies the course; all sections are set to preferred. A subsequent single tap clears it back to +.
  - 2 taps (within ~280ms): sets this as preference #1 and shifts previous 1→2 and 2→3 (3 becomes just qualified).
  - 3 taps: if there is already a #1 (some other course), inserts this as #2 and shifts previous 2→3. If there’s no #1 yet, this becomes #1.
- Section control (right side of each section row)
  - Toggle between ✔ (included) and ✕ (excluded).
  - If all sections are ✔ and the course is qualified, the course-level control shows ✔.
  - If any section is ✕, the course displays – (partial) and drops any numeric rank until resolved.

## Run
Open `index.html` in a browser. No build tools required.

## Notes
- This is a client-side prototype only. No persistence is implemented; the Save button shows a confirmation toast.
- Double-click is handled via the native `dblclick` event; on mobile, a quick double tap triggers it on most browsers. For device-specific behavior, augment with a custom double-tap detector.
