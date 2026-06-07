// ============================================================
// LANGUAGE SYSTEM
// ============================================================
let LANG = 'ko';

// ============================================================
// SCORE SYSTEM (사극 점수)
// ============================================================
let TOTAL_SCORE = 0;
let TOTAL_MAX = 0;

function addScore(correct) {
  TOTAL_MAX += 1;
  if (correct) {
    TOTAL_SCORE += 1;
  } else {
    TOTAL_SCORE -= 1;
  }
}

function getScorePercent() {
  if (TOTAL_MAX === 0) return 0;
  // 음수 점수도 0으로 클램프
  const score = Math.max(0, TOTAL_SCORE);
  return Math.round((score / TOTAL_MAX) * 100);
}

// 화면에 떠 있는 피드백 버블 id 목록 — 언어 전환 시 보존/번역 대상
const FEEDBACK_IDS = ['l1-feedback', 'l2-feedback', 'band-feedback', 'danch-feedback', 'taegeuk-feedback', 'l5-feedback'];

// 피드백 텍스트를 ko/en 양쪽으로 저장 → setLang의 data-ko 일괄 교체가 즉시 번역.
// `<b>` 등 마크업을 지원하기 위해 innerHTML 사용(저장 문자열과 동일하게 렌더).
function setFeedback(el, ko, en) {
  if (!el) return;
  el.dataset.ko = ko;
  el.dataset.en = en;
  el.innerHTML = LANG === 'ko' ? ko : en;
}

// 피드백을 비울 때는 data 속성도 제거해야 이후 setLang에서 옛 메시지가 되살아나지 않는다.
function clearFeedback(el) {
  if (!el) return;
  delete el.dataset.ko;
  delete el.dataset.en;
  el.innerHTML = '';
}

