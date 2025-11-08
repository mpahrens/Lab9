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
  coursePrefs: {}, // code -> { qualified:boolean, rank:number|null, sections: { id -> 'neutral'|'prefer'|'exclude'} }
  topRanks: [], // ordered list of codes for ranks 1..n (limit 3)
  filters: { onlySelected:false, showGrad:true, min:1000, max:4999 },
  pulseCode: null,
};

const courseListEl = document.getElementById('courseList');

function init(){
  renderCourses();
  wireGlobalEvents();
}

function wireGlobalEvents(){
  document.getElementById('filterBtn').addEventListener('click', ()=> openModal('filterModal'));
  document.getElementById('saveBtn').addEventListener('click', savePrefs);
  document.querySelectorAll('[data-close]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = btn.getAttribute('data-close');
      closeModal(id);
    });
  });
  document.getElementById('applyFilters').addEventListener('click', e=>{
    e.preventDefault();
    const only = document.getElementById('onlySelected').checked;
    const grad = document.getElementById('showGrad').checked;
    const min = parseInt(document.getElementById('minCourse').value)||1000;
    const max = parseInt(document.getElementById('maxCourse').value)||5999;
    state.filters = { onlySelected:only, showGrad:grad, min, max };
    closeModal('filterModal');
    renderCourses();
  });
}

function openModal(id){
  if(id==='filterModal'){
    // sync current state to controls
    document.getElementById('onlySelected').checked = state.filters.onlySelected;
    document.getElementById('showGrad').checked = state.filters.showGrad;
    document.getElementById('minCourse').value = state.filters.min;
    document.getElementById('maxCourse').value = state.filters.max;
  }
  const dlg = document.getElementById(id); if(!dlg.open) dlg.showModal();
}
function closeModal(id){
  const dlg = document.getElementById(id); if(dlg.open) dlg.close();
}

function savePrefs(){
  showToast('Preferences saved (demo)');
}
function showToast(msg){
  const toast = document.getElementById('toast');
  toast.innerHTML = `<div class="bubble">${msg}</div>`;
  toast.classList.add('show');
  setTimeout(()=> toast.classList.remove('show'), 2600);
}

function computeCourseState(code){
  if(!state.coursePrefs[code]){
    const course = courses.find(c=>c.code===code);
    // default sections to 'prefer' (included)
    const sectionState = Object.fromEntries(course.sections.map(s=>[s.id,'prefer']));
    state.coursePrefs[code] = { qualified:false, rank:null, sections:sectionState };
  }
  return state.coursePrefs[code];
}

