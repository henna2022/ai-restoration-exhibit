# I'm a Restorer! (나도 복원가!)

An interactive web game built for the Seoul Robot & AI Science Museum (서울로봇인공지능과학관), where visitors restore traditional Korean patterns by hand — instead of just reading about them on a placard.

**Live:** https://henna2022.github.io/ai-restoration-exhibit/

## What it is

Exhibition-linked education content: visitors work through a series of pattern-restoration puzzles based on real Korean traditional motifs — sequence patterns, mirror symmetry, dancheong (traditional temple) coloring, Sam-Taegeuk coloring, and Minhwa (folk painting) wallpaper patterns — and get a "restorer rank" at the end based on their score. The framing (formal, archaic-tone Korean/English copy, a "training" narrative, an unrolling hanji scroll for the result) is built to fit a museum exhibition rather than read like a generic quiz app.

## How it runs

- **No backend.** Static HTML/CSS/vanilla JavaScript, no build step, no server-side code.
- **Deployed on GitHub Pages** directly from this repo.
- **Runs on 8 exhibition tablets** as a museum program: **once a day, ~15 participants per session**.
- **Installable PWA** — `manifest.json` + a service worker (`sw.js`) precache the app shell and cache game assets on first load, so the experience keeps working if the tablets lose network mid-session (network-first for page navigation, cache-first for static assets).
- **Bilingual (한국어 / English)** — every UI string is duplicated via `data-ko` / `data-en` attributes and swapped live by `setLang()`, with a language toggle both on the start screen and the in-game header.
- **Built-in usage tracking, no external analytics dashboard needed for it** — `admin.html` is a PIN-gated page (PIN set in-file) that reads a per-device `localStorage` counter (`nrx_stats`) recorded by `script.js`, and shows total plays, completions, completion rate, a 14-day daily bar chart, and CSV export. Note this is per-device: each tablet's browser keeps its own count, nothing is aggregated across the 8 tablets automatically.
- Google Analytics (`gtag.js`) is also wired into `index.html` for page-level tracking.

## Game flow

1. **Start screen** — opening video background, "수련 시작 / Begin Training" button, language toggle.
2. **Level 1 — Find the Pattern**: a 5-question multiple-choice quiz where visitors spot the missing motif in a repeating sequence of traditional icons (lotus, cloud, crane, plum, phoenix, wave, bamboo, turtle, peony), immediately followed by a 2-question "band pattern" round (`band/` assets) where the missing tile in a decorative border has to be picked.
3. **Level 2 — Symmetry**: a 5-question progressive-difficulty round where visitors complete a mirrored grid (3×3 up to 7×7) by choosing the pattern that keeps left/right symmetry.
4. **Level 3 — Color Reasoning**, spanning three mini-games under one theme:
   - **Dancheong coloring** — infer the blue → red → green → yellow color cycle and pick the right color for each of 4 unfilled petals of an SVG-rendered lotus/dancheong motif.
   - **Sam-Taegeuk coloring** — fill in the Sam-Taegeuk's color regions in the correct order, in 3 steps (`taegeuk/taegeuk_1.png` → `taegeuk_2.png` → `taegeuk_3.png` → `taegeuk_finish.png`).
   - **Minhwa wallpaper patterns** — pick the correct traditional motif (crane, peony, deer) to fill 3 blank squares in a folk-painting wallpaper image.
5. **Score tallying** — a loading overlay while the score is computed (each question is +1 correct / -1 wrong, floored at 0, converted to a percentage).
6. **Celebration** — an animated hanji scroll unrolls with a final rank (aspiring restorer / skilled restorer / timeless master restorer, by score band), a score readout, a closing message, and CSS-only confetti — all in the same formal in-character tone as the rest of the game.

## Project structure

```
index.html      Single-page app shell: start screen, level 1-5 markup, celebration scroll
script.js       All game logic: quiz data/rendering, scoring, language switching, play counter, PWA image preloading
style.css       All styling
admin.html      PIN-gated, per-device play-count dashboard (localStorage stats, CSV export)
manifest.json   PWA manifest (name, icons, theme color)
sw.js           Service worker: app-shell precache + cache-first/network-first fetch strategy
opening.mp4/.mov  Opening/level-transition video background
icon/           SVG motif icons used in Level 1 (lotus, cloud, crane, plum, phoenix, wave, bamboo, turtle, peony)
band/           Border/band-pattern images for the Level 1 bonus round
minhwa/         Folk-painting wallpaper + motif images for the Level 3 wallpaper round
taegeuk/        Sam-Taegeuk step images for the Level 3 coloring round
loading/        Loading-overlay illustrations shown while the score is tallied
```

## 한국어 소개

서울로봇인공지능과학관의 전시 연계 교육 콘텐츠로 만든 인터랙티브 웹게임입니다. 관람객이 순서 패턴, 대칭, 단청·삼태극·민화 벽지의 색과 문양을 직접 맞춰가며 한국 전통 문양을 "복원"하는 체험을 하도록 구성했습니다. 서버 없는 정적 JavaScript/HTML/CSS로 가볍게 구현해 GitHub Pages에 배포했고, 전시장 태블릿 8대에서 1일 1회 프로그램(회당 약 15명 참여)으로 운영됩니다. 오프라인에서도 이어지도록 PWA(서비스 워커) 지원과 한국어/영어 전환을 갖췄고, 기기별 플레이 횟수를 확인할 수 있는 PIN 보호 관리자 페이지(`admin.html`)도 함께 만들었습니다.

포트폴리오 상세: https://juwonlee.dev/work/im-a-restorer