function setLang(lang) {
  LANG = lang;

  // ── 1. 화면에 떠 있는 피드백을 스냅샷 ──
  // 일부 카드의 재렌더(renderL1Quiz 등)는 피드백을 지우므로, 언어만 바뀌고
  // 메시지는 유지되도록 재렌더 전에 보관했다가 뒤에서 복원한다.
  const fbSnapshot = {};
  FEEDBACK_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && (el.dataset.ko || el.dataset.en)) {
      fbSnapshot[id] = { ko: el.dataset.ko, en: el.dataset.en, className: el.className };
    }
  });

  // ── 1b. 진행 상태 스냅샷 (완료 플래그 + 다음/완료 버튼 가시성) ──
  // 일부 카드의 재렌더(renderL1Quiz 등)는 현재 문제를 새로 그리며 완료 플래그와
  // 다음/완료 버튼을 초기화한다. 이미 푼 문제가 "언어 전환"만으로 리셋되어
  // 다음 단계(특히 마지막 결과 화면)로 넘어가지 못하는 일이 없도록 보관 후 복원한다.
  const flagSnapshot = { l1Answered, bandDone, l5Done };
  const NAV_BUTTON_IDS = ['l1-next-btn', 'l1-finish-btn', 'band-finish-btn',
                          'l2-next-btn', 'l2-finish-btn', 'l5-finish-btn'];
  const btnSnapshot = {};
  NAV_BUTTON_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) btnSnapshot[id] = { display: el.style.display, show: el.classList.contains('show') };
  });

  // ── 2. 현재 보이는 카드의 동적 콘텐츠를 다시 렌더링 ──
  // 렌더 시점에 언어가 박히는 콘텐츠(문제·선택지·라벨)는 data-ko 일괄 교체로
  // 잡히지 않으므로, 보이는 모든 카드를 렌더 함수로 다시 그린다.
  // ※ data-ko 교체(4단계)보다 먼저 실행해야, 여기서 새로 생성된 data-ko
  //   스팬까지 4단계에서 함께 번역된다.
  // ※ level2-card는 renderL2Quiz()가 진행 중인 빈칸/완료 상태까지 초기화하므로,
  //   상태를 건드리지 않고 화면만 다시 그리는 grid/options 렌더만 호출한다.
  const LANG_RERENDERERS = {
    'level1-card':  () => renderL1Quiz(),
    'band-card':    () => renderBandQuiz(),
    'level2-card':  () => { renderL2QuizGrid(); renderL2Options(); },
    'level3-card':  () => { renderDanchLegend(); renderDancheong(); renderDanchOptions(); updateDanchQuestion(); },
    'taegeuk-card': () => { updateTaegeukLabel(); renderTaegeukOptions(); updateTaegeukNumBadge(); },
    'level5-card':  () => { renderL5Badges(); renderL5Quiz(); },
  };
  for (const [cardId, rerender] of Object.entries(LANG_RERENDERERS)) {
    const card = document.getElementById(cardId);
    if (card && !card.classList.contains('hidden-section')) {
      try { rerender(); }
      catch(e) { console.warn('lang re-render error [' + cardId + ']:', e); }
    }
  }

  // ── 2b. 진행 상태 복원 (재렌더가 초기화한 완료 플래그 + 버튼 되돌리기) ──
  l1Answered = flagSnapshot.l1Answered;
  bandDone   = flagSnapshot.bandDone;
  l5Done     = flagSnapshot.l5Done;
  Object.entries(btnSnapshot).forEach(([id, s]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = s.display;
    el.classList.toggle('show', s.show);
  });

  // ── 3. 재렌더로 지워졌을 수 있는 피드백 복원 ──
  Object.entries(fbSnapshot).forEach(([id, s]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.ko = s.ko;
    el.dataset.en = s.en;
    el.className = s.className;
  });

  // ── 4. data-ko/data-en 속성을 가진 모든 요소를 현재 언어로 교체 ──
  // (위에서 복원한 피드백 포함)
  document.querySelectorAll('[data-ko]').forEach(el => {
    el.innerHTML = el.getAttribute('data-' + lang) || el.getAttribute('data-ko');
  });

  // ── 5. 언어 버튼 active 상태 갱신 ──
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.lang-btn[onclick="setLang('${lang}')"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

// ============================================================
// TRADITIONAL PATTERN SVGs
// All patterns are pure SVG shapes — no emoji
// ============================================================
const PATTERNS = {
  lotus: {
    name_ko: '연꽃', name_en: 'Lotus',
    svg: `<img src="icon/lotus.svg" width="40" height="40" style="width:85%;height:85%;object-fit:contain;display:block;">`
  },
  cloud: {
    name_ko: '구름', name_en: 'Cloud',
    svg: `<img src="icon/cloud.svg" width="40" height="40" style="width:85%;height:85%;object-fit:contain;display:block;">`
  },
  crane: {
    name_ko: '학', name_en: 'Crane',
    svg: `<img src="icon/crane.svg" width="40" height="40" style="width:85%;height:85%;object-fit:contain;display:block;">`
  },
  plum: {
    name_ko: '매화', name_en: 'Plum Blossom',
    svg: `<img src="icon/plum.svg" width="40" height="40" style="width:85%;height:85%;object-fit:contain;display:block;">`
  },
  phoenix: {
    name_ko: '봉황', name_en: 'Phoenix',
    svg: `<img src="icon/phoenix.svg" width="40" height="40" style="width:85%;height:85%;object-fit:contain;display:block;">`
  },
  wave: {
    name_ko: '파도', name_en: 'Wave',
    svg: `<img src="icon/wave.svg" width="40" height="40" style="width:85%;height:85%;object-fit:contain;display:block;">`
  },
  bamboo: {
    name_ko: '대나무', name_en: 'Bamboo',
    svg: `<img src="icon/bamboo.svg" width="40" height="40" style="width:85%;height:85%;object-fit:contain;display:block;">`
  },
  turtle: {
    name_ko: '거북', name_en: 'Turtle',
    svg: `<img src="icon/turtle.svg" width="40" height="40" style="width:85%;height:85%;object-fit:contain;display:block;">`
  },
  peony: {
    name_ko: '모란', name_en: 'Peony',
    svg: `<img src="icon/peony.svg" width="40" height="40" style="width:85%;height:85%;object-fit:contain;display:block;">`
  }
};

function patternSVG(key) {
  return PATTERNS[key] ? PATTERNS[key].svg : '<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="#ddd"/></svg>';
}
function patternName(key) {
  return LANG === 'ko' ? PATTERNS[key].name_ko : PATTERNS[key].name_en;
}

// ============================================================
// LEVEL 1 — fixed sequence quizzes
// ============================================================
// blankPos: '?' 칸의 위치 (0=처음, 1~3=중간, 4=끝)
const L1_QUIZZES = [
  // 문제 1 (NEW): 맨 처음이 빈칸 - ?, 매화, 구름, 매화, 구름  → 답: 구름
  {
    seq: ['cloud','plum','cloud','plum','cloud'],
    blankPos: 0,
    answer: 'cloud',
    wrongs: ['lotus','crane','wave']
  },
  // 문제 2 (기존 1번): 끝이 빈칸 - 연꽃, 매화, 연꽃, 매화, ? → 답: 연꽃
  {
    seq: ['lotus','plum','lotus','plum','lotus'],
    blankPos: 4,
    answer: 'lotus',
    wrongs: ['cloud','crane','wave']
  },
  // 문제 3 (기존 2번): 끝이 빈칸 - 봉황, 매화, 봉황, 매화, ? → 답: 봉황
  {
    seq: ['phoenix','plum','phoenix','plum','phoenix'],
    blankPos: 4,
    answer: 'phoenix',
    wrongs: ['crane','turtle','cloud']
  },
  // 문제 4 (기존 3번): 끝이 빈칸 - 거북, 대나무, 거북, 대나무, ? → 답: 거북
  {
    seq: ['turtle','bamboo','turtle','bamboo','turtle'],
    blankPos: 4,
    answer: 'turtle',
    wrongs: ['wave','lotus','peony']
  },
  // 문제 5 (NEW): 중간(3번째)이 빈칸 - 학, 구름, ?, 구름, 학 → 답: 학
  {
    seq: ['crane','cloud','crane','cloud','crane'],
    blankPos: 2,
    answer: 'crane',
    wrongs: ['plum','turtle','peony']
  }
];

let l1Current = 0, l1Score = 0, l1Answered = false;

function shuffle(arr) { return [...arr].sort(() => Math.random() - .5); }

function renderL1Quiz() {
  const q = L1_QUIZZES[l1Current];
  const options = shuffle([q.answer, ...q.wrongs]);
  const letters = ['1','2','3','4'];

  let seqHTML = '<div class="pattern-sequence">';
  q.seq.forEach((key, i) => {
    if (i === q.blankPos) {
      // ? 칸 그리기
      seqHTML += `<div class="pattern-item">
        <div class="pattern-question"><span style="font-size:30px;color:white;font-weight:900;font-family:'Noto Serif KR',serif">?</span></div>
        <div class="pattern-name" style="visibility:hidden">여기</div>
      </div>`;
    } else {
      seqHTML += `<div class="pattern-item">
        <div class="pattern-cell">${patternSVG(key)}</div>
        <div class="pattern-name">${patternName(key)}</div>
      </div>`;
    }
    if (i < q.seq.length - 1) seqHTML += `<div class="pattern-arrow">&rarr;</div>`;
  });
  seqHTML += `</div>`;

  let optHTML = '<div class="quiz-options">';
  options.forEach((key, i) => {
    optHTML += `<button class="quiz-option" onclick="checkL1(this,'${key}','${q.answer}')">
      <div class="opt-letter">${letters[i]}</div>
      <div class="opt-cell">${patternSVG(key)}</div>
      <div>${patternName(key)}</div>
    </button>`;
  });
  optHTML += '</div>';

  const qLabel_ko = `문제 ${l1Current+1}/5 &mdash; 빈칸에 들 문양은 무엇이오?`;
  const qLabel_en = `Q${l1Current+1}/5 &mdash; What pattern fills the blank?`;

  document.getElementById('l1-quiz-container').innerHTML = `
    <div class="pattern-display">
      <p style="font-size:16px;color:var(--text-medium);margin-bottom:16px;font-weight:600" data-ko="${qLabel_ko}" data-en="${qLabel_en}">${LANG==='ko'?qLabel_ko:qLabel_en}</p>
      ${seqHTML}
    </div>
    ${optHTML}
  `;

  // 이전 문제의 피드백 초기화
  const prevFb = document.getElementById('l1-feedback');
  prevFb.classList.remove('show','correct','wrong');
  clearFeedback(prevFb);

  // dots
  document.getElementById('l1-nav').innerHTML = L1_QUIZZES.map((_,i) =>
    `<div class="quiz-dot ${i<l1Current?'done':i===l1Current?'active':''}"></div>`).join('');

  document.getElementById('l1-next-btn').classList.remove('show');
  document.getElementById('l1-finish-btn').style.display = 'none';
  l1Answered = false;
}

function checkL1(btn, chosen, answer) {
  if (l1Answered) return;
  l1Answered = true;
  const correct = (chosen === answer);
  if (correct) l1Score++;
  addScore(correct);  // ← 정답 스코어 추가

  document.querySelectorAll('#l1-quiz-container .quiz-option').forEach(b => {
    b.style.pointerEvents = 'none';
    // 정답 버튼 강조
    if (b.textContent.trim().includes(LANG==='ko'?PATTERNS[answer].name_ko:PATTERNS[answer].name_en)) {
      b.classList.add('correct');
    }
  });
  btn.classList.add(correct ? 'correct' : 'wrong');

  const fb = document.getElementById('l1-feedback');
  fb.classList.remove('show','correct','wrong');
  fb.classList.add('show', correct ? 'correct' : 'wrong');
  if (correct) {
    setFeedback(fb, '옳소! 패턴을 잘 헤아렸소.', 'Correct! You found the pattern.');
  } else {
    setFeedback(fb,
      `아쉽소! 정답은 [${PATTERNS[answer].name_ko}]이오. 다시 살펴보시오.`,
      `Close! The answer is [${PATTERNS[answer].name_en}]. Look at the pattern again.`);
  }

  document.getElementById('score-1').textContent = `${l1Current + 1} / 5`;

  if (l1Current < 4) {
    document.getElementById('l1-next-btn').classList.add('show');
  } else {
    document.getElementById('l1-finish-btn').style.display = 'flex';
    document.getElementById('l1-finish-btn').style.margin = '14px auto 0';
  }
}
function nextL1Quiz() { l1Current++; renderL1Quiz(); }

function finishLevel1() {
  document.getElementById('level1-card').classList.add('hidden-section');
  startBandQuiz();
}

// ============================================================
// LEVEL 2 — SYMMETRY (5 questions, progressive difficulty)
// ============================================================
// Schema: grid is the full final answer (cols x cols).
// `cols` is grid side length (3, 5, or 7).
// `mirror` axis is vertical (left half mirrors to right half).
// `blanks` is an array of cell indices in the grid that are the mystery cells.
// For each blank: { idx, answer, wrongs } — wrongs only matters for the
//   "active" blank that the user is currently choosing for.
// For multi-blank quizzes, blanks are filled in order; correct answer shows
//   in cell, then advance to the next blank.

// Helper: build a full NxN horizontally-mirrored grid from the left half

// Q1: 3x3 — left half is 2 cols (col 0,1,2 where col 2 mirrors col 0)
// leftHalf defines all 3 cols of left side. Right side = mirror of left.
// Total grid = 6 cols (left 3 + right 3), displayed side by side with divider
// New approach: define full 3-col LEFT grid, right grid = reverse of left per row
function makeSymQuiz(cols, leftGrid) {
  // leftGrid: cols×cols array (row-major). rightGrid is horizontal mirror.
  const rightGrid = [];
  for (let r = 0; r < cols; r++) {
    const row = leftGrid.slice(r * cols, r * cols + cols);
    rightGrid.push(...row.slice().reverse());
  }
  return { left: leftGrid, right: rightGrid };
}

// Q1: 3x3
const Q1 = makeSymQuiz(3, ['lotus','cloud','crane',  'wave','plum','bamboo',  'peony','phoenix','turtle']);
// Q2: 3x3
const Q2 = makeSymQuiz(3, ['plum','wave','phoenix',  'bamboo','crane','lotus',  'turtle','peony','cloud']);
// Q3: 3x3 HARD (flower family options)
const Q3 = makeSymQuiz(3, ['lotus','cloud','peony',  'plum','wave','crane',  'phoenix','bamboo','turtle']);
// Q4: 5x5
const Q4 = makeSymQuiz(5, [
  'lotus','cloud','crane','wave','bamboo',
  'wave','plum','peony','phoenix','turtle',
  'peony','phoenix','turtle','lotus','crane',
  'plum','lotus','cloud','wave','peony',
  'wave','crane','peony','bamboo','cloud'
]);
// Q5: 5x5
const Q5 = makeSymQuiz(5, [
  'crane','peony','bamboo','lotus','wave',
  'turtle','cloud','phoenix','plum','crane',
  'lotus','wave','turtle','bamboo','peony',
  'plum','crane','cloud','phoenix','turtle',
  'bamboo','lotus','peony','wave','cloud'
]);

// Blanks: indices are into the RIGHT grid (cols×cols)
// For Q1-Q3: blank idx 0 = top-right corner (mirror of top-left = col 0 of left)
const L2_QUIZZES = [
  // Q1: 3x3 — 가운데 칸 빈칸 (idx:4)
  {
    cols: 3, left: Q1.left, right: Q1.right,
    blanks: [{ idx: 4, wrongs: ['lotus','wave','bamboo'] }]
  },
  // Q2: 3x3 — 우하단 칸 빈칸 (idx:8)
  {
    cols: 3, left: Q2.left, right: Q2.right,
    blanks: [{ idx: 8, wrongs: ['plum','lotus','bamboo'] }]
  },
  // Q3 HARD: 3x3 — 좌하단 칸 빈칸 (idx:6)
  {
    cols: 3, left: Q3.left, right: Q3.right,
    blanks: [{ idx: 6, wrongs: ['lotus','plum','phoenix'] }]
  },
  // Q4
  {
    cols: 5, left: Q4.left, right: Q4.right,
    blanks: [
      { idx: 6,  wrongs: ['wave','peony','plum'] },        // 정답: phoenix
      { idx: 12, wrongs: ['crane','lotus','peony'] },      // 정답: turtle
      { idx: 18, wrongs: ['crane','peony','bamboo'] }      // 정답: lotus
    ]
  },
  // Q5: 5x5
  {
    cols: 5, left: Q5.left, right: Q5.right,
    blanks: [
      { idx: 7,  wrongs: ['turtle','lotus','peony'] },    // 정답: phoenix
      { idx: 13, wrongs: ['cloud','crane','plum'] },      // 정답: wave
      { idx: 19, wrongs: ['bamboo','phoenix','crane'] },  // 정답: plum
      { idx: 22, wrongs: ['turtle','bamboo','lotus'] }    // 정답: peony
    ]
  }
];

let l2Current = 0, l2Score = 0, l2Answered = false;
let l2ActiveBlankIdx = 0;
let l2QuizSolved = false;
let l2Filled = new Set();

function renderL2Quiz() {
  const q = L2_QUIZZES[l2Current];
  l2ActiveBlankIdx = 0;
  l2QuizSolved = false;
  l2Answered = false;
  l2Filled = new Set();
  document.getElementById('score-2').textContent = `${l2Current + 1} / 5`;  // ← 추가
  renderL2QuizGrid();
  renderL2Options();
  renderL2Nav();
  document.getElementById('l2-next-btn').classList.remove('show');
  document.getElementById('l2-finish-btn').style.display = 'none';
}

function renderL2QuizGrid() {
  const q = L2_QUIZZES[l2Current];
  const cols = q.cols;
  const blankIndices = q.blanks.map(b => b.idx);
  const activeBlankIdx = q.blanks[l2ActiveBlankIdx] ? q.blanks[l2ActiveBlankIdx].idx : -1;

  // Cell size decreases with larger grids
  const cellSize = cols === 5 ? '17%' : '30%';
  const gap = cols === 5 ? '4px' : '5px';
  const svgScale = cols === 5 ? '75%' : '80%';

  // Build LEFT cells (all shown, never blank)
  let leftCells = '';
  for (let i = 0; i < cols * cols; i++) {
    leftCells += `<div class="sym-cell" style="font-size:${svgScale}">
      <div style="width:${svgScale};height:${svgScale}">${patternSVG(q.left[i])}</div>
    </div>`;
  }

  // Build RIGHT cells (blanks show ?)
  let rightCells = '';
  for (let i = 0; i < cols * cols; i++) {
    if (blankIndices.includes(i)) {
      const blankNum = blankIndices.indexOf(i) + 1;
      const isFilled = l2Filled.has(i);
      const isActive = i === activeBlankIdx;
      if (isFilled) {
        rightCells += `<div class="sym-cell filled-correct">
          <div style="width:${svgScale};height:${svgScale}">${patternSVG(q.right[i])}</div>
        </div>`;
      } else {
        rightCells += `<div class="sym-cell mystery ${isActive ? 'active-target' : ''}">
          <span class="q-mark" style="font-size:${cols>=7?'13px':cols===5?'15px':'20px'}">?</span>
          ${q.blanks.length > 1 ? `<span class="blank-num">${blankNum}</span>` : ''}
        </div>`;
      }
    } else {
      rightCells += `<div class="sym-cell">
        <div style="width:${svgScale};height:${svgScale}">${patternSVG(q.right[i])}</div>
      </div>`;
    }
  }

  const qKo = `문제 ${l2Current+1}/5 &mdash; 빈칸에 들어갈 문양은 무엇이오?${q.blanks.length > 1 ? ` (총 ${q.blanks.length}개)` : ''}`;
  const qEn = `Q${l2Current+1}/5 &mdash; What fills the blank(s)?${q.blanks.length > 1 ? ` (${q.blanks.length} blanks)` : ''}`;
  const curBlankKo = q.blanks.length > 1 ? `<p style="font-size:15px;color:var(--gold-dark);margin-bottom:10px;text-align:center;font-weight:600">현재 ${l2ActiveBlankIdx+1}번 빈칸을 풀고 있소.</p>` : '';
  const curBlankEn = q.blanks.length > 1 ? `<p style="font-size:15px;color:var(--gold-dark);margin-bottom:10px;text-align:center;font-weight:600">Now solving blank #${l2ActiveBlankIdx+1}</p>` : '';

  document.getElementById('l2-quiz-container').innerHTML = `
    <p style="font-size:16px;color:var(--text-medium);margin-bottom:10px;font-weight:600;text-align:center">${LANG==='ko'?qKo:qEn}</p>
    ${LANG==='ko'?curBlankKo:curBlankEn}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:center;background:var(--bg-paper);border-radius:14px;border:1.5px solid var(--border-warm);padding:16px;margin-bottom:16px">
      <div style="border-radius:10px;overflow:hidden;border:1.5px solid var(--border-warm);background:white">
        <div style="background:var(--primary-dark);color:white;text-align:center;font-size:14px;font-weight:700;padding:6px;letter-spacing:1px">${LANG==='ko'?'왼쪽':'Left'}</div>
        <div style="padding:8px;display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap}">${leftCells}</div>
      </div>
      <div style="border-radius:10px;overflow:hidden;border:1.5px solid var(--border-warm);background:white">
        <div style="background:var(--primary-dark);color:white;text-align:center;font-size:14px;font-weight:700;padding:6px;letter-spacing:1px">${LANG==='ko'?'오른쪽':'Right'}</div>
        <div style="padding:8px;display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap}">${rightCells}</div>
      </div>
    </div>
    <div id="l2-options-area"></div>
  `;
  // 이전 문제의 피드백 초기화
  const prevFb = document.getElementById('l2-feedback');
  if (prevFb) {
    prevFb.classList.remove('show','correct','wrong');
    clearFeedback(prevFb);
  }
}

function renderL2Options() {
  const q = L2_QUIZZES[l2Current];
  const blank = q.blanks[l2ActiveBlankIdx];
  if (!blank) return;
  const answer = q.right[blank.idx]; // answer comes from the RIGHT grid
  const options = shuffle([answer, ...blank.wrongs]);
  const letters = ['A','B','C','D'];

  let html = '<div class="quiz-options">';
  options.forEach((key, i) => {
    html += `<button class="quiz-option" onclick="checkL2(this,'${key}','${answer}')">
      <div class="opt-letter">${letters[i]}</div>
      <div class="opt-cell">${patternSVG(key)}</div>
      <div>${patternName(key)}</div>
    </button>`;
  });
  html += '</div>';
  document.getElementById('l2-options-area').innerHTML = html;
}

function renderL2Nav() {
  document.getElementById('l2-nav').innerHTML = L2_QUIZZES.map((_,i) =>
    `<div class="quiz-dot ${i<l2Current?'done':i===l2Current?'active':''}"></div>`).join('');
}

function checkL2(btn, chosen, answer) {
  if (l2Answered && l2QuizSolved) return;
  const q = L2_QUIZZES[l2Current];
  const blank = q.blanks[l2ActiveBlankIdx];
  const correct = chosen === answer;
  addScore(correct);  // ← 추가

  // disable buttons
  document.querySelectorAll('#l2-options-area .quiz-option').forEach(b => {
    b.style.pointerEvents = 'none';
    if (b.textContent.trim().includes(LANG==='ko'?PATTERNS[answer].name_ko:PATTERNS[answer].name_en)) {
      b.classList.add('correct');
    }
  });
  if (!correct) btn.classList.add('wrong');

  const fb = document.getElementById('l2-feedback');
  fb.classList.remove('show','correct','wrong');
  void fb.offsetWidth;
  fb.classList.add('show', correct ? 'correct' : 'wrong');

  if (correct) {
    l2Filled.add(blank.idx);
    // Check if all blanks filled
    if (l2ActiveBlankIdx >= q.blanks.length - 1) {
      // Quiz fully solved
      l2QuizSolved = true;
      l2Score++;
      setFeedback(fb,
        (q.blanks.length > 1 ? `훌륭하오! 모든 빈칸을 다 맞췄소!` : '옳소! 대칭 패턴을 잘 헤아렸소.'),
        (q.blanks.length > 1 ? `Excellent! You filled all the blanks!` : 'Correct! You found the symmetry pattern.'));

      if (l2Current < L2_QUIZZES.length - 1) {
        document.getElementById('l2-next-btn').classList.add('show');
      } else {
        document.getElementById('l2-finish-btn').style.display = 'flex';
        document.getElementById('l2-finish-btn').style.margin = '14px auto 0';
      }
    } else {
      // More blanks remaining — advance to next blank
      setFeedback(fb,
        `잘했소! ${l2ActiveBlankIdx+1}번 빈칸 정답이오! 다음 빈칸을 풀어보시오.`,
        `Good! Blank #${l2ActiveBlankIdx+1} correct. Now solve the next one.`);
      setTimeout(() => {
        l2ActiveBlankIdx++;
        renderL2QuizGrid();
        renderL2Options();
        // Re-bind feedback
      }, 1100);
    }
  } else {
    setFeedback(fb,
      `아쉽소! 왼쪽과 반대로 생각해보시오. 정답은 [${PATTERNS[answer].name_ko}]이오.`,
      `Not quite! Mirror the left side. The answer is [${PATTERNS[answer].name_en}].`);
    // Auto-fill this blank with correct answer + advance
    l2Filled.add(blank.idx);
    if (l2ActiveBlankIdx >= q.blanks.length - 1) {
      l2QuizSolved = true;
      // Don't increment score for wrong answer, but still allow moving to next quiz
      if (l2Current < L2_QUIZZES.length - 1) {
        document.getElementById('l2-next-btn').classList.add('show');
      } else {
        document.getElementById('l2-finish-btn').style.display = 'flex';
        document.getElementById('l2-finish-btn').style.margin = '14px auto 0';
      }
    } else {
      setTimeout(() => {
        l2ActiveBlankIdx++;
        renderL2QuizGrid();
        renderL2Options();
      }, 1500);
    }
  }
}

function nextL2Quiz() {
  l2Current++;
  renderL2Quiz();
}

function finishLevel2() {
  document.getElementById('level2-card').classList.add('hidden-section');
  showLevelIntro(3, () => {
    document.getElementById('level3-card').classList.remove('hidden-section');
    initDancheong();
  });
}

// ============================================================
// LEVEL 3 — DANCHEONG (real form, 6 petals: 3 example + 3 fill)
// Reference: attached image — multi-layer mandala/lotus with
// concentric layered petals. Inner ring has 6 pointed petals.
// We model a dancheong lotus: outer decorative ring + inner 6 petals.
// Colors cycle: red -> green -> yellow (randomly chosen)
// ============================================================

const DANCH_COLORS = {
  blue:   { hex:'#2B4A8C', light:'#6A8FD4', name_ko:'파랑', name_en:'Blue' },
  red:    { hex:'#B83232', light:'#E07070', name_ko:'빨강', name_en:'Red' },
  green:  { hex:'#2A6B3A', light:'#6AAA80', name_ko:'초록', name_en:'Green' },
  yellow: { hex:'#C9960A', light:'#EFC050', name_ko:'노랑', name_en:'Yellow' }
};

// Fixed pattern per spec: red -> green -> yellow (can be shuffled from base)
let danchPattern = []; // 4-color keys for cycling
// 8 petals total: 0-3 = 예시(★, 미리 채움), 4-7 = 객관식으로 채우는 칸(번호 1~4)
let petalFill = [null, null, null, null, null, null, null, null];

// 객관식 진행 상태
let danchStep = 0; // 0 → 1번 꽃잎, 1 → 2번, 2 → 3번, 3 → 4번
const DANCH_ANSWERS = ['blue','red', 'green', 'yellow']; // 1,2,3,4번 꽃잎 정답

function initDancheong() {
  petalFill = [null, null, null, null, null, null, null, null];
  danchPattern = ['blue','red','green','yellow'];
  // 예시 꽃잎(0,1,2,3) 미리 채우기 — 파/빨/초/노
  for (let i = 0; i < 4; i++) petalFill[i] = danchPattern[i];

  danchStep = 0;

  renderDanchLegend();
  renderDancheong();
  renderDanchOptions();      // ← 객관식 버튼 렌더
  updateDanchQuestion();     // ← 질문 텍스트 업데이트
  setLang(LANG);
}

function renderDanchLegend() {
  const legend = document.getElementById('danch-legend');
  let html = '';
  danchPattern.forEach((key, i) => {
    if (i > 0) html += `<div class="danch-arrow">&rarr;</div>`;
    html += `<div class="danch-pattern-item">
      <div class="danch-pattern-swatch" style="background:${DANCH_COLORS[key].hex}"></div>
      <div class="danch-pattern-label" data-ko="${DANCH_COLORS[key].name_ko}" data-en="${DANCH_COLORS[key].name_en}">${LANG==='ko'?DANCH_COLORS[key].name_ko:DANCH_COLORS[key].name_en}</div>
    </div>`;
  });
  html += `<div class="danch-arrow">&rarr;</div><div class="danch-pattern-item"><div class="danch-pattern-swatch" style="background:#E0D4B8;border:2px dashed #C9A84C"></div><div class="danch-pattern-label">?</div></div>`;
  legend.innerHTML = html;
}

// 객관식 버튼 렌더 (레벨 4 삼태극과 동일한 스타일)
function renderDanchOptions() {
  const box = document.getElementById('danch-options');
  box.innerHTML = Object.entries(DANCH_COLORS).map(([key, c]) => `
    <div class="taegeuk-color-btn-wrap" onclick="answerDanch('${key}')" data-color="${key}" style="cursor:pointer;text-align:center;">
      <div class="taegeuk-color-btn" style="background:${c.hex}"></div>
      <span style="font-size:13px;font-weight:600;color:var(--text-dark);margin-top:4px;display:block;">
        ${LANG==='ko'?c.name_ko:c.name_en}
      </span>
    </div>
  `).join('');
}

// 질문 텍스트 업데이트 ("1번 꽃잎에 들어갈 색은?")
function updateDanchQuestion() {
  const label = document.getElementById('danch-question-label');
  if (!label) return;
  // score-display 업데이트 (최대값 3으로 고정)
  const scoreEl = document.getElementById('score-danch');
  if (scoreEl) scoreEl.textContent = `${Math.min(danchStep + 1, 4)} / 4`;
  if (danchStep >= 4) {
    const ko = '모두 맞히셨소!', en = 'All correct!';
    label.innerHTML = `<span data-ko="${ko}" data-en="${en}">${LANG==='ko'?ko:en}</span>`;
    return;
  }
  const num = danchStep + 1;
  const ko = `${num}번 꽃잎에 들어갈 색은?`;
  const en = `What color goes in petal ${num}?`;
  label.innerHTML = `<span data-ko="${ko}" data-en="${en}">${LANG==='ko'?ko:en}</span>`;
}

// 객관식 답 처리
function answerDanch(colorKey) {
  if (danchStep >= 4) return;
  const correct = DANCH_ANSWERS[danchStep];
  addScore(colorKey === correct);

  if (colorKey === correct) {
    // 해당 꽃잎 색칠
    const petalIdx = danchStep + 4; // step 0 → 꽃잎 4, step 1 → 5, step 2 → 6, step 3 → 7
    petalFill[petalIdx] = colorKey;
    danchStep++;

    renderDancheong();
    showDanchFeedback(true,
      `정답이오! ${danchStep}번 꽃잎에 ${DANCH_COLORS[colorKey].name_ko}색이 칠해졌소.`,
      `Correct! Petal ${danchStep} is now ${DANCH_COLORS[colorKey].name_en}.`);

    updateDanchQuestion();

    // 4개 다 맞히면 완료 버튼 표시
    if (danchStep >= 4) {
      document.getElementById('l3-finish-btn').style.display = 'flex';
    }
  } else {
    showDanchFeedback(false,
      `다시 생각해보시오. 패턴을 살펴보면 답이 보일 것이오.`,
      `Try again. Look at the pattern carefully.`);
  }
}


// SVG: dancheong-style lotus faithfully recreating the attached reference image
// Layer order (back to front):
//   1. Dark green-black circular background
//   2. Outer teal scallop ring (decorative — small leaves + dark inner)
//   3. Orange round half-petals layer (between scallop and pink petals)
//   4. Blue star/diamond layer (peeks between pink petals)
//   5. 8 large pink lotus petals (THE INTERACTIVE LAYER)
//   6. Red small leaf inside each pink petal (color follows petal color when filled)
//   7. Small black inner leaf
//   8. Center: teal disc with yellow dot
function renderDancheong() {
  const svg = document.getElementById('dancheong-svg');
  const cx = 200, cy = 200;
  let s = '';

  // ── 1. Dark background circle ──
  s += `<circle cx="${cx}" cy="${cy}" r="195" fill="#1A2E22" stroke="#0A1610" stroke-width="1.5"/>`;

  // ── 2. Outer teal scallop ring (10 scallops, decorative) ──
  // Each scallop = larger light-teal "cloud" with a darker teal blob and a dark green inner blob
  for (let i = 0; i < 10; i++) {
    const a = (i * 36 - 90) * Math.PI / 180;
    const sx = cx + Math.cos(a) * 158;
    const sy = cy + Math.sin(a) * 158;
    // outer light teal cloud (3-bump scallop)
    const rot = (i * 36);
    s += `<g transform="translate(${sx},${sy}) rotate(${rot+90})">
      <path d="M -30,8 Q -30,-12 -18,-12 Q -12,-22 0,-22 Q 12,-22 18,-12 Q 30,-12 30,8 Q 20,16 0,14 Q -20,16 -30,8 Z"
        fill="#7BB8A0" stroke="#2C3E2E" stroke-width="2.5"/>
      <path d="M -22,6 Q -22,-8 -12,-8 Q -8,-15 0,-15 Q 8,-15 12,-8 Q 22,-8 22,6 Q 14,12 0,10 Q -14,12 -22,6 Z"
        fill="#1A2E22" stroke="none"/>
      <ellipse cx="0" cy="-2" rx="6" ry="4" fill="#7BB8A0" stroke="none"/>
    </g>`;
  }

  // ── 3. Orange round half-petals layer (8 round orange shapes between scallops) ──
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 - 90) * Math.PI / 180;
    const ox = cx + Math.cos(a) * 122;
    const oy = cy + Math.sin(a) * 122;
    const rot = (i * 45);
    // Orange round leaf (semicircle pointing outward)
    s += `<g transform="translate(${ox},${oy}) rotate(${rot+90})">
      <path d="M -22,4 Q -22,-18 0,-18 Q 22,-18 22,4 Q 22,10 0,10 Q -22,10 -22,4 Z"
        fill="#D87538" stroke="#2C3E2E" stroke-width="2.5"/>
      <path d="M -14,2 Q -14,-12 0,-12 Q 14,-12 14,2 Q 14,6 0,6 Q -14,6 -14,2 Z"
        fill="#B8482A" stroke="none"/>
    </g>`;
  }

  // ── 4. Blue star/diamond layer (8 blue pointed shapes peeking between pink petals) ──
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 - 90 + 22.5) * Math.PI / 180; // offset to sit between pink petals
    const bx = cx + Math.cos(a) * 80;
    const by = cy + Math.sin(a) * 80;
    const rot = i * 45 + 22.5;
    s += `<g transform="translate(${bx},${by}) rotate(${rot})">
      <path d="M 0,-30 L 16,0 L 0,30 L -16,0 Z"
        fill="#7BB5E0" stroke="#2C3E2E" stroke-width="2"/>
      <path d="M 0,-22 L 10,0 L 0,22 L -10,0 Z"
        fill="#3A6BAA" stroke="none"/>
      <path d="M 0,-14 L 6,0 L 0,14 L -6,0 Z"
        fill="#1A2E22" stroke="none"/>
    </g>`;
  }


  // ── 5. 8 LARGE PINK LOTUS PETALS (THE INTERACTIVE LAYER) ──
  // Each petal is a pointed pink leaf with red inner leaf + small dark leaf
  // Indices 0-3: example (★) — pre-filled in initDancheong
  // Indices 4-7: interactive (numbered 1,2,3,4) — filled via answerDanch (step+4)
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 - 90) * Math.PI / 180;
    const isExample     = i < 4;        // petals 0,1,2,3 → ★
    const isInteractive = i >= 4;       // petals 4,5,6,7 → 번호 1,2,3,4

    const colorKey = petalFill[i];
    // Default pink color
    const pinkFill = '#F2C8C8';
    const pinkStroke = '#2C3E2E';

    // If colored by user/example, use the assigned color
    const fillColor  = colorKey ? DANCH_COLORS[colorKey].hex   : pinkFill;
    const innerColor = colorKey ? DANCH_COLORS[colorKey].light  : '#B8484A';
    const strokeColor = pinkStroke;
    const dashAttr = (isInteractive && !colorKey) ? 'stroke-dasharray="6,4"' : '';

    const rot = i * 45;

    s += `<g transform="translate(${cx},${cy}) rotate(${rot})">
      <!-- main pink/colored petal -->
      <path d="M 0,-110 Q -28,-90 -28,-60 Q -28,-30 -16,-22 L 0,-18 L 16,-22 Q 28,-30 28,-60 Q 28,-90 0,-110 Z"
        fill="${fillColor}" stroke="${strokeColor}" stroke-width="3" ${dashAttr}/>`;

    // Inner detail: show for example petals always, and for interactive petals once colored
    if (colorKey || isExample) {
      s += `<path d="M 0,-95 Q -16,-78 -16,-58 Q -16,-40 -8,-36 L 0,-34 L 8,-36 Q 16,-40 16,-58 Q 16,-78 0,-95 Z"
        fill="${innerColor}" stroke="${strokeColor}" stroke-width="1.5"/>`;
      s += `<path d="M 0,-60 Q -7,-50 -7,-42 Q -7,-36 0,-34 Q 7,-36 7,-42 Q 7,-50 0,-60 Z"
        fill="#1A2E22" stroke="none"/>`;
    }

    // Label: ★ for examples, number for interactive
    if (isExample) {
      s += `<text x="0" y="-60" text-anchor="middle" font-size="18" font-weight="700" fill="white" font-family="serif" opacity=".95" style="pointer-events:none">&#9733;</text>`;
    } else if (isInteractive) {
      const num = i - 3; // petals 4,5,6,7 → 1,2,3,4
      const textFill = colorKey ? 'white' : '#8B6343';
      s += `<text x="0" y="-58" text-anchor="middle" font-size="18" font-weight="900" fill="${textFill}" font-family="Noto Sans KR,sans-serif" style="pointer-events:none">${num}</text>`;
    }
    s += `</g>`;
  }

  // ── 6. Center: teal disc with yellow dot ──
  s += `<circle cx="${cx}" cy="${cy}" r=\"28\" fill=\"#7BB8A0\" stroke=\"#2C3E2E\" stroke-width=\"2.5\"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="22" fill="#5AA888" stroke="#2C3E2E" stroke-width="1.5"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="12" fill="#F0D050" stroke="#C9A030" stroke-width="1.5"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="8" fill="#F8DC60"/>`;

  svg.innerHTML = s;
}

