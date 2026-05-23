// Copilot instructions for ai-restoration-exhibit

Keep responses short and strictly actionable. This is a small, static single-page exhibit app (plain HTML/CSS/JS) that runs from `index.html` and uses local asset folders: `icon/`, `minhwa/`, `taegeuk/`, `band/`.

Key architecture and intent
- Single-page app: everything lives in `index.html` (markup, styles, and the entire game logic in plain JS). No build tools.
- Purpose: an interactive guided quiz/game teaching traditional Korean patterns across Levels 1–5. UI flows are driven by DOM updates and CSS class toggles (e.g. `.hidden-section`).
- State: global JS variables in `index.html` (LANG, TOTAL_SCORE, L1/L2/L3 state variables). Prefer reading/altering those rather than introducing new global managers.

Important files and locations to reference
- `index.html` — primary (and only) source of truth. Search for "LEVEL 1", "PATTERNS", and functions like `renderL1Quiz`, `renderL2Quiz`, `initDancheong` for behavior hooks.
- `icon/` — SVG assets used by PATTERNS (keys: lotus, cloud, crane, plum, phoenix, wave, bamboo, turtle, peony).
- `minhwa/`, `taegeuk/`, `band/` — image assets referenced by later levels.

Conventions and patterns in this codebase
- UI localization: text nodes use data attributes `data-ko` and `data-en`. Use `setLang(lang)` to re-render text safely.
- DOM-first rendering: functions produce HTML strings and set `innerHTML`. Keep event wiring consistent with existing patterns (inline `onclick` or post-render addEventListener calls). If adding features prefer using the same style unless refactoring the whole file.
- Score and progression: use `addScore(correct)` and `updateHeaderScore()` to update global scoring. Do not directly mutate header DOM without calling these helpers.
- Assets: pattern icons are referenced via `PATTERNS` in `index.html`. When adding new patterns, update `PATTERNS` and `P_KEYS` together.

Developer workflows
- Run locally: open `index.html` in a browser (no server required). For CORS-safe testing with local fetches, run a simple static server (e.g. `python -m http.server 8000`) in the repo root.
- No tests or build. Keep changes minimal and self-contained when editing `index.html` because everything is colocated.

When editing or adding behavior, prefer small, low-risk changes
- Add new quizzes by appending to L1_QUIZZES or L2_QUIZZES arrays and following existing object schema (seq, blankPos, answer, wrongs) or (cols,left,right,blanks).
- When modifying the DANCHEONG SVG renderer, preserve the structure: petal indices 0–7 have meaning. Update `petalFill` and `danchPattern` only where the code expects them.
- When adding new UI labels, use `data-ko`/`data-en` attributes and call `setLang(LANG)` (or `setLang('ko'|'en')`) after render to ensure consistency.

Edge cases and gotchas (observed)
- `index.html` uses global variables extensively; introducing modules or bundlers will require refactoring the whole file.
- Several functions use inline `onclick` strings and `eval` in touch handlers (see `renderDancheong` postprocessing). Avoid adding code that depends on `eval` if possible.
- `PATTERNS` contains duplicate keys (phoenix repeated); if changing keys ensure uniqueness and update all references.

Example edits (how to implement small tasks)
- Add a new Level 1 question: push an object with {seq, blankPos, answer, wrongs} to the `L1_QUIZZES` array and ensure `renderL1Quiz` will pick it up.
- Add a new icon: place SVG in `icon/`, add an entry to `PATTERNS` with the svg HTML, and add its key to `P_KEYS`.

If you need to refactor
- Keep behavior identical. Provide a migration patch in the same commit that updates all references (events, PATTERNS keys, L1/L2 data). Add a short comment at top of `index.html` explaining the refactor.

Questions to ask when unclear
- Where should added assets live (icon vs minhwa vs taeguek)? Default: small vector icons -> `icon/`; photographic assets -> `minhwa/`, `band/`, `taegeuk/`.
- Should we split `index.html` into multiple files or keep it single-file? Answering this informs whether to introduce a build step.

After writing changes
- Manually open `index.html` in a browser and click through Levels 1–4 to verify the flow and score updates. Report any console errors and exact failing DOM selectors.
