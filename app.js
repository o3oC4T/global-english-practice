'use strict';
(() => {
  const D = window.EXAM_DATA;
  const main = document.querySelector('#main');
  const professor = window.ACTIVE_PROFESSOR;
  if (!D || !professor || D.professorCode !== professor.code || D.course?.code !== professor.code) { main.textContent = '교수님 코드와 학습 자료가 일치하지 않습니다. 코드 입력 화면으로 돌아가 주세요.'; return; }
  const C = D.course;
  const assetURL = window.practiceAsset || (path => path);
  const KEY = `global-english-practice:${professor.code}:v1`;
  const LEGACY_KEY = 'global-english-practice-v1';
  const SPEECH_SECONDS = Number(C.speaking?.practiceSeconds) || 0;
  const setIds = new Set(D.reading.sets.map(set => set.id));
  const setLabel = id => D.reading.sets.find(set=>set.id===id)?.title || `모의고사 ${String(id).padStart(2,'0')}`;
  const hasSpeaking = D.speaking.topics.length>0 && D.speaking.models.length>0 && !!C.speaking;
  const hasWriting = Array.isArray(D.writing?.sections) && D.writing.sections.length>0;
  document.querySelector('#nav [data-view="speaking"]').hidden=!hasSpeaking;
  const writingNav=document.querySelector('#nav [data-view="writing"]');
  if(writingNav)writingNav.hidden=!hasWriting;
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const letter = n => String.fromCharCode(65 + n);
  const fmt = n => `${String(Math.floor(n / 60)).padStart(2,'0')}:${String(Math.floor(n % 60)).padStart(2,'0')}`;
  const levelFor = n => { const level=C.levels.find(x=>n>=x.from&&n<=x.to); return level?[level.label,level.style,level.description]:['연습','','']; };
  const index = new Map();
  const passages = new Map(D.reading.passages.map(p => [p.id,p]));
  for (const set of D.reading.sets) set.questions.forEach((q,i) => index.set(q.id,{...q,setId:set.id,section:'reading',number:i+1,passage:passages.get(q.passageId)}));
  for (const set of D.listening.sets) {
    let n=0;
    for (const group of set.groups) for (const q of group.questions) index.set(q.id,{...q,setId:set.id,section:'listening',number:++n,group});
  }
  let storageOK = true, toastTimer, active = null, filter='all', speechTimer = null, speechRemaining=SPEECH_SECONDS, speechRunning=false;
  let speechHide=false, speechKorean=true, resultOnlyWrong=false;
  let memoryUI=null, memoryModule=null, memoryRoute=0;
  const hasMemory=professor.memorizationPath===`${professor.assetRoot}memory.js`;
  let memoryNav=document.querySelector('#nav [data-view="memorize"]');
  if(hasMemory && !memoryNav){
    memoryNav=document.createElement('a');memoryNav.href='#memorize';memoryNav.dataset.view='memorize';
    memoryNav.innerHTML='<span aria-hidden="true">Aa</span> 본문 암기';
    document.querySelector('#nav [data-view="home"]').after(memoryNav);
  }
  if(memoryNav) memoryNav.hidden=!hasMemory;
  const emptyMemory=()=>({mode:'sentence',visibility:'both',passages:{}});
  function sanitizeMemory(raw){
    const safe=emptyMemory(), validId=id=>typeof id==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(id);
    if(!hasMemory || !raw || typeof raw!=='object') return safe;
    if(['sentence','paragraph'].includes(raw.mode))safe.mode=raw.mode;
    if(['both','hide-en','hide-ko'].includes(raw.visibility))safe.visibility=raw.visibility;
    if(raw.passages && typeof raw.passages==='object')for(const [id,p] of Object.entries(raw.passages).slice(0,100)){
      if(!validId(id)||!p||!validId(p.sentenceId))continue;
      safe.passages[id]={sentenceId:p.sentenceId,known:Array.isArray(p.known)?[...new Set(p.known.filter(validId))].slice(0,1000):[],updated:Number.isFinite(p.updated)?p.updated:0};
    }
    return safe;
  }
  const emptyDB=()=>({version:1,professorCode:professor.code,runs:{},mastery:{},history:[],memory:emptyMemory(),writing:{}});
  function sanitizeDB(raw) {
    if (!raw || raw.version!==1 || typeof raw.runs!=='object' || !raw.runs || typeof raw.mastery!=='object' || !raw.mastery || !Array.isArray(raw.history)) throw new Error('다른 형식의 학습 기록입니다.');
    if (raw.professorCode === undefined ? professor.code !== 'yjy' : raw.professorCode !== professor.code) throw new Error('다른 교수님의 학습 기록은 가져올 수 없습니다.');
    const safe=emptyDB();
    for(const [key,r] of Object.entries(raw.runs)) {
      if(!r || typeof r!=='object' || !Array.isArray(r.itemIds) || !r.itemIds.length || r.itemIds.length>index.size || !r.itemIds.every(id=>index.has(id)) || new Set(r.itemIds).size!==r.itemIds.length) continue;
      if(!['all','reading','listening','wrong'].includes(r.mode)) continue;
      const answers={}, flags={};
      for(const id of r.itemIds) {
        if(Number.isInteger(r.answers?.[id]) && r.answers[id]>=0 && r.answers[id]<index.get(id).options.length) answers[id]=r.answers[id];
        if(r.flags?.[id]===true) flags[id]=true;
      }
      const setId=Number(r.setId);
      if(r.mode!=='wrong' && (!Number.isInteger(setId) || !setIds.has(setId) || r.itemIds.some(id=>index.get(id).setId!==setId || (r.mode!=='all' && index.get(id).section!==r.mode)))) continue;
      const safeKey=r.mode==='wrong'?'wrongbook':`${setId}-${r.mode}`;
      safe.runs[safeKey]={setId:r.mode==='wrong'?0:setId,mode:r.mode,itemIds:r.itemIds,answers,flags,elapsed:Math.max(0,Math.min(1e7,Number(r.elapsed)||0)),submitted:r.submitted===true,updated:Number(r.updated)||0,completedAt:Number(r.completedAt)||0,cursor:Math.max(0,Math.min(r.itemIds.length-1,Number(r.cursor)||0))};
    }
    for(const [id,m] of Object.entries(raw.mastery)) if(index.has(id) && m && Number.isInteger(m.answer) && m.answer>=-1 && m.answer<index.get(id).options.length) safe.mastery[id]={answer:m.answer,correct:m.answer===index.get(id).answer,time:Number(m.time)||0};
    safe.history=raw.history.filter(h=>h && Number.isFinite(h.score) && Number.isFinite(h.total) && h.total>0 && h.score>=0 && h.score<=h.total).slice(-500).map(h=>({setId:Number(h.setId)||0,mode:['all','reading','listening','wrong'].includes(h.mode)?h.mode:'all',score:h.score,total:h.total,date:Number(h.date)||0}));
    safe.memory=sanitizeMemory(raw.memory);
    if(hasWriting)for(const section of D.writing.sections)if(typeof raw.writing?.[section.id]==='string')safe.writing[section.id]=raw.writing[section.id].slice(0,20000);
    return safe;
  }
  let db;
  let migratedLegacy=false;
  try {
    let raw=localStorage.getItem(KEY);
    if(raw===null && professor.code==='yjy'){raw=localStorage.getItem(LEGACY_KEY);migratedLegacy=raw!==null;}
    db=raw?sanitizeDB(JSON.parse(raw)):emptyDB();
    localStorage.setItem(KEY,JSON.stringify(db));
  }
  catch { storageOK=false; db=emptyDB(); }
  function save(){ try {localStorage.setItem(KEY,JSON.stringify(db));} catch { if(storageOK) toast('저장 공간을 사용할 수 없어요. 학습 기록을 내보내 주세요.'); storageOK=false; } updateBadge(); }
  function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500);}
  function modal(title,body,button,onConfirm,danger=false){
    const dialog=document.querySelector('#modal');
    document.querySelector('#modal-body').innerHTML=`<h2>${esc(title)}</h2><p>${esc(body)}</p><div class="action-row"><button class="btn outline" id="modal-cancel">돌아가기</button><button class="btn ${danger?'danger':''}" id="modal-confirm">${esc(button)}</button></div>`;
    document.querySelector('#modal-cancel').onclick=()=>dialog.close();
    document.querySelector('#modal-confirm').onclick=()=>{dialog.close();onConfirm();};
    dialog.showModal();
  }
  const wrongIds=()=>Object.keys(db.mastery).filter(id=>!db.mastery[id].correct && index.has(id));
  function updateBadge(){document.querySelector('#wrong-count').textContent=wrongIds().length;}
  function itemsFor(setId,mode){return [...index.values()].filter(q=>q.setId===setId && (mode==='all'||q.section===mode));}
  function runItems(run){return run.itemIds.map(id=>index.get(id)).filter(Boolean);}
  function answered(run){return run.itemIds.filter(id=>Number.isInteger(run.answers[id])).length;}
  function score(run){return run.itemIds.filter(id=>run.answers[id]===index.get(id).answer).length;}
  function modeLabel(mode){return ({all:'리딩 + 리스닝',reading:'리딩',listening:'리스닝',wrong:'오답 다시 풀기'})[mode];}
  function titleRun(run){return run.mode==='wrong'?'오답 다시 풀기':`${setLabel(run.setId)} · ${modeLabel(run.mode)}`;}
  function pageTop(tag,title,sub,pill=''){return `<div class="page-top"><div><p class="eyebrow">${tag}</p><h1>${title}</h1><p class="subtitle">${sub}</p></div>${pill?`<span class="subtle-pill">${pill}</span>`:''}</div>`;}
  function navigate(hash){if(location.hash===hash)route();else location.hash=hash;}
  function flushActive(){if(active){const run=db.runs[active.key];if(run && !run.submitted){run.cursor=active.cursor;run.updated=Date.now();save();}}}
  function stopSpeech(){clearInterval(speechTimer);speechTimer=null;speechRunning=false;window.speechSynthesis?.cancel();}
  function route(){
    flushActive();active=null;stopSpeech();
    memoryRoute++;memoryUI?.leave();
    const parts=(location.hash.replace(/^#/,'')||'home').split('/');
    let view=parts[0];
    const navView=['test','result'].includes(view)?'home':view==='speech'?'speaking':view;
    document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('active',a.dataset.view===navView));
    document.querySelector('#breadcrumb').textContent=`My learning / ${{home:'모의고사',memorize:'본문 암기',wrong:'오답 노트',speaking:'스피킹 연습',writing:'자기소개서 연습',guide:'학습 안내'}[navView]||'모의고사'}`;
    if(view==='test') renderTest(parts[1],Number(parts[2])||0);
    else if(view==='result') renderResult(parts[1]);
    else if(view==='wrong')renderWrong();
    else if(view==='speaking')renderSpeaking();
    else if(view==='speech')renderSpeech(Number(parts[1]));
    else if(view==='guide')renderGuide();
    else if(view==='writing')renderWriting();
    else if(view==='memorize')renderMemory(parts[1]);
    else renderHome();
    window.scrollTo({top:0,behavior:'instant'});updateBadge();
  }
  async function renderMemory(passageId){
    if(!hasMemory){main.innerHTML=pageTop('READ & RECALL','본문 암기','이 교수님의 본문 암기 자료는 아직 준비되지 않았어요.');return;}
    const ticket=memoryRoute;
    main.innerHTML='<div class="loading" role="status">본문과 해석을 불러오는 중입니다…</div>';
    try{
      if(!memoryModule)memoryModule=new Promise((resolve,reject)=>{
        if(window.createMemoryPractice){resolve();return;}
        const script=document.createElement('script');script.src=assetURL('memorize.js');
        script.onload=()=>typeof window.createMemoryPractice==='function'?resolve():reject(new Error('module'));
        script.onerror=()=>{script.remove();reject(new Error('network'));};document.body.appendChild(script);
      });
      await memoryModule;
      if(ticket!==memoryRoute)return;
      if(!memoryUI)memoryUI=window.createMemoryPractice({main,professor,toast,getProgress:()=>db.memory,saveProgress:value=>{db.memory=sanitizeMemory(value);save();}});
      await memoryUI.render(passageId);
    }catch{
      memoryModule=null;
      if(ticket===memoryRoute)main.innerHTML='<div class="storage-warning">본문 암기 화면을 불러오지 못했어요. 새로고침한 뒤 다시 열어 주세요.</div>';
    }
  }
  function renderHome(){
    const completed=new Set(D.reading.sets.filter(set=>db.runs[`${set.id}-all`]?.submitted || ['reading','listening'].filter(section=>itemsFor(set.id,section).length).every(section=>db.runs[`${set.id}-${section}`]?.submitted)).map(set=>set.id));
    const completeQuestions=new Set(Object.keys(db.mastery));
    const attempted=Object.values(db.mastery);const acc=attempted.length?Math.round(attempted.filter(m=>m.correct).length/attempted.length*100):null;
    const resumable=Object.entries(db.runs).filter(([,r])=>!r.submitted).sort((a,b)=>b[1].updated-a[1].updated)[0];
    const filtered=set=>filter==='all'||(filter==='done'?completed.has(set.id):!completed.has(set.id));
    const core=D.reading.sets.filter(set=>set.category!=='supplement');
    const extra=D.reading.sets.filter(set=>set.category==='supplement');
    const cards=sets=>sets.filter(filtered).map(set=>{
      const n=set.id,[level,cls,description]=levelFor(n),rc=itemsFor(n,'reading').length,lc=itemsFor(n,'listening').length;
      const mode=rc&&lc?'all':rc?'reading':'listening',run=db.runs[`${n}-${mode}`];
      return `<article class="exam-card ${set.category==='supplement'?'supplement-card':''}" data-set="${n}"><div class="card-top"><span class="exam-number">${String(n).padStart(2,'0')}</span><span class="level ${esc(cls)}">${esc(set.badge||level)}</span></div>${run?`<span class="saved-label">${run.submitted?`${score(run)} / ${rc+lc} 정답`:`${answered(run)}문항 저장됨`}</span>`:''}<h3>${esc(setLabel(n))}</h3><p class="card-desc">${esc(set.description||description)}</p><div class="card-meta">${rc?`<span>Reading ${rc}</span>`:''}${lc?`<span>Listening ${lc}</span>`:''}</div><button class="btn primary-action" data-start="${n}" data-mode="${mode}">${run?(run.submitted?'결과 · 해설 보기':'이어서 풀기'):`${mode==='all'?'전체 ':''}${rc+lc}문항 시작`}<span class="arrow">→</span></button>${rc&&lc?`<div class="card-sub-actions"><button class="btn outline" data-start="${n}" data-mode="reading">${db.runs[`${n}-reading`]?.submitted?'리딩 결과 보기':db.runs[`${n}-reading`]?'리딩 이어 풀기':'리딩만 풀기'}</button><button class="btn outline" data-start="${n}" data-mode="listening">${db.runs[`${n}-listening`]?.submitted?'듣기 결과 보기':db.runs[`${n}-listening`]?'듣기 이어 풀기':'듣기만 풀기'}</button></div>`:''}</article>`;
    }).join('');
    main.innerHTML=pageTop('MAKE ROOM FOR PRACTICE','오늘의 연습을 시작해요.',esc(C.homeSubtitle||'리딩부터 리스닝까지. 한 회씩 쌓아가는 시험 준비.'),`${core.length} SETS${extra.length?` + ${extra.length} EXTRA`:''} · ${index.size} QUESTIONS`)+
    (!storageOK?'<div class="storage-warning">자동 저장을 사용할 수 없는 브라우저 설정입니다. 학습 후 기록 내보내기로 백업해 주세요.</div>':'')+
    `<section class="hero"><div><p class="eyebrow">A SMALL STEP, EVERY DAY</p><h2>아는 것에서,<br>자신 있게 답하는 것으로.</h2><p>${esc(C.heroText)}</p></div><div class="hero-art" aria-hidden="true"><div class="art-page"><div class="art-line"></div><div class="art-line"></div><div class="art-line"></div></div><div class="art-circle">✓</div><span class="art-star">✦</span></div></section>`+
    `<div class="stats"><div class="stat"><div class="stat-icon">▦</div><div><p class="stat-label">완료한 ${extra.length?'연습':'회차'}</p><p class="stat-value">${completed.size}<small>/ ${setIds.size}회</small></p></div></div><div class="stat"><div class="stat-icon">✓</div><div><p class="stat-label">채점한 문항</p><p class="stat-value">${completeQuestions.size}<small>/ ${index.size}</small></p></div></div><div class="stat"><div class="stat-icon">↗</div><div><p class="stat-label">최근 답안 정답률</p><p class="stat-value">${acc===null?'—':acc}<small>${acc===null?'아직 기록 없음':'%'}</small></p></div></div></div>`+
    (resumable?`<div class="continue-banner"><div><p>${esc(titleRun(resumable[1]))} 이어서 풀까요?</p><small>${answered(resumable[1])} / ${resumable[1].itemIds.length}문항 응답 · ${fmt(resumable[1].elapsed)} 학습</small></div><button class="btn" data-resume="${esc(resumable[0])}">이어서 풀기 →</button></div>`:'')+
    (hasMemory?'<div class="continue-banner"><div><p>영어 한 문장, 해석 한 문장.</p><small>문장과 단락을 오가며 본문의 흐름을 외워 보세요.</small></div><a class="btn outline" href="#memorize">본문 암기 →</a></div>':'')+
    `<div class="section-heading"><h2>모의고사 <span>${esc(professor.name)} 교수님 자료</span></h2><div class="filter-tabs" aria-label="회차 필터">${[['all','전체'],['new','미완료'],['done','완료']].map(([key,label])=>`<button data-filter="${key}" class="${filter===key?'active':''}">${label}</button>`).join('')}</div></div><div class="exam-grid main-exam-grid">${cards(core)}</div>`+
    (extra.length?`<div class="section-heading"><h2>${esc(C.supplementTitle||'추가 연습')} <span>${esc(C.supplementNote||'제공 자료별 연습')}</span></h2></div><div class="exam-grid supplement-grid">${cards(extra)}</div>`:'')+
    `<div class="notice"><strong>시작하기 전에</strong> &nbsp; ${esc(C.homeNotice)}</div>`;
    main.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>startSet(Number(b.dataset.start),b.dataset.mode));
    main.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderHome();});
    main.querySelector('[data-resume]')?.addEventListener('click',e=>{const key=e.currentTarget.dataset.resume;navigate(`#test/${key}/${db.runs[key].cursor||0}`);});
  }
  function startSet(setId,mode,restart=false){
    if(!Number.isInteger(setId)||!setIds.has(setId)||!['all','reading','listening'].includes(mode))return;
    if(!itemsFor(setId,mode).length){toast('이 연습에는 해당 영역의 문항이 없어요.');return;}
    const key=`${setId}-${mode}`;
    if(db.runs[key]&&!restart){navigate(`#${db.runs[key].submitted?'result':'test'}/${key}/${db.runs[key].cursor||0}`);return;}
    db.runs[key]={setId,mode,itemIds:itemsFor(setId,mode).map(q=>q.id),answers:{},flags:{},elapsed:0,updated:Date.now(),submitted:false,cursor:0};save();navigate(`#test/${key}/0`);
  }
  function startWrong(ids=wrongIds()){
    if(!ids.length){toast('다시 풀 오답이 없어요.');return;}
    const go=()=>{db.runs.wrongbook={setId:0,mode:'wrong',itemIds:[...new Set(ids)],answers:{},flags:{},elapsed:0,updated:Date.now(),submitted:false,cursor:0};save();navigate('#test/wrongbook/0');};
    if(db.runs.wrongbook&&!db.runs.wrongbook.submitted&&answered(db.runs.wrongbook))modal('새 오답 연습을 시작할까요?','진행 중인 오답 연습 답안은 새 연습으로 바뀝니다. 제출한 채점 기록은 유지됩니다.','새 연습 시작',go);else go();
  }
  function visibleQuestions(items,cursor){const q=items[cursor];if(q.section==='reading')return[q];return items.filter(x=>x.section==='listening'&&x.group.id===q.group.id);}
  function renderTest(key,cursor){
    const run=db.runs[key];if(!run){renderHome();return;}
    const items=runItems(run);cursor=Math.max(0,Math.min(items.length-1,cursor));active={key,cursor};
    const q=items[cursor];const visible=visibleQuestions(items,cursor);
    main.innerHTML=`<button class="back-link" id="leave-test">← ${run.submitted?'결과로 돌아가기':'저장하고 나가기'}</button><div class="test-header"><div><p class="eyebrow">${run.submitted?'REVIEW YOUR ANSWERS':'ONE QUESTION AT A TIME'}</p><h1>${esc(titleRun(run))}</h1></div><div class="test-status"><span class="timer" id="elapsed">${fmt(run.elapsed)}</span>${run.submitted?'총 풀이 시간':'경과 시간 · 자동 저장'}</div></div><div class="test-progress"><span id="progress-bar" style="width:${answered(run)/items.length*100}%"></span></div><div class="test-layout"><div class="test-content"><div id="question-area">${q.section==='reading'?`<div class="test-reading">${passageHTML(q,run.submitted)}<div>${questionHTML(q,run,items)}</div></div>`:`${audioHTML(q.group,run)}${visible.map(x=>questionHTML(x,run,items)).join('')}`}</div><div class="test-bottom"><button class="btn outline" id="prev-question" ${cursor===0?'disabled':''}>← 이전</button><span id="answered-count">${answered(run)} / ${items.length}문항 응답</span><button class="btn" id="next-question">${Math.max(...visible.map(v=>items.findIndex(x=>x.id===v.id)))===items.length-1?(run.submitted?'결과 보기':'제출하기'):'다음 →'}</button></div></div>${navigatorHTML(run,items,cursor)}</div>`;
    document.querySelector('#leave-test').onclick=()=>navigate(run.submitted?`#result/${key}`:'#home');
    main.querySelectorAll('[data-qnav]').forEach(b=>b.onclick=()=>goQuestion(Number(b.dataset.qnav)));
    main.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>chooseAnswer(b.dataset.answer,Number(b.dataset.option)));
    main.querySelectorAll('[data-flag]').forEach(b=>b.onclick=()=>toggleFlag(b.dataset.flag));
    document.querySelector('#prev-question').onclick=()=>{const first=Math.min(...visible.map(v=>items.findIndex(x=>x.id===v.id)));goQuestion(Math.max(0,first-1));};
    document.querySelector('#next-question').onclick=()=>{const next=Math.max(...visible.map(v=>items.findIndex(x=>x.id===v.id)))+1;if(next<items.length)goQuestion(next);else if(run.submitted)navigate(`#result/${key}`);else confirmSubmit();};
    document.querySelector('#submit-test').onclick=()=>run.submitted?navigate(`#result/${key}`):confirmSubmit();
    document.querySelector('#go-unanswered')?.addEventListener('click',()=>{const n=items.findIndex(x=>run.answers[x.id]===undefined);if(n>=0)goQuestion(n);else toast('모든 문항에 답했어요.');});
    document.querySelector('#go-flagged')?.addEventListener('click',()=>{const positions=items.map((x,i)=>run.flags[x.id]?i:-1).filter(i=>i>=0);const next=positions.find(i=>i>cursor)??positions[0];if(next!==undefined)goQuestion(next);else toast('표시한 문항이 없어요.');});
    setupAudio(q,run);
  }
  function passageHTML(q,review=false){const p=q.passage;return `<section class="passage"><p class="panel-label">READING · ${esc(typeof q.unit==='number'?`UNIT ${q.unit}`:q.unit)}</p><h2>${esc(review?(p?.title||'Reading passage'):`Passage ${q.passageId.toUpperCase()}`)}</h2><div class="passage-text" lang="en">${esc(p?.text||'')}</div><p class="source">${esc(p?.source||'수업 자료 발췌')}</p></section>`;}
  function questionHTML(q,run,items){
    const chosen=run.answers[q.id], isReview=run.submitted, part2=q.section==='listening'&&q.group.part===2;
    const displayNum=items.findIndex(x=>x.id===q.id)+1;
    return `<section class="question-card ${isReview?(chosen===q.answer?'review-correct':'review-wrong'):''}" id="q-${esc(q.id)}"><div class="question-top"><span class="q-label">QUESTION ${String(displayNum).padStart(2,'0')} <span aria-hidden="true">/</span> ${esc(q.section==='reading'?q.kind||'READING':q.group.label||`PART ${q.group.part}`)}</span><button class="flag-button ${run.flags[q.id]?'flagged':''}" data-flag="${esc(q.id)}" aria-pressed="${!!run.flags[q.id]}">${run.flags[q.id]?'★ 다시 볼 문제':'☆ 다시 보기'}</button></div>${part2&&!isReview?'<p class="part2-note">질문과 세 가지 응답을 듣고 가장 적절한 응답을 고르세요. 선택지는 음성으로만 제시됩니다.</p>':`<h2 class="question-stem english" lang="en">${esc(q.question)}</h2>`}<div class="options" role="group" aria-label="${displayNum}번 답안">${q.options.map((opt,i)=>`<button class="option ${chosen===i?'selected':''} ${isReview&&i===q.answer?'correct':''} ${isReview&&chosen===i&&i!==q.answer?'incorrect':''}" data-answer="${esc(q.id)}" data-option="${i}" aria-pressed="${chosen===i}" ${isReview?'disabled':''}><span class="letter">${letter(i)}</span><span lang="en">${part2&&!isReview?`${letter(i)}번 응답`:esc(opt)}</span>${isReview&&i===q.answer?'<span class="answer-marker">정답</span>':isReview&&i===chosen?'<span class="answer-marker">내 답</span>':''}</button>`).join('')}</div>${isReview?`<div class="explanation"><p class="result-line">내 답: ${chosen===undefined?'미응답':letter(chosen)} &nbsp; · &nbsp; 정답: ${letter(q.answer)}</p><h3>정답의 근거</h3><p>${esc(q.explanation)}</p>${q.evidence?`<blockquote lang="en">${esc(q.evidence)}</blockquote>`:''}</div>`:''}</section>`;
  }
  function audioHTML(group,run){
    const clip=D.audio[group.clipId],reused=group.reused||group.reuseNote;
    const title=(run.submitted&&group.title) || group.promptTitle || (group.part===2?'짧은 질문, 가장 자연스러운 응답':group.part===3?'대화를 듣고 답하세요.':'담화를 듣고 답하세요.');
    const instructions=group.instructions || (group.part===2?'원본 순서대로 A → B → C를 듣고 선택해요.':'원본 대화·담화에 대한 새 문제입니다. 문제와 보기는 화면에서 읽어 주세요.');
    return `<section class="audio-panel"><p class="panel-label">LISTENING · ${esc(group.label||`PART ${group.part}`)}</p><h2>${esc(title)}</h2><p>${esc(group.source)}${reused?` · ${esc(group.reuseNote||'재사용 음원 / 복습')}`:''}</p>${clip?`<audio id="listening-audio" controls preload="metadata" src="${esc(clip.file)}" aria-label="듣기 음원">브라우저에서 음원을 재생할 수 없습니다.</audio><div class="audio-toolbar"><button id="audio-restart">처음부터 다시 듣기 ↺</button><label>재생 속도 <select id="audio-speed" aria-label="음원 재생 속도"><option value="0.8">0.8×</option><option value="1" selected>1.0×</option><option value="1.15">1.15×</option></select></label></div><p class="audio-error" id="audio-error" hidden>음원을 읽지 못했어요. 교수님 폴더와 HTML 파일을 함께 두었는지 확인해 주세요.</p>`:'<p class="audio-error">이 문제의 음원 파일을 찾을 수 없습니다.</p>'}<p style="margin-top:12px">${esc(instructions)}</p>${run.submitted?`<details class="transcript"><summary>영어 스크립트 보기</summary><p lang="en">${esc(group.script)}</p></details>`:''}</section>`;
  }
  function setupAudio(q,run){
    const audio=document.querySelector('#listening-audio');if(!audio)return;
    audio.onerror=()=>{document.querySelector('#audio-error').hidden=false;};
    document.querySelector('#audio-speed').onchange=e=>{audio.playbackRate=Number(e.target.value);};
    document.querySelector('#audio-restart').onclick=()=>{audio.currentTime=0;audio.play().catch(()=>toast('음원 재생 버튼을 눌러 주세요.'));};
  }
  function navigatorHTML(run,items,cursor){
    return `<aside class="navigator" aria-label="문항 이동">${['reading','listening'].map(section=>{const sub=items.map((q,i)=>({q,i})).filter(x=>x.q.section===section);return sub.length?`<h3>${section==='reading'?'READING':'LISTENING'} · ${sub.length}</h3><div class="number-grid">${sub.map(({q,i})=>`<button data-qnav="${i}" class="${run.answers[q.id]!==undefined?'answered':''} ${run.flags[q.id]?'flagged':''} ${i===cursor?'current':''} ${run.submitted?(run.answers[q.id]===q.answer?'right':'wrong'):''}" aria-label="${i+1}번${run.answers[q.id]!==undefined?' 응답 완료':' 미응답'}${run.flags[q.id]?' 다시 보기':''}" ${i===cursor?'aria-current="true"':''}>${i+1}</button>`).join('')}</div>`:'';}).join('')}<div class="nav-legend">연두색 · 응답 완료<br>금색 점 · 다시 볼 문제<br>${run.submitted?'붉은색 · 오답 / 미응답':'선택한 답은 자동으로 저장돼요.'}</div>${!run.submitted?'<button class="btn outline" id="go-unanswered">미응답으로 이동</button><button class="btn outline" id="go-flagged">표시한 문제로 이동</button>':''}<button class="btn" id="submit-test">${run.submitted?'결과로 돌아가기':'답안 제출 · 채점'}</button></aside>`;
  }
  function goQuestion(cursor){
    if(!active)return;const {key}=active,run=db.runs[key],items=runItems(run),current=items[active.cursor],next=items[cursor];if(!next)return;
    run.cursor=cursor;save();
    if(current.section==='listening' && next.section==='listening' && current.group.id===next.group.id){
      active.cursor=cursor;history.replaceState(null,'',`#test/${key}/${cursor}`);main.querySelectorAll('[data-qnav]').forEach(b=>{const same=Number(b.dataset.qnav)===cursor;b.classList.toggle('current',same);if(same)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});document.getElementById(`q-${next.id}`)?.scrollIntoView({behavior:'smooth',block:'center'});return;
    }
    navigate(`#test/${key}/${cursor}`);
  }
  function chooseAnswer(id,answer){
    if(!active)return;const run=db.runs[active.key];if(run.submitted||!run.itemIds.includes(id)||!Number.isInteger(answer)||answer<0||answer>=index.get(id).options.length)return;
    run.answers[id]=answer;run.updated=Date.now();save();
    const card=document.getElementById(`q-${id}`);
    card.querySelectorAll('[data-answer]').forEach(b=>{const chosen=Number(b.dataset.option)===answer;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));});
    const n=run.itemIds.indexOf(id);main.querySelector(`[data-qnav="${n}"]`)?.classList.add('answered');
    document.querySelector('#answered-count').textContent=`${answered(run)} / ${run.itemIds.length}문항 응답`;document.querySelector('#progress-bar').style.width=`${answered(run)/run.itemIds.length*100}%`;
  }
  function toggleFlag(id){if(!active)return;const run=db.runs[active.key];run.flags[id]=!run.flags[id];save();const button=main.querySelector(`[data-flag="${id}"]`);button.classList.toggle('flagged',run.flags[id]);button.setAttribute('aria-pressed',String(run.flags[id]));button.textContent=run.flags[id]?'★ 다시 볼 문제':'☆ 다시 보기';main.querySelector(`[data-qnav="${run.itemIds.indexOf(id)}"]`)?.classList.toggle('flagged',run.flags[id]);}
  function confirmSubmit(){if(!active)return;const key=active.key,run=db.runs[key];const missing=run.itemIds.length-answered(run);modal('답안을 제출할까요?',missing?`${missing}문항이 아직 미응답입니다. 미응답은 오답으로 처리되며, 제출 후 정답·해설을 볼 수 있습니다.`:'제출 후 점수와 모든 문제의 정답·해설을 확인할 수 있습니다.','제출하고 채점',()=>submitRun(key));}
  function submitRun(key){
    const run=db.runs[key];if(!run||run.submitted)return;
    run.submitted=true;run.completedAt=Date.now();run.updated=Date.now();
    for(const id of run.itemIds)db.mastery[id]={correct:run.answers[id]===index.get(id).answer,answer:run.answers[id]??-1,time:run.completedAt};
    db.history.push({setId:run.setId,mode:run.mode,score:score(run),total:run.itemIds.length,date:run.completedAt});db.history=db.history.slice(-500);save();navigate(`#result/${key}`);
  }
  function renderResult(key){
    const run=db.runs[key];if(!run?.submitted){renderHome();return;}
    const items=runItems(run),correct=score(run),pct=Math.round(correct/items.length*100),wrong=items.filter(q=>run.answers[q.id]!==q.answer);
    main.innerHTML=pageTop('YOUR PRACTICE, REVIEWED',`${esc(run.mode==='wrong'?'오답 연습':setLabel(run.setId))}를 마쳤어요.`,`${esc(modeLabel(run.mode))} · 제출한 답안을 바탕으로 채점했어요.`,`${fmt(run.elapsed)} 학습`)+
      `<section class="score-hero"><div class="score-ring" style="--score:${pct}"><div class="score-inner"><b>${pct}<span style="font-size:15px">%</span></b><small>정답률</small></div></div><div><h2>${correct}문항 정답 <span style="font-size:14px;color:#879776">/ ${items.length}</span></h2><p>${pct>=90?'잘 이해하고 있어요. 헷갈렸던 표현을 한 번 더 확인해 보세요.':pct>=65?'차근차근 잘 쌓이고 있어요. 오답의 근거를 확인하며 마무리해요.':'틀린 문제부터 다시 살펴봐요. 지문과 음원에 정답의 근거가 있어요.'}</p><div class="score-breakdown">${['reading','listening'].map(s=>{const qs=items.filter(q=>q.section===s);return qs.length?`<span>${s==='reading'?'Reading':'Listening'} ${qs.filter(q=>run.answers[q.id]===q.answer).length} / ${qs.length}</span>`:'';}).join('')}<span>미응답 ${items.length-answered(run)}</span></div></div></section><div class="action-row"><button class="btn" id="review-all">전체 해설 보기 →</button><button class="btn outline" id="review-wrong" ${wrong.length?'':'disabled'}>오답 ${wrong.length}문항 다시 풀기</button><button class="btn outline" id="retry-test">처음부터 다시 풀기</button><button class="btn outline" id="back-home">목록으로</button></div><div class="section-heading"><h2>문항별 결과</h2><div class="filter-tabs"><button class="${!resultOnlyWrong?'active':''}" id="show-all">전체</button><button class="${resultOnlyWrong?'active':''}" id="show-wrong">오답만</button></div></div><div class="review-list">${items.map((q,i)=>({q,i})).filter(({q})=>!resultOnlyWrong||run.answers[q.id]!==q.answer).map(({q,i})=>`<button class="review-row" data-review="${i}"><span class="result-icon ${run.answers[q.id]===q.answer?'':'bad'}">${run.answers[q.id]===q.answer?'✓':'×'}</span><span class="review-title"><small>${i+1}번 · ${esc(q.section==='reading'?`${typeof q.unit==='number'?'UNIT ':''}${q.unit}`:q.group.label||`PART ${q.group.part}`)}</small><br>${esc(q.question)}</span><span>${run.answers[q.id]===undefined?'—':letter(run.answers[q.id])} → ${letter(q.answer)} &nbsp; ↗</span></button>`).join('')||'<div class="empty"><h2>모든 문제를 맞혔어요.</h2></div>'}</div><div class="notice">${esc(C.scoreNotice||'점수는 이 연습의 정답률이며 TOEIC 환산 점수가 아닙니다. 오답과 미응답은 오답 노트에 저장됩니다.')}</div>`;
    document.querySelector('#review-all').onclick=()=>navigate(`#test/${key}/0`);
    document.querySelector('#review-wrong').onclick=()=>startWrong(wrong.map(q=>q.id));
    document.querySelector('#retry-test').onclick=()=>modal('새 답안으로 다시 풀까요?','이 회차의 답안과 표시가 초기화됩니다. 문항별 최근 학습 기록은 다음 제출 시 갱신됩니다.','다시 시작',()=>run.mode==='wrong'?startWrong(run.itemIds):startSet(run.setId,run.mode,true));
    document.querySelector('#back-home').onclick=()=>navigate('#home');
    document.querySelector('#show-all').onclick=()=>{resultOnlyWrong=false;renderResult(key);};
    document.querySelector('#show-wrong').onclick=()=>{resultOnlyWrong=true;renderResult(key);};
    main.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>navigate(`#test/${key}/${b.dataset.review}`));
  }
  function renderWrong(){
    const ids=wrongIds().sort((a,b)=>db.mastery[b].time-db.mastery[a].time);
    main.innerHTML=pageTop('TURN MISTAKES INTO PROGRESS','오답에서 한 걸음 더.','최근 제출 답안에서 틀리거나 답하지 않은 문제를 모았어요.',`${ids.length} QUESTIONS`)+(ids.length?`<div class="wrong-controls"><button class="btn" id="wrong-all">전체 ${ids.length}문항 다시 풀기 →</button><button class="btn outline" id="wrong-reading">리딩 오답</button><button class="btn outline" id="wrong-listening">리스닝 오답</button></div><div class="notice" style="margin:0 0 22px">다시 풀고 정답을 제출하면 이 목록에서 자동으로 빠져요. 같은 문항은 가장 최근 제출 기록으로 판단합니다.</div>${ids.map(id=>{const q=index.get(id);return `<article class="wrong-item"><p class="meta">${esc(setLabel(q.setId))} · ${esc(q.section==='reading'?`READING / ${typeof q.unit==='number'?'UNIT ':''}${q.unit}`:`LISTENING / ${q.group.label||`PART ${q.group.part}`}`)} · ${q.number}번</p><h3>${q.section==='listening'&&q.group.part===2?'질의응답 · 음원을 듣고 다시 답해 보세요.':esc(q.question)}</h3><div class="action-row"><button class="btn outline small" data-wrong-one="${esc(id)}">이 문제 다시 풀기 →</button><button class="btn outline small" data-wrong-solution="${esc(id)}">이전 해설 보기</button></div></article>`;}).join('')}`:`<section class="empty"><div class="empty-icon">✓</div><h2>아직 오답이 없어요.</h2><p>모의고사를 제출하면 오답이 여기에 모입니다.<br>맞힌 문제는 다음 연습을 위한 자신감으로 남겨요.</p><a href="#home" class="btn">모의고사 풀러 가기 →</a></section>`);
    document.querySelector('#wrong-all')?.addEventListener('click',()=>startWrong(ids));
    document.querySelector('#wrong-reading')?.addEventListener('click',()=>startWrong(ids.filter(id=>index.get(id).section==='reading')));
    document.querySelector('#wrong-listening')?.addEventListener('click',()=>startWrong(ids.filter(id=>index.get(id).section==='listening')));
    main.querySelectorAll('[data-wrong-one]').forEach(b=>b.onclick=()=>startWrong([b.dataset.wrongOne]));
    main.querySelectorAll('[data-wrong-solution]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.wrongSolution,entry=Object.entries(db.runs).filter(([,r])=>r.submitted&&r.itemIds.includes(id)).sort((a,b)=>b[1].completedAt-a[1].completedAt)[0];
      if(entry)navigate(`#test/${entry[0]}/${entry[1].itemIds.indexOf(id)}`);else toast('이 문제를 다시 풀고 제출하면 해설을 볼 수 있어요.');
    });
  }
  function renderSpeaking(){
    if(!hasSpeaking){main.innerHTML=pageTop('SPEAKING','스피킹 안내','이 교수님의 제공 자료에는 스피킹 시험 질문이 없어 별도 연습을 등록하지 않았어요.');return;}
    main.innerHTML=pageTop('SPEAK WITH A LITTLE MORE CONFIDENCE',esc(C.speaking.title),esc(C.speaking.subtitle),esc(C.speaking.badge))+`<div class="speaking-info"><strong>실제 시험 안내</strong> &nbsp; ${esc(C.speaking.instructions)}</div><div class="section-heading"><h2>준비한 답변 ${D.speaking.models.length}개 <span>실제 문항 번호 기준</span></h2></div><div class="speaking-grid">${D.speaking.models.map(s=>`<article class="speaking-card"><span class="level ${s.unit===7?'medium':''}">UNIT ${s.unit} · TOPIC ${String(s.number).padStart(2,'0')}</span><h3>${esc(s.title)}</h3><p>${esc(s.summary)}</p><div class="speech-keywords">${s.keywords.slice(0,3).map(k=>`<span>${esc(k)}</span>`).join('')}</div><button class="btn outline" data-speech="${s.number}">답변 연습하기 <span>→</span></button></article>`).join('')}</div><div class="section-heading"><h2>공식 질문 전체 ${D.speaking.topics.length}개</h2></div><div class="official-list">${D.speaking.topics.map(t=>`<details><summary>${t.number}. ${esc(t.title)}</summary><p lang="en">${esc(t.question)}</p></details>`).join('')}</div><div class="notice">${esc(C.speaking.rubric)}</div>`;
    main.querySelectorAll('[data-speech]').forEach(b=>b.onclick=()=>navigate(`#speech/${b.dataset.speech}`));
  }
  function renderSpeech(n){
    const s=D.speaking.models.find(x=>x.number===n),topic=D.speaking.topics.find(x=>x.number===n);if(!s){renderSpeaking();return;}
    speechRemaining=SPEECH_SECONDS;speechHide=false;speechKorean=true;
    main.innerHTML=`<button class="back-link" id="back-speaking">← 스피킹 목록</button>${pageTop(`SPEAKING TOPIC ${String(n).padStart(2,'0')}`,esc(s.title),`UNIT ${s.unit} · 약 ${s.answer.split(/\s+/).length}단어 · 말하는 속도에 따라 ${esc(C.speaking.durationLabel)}`)}<section class="speaking-prompt"><p class="panel-label">THE QUESTION</p><p lang="en">${esc(topic.question)}</p></section><div class="speaking-layout"><div><section class="speech-panel"><h2>답변 흐름 먼저 잡기</h2><ol class="outline-list">${s.outline.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="speech-keywords">${s.keywords.map(k=>`<span>${esc(k)}</span>`).join('')}</div></section><section class="speech-panel"><div class="section-heading" style="margin:0 0 16px"><h2 style="margin:0">연습 답변</h2><button class="btn outline small" id="toggle-script">답변 가리기</button></div><p class="speech-script" id="speech-answer" lang="en">${esc(s.answer)}</p><div class="action-row"><button class="btn outline small" id="read-speech">영어로 듣기 ▷</button><button class="btn outline small" id="stop-read">읽기 중지</button><button class="btn outline small" id="toggle-korean">뜻풀이 가리기</button></div><p class="speech-korean" id="speech-korean">${esc(s.translation)}</p></section><section class="speech-panel"><h2>말할 때 기억할 표현</h2><ul class="outline-list">${s.tips.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="source">영어 읽기는 기기의 음성 기능을 사용합니다. 영어 음성이 없으면 작동하지 않을 수 있어요. ${esc(C.speaking.submissionNote)}</p></section></div><aside class="speech-timer-panel"><p class="eyebrow">${esc(C.speaking.timerTitle)}</p><div class="timer-big" id="speech-clock">${fmt(SPEECH_SECONDS)}</div><p id="speech-status">질문을 읽고,<br>준비되면 말하기를 시작해요.</p><button class="btn" id="speech-start">${SPEECH_SECONDS}초 연습 시작</button><button class="btn outline" id="speech-reset">타이머 초기화</button><div class="rubric"><b>스스로 점검해요</b>질문에 직접 답했나요?<br>근거와 예시가 있나요?<br>핵심 단어를 또렷하게 말했나요?<br>문장 사이에 잠깐 쉬었나요?</div></aside></div>`;
    document.querySelector('#back-speaking').onclick=()=>navigate('#speaking');
    document.querySelector('#toggle-script').onclick=e=>{speechHide=!speechHide;document.querySelector('#speech-answer').hidden=speechHide;e.target.textContent=speechHide?'답변 다시 보기':'답변 가리기';};
    document.querySelector('#toggle-korean').onclick=e=>{speechKorean=!speechKorean;document.querySelector('#speech-korean').hidden=!speechKorean;e.target.textContent=speechKorean?'뜻풀이 가리기':'뜻풀이 보기';};
    document.querySelector('#read-speech').onclick=()=>{
      if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){toast('이 브라우저는 영어 읽기를 지원하지 않아요.');return;}
      window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(s.answer);u.lang='en-US';u.rate=.9;const v=speechSynthesis.getVoices().find(v=>v.lang.startsWith('en'));if(v)u.voice=v;u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))toast('영어 음성을 사용할 수 없어요. 기기의 음성 설정을 확인해 주세요.');};speechSynthesis.speak(u);
    };
    document.querySelector('#stop-read').onclick=()=>window.speechSynthesis?.cancel();
    document.querySelector('#speech-start').onclick=()=>{
      if(speechRunning){clearInterval(speechTimer);speechRunning=false;document.querySelector('#speech-start').textContent='계속 연습하기';return;}
      if(speechRemaining===0)speechRemaining=SPEECH_SECONDS;speechRunning=true;document.querySelector('#speech-start').textContent='잠시 멈추기';document.querySelector('#speech-status').textContent='차분하게, 끝 문장까지 말해 보세요.';
      const end=Date.now()+speechRemaining*1000;
      speechTimer=setInterval(()=>{speechRemaining=Math.max(0,Math.ceil((end-Date.now())/1000));document.querySelector('#speech-clock').textContent=fmt(speechRemaining);if(speechRemaining===0){clearInterval(speechTimer);speechRunning=false;document.querySelector('#speech-start').textContent='다시 연습하기';document.querySelector('#speech-status').textContent=`${SPEECH_SECONDS}초가 지났어요. 답변을 마무리해 주세요.`;toast(`${SPEECH_SECONDS}초 연습을 마쳤어요.`);}},200);
    };
    document.querySelector('#speech-reset').onclick=()=>{clearInterval(speechTimer);speechRunning=false;speechRemaining=SPEECH_SECONDS;document.querySelector('#speech-clock').textContent=fmt(SPEECH_SECONDS);document.querySelector('#speech-start').textContent=`${SPEECH_SECONDS}초 연습 시작`;document.querySelector('#speech-status').textContent='준비되면 다시 시작해요.';};
  }
  function renderWriting(){
    if(!hasWriting){main.innerHTML=pageTop('WRITING','자기소개서 연습','이 교수님의 작문 연습 자료는 아직 준비되지 않았어요.');return;}
    const writing=D.writing;
    main.innerHTML=pageTop('WRITE FROM YOUR OWN EXPERIENCE',esc(writing.title),esc(writing.subtitle))+`<div class="notice" style="margin:0 0 24px">${esc(writing.notice)}</div><div class="writing-layout"><div>${writing.sections.map((section,i)=>`<section class="speech-panel writing-section"><p class="panel-label">STEP ${i+1}</p><h2>${esc(section.title)}</h2><p class="writing-prompt">${esc(section.prompt)}</p><ul class="outline-list">${(section.tips||[]).map(tip=>`<li>${esc(tip)}</li>`).join('')}</ul><details class="writing-starters"><summary>시작 표현 보기</summary>${(section.starters||[]).map(line=>`<p lang="en">${esc(line)}</p>`).join('')}</details><label for="writing-${esc(section.id)}">내 경험으로 써 보기</label><textarea id="writing-${esc(section.id)}" data-writing="${esc(section.id)}" lang="en" rows="5" maxlength="20000" placeholder="Write about your own experience…">${esc(db.writing[section.id]||'')}</textarea><small data-writing-count="${esc(section.id)}"></small></section>`).join('')}</div><aside><section class="speech-panel"><h2>스스로 확인해요</h2><ul class="outline-list">${(writing.checklist||[]).map(item=>`<li>${esc(item)}</li>`).join('')}</ul><p class="source">작성한 내용은 현재 교수님의 브라우저 기록에 자동 저장되고 백업에도 포함돼요. 자동 채점은 하지 않아요.</p></section><section class="speech-panel"><h2>새로 작성한 예시</h2><p class="source">가상의 경험으로 구성한 연습 예시예요. 자신의 실제 경험에 맞춰 써 보세요.</p>${writing.models.map(model=>`<details class="writing-model"><summary>${esc(model.title)}</summary><p class="writing-prompt">${esc(model.description)}</p>${model.sections.map(section=>`<h3>${esc(writing.sections.find(item=>item.id===section.sectionId)?.title||'')}</h3><p lang="en">${esc(section.en)}</p><p class="speech-korean">${esc(section.ko)}</p>`).join('')}</details>`).join('')}</section></aside></div><p class="source">${esc(writing.source)}</p>`;
    const updateCount=(input,saved=false)=>{const count=input.value.trim()?input.value.trim().split(/\s+/).length:0;main.querySelector(`[data-writing-count="${input.dataset.writing}"]`).textContent=`${count} words${saved?' · 저장됨':''}`;};
    main.querySelectorAll('[data-writing]').forEach(input=>{updateCount(input);input.oninput=()=>{db.writing[input.dataset.writing]=input.value;save();updateCount(input,storageOK);};});
  }
  function renderGuide(){
    main.innerHTML=pageTop('YOUR GUIDE TO THIS PRACTICE','필요한 것만, 한눈에.',`${esc(professor.name)} 교수님 수업의 시험 범위와 학습 안내.`)+`<div class="guide-grid">${C.guideHtml}<section class="guide-card"><h2>교수님별 학습 기록</h2><ul><li>현재 교수님 코드: <strong>${esc(professor.code)}</strong>. 이 화면에서는 해당 교수님 자료만 사용합니다.</li><li>문제·음원·스피킹·답안·오답 기록을 교수님별로 분리합니다. 자료를 공유할 수 있는 예외는 지정한 교재 PDF 하나입니다.</li><li>선택한 답안과 풀이 시간은 이 브라우저에 저장됩니다. 코드 변경 후 돌아와도 현재 교수님의 기록은 유지됩니다.</li><li>기록을 옮길 때는 내보내기·가져오기를 사용하세요. 다른 교수님의 기록 파일은 가져올 수 없습니다.</li><li>리딩만·듣기만·전체 시험은 별도로 저장됩니다. 오답 노트는 문항별 최근 제출 기록을 사용합니다.</li>${hasMemory?'<li>본문 암기는 문장·단락 단위로 원문과 해석을 봅니다. 멈춘 위치와 외운 문장도 자동 저장되며 기록 내보내기에 함께 포함됩니다.</li>':''}</ul><div class="action-row"><button class="btn outline small" id="guide-backup">기록 내보내기</button><button class="btn outline small" id="guide-restore">기록 가져오기</button></div></section><section class="guide-card"><h2>다른 기기에서 이어 풀기</h2><p>같은 교수님 코드를 입력해도 기기나 브라우저가 달라지면 기록은 자동으로 연결되지 않습니다. 옮기기 전에 기록을 내보내고 새 화면에서 가져오세요. 브라우저 데이터를 지우거나 시크릿 모드를 사용하면 저장 기록이 사라질 수 있습니다.</p>${professor.code==='yjy'?'<p>YJY 코드가 생기기 전의 기존 백업은 YJY에서 계속 가져올 수 있습니다.</p>':''}</section><section class="guide-card"><h2>HTML로 바로 실행</h2><ol><li>압축파일을 전체 해제합니다.</li><li><code>index.html</code>을 열고 교수님 코드를 입력합니다.</li><li><code>professors</code>와 <code>assets</code> 폴더, HTML·JS·CSS 파일을 함께 유지합니다.</li></ol><p>문제·채점·듣기는 오프라인에서 작동합니다. 스피킹 읽기는 기기의 영어 음성 지원 여부에 따라 달라집니다.</p></section><section class="guide-card"><h2>GitHub Pages에서 사용</h2><p>전체 폴더 구조를 유지해 업로드하면 같은 화면을 사용할 수 있습니다. 학습 기록은 서버에 전송되지 않고 각 브라우저에 저장됩니다. 배포와 업데이트 방법은 README.md를 참고해 주세요.</p></section></div>`;
    document.querySelector('#guide-backup').onclick=exportData;document.querySelector('#guide-restore').onclick=()=>document.querySelector('#restore-file').click();
  }
  function exportData(){flushActive();const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`english-progress-${professor.code}-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('학습 기록을 파일로 내보냈어요.');}
  document.querySelector('#backup').onclick=exportData;
  document.querySelector('#restore-file').onchange=async e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>5e6){toast('기록 파일이 너무 큽니다.');return;}
    try{const restored=sanitizeDB(JSON.parse(await file.text()));modal('학습 기록을 가져올까요?',`${professor.name} 교수님의 현재 학습 기록이 가져온 파일의 기록으로 교체됩니다. 필요한 기록은 먼저 내보내 주세요.`,'가져오기',()=>{active=null;db=restored;save();route();toast('학습 기록을 가져왔어요.');});}catch(error){toast(`가져올 수 없어요. ${error.message}`);}
  };
  let lastTick=Date.now();
  setInterval(()=>{const now=Date.now(),delta=Math.min(3,(now-lastTick)/1000);lastTick=now;if(!active||document.hidden)return;const run=db.runs[active.key];if(!run||run.submitted)return;run.elapsed+=delta;const el=document.querySelector('#elapsed');if(el)el.textContent=fmt(run.elapsed);if(Math.floor(run.elapsed)%5===0)save();},1000);
  document.addEventListener('visibilitychange',()=>{lastTick=Date.now();if(document.hidden)flushActive();});
  window.addEventListener('pagehide',flushActive);
  window.addEventListener('hashchange',route);
  window.addEventListener('keydown',e=>{if(!active||document.querySelector('#modal').open||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.altKey||e.metaKey)return;if(['1','2','3','4'].includes(e.key)){const q=runItems(db.runs[active.key])[active.cursor];chooseAnswer(q.id,Number(e.key)-1);}});
  route();
  if(migratedLegacy && storageOK) toast('기존 학습 기록을 YJY에 이어서 불러왔어요.');
})();