function showDanchFeedback(correct, ko, en) {
  const fb = document.getElementById('danch-feedback');
  fb.className = 'feedback-bubble show ' + (correct ? 'correct' : 'wrong');
  setFeedback(fb, ko, en);
}

function finishLevel3() {
  document.getElementById('level3-card').classList.add('hidden-section');
  document.getElementById('taegeuk-card').classList.remove('hidden-section');
  renderTaegeuk();
}

function finishTaegeuk() {
  document.getElementById('taegeuk-card').classList.add('hidden-section');
  startLevel5();
}

function showFinalCelebration() {
  const pct = getScorePercent();
  let rank, message;

  if (pct >= 70) {
    rank = '시대를 초월한<br>복원 명장';
    message = '참으로 잘 하였소!<br>그대는 시대를 초월하는 복원가요.<br>그 솜씨, 후세에 길이 전해질 것이오.';
  } else if (pct >= 50) {
    rank = '훌륭한 복원가';
    message = '잘 하였소.<br>허나 조금 더 정진한다면<br>참으로 멋진 복원가가 될 것이오.';
  } else {
    rank = '복원의 길을<br>걷는 자';
    message = '열심히 힘쓴 그대에게 박수를 보내오.<br>훗날 멋진 복원가가 되기 위하여<br>더욱 공부에 매진하여 주시오.';
  }

  // 텍스트 채우기
  document.getElementById('celeb-rank').innerHTML = rank;
  document.getElementById('celeb-score').innerHTML = 
    `점수: ${pct}점 / 100점`;
  document.getElementById('celeb-message').innerHTML = message;

  // 영어 모드 대응
  if (LANG === 'en') {
    const ranks_en = {
     '시대를 초월한<br>복원 명장': 'Timeless Master Restorer',
     '훌륭한 복원가': 'Skilled Restorer',
     '복원의 길을<br>걷는 자': 'Aspiring Restorer'
    };
    const messages_en = pct >= 70
      ? 'Well done indeed!<br>Thou art a restorer beyond time.<br>Thy craft shall be remembered for ages.'
      : pct >= 50
      ? 'Thou hast done well.<br>With more devotion, thou shalt<br>become a true restorer.'
      : 'I salute thy diligent effort.<br>Study further with all thy heart,<br>and one day thou shalt master this art.';
    document.getElementById('celeb-rank').innerHTML = ranks_en[rank];
    document.getElementById('celeb-message').innerHTML = messages_en;
    document.getElementById('celeb-score').innerHTML = `Score: ${pct} / 100`;
  }

  // 카드 표시
  const card = document.getElementById('celebration-card');
  const scroll = card.querySelector('.hanji-scroll');
  const scrollText = card.querySelector('.scroll-text');

  card.classList.remove('hidden-section');

  // 1) 초기 상태 리셋 (다시 봤을 때도 동작하도록)
  scroll.classList.remove('unrolling');
  scrollText.classList.remove('show');
  void scroll.offsetWidth; // reflow 강제 → 애니메이션 재시작

  // 2) 두루마리 펼치기 시작
  scroll.classList.add('unrolling');

  // 3) 두루마리 거의 다 펼쳐진 시점(약 1.4초)에 텍스트 페이드 인
  setTimeout(() => {
    scrollText.classList.add('show');
  }, 1400);

  // 4) 텍스트 나타난 직후, 3군데에서 0.5초 간격 연쇄 폭발
  setTimeout(() => spawnConfetti(50, 20, 50), 1900);   // 상단 중앙
  setTimeout(() => spawnConfetti(15, 45, 45), 2400);   // 좌측
  setTimeout(() => spawnConfetti(85, 45, 45), 2900);   // 우측
}

