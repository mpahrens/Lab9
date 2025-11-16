// Sample data
const courses = [
  {
    code: 'CS1101-C25',
    name: 'Introduction to Computer Science',
    description: 'Fundamental concepts of programming, problem solving, and computation. Emphasis on algorithmic thinking and clear communication of solutions.',
    sections: [
      { id: 'CL01', professor: 'Matthew Ahrens' },
    ]
  },
  {
    code: 'CS2303-C25',
    name: 'Systems Programming Concepts',
    description: 'Programming focused on machine organization, memory management, and lower-level constructs with attention to performance.',
    sections: [
      { id: 'CL01', professor: 'Jennifer Mortensen' },
      { id: 'CL02', professor: 'Yu-Shan Sun' },
    ]
  },
  {
    code: 'CS2223-C25',
    name: 'Algorithms',
    description: 'Design and analysis of algorithms including divide-and-conquer, greedy methods, dynamic programming, and graph algorithms.',
    sections: [
      { id: 'CL01', professor: 'Yu-Shan Sun' },
      { id: 'CL02', professor: 'Rodica Neamtu' },
    ]
  },
  { code: 'CS2102-C25', name: 'Object-Oriented Design', description: 'Principles of object-oriented design and implementation using modern languages.', sections:[{id:'CL01',professor:'Dr. K. Lee'},{id:'CL02',professor:'Dr. K. Lee'}] },
  { code: 'CS2011-C25', name: 'Machine Organization', description: 'Machine-level programming, data representation, and computer architecture fundamentals.', sections:[{id:'CL01',professor:'Dr. Chen'}] },
  { code: 'CS2022-C25', name: 'Discrete Mathematics', description: 'Propositional logic, combinatorics, graphs, and proofs for computing.', sections:[{id:'CL01',professor:'Dr. Patel'},{id:'CL02',professor:'Dr. Patel'}] },
  { code: 'CS3043-C25', name: 'Social Implications of Computing', description: 'Ethical, legal, and social issues surrounding computing technology.', sections:[{id:'CL01',professor:'Dr. Gomez'}] },
  { code: 'CS3431-C25', name: 'Database Systems I', description: 'Relational databases, SQL, design, and transactions.', sections:[{id:'CL01',professor:'Dr. Ramirez'}] },
  { code: 'CS3733-C25', name: 'Software Engineering', description: 'Team-based software engineering process and practices.', sections:[{id:'CL01',professor:'Dr. Nguyen'},{id:'CL02',professor:'Dr. Nguyen'}] },
  { code: 'CS4536-C25', name: 'Mobile and Ubiquitous Computing', description: 'Concepts and practice in building mobile applications.', sections:[{id:'CL01',professor:'Dr. Wallace'}] },
  {
    code: 'CS5001-A25',
    name: 'Graduate Computing Foundations I',
    description: 'Graduate introduction to core computing concepts for students bridging into advanced study.',
    sections: [
      { id: 'CL01', professor: 'Dr. Ada Lovelace' },
    ]
  }
];

// State
const state = {
  selected: new Set(), // codes of selected courses
  preferences: { 1: null, 2: null, 3: null }, // rank -> code
  sectionPrefs: {}, // code -> { id -> 'prefer'|'exclude' }
};

// Metrics
const METRICS_RUN_KEY = 'currentRunMetrics';
const METRICS_ALL_KEY = 'allRunsMetrics';

function getCurrentRun(){
  const raw = localStorage.getItem(METRICS_RUN_KEY);
  if(raw){
    try { return JSON.parse(raw); } catch(e){ /* ignore */ }
  }
  const fresh = { startedAt: Date.now(), nonInteractiveClicks:0, courseSelectorClicks:0, sectionSelectorClicks:0 };
  localStorage.setItem(METRICS_RUN_KEY, JSON.stringify(fresh));
  return fresh;
}
function setCurrentRun(run){ localStorage.setItem(METRICS_RUN_KEY, JSON.stringify(run)); }
function appendRunToAll(run){
  const all = JSON.parse(localStorage.getItem(METRICS_ALL_KEY)||'[]');
  all.push(run);
  localStorage.setItem(METRICS_ALL_KEY, JSON.stringify(all));
}

const courseListEl = document.getElementById('courseList');
const binEl = document.getElementById('bin');
const selectedCoursesEl = document.getElementById('selectedCourses');
const pref1El = document.getElementById('pref1');
const pref2El = document.getElementById('pref2');
const pref3El = document.getElementById('pref3');

let draggedChip = null;
let dragSourceType = null; // 'card' or 'chip'
let dragSourceCode = null;

function init(){
  renderCourses();
  renderBin();
  wireGlobalEvents();
  wireMetricsListeners();
  wireBinDropZones();
}