function renderCourses(){
  courseListEl.textContent = '';
  const frag = document.createDocumentFragment();
  const filtered = courses.filter(c=>{
    const num = parseInt(c.code.match(/(\d{4})/)[0]);
    if(!state.filters.showGrad && num >=5000) return false;
    if(num < state.filters.min || num > state.filters.max) return false;
    if(state.filters.onlySelected){
      const st = state.coursePrefs[c.code];
      if(!st || (!st.qualified && st.rank==null)) return false;
    }
    return true;
  });
  filtered.forEach(course=>{
    const pref = computeCourseState(course.code);
    const card = document.createElement('div');
    card.className='card';
    const hasExcluded = Object.values(pref.sections).some(v=> v==='exclude');
    const selClasses = ['selector'];
    let selContent;
    if(pref.rank){ selClasses.push('num'); if(hasExcluded) selClasses.push('partial'); selContent = pref.rank; }
    else if(pref.qualified){ if(hasExcluded){ selClasses.push('partial'); selContent = '–'; } else { selClasses.push('check'); selContent = '✔'; } }
    else { selContent = '<span class="plus">+</span>'; }
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
  const pref = computeCourseState(code);
  const st = pref.sections[sec.id];
  let cls=''; let content='✔';
  const courseSelected = !!(pref.qualified || pref.rank);
  if(!courseSelected){
    // course not selected: show plus symbol regardless of stored state
    cls = ''; content = '+';
  } else if(st==='exclude') { cls='exclude'; content='✕'; }
  else { cls='prefer'; content='✔'; }
  return `<div class="section" data-course="${code}" data-sec="${sec.id}">
    <div class="meta">${sec.id} - ${sec.professor}</div>
    <button class="sec-btn ${cls}" data-sec-btn="${code}:${sec.id}">${content}</button>
  </div>`;
}

const tapState = new Map(); // element -> { last:number, timer:number|null, count:number }

// Multi-tap detector: fires once after a quiet period with the tap count (1..3)
function attachTap(el, onProgress, onCommit, threshold=280){
  el.addEventListener('click', (ev)=>{
    const now = performance.now();
    const rec = tapState.get(el) || { last: 0, timer: null, count: 0 };
    if(now - rec.last < threshold){
      // same gesture sequence
      rec.count = Math.min(4, rec.count + 1); // allow up to 4 taps
      rec.last = now;
      if(rec.timer) clearTimeout(rec.timer);
    } else {
      // new sequence
      rec.count = 1;
      rec.last = now;
      if(rec.timer) clearTimeout(rec.timer);
    }

    // brief visual press feedback on each physical tap
    addTapFeedback(el);

    // update progress hint immediately
    showTapHint(el, rec.count);

    rec.timer = setTimeout(()=>{
      const count = rec.count;
      tapState.set(el, { last: 0, timer: null, count: 0 });
      onCommit(ev, count);
    }, threshold);

    tapState.set(el, rec);
    onProgress(rec.count);
  }, { passive:true });
}

function addTapFeedback(el){
  el.classList.add('tapped');
  setTimeout(()=> el.classList.remove('tapped'), 140);
}

function triggerPulse(){
  if(!state.pulseCode) return;
  const btn = document.querySelector(`[data-select="${state.pulseCode}"]`);
  if(btn){
    btn.classList.add('pulse');
    setTimeout(()=> btn.classList.remove('pulse'), 400);
  }
  state.pulseCode = null;
}

function bindDynamicEvents(){
  document.querySelectorAll('[data-info]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const code = btn.getAttribute('data-info');
      const course = courses.find(c=>c.code===code);
      document.getElementById('infoTitle').textContent = `${course.code} - ${course.name}`;
      document.getElementById('infoDescription').textContent = course.description;
      openModal('infoModal');
    });
  });
  document.querySelectorAll('[data-select]').forEach(btn=>{
    attachTap(btn, (count)=> previewCourseTap(btn, count), (e, count)=> commitCourseMulti(btn, count));
  });
  document.querySelectorAll('[data-sec-btn]').forEach(btn=>{
    btn.addEventListener('click', ()=> { addTapFeedback(btn); handleSectionClick(btn); });
  });
  // run any pending pulses after elements exist
  triggerPulse();
}

function handleCourseSingle(e, btn){
  const code = btn.getAttribute('data-select');
  const pref = computeCourseState(code);
  if(pref.rank){ // if already ranked, clicking toggles off ranking -> remain qualified
    removeRank(code);
    pref.qualified = true;
  } else if(pref.qualified){
    // turn off qualified (keep section include/exclude choices)
    pref.qualified = false; pref.rank = null;
  } else {
    // set qualified and mark all sections prefer
    pref.qualified = true;
    Object.keys(pref.sections).forEach(k=> pref.sections[k]='prefer');
  }
  renderCourses();
}

function handleCourseDouble(btn){
  const code = btn.getAttribute('data-select');
  const pref = computeCourseState(code);
  // ensure qualified
  if(!pref.qualified){
    pref.qualified = true;
    Object.keys(pref.sections).forEach(k=> pref.sections[k]='prefer');
  }
  assignRankAt(code, 1);
  state.pulseCode = code;
  renderCourses();
}

function handleCourseTriple(btn){
  const code = btn.getAttribute('data-select');
  const pref = computeCourseState(code);
  if(!pref.qualified){
    pref.qualified = true;
    Object.keys(pref.sections).forEach(k=> pref.sections[k]='prefer');
  }
  // If there is already a #1 (and it's not this course), insert this as #2
  if(state.topRanks.length>0 && state.topRanks[0] !== code){
    assignRankAt(code, 2);
  } else {
    // No #1 yet or this is already #1; keep/set as #1
    assignRankAt(code, 1);
  }
  state.pulseCode = code;
  renderCourses();
}