// ============================================================
// CONFETTI (CSS-only shapes, no emoji)
// ============================================================
function spawnConfetti(originX, originY, count) {
  const area = document.getElementById('confetti-area');
  if (!area) return;

  // 기본값: 화면 정중앙
  if (typeof originX !== 'number') originX = 50;
  if (typeof originY !== 'number') originY = 50;
  if (typeof count !== 'number') count = 50;

  const colors = ['#C9A84C','#8B1A1A','#1A5C6B','#2A6B3A','#C94040','#F0D080','#E8B4B8','#D4AF37'];

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece burst';

    // 방사형으로 흩뿌리기 - 각도와 거리 무작위
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const distance = 120 + Math.random() * 220;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance + Math.random() * 80;
    const rot = (Math.random() * 720 - 360) + 'deg';
    const size = 6 + Math.random() * 10;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = Math.random();
    const delay = Math.random() * 0.25;

    el.style.setProperty('--dx', dx + 'px');
    el.style.setProperty('--dy', dy + 'px');
    el.style.setProperty('--rot', rot);
    el.style.width = size + 'px';
    el.style.height = (shape > 0.6 ? size * 0.5 : size) + 'px';
    el.style.background = color;
    el.style.borderRadius = shape > 0.5 ? '50%' : '2px';
    el.style.animationDelay = delay + 's';
    // 시작 위치 설정 (% 단위)
    el.style.left = originX + '%';
    el.style.top = originY + '%';

    area.appendChild(el);

    // 1.8초 후 자동 제거 (메모리 누적 방지)
    setTimeout(() => el.remove(), 2200 + delay * 1000);
  }
}

