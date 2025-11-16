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

// Touch drag state
let touchDragEl = null;
let touchDragType = null;
let touchDragCode = null;
let touchStartY = 0, touchStartX = 0;
let touchGhost = null;
let touchDragStarted = false; // becomes true once movement threshold passed
let suppressNextChipClick = false; // prevent duplicate click after touchend toggle

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
    // Hover text to hint drag action into bins
    card.title = `You can drag ${getShortCode(course.code)} into the bins below`;
    
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
  const shortCode = getShortCode(code);
  return `<div class="section" data-course="${code}" data-sec="${sec.id}" title="You can drag ${shortCode} into the bins below">
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

  // Section row click (no drag)
  document.querySelectorAll('.section').forEach(row=>{
    row.addEventListener('click', (e)=>{
      if(e.target.closest('.sec-btn')) return;
      const btn = row.querySelector('.sec-btn');
      if(!btn) return;
      metricsCountSectionTap();
      handleSectionClick(btn);
    });
    // Remove draggable and drag events from section rows
    row.removeAttribute('draggable');
    row.removeEventListener('dragstart', handleSectionDragStart);
    row.removeEventListener('dragend', handleDragEnd);
    row.removeEventListener('touchstart', handleTouchDragStartSection, {passive:false});
  });

  // Drag events for cards
  document.querySelectorAll('.card').forEach(card=>{
    card.addEventListener('dragstart', handleCardDragStart);
    card.addEventListener('dragend', handleDragEnd);
    // Touch events for mobile drag
    card.addEventListener('touchstart', handleTouchDragStartCard, {passive:false});
  });
}

function toggleCourseSelection(code){
  if(state.selected.has(code)){
    // Unselect: remove from selected set and from preferences
    state.selected.delete(code);
    for(let rank in state.preferences){
      if(state.preferences[rank] === code) state.preferences[rank] = null;
    }
    // Shift remaining preferences up when a slot is cleared
    compactPreferences();
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
  console.log("CARD DRAG START", code);
  dragSourceCode = code;
  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', code);
  // Activate global drag visuals (empty slot pulsing)
  document.body.classList.add('drag-active');
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
  // Activate global drag visuals (empty slot pulsing)
  document.body.classList.add('drag-active');
}

function handleDragEnd(e){
  e.currentTarget.classList.remove('dragging');
  draggedChip = null;
  dragSourceType = null;
  dragSourceCode = null;
  // Cleanup drag state visuals
  document.body.classList.remove('drag-active');
  const prefsArea = document.querySelector('.preferences-area');
  const selectedArea = document.querySelector('.selected-area');
  if(prefsArea) prefsArea.classList.remove('drag-over');
  if(selectedArea) selectedArea.classList.remove('drag-over');
}

function handleSectionDragStart(e){
  // Prevent drag if starting on the section's toggle button
  if(e.target && e.target.closest('.sec-btn')){ e.preventDefault(); return; }
  console.log("SECTION DRAG START", code);
  const row = e.currentTarget;
  const code = row.getAttribute('data-course');
  dragSourceType = 'card'; // treat section drags like card drags (copy semantics)
  dragSourceCode = code;
  row.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', code);
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
  // Touch events for mobile drag
  chip.addEventListener('touchstart', handleTouchDragStartChip, {passive:false});
  // Allow clicking chip to unselect (but prevent default drag behavior on click)
  chip.addEventListener('click', (e)=>{
    e.stopPropagation();
    // Clean up any ghost
    if(touchGhost){ try{ document.body.removeChild(touchGhost);}catch(_){} touchGhost=null; }
    if(suppressNextChipClick){
      // Skip duplicate click following a touchend toggle
      suppressNextChipClick = false;
      return;
    }
    toggleCourseSelection(code);
  });
  return chip;
}
// --- Touch Drag and Drop for Mobile ---
function handleTouchDragStartCard(e){
  // Ignore taps on selector button (normal click logic handles it)
  if(e.target.closest('.selector')) return;
  const card = e.currentTarget;
  const code = card.dataset.code;
  touchDragEl = card;
  touchDragType = 'card';
  touchDragCode = code;
  touchStartY = e.touches[0].clientY;
  touchStartX = e.touches[0].clientX;
  touchDragStarted = false;
  document.addEventListener('touchmove', handleTouchDragMove, {passive:false});
  document.addEventListener('touchend', handleTouchDragEnd, {passive:false});
}

function handleTouchDragStartChip(e){
  const chip = e.currentTarget;
  const code = chip.dataset.code;
  touchDragEl = chip;
  touchDragType = 'chip';
  touchDragCode = code;
  touchStartY = e.touches[0].clientY;
  touchStartX = e.touches[0].clientX;
  touchDragStarted = false;
  document.addEventListener('touchmove', handleTouchDragMove, {passive:false});
  document.addEventListener('touchend', handleTouchDragEnd, {passive:false});
}

function handleTouchDragStartSection(e){
  e.preventDefault();
  const row = e.currentTarget;
  const code = row.getAttribute('data-course');
  touchDragEl = row;
  touchDragType = 'card';
  touchDragCode = code;
  touchStartY = e.touches[0].clientY;
  touchStartX = e.touches[0].clientX;
  createTouchGhost(row, e.touches[0]);
  document.addEventListener('touchmove', handleTouchDragMove, {passive:false});
  document.addEventListener('touchend', handleTouchDragEnd, {passive:false});
}

function createTouchGhost(el, touch){
  touchGhost = el.cloneNode(true);
  touchGhost.style.position = 'fixed';
  touchGhost.style.pointerEvents = 'none';
  touchGhost.style.opacity = '0.8';
  touchGhost.style.zIndex = '9999';
  touchGhost.style.left = (touch.clientX - 40) + 'px';
  touchGhost.style.top = (touch.clientY - 20) + 'px';
  touchGhost.style.width = el.offsetWidth + 'px';
  touchGhost.classList.add('touch-ghost');
  document.body.appendChild(touchGhost);
}

function handleTouchDragMove(e){
  if(!touchDragEl) return;
  const touch = e.touches[0];
  const dy = Math.abs(touch.clientY - touchStartY);
  const dx = Math.abs(touch.clientX - touchStartX);
  if(!touchDragStarted && (dx > 8 || dy > 8)){
    touchDragStarted = true;
    createTouchGhost(touchDragEl, touch);
    document.body.classList.add('drag-active');
    e.preventDefault();
  }
  if(touchDragStarted && touchGhost){
    e.preventDefault();
    touchGhost.style.left = (touch.clientX - 40) + 'px';
    touchGhost.style.top = (touch.clientY - 20) + 'px';
    const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Highlight preferences area
    const prefsArea = document.querySelector('.preferences-area');
    if(elUnder && (elUnder.classList.contains('preferences-area') || elUnder.closest('.preferences-area'))){
      prefsArea.classList.add('drag-over');
    } else {
      prefsArea.classList.remove('drag-over');
    }
    
    // Highlight selected area
    const selectedArea = document.querySelector('.selected-area');
    if(elUnder && (elUnder.classList.contains('selected-area') || elUnder.closest('.selected-area'))){
      selectedArea.classList.add('drag-over');
    } else if(selectedArea){
      selectedArea.classList.remove('drag-over');
    }
    
    // Highlight individual preference slots
    [pref1El, pref2El, pref3El].forEach(slot => {
      if(elUnder && (elUnder === slot || elUnder.parentElement === slot)){
        slot.classList.add('drag-over');
      } else {
        slot.classList.remove('drag-over');
      }
    });
  }
}

function handleTouchDragEnd(e){
  if(!touchDragEl){
    document.removeEventListener('touchmove', handleTouchDragMove);
    document.removeEventListener('touchend', handleTouchDragEnd);
    return;
  }
  // If drag never started treat as tap (chips only toggle)
  if(!touchDragStarted && touchDragType === 'chip' && touchDragCode){
    // Treat as tap, toggle once and suppress synthetic click
    toggleCourseSelection(touchDragCode);
    suppressNextChipClick = true;
    // Prevent default to stop the follow-up synthetic click event
    if(e.cancelable) e.preventDefault();
  } else if(touchDragStarted){
    const touch = e.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    if(dropTarget){
      if(dropTarget.classList.contains('course-chip')){
        const parentSlot = dropTarget.parentElement;
        const slotRank = getSlotRank(parentSlot);
        if(slotRank) {
          handleDropOnSlotTouch(slotRank);
        } else if(parentSlot.id === 'selectedCourses' || parentSlot.closest('.selected-area')){
          // Dropped on a chip in selected courses area
          handleDropSelectedTouch();
        }
      } else if(['pref1','pref2','pref3'].includes(dropTarget.id)){
        const slotRank = getSlotRank(dropTarget);
        if(slotRank) handleDropOnSlotTouch(slotRank);
      } else if(dropTarget.id === 'selectedCourses' || dropTarget.closest('.selected-area')){
        handleDropSelectedTouch();
      } else if(dropTarget.classList.contains('preferences-area')){
        handleDropPreferencesTouch();
      } else if(dropTarget.id === 'courseList'){
        handleDropCourseListTouch();
      }
    }
  }
  if(touchGhost){ try{ document.body.removeChild(touchGhost);}catch(_){} touchGhost=null; }
  touchDragEl = null;
  touchDragType = null;
  touchDragCode = null;
  touchDragStarted = false;
  const prefsArea = document.querySelector('.preferences-area');
  if(prefsArea) prefsArea.classList.remove('drag-over');
  const selectedArea = document.querySelector('.selected-area');
  if(selectedArea) selectedArea.classList.remove('drag-over');
  // Clear drag-over from all individual slots
  [pref1El, pref2El, pref3El].forEach(slot => slot.classList.remove('drag-over'));
  document.body.classList.remove('drag-active');
  document.removeEventListener('touchmove', handleTouchDragMove);
  document.removeEventListener('touchend', handleTouchDragEnd);
}

function getSlotRank(el){
  if(!el) return null;
  if(el.id === 'pref1') return 1;
  if(el.id === 'pref2') return 2;
  if(el.id === 'pref3') return 3;
  return null;
}

function handleDropOnSlotTouch(targetRank){
  let draggedCode = touchDragCode;
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

function handleDropSelectedTouch(){
  let code = touchDragCode;
  if(!code) return;
  if(touchDragType === 'card'){
    if(!state.selected.has(code)){
      state.selected.add(code);
      const course = courses.find(c=>c.code===code);
      if(!state.sectionPrefs[code]){
        state.sectionPrefs[code] = Object.fromEntries(course.sections.map(s=>[s.id,'prefer']));
      }
    }
  } else if(touchDragType === 'chip'){
    for(let rank in state.preferences){
      if(state.preferences[rank] === code) state.preferences[rank] = null;
    }
    compactPreferences();
  }
  renderCourses();
  renderBin();
}

function handleDropPreferencesTouch(){
  let code = touchDragCode;
  if(!code) return;
  if(!state.selected.has(code)){
    state.selected.add(code);
    const course = courses.find(c=>c.code===code);
    if(!state.sectionPrefs[code]){
      state.sectionPrefs[code] = Object.fromEntries(course.sections.map(s=>[s.id,'prefer']));
    }
  }
  for(let r in state.preferences){
    if(state.preferences[r] === code) state.preferences[r] = null;
  }
  let targetRank = null;
  if(!state.preferences[1]) targetRank = 1;
  else if(!state.preferences[2]) targetRank = 2;
  else if(!state.preferences[3]) targetRank = 3;
  else targetRank = 3;
  if(targetRank) state.preferences[targetRank] = code;
  renderCourses();
  renderBin();
}

function handleDropCourseListTouch(){
  let code = touchDragCode;
  if(!code) return;
  if(touchDragType === 'chip'){
    state.selected.delete(code);
    for(let rank in state.preferences){
      if(state.preferences[rank] === code) state.preferences[rank] = null;
    }
    compactPreferences();
    renderCourses();
    renderBin();
  }
}

function wireBinDropZones(){
  // Make selected courses area a drop zone with highlight
  const selectedArea = document.querySelector('.selected-area');
  selectedCoursesEl.addEventListener('dragover', (e)=> { handleDragOver(e); selectedArea.classList.add('drag-over'); });
  selectedCoursesEl.addEventListener('dragleave', ()=> { selectedArea.classList.remove('drag-over'); });
  selectedCoursesEl.addEventListener('drop', (e)=> { handleDropSelected(e); selectedArea.classList.remove('drag-over'); });
  
  // Make entire preferences area a single drop zone
  const prefsArea = document.querySelector('.preferences-area');
  prefsArea.addEventListener('dragover', (e)=> { handleDragOver(e); prefsArea.classList.add('drag-over'); });
  prefsArea.addEventListener('dragleave', ()=> { prefsArea.classList.remove('drag-over'); });
  prefsArea.addEventListener('drop', (e)=> { handleDropPreferences(e); prefsArea.classList.remove('drag-over'); });
  
  // Make individual preference slots drop zones for swapping
  [pref1El, pref2El, pref3El].forEach((el, idx)=>{
    const rank = idx + 1;
    el.addEventListener('dragover', (e)=>{
      e.preventDefault();
      e.stopPropagation(); // Prevent parent preferences area from handling
      console.log("DRAGOVER SLOT", rank);
      e.dataTransfer.dropEffect = dragSourceType === 'card' ? 'copy' : 'move';
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', (e)=>{
      console.log("DRAGLEAVE SLOT", rank);
      el.classList.remove('drag-over');
    });
    el.addEventListener('drop', (e)=> {
      e.preventDefault();
      console.log("DROP ON SLOT", rank, "source:", dragSourceType, "code:", dragSourceCode);
      e.stopPropagation(); // Prevent parent preferences area from handling
      el.classList.remove('drag-over');
      handleDropOnSlot(e, rank);
    });
    console.log("Wired slot", rank, el.id, "for drop");
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
  let code = e.dataTransfer.getData('text/plain');
  if(!code && dragSourceCode) code = dragSourceCode;
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
  let code = e.dataTransfer.getData('text/plain');
  if(!code && dragSourceCode) code = dragSourceCode;
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
  console.log("DROP ON PREFS AREA", "source:", dragSourceType, "code:", dragSourceCode);
  let code = e.dataTransfer.getData('text/plain');
  if(!code && dragSourceCode) code = dragSourceCode;
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
  let code = e.dataTransfer.getData('text/plain');
  if(!code && dragSourceCode) code = dragSourceCode;
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
  let draggedCode = e.dataTransfer.getData('text/plain');
  if(!draggedCode && dragSourceCode) draggedCode = dragSourceCode;
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