function commitCourseMulti(btn, count){
  if(count === 1) return handleCourseSingle(null, btn);
  if(count === 2) return handleCourseDouble(btn);
  if(count === 3) return handleCourseTriple(btn);
  if(count === 4) return handleCourseQuad(btn);
}

function handleCourseQuad(btn){
  const code = btn.getAttribute('data-select');
  const pref = computeCourseState(code);
  if(!pref.qualified){
    pref.qualified = true;
    Object.keys(pref.sections).forEach(k=> pref.sections[k]='prefer');
  }
  // Insert at rank 3 unless already #1 or #2; if #1 or #2 tapped 4 times keep existing position.
  const idx = state.topRanks.indexOf(code);
  if(idx === -1){
    assignRankAt(code, 3);
  }
  state.pulseCode = code;
  renderCourses();
}

function previewCourseTap(btn, count){
  // Visual hint only; don’t mutate permanent state.
  const code = btn.getAttribute('data-select');
  const pref = computeCourseState(code);
  const hasExcluded = Object.values(pref.sections).some(v=> v==='exclude');
  let previewClass = 'selector';
  let previewContent = '<span class="plus">+</span>';
  if(count === 1){ previewClass += ' check'; previewContent = hasExcluded? '–':'✔'; }
  else if(count === 2){ previewClass += hasExcluded? ' num partial':' num'; previewContent = '1'; }
  else if(count === 3){ previewClass += hasExcluded? ' num partial':' num'; previewContent = '2'; }
  else if(count === 4){ previewClass += hasExcluded? ' num partial':' num'; previewContent = '3'; }
  // Apply temporary transform without rerender
  btn.className = previewClass;
  btn.innerHTML = previewContent;
}

function isPartial(pref){
  if(pref.qualified) return false;
  const vals = Object.values(pref.sections);
  return vals.some(v=> v==='exclude');
}

function handleSectionClick(btn){
  const [code,id] = btn.getAttribute('data-sec-btn').split(':');
  const pref = computeCourseState(code);
  const current = pref.sections[id];
  pref.sections[id] = current==='exclude' ? 'prefer' : 'exclude';
  // Do not alter course numeric rank or qualified status when excluding.
  renderCourses();
}

function assignRankAt(code, position){
  // normalize and cap position (1..3)
  const pos = Math.max(1, Math.min(3, position|0));
  // remove if already present
  const cur = state.topRanks.indexOf(code);
  if(cur !== -1) state.topRanks.splice(cur, 1);
  // insert
  if(pos === 1){
    state.topRanks.unshift(code);
  } else if(pos === 2){
    if(state.topRanks.length === 0){
      state.topRanks.unshift(code); // no #1 yet; becomes #1
    } else {
      state.topRanks.splice(1, 0, code);
    }
  } else { // position 3 requested; keep for completeness
    while(state.topRanks.length < 2) state.topRanks.push(null);
    state.topRanks.splice(2, 0, code);
  }
  // filter any nulls and cap to 3
  state.topRanks = state.topRanks.filter(Boolean).slice(0,3);

  // update pref objects
  state.topRanks.forEach((c,i)=>{ const pref = computeCourseState(c); pref.rank = i+1; pref.qualified = true; });
  courses.forEach(c=>{
    if(!state.topRanks.includes(c.code)){
      const p = computeCourseState(c.code);
      if(p.rank){ p.rank=null; }
    }
  });
}
function removeRank(code){
  const idx = state.topRanks.indexOf(code);
  if(idx!==-1){ state.topRanks.splice(idx,1); }
  const pref = computeCourseState(code); pref.rank=null; // remains qualified state handled by caller
  // reassign numbers
  state.topRanks.forEach((c,i)=> computeCourseState(c).rank = i+1);
}

// Overlay animated number hint
function showTapHint(btn, count){
  let hint = btn.querySelector('.tap-hint');
  if(!hint){
    hint = document.createElement('div');
    hint.className='tap-hint';
    btn.appendChild(hint);
  }
  hint.textContent = count;
  hint.classList.remove('show');
  void hint.offsetWidth; // force reflow for restart
  hint.classList.add('show');
}

init();