// ============================================================
// LEVEL 4 — 삼태극 색 맞추기
// ============================================================
const TAEGEUK_COLORS = {
  red:    { hex:'#D32F2F', name_ko:'빨강', name_en:'Red' },
  yellow: { hex:'#F9C53A', name_ko:'노랑', name_en:'Yellow' },
  blue:   { hex:'#2B4A8C', name_ko:'파랑', name_en:'Blue' },
  green:  { hex:'#2A6B3A', name_ko:'초록', name_en:'Green' },
  black:  { hex:'#1A1A1A', name_ko:'검정', name_en:'Black' }
};
const TAEGEUK_KEYS = ['red','yellow','blue','green','black'];
const TAEGEUK_ANSWERS = ['yellow','red','blue']; // 고정 순서

let taegeukStep = 0; // 0: 빨강 차례, 1: 노랑 차례, 2: 파랑 차례

function renderTaegeuk() {
  taegeukStep = 0;
  document.getElementById('taegeuk-img').src = 'taegeuk/taegeuk_1.png';
  updateTaegeukLabel();
  renderTaegeukOptions();
  updateTaegeukNumBadge(); // ← 추가
  const fb = document.getElementById('taegeuk-feedback');
  fb.className = 'feedback-bubble';
  clearFeedback(fb);
  document.getElementById('taegeuk-finish-btn').style.display = 'none';
}

