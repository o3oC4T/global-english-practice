/* Shared practice UI. All learning content is loaded from the selected professor. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const assetURL = window.practiceAsset || (path => path);
  if (!document.querySelector('link[data-memory-style]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = assetURL('memorize.css'); link.dataset.memoryStyle = '';
    document.head.appendChild(link);
  }

  window.createMemoryPractice = ({main, professor, getProgress, saveProgress, toast}) => {
    let dataPromise, passages, current = null, anchor = '', revealed = false, revision = 0;
    let outlineOpen = window.matchMedia('(min-width: 1050px)').matches;
    const stopAudio = () => window.speechSynthesis?.cancel();
    const flat = passage => passage.paragraphs.flatMap((p, paragraphIndex) => p.sentences.map(s => ({...s, paragraphIndex})));
    const progressFor = passage => {
      const sentences = flat(passage), ids = new Set(sentences.map(s => s.id));
      const saved = getProgress().passages[passage.id];
      return {sentenceId: ids.has(saved?.sentenceId) ? saved.sentenceId : sentences[0].id,
        known: (saved?.known || []).filter(id => ids.has(id)), updated: saved?.updated || 0};
    };
    function persist(changes = {}) {
      const previous = getProgress();
      const record = {...progressFor(current), sentenceId: anchor, updated: Date.now(), ...changes};
      saveProgress({...previous, passages: {...previous.passages, [current.id]: record}});
    }
    function validate(data) {
      if (data?.version !== 1 || data.professorCode !== professor.code || data.course?.code !== professor.code || !Array.isArray(data.passages) || !data.passages.length) throw new Error('owner');
      const seen = new Set();
      for (const passage of data.passages) {
        if (!validId(passage.id) || seen.has(passage.id) || !text(passage.title) || !text(passage.source) || !Array.isArray(passage.paragraphs) || !passage.paragraphs.length) throw new Error('passage');
        seen.add(passage.id);
        const paragraphs = new Set(), sentences = new Set();
        for (const p of passage.paragraphs) {
          if (!validId(p.id) || paragraphs.has(p.id) || !text(p.flow) || !Array.isArray(p.sentences) || !p.sentences.length) throw new Error('paragraph');
          paragraphs.add(p.id);
          for (const s of p.sentences) {
            if (!validId(s.id) || sentences.has(s.id) || !text(s.en) || !text(s.ko)) throw new Error('sentence');
            sentences.add(s.id);
          }
        }
      }
      return data.passages;
    }
    function loadData() {
      if (!dataPromise) dataPromise = new Promise((resolve, reject) => {
        if (professor.memorizationPath !== `professors/${professor.code}/memory.js`) { reject(new Error('path')); return; }
        delete window.MEMORY_DATA;
        const script = document.createElement('script');
        script.src = assetURL(professor.memorizationPath);
        script.onerror = () => { script.remove(); reject(new Error('network')); };
        script.onload = () => {
          try { const result = validate(window.MEMORY_DATA); delete window.MEMORY_DATA; resolve(result); }
          catch (error) { delete window.MEMORY_DATA; script.remove(); reject(error); }
        };
        document.body.appendChild(script);
      });
      return dataPromise;
    }
    function library() {
      current = null;
      const count = passages.reduce((n, p) => n + flat(p).length, 0);
      main.innerHTML = `<div class="page-top"><div><p class="eyebrow">READ, RECALL, REMEMBER</p><h1>본문의 흐름을 내 것으로.</h1><p class="subtitle">영어를 읽고, 해석으로 이해하고, 가린 채 떠올려 보세요.</p></div><span class="subtle-pill">${passages.length} PASSAGES · ${count} SENTENCES</span></div>
        <div class="memory-intro"><span class="memory-book" aria-hidden="true">Aa</span><div><h2>한 문장부터, 한 단락까지.</h2><p>원문 순서대로 외우고 단락별 흐름을 연결해요.<br>멈춘 위치와 ‘외웠어요’ 표시는 이 브라우저에 자동 저장돼요.</p></div></div>
        <div class="memory-library">${passages.map(p => {
          const saved = progressFor(p), sentences = flat(p), cursor = sentences.findIndex(s => s.id === saved.sentenceId);
          return `<article class="memory-passage-card"><div class="memory-card-meta"><span class="level ${p.unit === 7 ? 'medium' : ''}">UNIT ${esc(p.unit)}</span><span>${esc(p.kind)}</span></div><h2 lang="en">${esc(p.title)}</h2><p class="memory-subtitle">${esc(p.subtitle)}</p><p class="memory-count">${p.paragraphs.length}단락 · ${sentences.length}문장</p><div class="memory-meter"><span style="width:${saved.known.length / sentences.length * 100}%"></span></div><p class="memory-saved">${saved.known.length} / ${sentences.length}문장 암기${saved.updated ? ` · ${cursor + 1}번째 문장에서 이어서` : ''}</p><a class="btn outline" href="#memorize/${esc(p.id)}" data-memory-open="${esc(p.id)}">${saved.updated ? '이어서 암기하기' : '본문 암기 시작'} <span>→</span></a><p class="source">${esc(p.source)} · ${esc(p.translationNote || '학습용 번역')}</p></article>`;
        }).join('')}</div><p class="memory-footnote">${esc(professor.name)} 수업 자료의 원문입니다. 한국어 해석과 흐름 단서는 학습을 돕기 위해 작성했어요. 기록 내보내기에 본문 암기 기록도 함께 포함돼요.</p>`;
    }
    function position() {
      const sentences = flat(current), at = Math.max(0, sentences.findIndex(s => s.id === anchor));
      const paragraphIndex = sentences[at].paragraphIndex, paragraph = current.paragraphs[paragraphIndex];
      const isParagraph = getProgress().mode === 'paragraph';
      return {sentences, at, paragraphIndex, paragraph, isParagraph,
        block: isParagraph ? paragraph.sentences : [sentences[at]],
        cursor: isParagraph ? paragraphIndex : at,
        total: isParagraph ? current.paragraphs.length : sentences.length};
    }
    function paint(focusSelector) {
      const info = position(), state = getProgress(), saved = progressFor(current);
      const known = new Set(saved.known), allKnown = info.block.every(s => known.has(s.id));
      const modeName = info.isParagraph ? '단락' : '문장';
      const enHidden = state.visibility === 'hide-en' && !revealed;
      const koHidden = state.visibility === 'hide-ko' && !revealed;
      const revealLabel = state.visibility === 'hide-en' ? '영어' : '해석';
      main.innerHTML = `<a class="back-link" href="#memorize" id="memory-back">← 본문 목록</a>
        <div class="page-top memory-page-top"><div><p class="eyebrow">UNIT ${esc(current.unit)} · READ & RECALL</p><h1 lang="en">${esc(current.title)}</h1><p class="subtitle">${esc(current.subtitle)}</p></div><span class="subtle-pill">${esc(professor.name)} · ${esc(current.kind)}</span></div>
        ${(current.notes || []).length ? `<details class="memory-notes" ${current.sourceWarning ? 'open' : ''}><summary>원문 확인 메모</summary><ul>${current.notes.map(note => `<li>${esc(note)}</li>`).join('')}</ul></details>` : ''}
        <div class="memory-toolbar"><div class="memory-unit"><span>학습 단위</span><div class="filter-tabs" role="group" aria-label="학습 단위">${[['sentence','한 문장'],['paragraph','한 단락']].map(([value, label]) => `<button data-memory-mode="${value}" class="${state.mode === value ? 'active' : ''}" aria-pressed="${state.mode === value}">${label}</button>`).join('')}</div></div><label class="memory-hide-label" for="memory-visibility">암기 방법 <select id="memory-visibility"><option value="both" ${state.visibility === 'both' ? 'selected' : ''}>영어 + 해석 함께 보기</option><option value="hide-en" ${state.visibility === 'hide-en' ? 'selected' : ''}>영어 가리기</option><option value="hide-ko" ${state.visibility === 'hide-ko' ? 'selected' : ''}>해석 가리기</option></select></label></div>
        <div class="memory-layout"><section class="memory-workspace" aria-label="본문 암기 카드"><div class="memory-status"><span id="memory-position" aria-live="polite">${modeName} ${info.cursor + 1} / ${info.total}</span><span id="memory-known">${known.size} / ${info.sentences.length}문장 암기</span></div><div class="memory-meter"><span style="width:${known.size / info.sentences.length * 100}%"></span></div>
        <div class="memory-flow"><span>${esc(info.paragraph.label || `${info.paragraphIndex + 1}단락`)}</span><p id="memory-flow">${esc(info.paragraph.flow)}</p></div>
        <article class="memory-study-card"><div class="memory-language"><span class="panel-label">ENGLISH</span>${info.paragraph.heading && !enHidden ? `<p class="memory-source-heading" lang="en">${esc(info.paragraph.heading)}</p>` : ''}<div id="memory-en" lang="en" ${enHidden ? 'hidden' : ''}>${enHidden ? '' : esc(info.block.map(s => s.en).join(' '))}</div>${enHidden ? '<p class="memory-covered">해석을 보고 영어를 떠올려 보세요.</p>' : ''}</div><div class="memory-language memory-korean"><span class="panel-label">한국어 해석</span><div id="memory-ko" lang="ko" ${koHidden ? 'hidden' : ''}>${koHidden ? '' : esc(info.block.map(s => s.ko).join(' '))}</div>${koHidden ? '<p class="memory-covered">영어를 읽고 뜻을 떠올려 보세요.</p>' : ''}</div>
        ${state.visibility !== 'both' ? `<div class="memory-reveal-row"><button class="btn outline" id="memory-reveal" aria-expanded="${revealed}" aria-controls="${state.visibility === 'hide-en' ? 'memory-en' : 'memory-ko'}">${revealLabel} ${revealed ? '다시 가리기' : '확인'} <span aria-hidden="true">${revealed ? '−' : '+'}</span></button></div>` : ''}</article>
        <div class="memory-card-actions"><button class="btn ${allKnown ? '' : 'outline'}" id="memory-mark" aria-pressed="${allKnown}">${allKnown ? '✓ 외웠어요' : '외웠어요 표시'}</button><div><button class="btn outline small" id="memory-listen">영어 듣기 ▷</button><button class="btn outline small" id="memory-stop">중지</button></div></div>
        ${known.size === info.sentences.length ? '<div class="memory-complete" role="status">✓ 이 본문을 모두 외웠다고 표시했어요. 가리기 모드로 흐름을 다시 확인해 보세요.</div>' : ''}
        <div class="memory-footer"><button class="btn outline" id="memory-prev" ${info.cursor === 0 ? 'disabled' : ''}>← 이전</button><span>${info.cursor === info.total - 1 ? `마지막 ${modeName}이에요` : '차근차근, 한 걸음씩'}</span><button class="btn" id="memory-next" ${info.cursor === info.total - 1 ? 'disabled' : ''}>다음 →</button></div><p class="memory-shortcut">← → 이전·다음 &nbsp; · &nbsp; Space 가린 내용 확인</p><p class="source">원문: ${esc(current.source)}${current.attribution ? `<br>${esc(current.attribution)}` : ''}<br>${esc(current.translationNote || '학습용 번역')} · 영어 듣기는 기기의 음성 기능을 사용해요.</p></section>
        <aside><details id="memory-outline" class="memory-outline" ${outlineOpen ? 'open' : ''}><summary>전체 흐름 <span>${current.paragraphs.length}단락</span></summary><ol>${current.paragraphs.map((p, i) => `<li><button data-memory-jump="${esc(p.id)}" data-current="${i === info.paragraphIndex}" ${i === info.paragraphIndex ? 'aria-current="step"' : ''}><span class="memory-step">${String(i + 1).padStart(2,'0')}</span><span>${esc(p.flow)}<small>${p.sentences.length}문장${p.sentences.every(s => known.has(s.id)) ? ' · ✓ 암기' : ''}</small></span></button></li>`).join('')}</ol></details></aside></div>`;

      main.querySelectorAll('[data-memory-mode]').forEach(button => button.onclick = () => {
        stopAudio(); revealed = false;
        saveProgress({...getProgress(), mode: button.dataset.memoryMode});
        paint(`[data-memory-mode="${button.dataset.memoryMode}"]`);
      });
      main.querySelector('#memory-visibility').onchange = event => {
        revealed = false; stopAudio(); saveProgress({...getProgress(), visibility: event.target.value}); paint('#memory-visibility');
      };
      main.querySelector('#memory-reveal')?.addEventListener('click', () => { revealed = !revealed; paint('#memory-reveal'); });
      main.querySelector('#memory-prev').onclick = () => move(-1);
      main.querySelector('#memory-next').onclick = () => move(1);
      main.querySelectorAll('[data-memory-jump]').forEach(button => button.onclick = () => {
        anchor = current.paragraphs.find(p => p.id === button.dataset.memoryJump).sentences[0].id;
        revealed = false; stopAudio(); persist(); paint(`[data-memory-jump="${button.dataset.memoryJump}"]`);
        if (window.innerWidth < 1050) main.querySelector('.memory-workspace').scrollIntoView({block:'start'});
      });
      main.querySelector('#memory-mark').onclick = () => {
        info.block.forEach(s => allKnown ? known.delete(s.id) : known.add(s.id));
        persist({known: [...known]}); paint('#memory-mark');
      };
      main.querySelector('#memory-outline').ontoggle = event => { outlineOpen = event.target.open; };
      main.querySelector('#memory-listen').onclick = () => {
        if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { toast('이 브라우저는 영어 읽기를 지원하지 않아요.'); return; }
        stopAudio();
        const utterance = new SpeechSynthesisUtterance(info.block.map(s => s.en).join(' '));
        utterance.lang = 'en-US'; utterance.rate = .85;
        const voice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
        if (voice) utterance.voice = voice;
        utterance.onerror = event => { if (!['interrupted','canceled'].includes(event.error)) toast('기기의 영어 음성을 사용할 수 없어요.'); };
        window.speechSynthesis.speak(utterance);
      };
      main.querySelector('#memory-stop').onclick = stopAudio;
      if (focusSelector) main.querySelector(focusSelector)?.focus({preventScroll:true});
    }
    function move(delta) {
      const info = position(), next = info.cursor + delta;
      if (next < 0 || next >= info.total) return;
      anchor = info.isParagraph ? current.paragraphs[next].sentences[0].id : info.sentences[next].id;
      stopAudio(); revealed = false; persist(); paint(delta > 0 ? '#memory-next' : '#memory-prev');
    }
    const onKey = event => {
      if (!current || !location.hash.startsWith('#memorize/') || document.querySelector('#modal')?.open || event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|TEXTAREA|SELECT|A|SUMMARY)$/.test(event.target.tagName) || event.target.isContentEditable) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
      if (event.code === 'Space' && event.target.tagName !== 'BUTTON' && getProgress().visibility !== 'both') { event.preventDefault(); revealed = !revealed; paint(); }
    };
    window.addEventListener('keydown', onKey);
    return {
      leave() { revision++; current = null; revealed = false; stopAudio(); },
      async render(passageId) {
        const ticket = ++revision;
        try {
          passages = await loadData();
          if (ticket !== revision) return;
          if (!passageId) { library(); return; }
          current = passages.find(p => p.id === passageId);
          if (!current) { library(); toast('찾을 수 없는 본문이에요. 목록에서 다시 골라 주세요.'); return; }
          anchor = progressFor(current).sentenceId; revealed = false; persist(); paint();
        } catch {
          dataPromise = null;
          if (ticket === revision) main.innerHTML = '<div class="storage-warning">이 교수님의 본문 암기 자료를 불러오지 못했어요. 새로고침한 뒤 다시 열어 주세요.</div><a class="btn outline" href="#home">모의고사로 돌아가기</a>';
        }
      }
    };
  };
})();