function wireGlobalEvents(){
  document.getElementById('saveBtn').addEventListener('click', savePrefs);
  document.querySelectorAll('[data-close]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = btn.getAttribute('data-close');
      closeModal(id);
    });
  });
}

function openModal(id){
  const dlg = document.getElementById(id); if(!dlg.open) dlg.showModal();
}
function closeModal(id){
  const dlg = document.getElementById(id); if(dlg.open) dlg.close();
}

function savePrefs(){
  const run = getCurrentRun();
  run.completedAt = Date.now();
  run.timeSec = Math.max(0, Math.round((run.completedAt - run.startedAt)/100) / 10);
  appendRunToAll(run);
  setCurrentRun({ startedAt: Date.now(), nonInteractiveClicks:0, courseSelectorClicks:0, sectionSelectorClicks:0 });
  showToast('Saved! Preparing summary…');
  const payload = encodeURIComponent(JSON.stringify(run));
  setTimeout(()=>{ window.location.href = `end.html#${payload}`; }, 450);
}
function showToast(msg){
  const toast = document.getElementById('toast');
  toast.innerHTML = `<div class="bubble">${msg}</div>`;
  toast.classList.add('show');
  setTimeout(()=> toast.classList.remove('show'), 2600);
}

function getShortCode(code){
  // Extract just the course number part (e.g., "CS1101" from "CS1101-C25")
  return code.split('-')[0];
}

function renderCourses(){
  courseListEl.textContent = '';
  const frag = document.createDocumentFragment();
  courses.forEach(course=>{
    const isSelected = state.selected.has(course.code);
    const card = document.createElement('div');
    card.className='card';
    card.draggable = true;
    card.dataset.code = course.code;
    
    const selClasses = ['selector'];
    let selContent = '<span class="plus">+</span>';
    if(isSelected){ selClasses.push('check'); selContent = '✔'; }
    
    card.innerHTML = `
      <div class="card-header">
        <div class="title">
          <button class="info-btn" aria-label="Course info" data-info="${course.code}">i</button>
          <span class="course-code">${course.code}</span>
        </div>
        <button class="${selClasses.join(' ')}" data-select="${course.code}">
          ${selContent}
        </button>
      </div>
      <div class="section-list">
        ${course.sections.map(sec=> renderSection(course.code, sec)).join('')}
      </div>
    `;
    frag.appendChild(card);
  });
  courseListEl.appendChild(frag);
  bindDynamicEvents();
}

function renderSection(code, sec){
  const sectionState = state.sectionPrefs[code] || {};
  const st = sectionState[sec.id] || 'prefer';
  const isSelected = state.selected.has(code);
  
  let cls=''; let content='✔';
  if(!isSelected){
    cls = ''; content = '+';
  } else if(st==='exclude') { cls='exclude'; content='✕'; }
  else { cls='prefer'; content='✔'; }
  
  return `<div class="section" data-course="${code}" data-sec="${sec.id}">
    <div class="meta">${sec.id} - ${sec.professor}</div>
    <button class="sec-btn ${cls}" data-sec-btn="${code}:${sec.id}">${content}</button>
  </div>`;
}

function bindDynamicEvents(){
  // Info buttons
  document.querySelectorAll('[data-info]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const code = btn.getAttribute('data-info');
      const course = courses.find(c=>c.code===code);
      document.getElementById('infoTitle').textContent = `${course.code} - ${course.name}`;
      document.getElementById('infoDescription').textContent = course.description;
      openModal('infoModal');
    });
  });
  
  // Selector buttons - simple toggle
  document.querySelectorAll('[data-select]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const code = btn.getAttribute('data-select');
      toggleCourseSelection(code);
      metricsCountCourseTap();
    });
  });
  
  // Card header click to toggle
  document.querySelectorAll('.card .card-header').forEach(headerEl=>{
    headerEl.addEventListener('click', (e)=>{
      const card = headerEl.closest('.card');
      const code = card.dataset.code;
      toggleCourseSelection(code);
      metricsCountCourseTap();
    });
  });
  
  // Section buttons
  document.querySelectorAll('[data-sec-btn]').forEach(btn=>{
    btn.addEventListener('click', ()=> { 
      metricsCountSectionTap(); 
      handleSectionClick(btn); 
    });
  });
  
  // Section row click
  document.querySelectorAll('.section').forEach(row=>{
    row.addEventListener('click', (e)=>{
      if(e.target.closest('.sec-btn')) return;
      const btn = row.querySelector('.sec-btn');
      if(!btn) return;
      metricsCountSectionTap();
      handleSectionClick(btn);
    });
  });
  
  // Drag events for cards
  document.querySelectorAll('.card').forEach(card=>{
    card.addEventListener('dragstart', handleCardDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });
}