function updateTaegeukLabel() {
  const label = document.getElementById('taegeuk-step-label');
  // score-display 업데이트 (최대값 3으로 고정)
  const scoreEl = document.getElementById('score-taegeuk');
  if (scoreEl) scoreEl.textContent = `${Math.min(taegeukStep + 1, 3)} / 3`;
  if (taegeukStep < TAEGEUK_ANSWERS.length) {
    const stepNum = taegeukStep + 1;
    label.textContent = LANG==='ko'
      ? `${stepNum}번째 색을 골라주시오!`
      : `Choose color #${stepNum}!`;
  } else {
    label.textContent = LANG==='ko' ? '삼태극 완성이오!' : 'Sam-Taegeuk completed!';
  }
}

function renderTaegeukOptions() {
  const box = document.getElementById('taegeuk-options');
  box.innerHTML = TAEGEUK_KEYS.map(key => `
    <div class="taegeuk-color-btn-wrap" onclick="selectTaegeukColor('${key}')" data-color="${key}" style="cursor:pointer;text-align:center;">
      <div class="taegeuk-color-btn" style="background:${TAEGEUK_COLORS[key].hex}"></div>
      <span style="font-size:13px;font-weight:600;color:var(--text-dark);margin-top:4px;display:block;">
        ${LANG==='ko'?TAEGEUK_COLORS[key].name_ko:TAEGEUK_COLORS[key].name_en}
      </span>
    </div>
  `).join('');
}

// ─── 삼태극 번호 배지 위치 (이미지 비율 기준 %) ───
// 각 단계에서 "다음에 칠해야 할 빈 영역"의 중심 좌표를 % 단위로 지정
// 실제 이미지를 보고 조정해주세요!
const TAEGEUK_BADGE_POSITIONS = [
  { x: 56, y: 42 },  // 1단계: taegeuk_1.png 의 빈 영역 (예: 위쪽)
  { x: 62, y: 28 },  // 2단계: taegeuk_2.png 의 빈 영역 (예: 좌하단)
  { x: 65, y: 18 }   // 3단계: taegeuk_3.png 의 빈 영역 (예: 우하단)
];

function updateTaegeukNumBadge() {
  const badge = document.getElementById('taegeuk-num-badge');
  if (!badge) return;

  // 모든 단계 완료 시 배지 숨김
  if (taegeukStep >= TAEGEUK_ANSWERS.length) {
    badge.style.display = 'none';
    return;
  }

  const pos = TAEGEUK_BADGE_POSITIONS[taegeukStep];
  if (!pos) {
    badge.style.display = 'none';
    return;
  }

  // 배지 번호 갱신 + 위치 설정 + 표시
  badge.textContent = taegeukStep + 1;
  badge.style.left = pos.x + '%';
  badge.style.top = pos.y + '%';
  badge.style.display = 'flex';
}

function selectTaegeukColor(colorKey) {
  const correct = TAEGEUK_ANSWERS[taegeukStep];
  const btn = document.querySelector(`.taegeuk-color-btn-wrap[data-color="${colorKey}"] .taegeuk-color-btn`);
  const fb = document.getElementById('taegeuk-feedback');

  addScore(colorKey === correct);

  if (colorKey === correct) {
    taegeukStep++;
    // 이미지 단계 업데이트 (1 → 2 → 3 → 4)
    const imgName = taegeukStep >= 3 ? 'taegeuk_finish' : `taegeuk_${taegeukStep + 1}`;
    document.getElementById('taegeuk-img').src = `taegeuk/${imgName}.png`;
    updateTaegeukNumBadge(); // ← 추가
    fb.className = 'feedback-bubble correct show';
    setFeedback(fb,
      `정답! ${TAEGEUK_COLORS[colorKey].name_ko}이오!`,
      `Correct! It's ${TAEGEUK_COLORS[colorKey].name_en}!`);

    if (taegeukStep >= TAEGEUK_ANSWERS.length) {
      // 모두 완료
      setTimeout(() => {
        updateTaegeukLabel();
        setFeedback(fb, '🎉 삼태극을 모두 복원했소!', '🎉 You restored the Sam-Taegeuk!');
        document.getElementById('taegeuk-finish-btn').style.display = 'inline-flex';
      }, 600);
    } else {
      updateTaegeukLabel();
    }
  } else {
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 600);
    fb.className = 'feedback-bubble wrong show';
    setFeedback(fb,
      `아쉽소! 그것은 <b>${TAEGEUK_COLORS[colorKey].name_ko}</b>이오. 다시 골라보시오.`,
      `Not quite! That was <b>${TAEGEUK_COLORS[colorKey].name_en}</b>. Try again!`);
  }
}
// ============================================================
// LEVEL 1.5 — 띠 패턴 빈칸 채우기
// ============================================================
const BAND_PATTERNS = [
  { key:'cloud',  name_ko:'구름',   name_en:'Cloud' },
  { key:'zigzag', name_ko:'지그재그', name_en:'Zigzag' },
  { key:'lotus',  name_ko:'연꽃잎', name_en:'Lotus Leaf' },
  { key:'wave',   name_ko:'파도',   name_en:'Wave' },
  { key:'vine',   name_ko:'덩굴',   name_en:'Vine' }
];

const BAND_QUIZZES = [
  { full:'band/band_full_1.png', answer:'cloud' },
  { full:'band/band_full_2.png', answer:'lotus' },
  { full:'band/band_full_3.png', answer:'zigzag' }
];

let bandIndex = 0;
let bandDone = false;

function renderBandQuiz() {
  const q = BAND_QUIZZES[bandIndex];
  document.getElementById('band-progress').textContent =
    (LANG==='ko' ? '문제 ' : 'Question ') + (bandIndex+1) + ' / ' + BAND_QUIZZES.length;
  document.getElementById('score-band').textContent = `${bandIndex + 1} / ${BAND_QUIZZES.length}`;

  // 양옆 이미지는 같은 full 이미지를 사용 (CSS로 잘라서 보여줌)
  document.getElementById('band-left').src = q.full;
  document.getElementById('band-left').style.objectPosition = 'left';
  document.getElementById('band-right').src = q.full;
  document.getElementById('band-right').style.objectPosition = 'right';

  // 보기 5개
  const box = document.getElementById('band-options');
  box.innerHTML = BAND_PATTERNS.map((p, i) => `
    <div class="band-option" data-key="${p.key}" onclick="selectBand('${p.key}')">
      <span class="band-option-num">${i+1}</span>
      <img src="band/band_${p.key}.png" alt="${LANG==='ko'?p.name_ko:p.name_en}">
    </div>
  `).join('');

  const fb = document.getElementById('band-feedback');
  fb.className = 'feedback-bubble';
  clearFeedback(fb);
  document.getElementById('band-finish-btn').style.display = 'none';
  bandDone = false;
}

function selectBand(key) {
  if (bandDone) return;
  const q = BAND_QUIZZES[bandIndex];
  const opt = document.querySelector(`.band-option[data-key="${key}"]`);
  const fb = document.getElementById('band-feedback');

  addScore(key === q.answer); 

  if (key === q.answer) {
    opt.classList.add('correct');
    bandDone = true;
    document.querySelectorAll('.band-option').forEach(b => {
      if (b.dataset.key !== key) b.style.pointerEvents = 'none';
    });
    fb.className = 'feedback-bubble correct show';
    setFeedback(fb, '정답이오!', 'Correct! 👏');

    setTimeout(() => {
      if (bandIndex < BAND_QUIZZES.length - 1) {
        bandIndex++;
        renderBandQuiz();
      } else {
        // 모든 문제 완료
        setFeedback(fb, '🎉 모든 띠 무늬를 복원했소!', '🎉 All bands restored!');
        document.getElementById('band-finish-btn').style.display = 'inline-flex';
      }
    }, 1200);
  } else {
    opt.classList.add('wrong');
    setTimeout(() => opt.classList.remove('wrong'), 600);
    fb.className = 'feedback-bubble wrong show';
    setFeedback(fb, '다시 한 번 살펴보시오...', 'Look carefully and try again!');
  }
}

function startBandQuiz() {
  bandIndex = 0;
  document.getElementById('band-card').classList.remove('hidden-section');
  renderBandQuiz();
}

function finishBand() {
  document.getElementById('band-card').classList.add('hidden-section');
  showLevelIntro(2, () => {
    document.getElementById('level2-card').classList.remove('hidden-section');
    renderL2Quiz();
  });
}

// ============================================================
// LEVEL 5 — 민화 벽지 패턴 찾기
// ============================================================
const L5_QUIZZES = [
  { category: 'bird',   answer: 'bird_2',   slot: 1 },
  { category: 'flower', answer: 'flower_1', slot: 2 },
  { category: 'deer',   answer: 'deer_2',   slot: 3 }
];
let l5Index = 0;
let l5Done = false;

// 번호 배지 좌표 — wallpaper 흰 네모칸의 가로 위치 (이미지 보고 % 조정)
const L5_BADGE_POS = [
  { left: '21.2%', top: '50%' },  // 1번 (학)
  { left: '49.8%', top: '49%' },  // 2번 (모란)
  { left: '84.6%', top: '64%' }   // 3번 (사슴)
];

function renderL5Badges() {
  const wrap = document.getElementById('l5-num-badges');
  wrap.innerHTML = L5_BADGE_POS.map((p, i) => `
    <div style="position:absolute; left:${p.left}; top:${p.top}; transform:translate(-50%,-50%);
                width:34px; height:34px; border-radius:8px;
                background:#8B1A1A; color:white;
                font-size:20px; font-weight:900;
                display:flex; align-items:center; justify-content:center;
                font-family:'Noto Sans KR', sans-serif;
                box-shadow:0 2px 8px rgba(0,0,0,0.3);
                border:2.5px solid white;">${i+1}</div>
  `).join('');
}

function renderL5Quiz() {
  const q = L5_QUIZZES[l5Index];
  l5Done = false;

  document.getElementById('l5-progress').textContent =
    (LANG==='ko' ? '문제 ' : 'Question ') + (l5Index+1) + ' / ' + L5_QUIZZES.length;
  document.getElementById('score-l5').textContent = `${l5Index + 1} / ${L5_QUIZZES.length}`;

  document.getElementById('l5-question-label').innerHTML =
    LANG==='ko'
      ? `<b>${q.slot}번</b> 네모 안에 들어갈 문양은 무엇이오?`
      : `What pattern fits in square <b>#${q.slot}</b>?`;

  // 보기 4개 (예: bird_1, bird_2, bird_3, bird_4)
  const box = document.getElementById('l5-options');
  box.innerHTML = [1,2,3,4].map(n => {
    const key = `${q.category}_${n}`;
    return `
      <div class="taegeuk-color-btn-wrap l5-option" data-key="${key}"
           onclick="selectL5('${key}')"
           style="cursor:pointer; text-align:center; padding:6px; border:2px solid var(--border-warm); border-radius:10px; background:white;">
        <img src="minhwa/${key}.png" style="width:90px; height:90px; object-fit:cover; border-radius:6px; display:block;">
        <div style="font-size:12px; font-weight:600; margin-top:4px;">${n}</div>
      </div>
    `;
  }).join('');

  const fb = document.getElementById('l5-feedback');
  fb.className = 'feedback-bubble';
  clearFeedback(fb);
  document.getElementById('l5-finish-btn').style.display = 'none';
}

function selectL5(key) {
  if (l5Done) return;
  const q = L5_QUIZZES[l5Index];
  const opt = document.querySelector(`.l5-option[data-key="${key}"]`);
  const fb = document.getElementById('l5-feedback');

  addScore(key === q.answer);

  if (key === q.answer) {
    opt.style.borderColor = 'var(--success)';
    opt.style.background = 'rgba(46,107,48,0.1)';
    l5Done = true;
    // 정답 맞출 때마다 wallpaper 이미지 업데이트 (1번 → wallpaper_1, 2번 → wallpaper_2, 3번 → wallpaper_3)
    document.getElementById('l5-wallpaper').src = `minhwa/wallpaper_${l5Index + 1}.png`;
    document.querySelectorAll('.l5-option').forEach(b => {
     if (b.dataset.key !== key) b.style.pointerEvents = 'none';
    });

    fb.className = 'feedback-bubble correct show';
    setFeedback(fb, '정답이오! 👏', 'Correct! 👏');

    setTimeout(() => {
      if (l5Index < L5_QUIZZES.length - 1) {
        l5Index++;
        renderL5Quiz();
      } else {
        setFeedback(fb, '🎉 모든 문양을 복원했소!', '🎉 All patterns restored!');
        document.getElementById('l5-finish-btn').style.display = 'flex';
      }
    }, 1200);
  } else {
    opt.style.borderColor = '#c0392b';
    setTimeout(() => { opt.style.borderColor = 'var(--border-warm)'; }, 600);
    fb.className = 'feedback-bubble wrong show';
    setFeedback(fb, '다시 한 번 살펴보시오...', 'Look carefully and try again!');
  }
}

function startLevel5() {
  l5Index = 0;
  document.getElementById('level5-card').classList.remove('hidden-section');
  renderL5Badges();
  renderL5Quiz();
}