function toggleCourseSelection(code){
  if(state.selected.has(code)){
    // Unselect: remove from selected set and from preferences
    state.selected.delete(code);
    for(let rank in state.preferences){
      if(state.preferences[rank] === code) state.preferences[rank] = null;
    }
  } else {
    // Select: add to selected set, initialize section prefs
    state.selected.add(code);
    const course = courses.find(c=>c.code===code);
    if(!state.sectionPrefs[code]){
      state.sectionPrefs[code] = Object.fromEntries(course.sections.map(s=>[s.id,'prefer']));
    }
  }
  renderCourses();
  renderBin();
}

function handleSectionClick(btn){
  const [code,id] = btn.getAttribute('data-sec-btn').split(':');
  if(!state.sectionPrefs[code]) state.sectionPrefs[code] = {};
  const current = state.sectionPrefs[code][id] || 'prefer';
  state.sectionPrefs[code][id] = current==='exclude' ? 'prefer' : 'exclude';
  renderCourses();
}

function handleCardDragStart(e){
  const card = e.currentTarget;
  const code = card.dataset.code;
  dragSourceType = 'card';
  dragSourceCode = code;
  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', code);
}

function handleChipDragStart(e){
  const chip = e.currentTarget;
  const code = chip.dataset.code;
  draggedChip = chip;
  dragSourceType = 'chip';
  dragSourceCode = code;
  chip.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', code);
}

function handleDragEnd(e){
  e.currentTarget.classList.remove('dragging');
  draggedChip = null;
  dragSourceType = null;
  dragSourceCode = null;
}

function renderBin(){
  // Render selected courses (not in preference slots)
  selectedCoursesEl.textContent = '';
  const selectedNotRanked = Array.from(state.selected).filter(code=>{
    return !Object.values(state.preferences).includes(code);
  });
  selectedNotRanked.forEach(code=>{
    const chip = createChip(code);
    selectedCoursesEl.appendChild(chip);
  });
  
  // Render preference slots
  [1,2,3].forEach(rank=>{
    const slotEl = rank===1 ? pref1El : rank===2 ? pref2El : pref3El;
    slotEl.textContent = '';
    const code = state.preferences[rank];
    if(code && state.selected.has(code)){
      const chip = createChip(code);
      slotEl.appendChild(chip);
    }
  });
}

function createChip(code){
  const chip = document.createElement('div');
  chip.className = 'course-chip';
  chip.draggable = true;
  chip.dataset.code = code;
  chip.textContent = getShortCode(code);
  chip.addEventListener('dragstart', handleChipDragStart);
  chip.addEventListener('dragend', handleDragEnd);
  // Allow clicking chip to unselect (but prevent default drag behavior on click)
  chip.addEventListener('click', (e)=>{
    e.stopPropagation();
    toggleCourseSelection(code);
  });
  return chip;
}

function wireBinDropZones(){
  // Make bin (selected courses area) a drop zone
  selectedCoursesEl.addEventListener('dragover', handleDragOver);
  selectedCoursesEl.addEventListener('drop', (e)=> handleDropSelected(e));
  
  // Make entire preferences area a single drop zone
  const prefsArea = document.querySelector('.preferences-area');
  prefsArea.addEventListener('dragover', handleDragOver);
  prefsArea.addEventListener('drop', (e)=> handleDropPreferences(e));
  
  // Make individual preference slots drop zones for swapping
  [pref1El, pref2El, pref3El].forEach((el, idx)=>{
    const rank = idx + 1;
    el.addEventListener('dragover', (e)=>{
      e.preventDefault();
      e.stopPropagation(); // Prevent parent preferences area from handling
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', (e)=>{
      el.classList.remove('drag-over');
    });
    el.addEventListener('drop', (e)=> {
      e.stopPropagation(); // Prevent parent preferences area from handling
      el.classList.remove('drag-over');
      handleDropOnSlot(e, rank);
    });
  });
  
  // Make course list a drop zone (to remove from bin)
  courseListEl.addEventListener('dragover', handleDragOver);
  courseListEl.addEventListener('drop', handleDropCourseList);
}

function handleDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect = dragSourceType === 'card' ? 'copy' : 'move';
}

function handleDropSelected(e){
  e.preventDefault();
  const code = e.dataTransfer.getData('text/plain');
  if(!code) return;
  
  if(dragSourceType === 'card'){
    // Dragged from course card -> select it
    if(!state.selected.has(code)){
      state.selected.add(code);
      const course = courses.find(c=>c.code===code);
      if(!state.sectionPrefs[code]){
        state.sectionPrefs[code] = Object.fromEntries(course.sections.map(s=>[s.id,'prefer']));
      }
    }
  } else if(dragSourceType === 'chip'){
    // Moved from preference slot to selected area
    for(let rank in state.preferences){
      if(state.preferences[rank] === code) state.preferences[rank] = null;
    }
    // Compact preferences after removal
    compactPreferences();
  }
  
  renderCourses();
  renderBin();
}