function finishLevel5() {
  // 레벨 5 카드 숨김
  document.getElementById('level5-card').classList.add('hidden-section');

  // 로딩 오버레이 표시
  const overlay = document.getElementById('score-loading-overlay');
  const img = document.getElementById('score-loading-img');
  overlay.classList.add('show');

  // 0.2초 간격으로 loading_1 ↔ loading_2 번갈아 표시
  let toggle = false;
  const blinkInterval = setInterval(() => {
    toggle = !toggle;
    img.src = toggle ? 'loading/loading_2.png' : 'loading/loading_1.png';
  }, 250);

  // 3초 후 → 로딩 종료 → 두루마리 표시
  setTimeout(() => {
    clearInterval(blinkInterval);
    overlay.classList.remove('show');
    showFinalCelebration();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const main = document.querySelector('.main-content');
    if (main) main.scrollTop = 0;
  }, 4500);
}

// ============================================================
// LEVEL INTRO OVERLAY 제어
// ============================================================
const LEVEL_INTRO_DATA = {
  1: {
    title_ko: '一段',
    title_en: 'LEVEL 1',
    subtitle_ko: '순서 패턴 익히기',
    subtitle_en: 'Sequence Patterns',
    desc_ko: '전통 문양이 반복되는 순서를 살피시오.<br>빈칸에 들어갈 문양을 맞추어보시오.',
    desc_en: 'Observe the repeating order of traditional patterns,<br>and guess what fills the blank!'
  },
  2: {
    title_ko: '二段',
    title_en: 'LEVEL 2',
    subtitle_ko: '대칭 패턴 찾기',
    subtitle_en: 'Symmetry Patterns',
    desc_ko: '좌우가 대칭을 이루는 격자에서<br>빈칸에 알맞은 문양을 고르시오.',
    desc_en: 'In a grid mirrored left-right,<br>choose the pattern that fits the blank!'
  },
  3: {
    title_ko: '三段',
    title_en: 'LEVEL 3',
    subtitle_ko: '색깔 추론',
    subtitle_en: 'Color Reasoning',
    desc_ko: '한국 전통 색 규칙을 따라<br>알맞은 색을 칠하시오.',
    desc_en: 'Following the color rules,<br>paint with the right color!'
  },
  4: {
    title_ko: '四段',
    title_en: 'LEVEL 4',
    subtitle_ko: '삼태극 색칠하기',
    subtitle_en: 'Sam-Taegeuk Coloring',
    desc_ko: '삼태극의 빈 영역을 차례대로<br>알맞은 색으로 채우시오.',
    desc_en: 'Fill the empty areas of the Sam-Taegeuk<br>with the right colors in order!'
  },
  5: {
  title_ko: '五段',
  title_en: 'LEVEL 5',
  subtitle_ko: '민화 벽지 패턴 찾기',
  subtitle_en: 'Minhwa Wallpaper Patterns',
  desc_ko: '민화 벽지의 빈 네모를 살피시오.<br>알맞은 전통 문양을 골라 채우시오.',
  desc_en: 'Examine the empty squares in the Minhwa wallpaper,<br>and choose the right traditional pattern for each!'
  }
};

// ============================================================
// LEVEL INTRO (시작 화면 갈색 상자 재사용)
// 흐름: 갈색 상자에 레벨 설명 표시 (2초) → 갈색 상자 페이드 아웃 + 영상 재생 → 퀴즈
// ============================================================
function showLevelIntro(level, onClose) {
  const screen = document.getElementById('game-start-screen');
  const video  = document.getElementById('start-video');
  const data   = LEVEL_INTRO_DATA[level];
  if (!data) { if (onClose) onClose(); return; }

  const startBlock = document.getElementById('start-mode-block');
  const introBlock = document.getElementById('intro-mode-block');

  // 1) 갈색 상자 안 내용을 레벨 인트로로 전환
  startBlock.style.display = 'none';
  introBlock.style.display = 'block';

  document.getElementById('intro-badge').textContent =
    LANG==='ko' ? `第 ${['一','二','三','四','五'][level-1]} 段` : `LEVEL ${level}`;
  document.getElementById('intro-title-text').innerHTML =
    (LANG==='ko' ? data.title_ko : data.title_en) +
    '<br><span style="font-size:28px;font-weight:600;letter-spacing:1px;">' +
    (LANG==='ko' ? data.subtitle_ko : data.subtitle_en) +
    '</span>';
  document.getElementById('intro-desc-text').innerHTML =
    LANG==='ko' ? data.desc_ko : data.desc_en;

  // 2) 시작 화면 다시 표시 (영상은 첫 프레임에서 멈춤)
  screen.style.display = 'block';
  if (video) {
    try { video.pause(); video.currentTime = 0; } catch(e) {}
  }
  screen.classList.remove('hide','opening');
  screen.classList.add('reshow');

  // 3) 2초 동안 설명 보여준 뒤 → 갈색 상자 페이드 아웃 + 영상 재생
  const DESC_DURATION = 2000;
  setTimeout(() => {
    // 갈색 상자 페이드 아웃 (.opening 클래스가 start-content를 페이드 아웃시킴)
    screen.classList.add('opening');

    // 영상 재생 + 끝나면 퀴즈로
    let done = false;
    const goNext = () => {
      if (done) return;
      done = true;
      screen.classList.remove('reshow');
      screen.classList.add('hide');
      setTimeout(() => {
        screen.style.display = 'none';
        // 다음 레벨을 위해 인트로 모드 → 시작 모드로 복원 (마지막엔 안 보이지만 안전하게)
        introBlock.style.display = 'none';
        startBlock.style.display = 'block';
        if (onClose) onClose();
      }, 600);
    };

    if (video) {
      video.addEventListener('ended', goNext, { once: true });
      const safetyTimer = setTimeout(goNext, 8000);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          clearTimeout(safetyTimer);
          goNext();
        });
      }
    } else {
      setTimeout(goNext, 1400);
    }
  }, DESC_DURATION);
}

// ============================================================
// GAME START SCREEN — 언어 토글 + 수련 시작 버튼
// ============================================================
function setStartLang(lang) {
  LANG = lang;
  const texts = {
    ko: {
      badge: 'AI 復元 體驗',
      title: '나도 <span style="color:var(--gold)">복원가</span>!',
      desc: '한국 전통 문양을 복원하는 체험을 통하여,<br>참된 복원가로 거듭나는 수련을 시작하시오.',
      btn: '수련 시작'
    },
    en: {
      badge: 'AI RESTORATION EXPERIENCE',
      title: 'I Am a <span style="color:var(--gold)">Restorer</span>!',
      desc: 'Through the experience of restoring<br>traditional Korean patterns,<br>begin thy training to become a true restorer.',
      btn: 'Begin Training'
    }
  };
  const t = texts[lang];
  document.getElementById('start-badge').textContent = t.badge;
  document.getElementById('start-title-text').innerHTML = t.title;
  document.getElementById('start-desc').innerHTML = t.desc;
  document.getElementById('start-btn-text').textContent = t.btn;

  // 언어 버튼 active 토글
  document.getElementById('start-lang-ko').classList.toggle('active', lang === 'ko');
  document.getElementById('start-lang-en').classList.toggle('active', lang === 'en');

  // 전체 페이지 언어 동기화
  setLang(lang);
}

function startGame() {
  const screen = document.getElementById('game-start-screen');
  const video  = document.getElementById('start-video');

  const startBlock = document.getElementById('start-mode-block');
  const introBlock = document.getElementById('intro-mode-block');
  const data = LEVEL_INTRO_DATA[1];

  // 1) 갈색 상자 안 내용을 레벨 1 인트로로 즉시 교체
  startBlock.style.display = 'none';
  introBlock.style.display = 'block';

  document.getElementById('intro-badge').textContent =
    LANG==='ko' ? '第 一 段' : 'LEVEL 1';
  document.getElementById('intro-title-text').innerHTML =
    (LANG==='ko' ? data.title_ko : data.title_en) +
    '<br><span style="font-size:28px;font-weight:600;letter-spacing:1px;">' +
    (LANG==='ko' ? data.subtitle_ko : data.subtitle_en) +
    '</span>';
  document.getElementById('intro-desc-text').innerHTML =
    LANG==='ko' ? data.desc_ko : data.desc_en;

  // 2) 2초 후 영상 재생 (갈색 상자 페이드 아웃)
  setTimeout(() => {
    screen.classList.add('opening');

    let done = false;
    const goNext = () => {
      if (done) return;
      done = true;
      screen.classList.add('hide');
      setTimeout(() => {
        screen.style.display = 'none';
        introBlock.style.display = 'none';
        startBlock.style.display = 'block';
        renderL1Quiz();
      }, 600);
    };

    if (video) {
      video.addEventListener('ended', goNext, { once: true });
      const safetyTimer = setTimeout(goNext, 8000);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          clearTimeout(safetyTimer);
          goNext();
        });
      }
    } else {
      setTimeout(goNext, 1400);
    }
  }, 2000);
}

// ============================================================
// INIT
// ============================================================
setLang('ko');
// 게임은 startGame() 버튼 클릭으로 시작