function handleDropPref(e, rank){
  e.preventDefault();
  const code = e.dataTransfer.getData('text/plain');
  if(!code) return;
  
  // Ensure course is selected
  if(!state.selected.has(code)){
    state.selected.add(code);
    const course = courses.find(c=>c.code===code);
    if(!state.sectionPrefs[code]){
      state.sectionPrefs[code] = Object.fromEntries(course.sections.map(s=>[s.id,'prefer']));
    }
  }
  
  // Remove from any existing rank
  for(let r in state.preferences){
    if(state.preferences[r] === code) state.preferences[r] = null;
  }
  
  // Assign to new rank
  state.preferences[rank] = code;
  
  renderCourses();
  renderBin();
}

function handleDropPreferences(e){
  e.preventDefault();
  const code = e.dataTransfer.getData('text/plain');
  if(!code) return;
  
  // Ensure course is selected
  if(!state.selected.has(code)){
    state.selected.add(code);
    const course = courses.find(c=>c.code===code);
    if(!state.sectionPrefs[code]){
      state.sectionPrefs[code] = Object.fromEntries(course.sections.map(s=>[s.id,'prefer']));
    }
  }
  
  // Remove from any existing rank
  for(let r in state.preferences){
    if(state.preferences[r] === code) state.preferences[r] = null;
  }
  
  // Find first empty slot (1, 2, or 3)
  let targetRank = null;
  if(!state.preferences[1]) targetRank = 1;
  else if(!state.preferences[2]) targetRank = 2;
  else if(!state.preferences[3]) targetRank = 3;
  else {
    // All slots full, replace slot 3
    targetRank = 3;
  }
  
  // Assign to the target rank
  if(targetRank) state.preferences[targetRank] = code;
  
  renderCourses();
  renderBin();
}

function handleDropCourseList(e){
  e.preventDefault();
  const code = e.dataTransfer.getData('text/plain');
  if(!code) return;
  
  // Only handle chips dragged out of bin
  if(dragSourceType === 'chip'){
    // Unselect the course
    state.selected.delete(code);
    for(let rank in state.preferences){
      if(state.preferences[rank] === code) state.preferences[rank] = null;
    }
    // Compact preferences after removal
    compactPreferences();
    renderCourses();
    renderBin();
  }
}

// Compact preferences: shift remaining items to fill gaps
function compactPreferences(){
  const prefs = [state.preferences[1], state.preferences[2], state.preferences[3]];
  const filtered = prefs.filter(c => c !== null);
  
  state.preferences[1] = filtered[0] || null;
  state.preferences[2] = filtered[1] || null;
  state.preferences[3] = filtered[2] || null;
}

// Handle drop on a specific preference slot (for swapping)
function handleDropOnSlot(e, targetRank){
  e.preventDefault();
  const draggedCode = e.dataTransfer.getData('text/plain');
  if(!draggedCode) return;
  
  // Ensure course is selected
  if(!state.selected.has(draggedCode)){
    state.selected.add(draggedCode);
    const course = courses.find(c=>c.code===draggedCode);
    if(!state.sectionPrefs[draggedCode]){
      state.sectionPrefs[draggedCode] = Object.fromEntries(course.sections.map(s=>[s.id,'prefer']));
    }
  }
  
  // Find where the dragged item currently is
  let sourceRank = null;
  for(let r in state.preferences){
    if(state.preferences[r] === draggedCode) {
      sourceRank = parseInt(r);
      break;
    }
  }
  
  // Get what's currently in the target slot
  const targetCode = state.preferences[targetRank];
  
  if(sourceRank && targetCode){
    // Swap: both items are in preference slots
    state.preferences[sourceRank] = targetCode;
    state.preferences[targetRank] = draggedCode;
  } else {
    // Just place in target slot (may displace existing item)
    if(sourceRank){
      // Moving from one preference slot to another
      state.preferences[sourceRank] = null;
    }
    
    if(targetCode){
      // Target slot occupied, push it out to selected area
      state.preferences[targetRank] = draggedCode;
    } else {
      // Target slot empty, just place it there
      state.preferences[targetRank] = draggedCode;
    }
    
    // Compact after the move
    compactPreferences();
  }
  
  renderCourses();
  renderBin();
}

// Metrics helpers
function wireMetricsListeners(){
  document.addEventListener('click', (e)=>{
    const target = e.target;
    const clickable = target.closest('button, a, [role="button"], input, select, textarea, label, summary');
    if(!clickable){
      const run = getCurrentRun();
      run.nonInteractiveClicks++;
      setCurrentRun(run);
    }
  }, true);
}
function metricsCountCourseTap(){ const run = getCurrentRun(); run.courseSelectorClicks++; setCurrentRun(run); }
function metricsCountSectionTap(){ const run = getCurrentRun(); run.sectionSelectorClicks++; setCurrentRun(run); }

init();
