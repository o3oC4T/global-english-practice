(() => {
  'use strict';
  const code = (new URLSearchParams(location.search).get('professor') || '').trim().toLowerCase();
  const courses = window.PROFESSOR_COURSES;
  const main = document.getElementById('main');
  const release = document.querySelector('meta[name="app-release"]')?.content;
  // The HTML selects the release, including for lazy scripts and local file URLs.
  window.practiceAsset = path => {
    const url = new URL(path, location.href);
    if (release) url.searchParams.set('v', release);
    return url.href;
  };
  function fail() {
    delete window.EXAM_DATA;
    delete window.ACTIVE_PROFESSOR;
    main.innerHTML = '<div class="storage-warning">이 교수님의 학습 자료를 불러오지 못했어요. 새로고침하거나 코드를 다시 입력해 주세요.</div><a class="btn outline" href="index.html">코드 입력으로 돌아가기</a>';
  }
  if (!courses || !Object.hasOwn(courses, code)) {
    location.replace(new URL('index.html', location.href).href);
    return;
  }
  const course = courses[code];
  if (course.code !== code || course.assetRoot !== `professors/${code}/` || course.dataPath !== `${course.assetRoot}data.js`) { fail(); return; }
  delete window.EXAM_DATA;
  const dataScript = document.createElement('script');
  dataScript.src = window.practiceAsset(course.dataPath);
  dataScript.onerror = fail;
  dataScript.onload = () => {
    const data = window.EXAM_DATA;
    const ownAudioRoot = new URL(`${course.assetRoot}audio/`, location.href).href;
    if (!data || data.professorCode !== code || data.course?.code !== code || !Array.isArray(data.reading?.sets) || !Array.isArray(data.reading?.passages) || !Array.isArray(data.listening?.sets) || !Array.isArray(data.speaking?.models) || !Array.isArray(data.speaking?.topics) || !data.audio) { fail(); return; }
    try {
      if (Object.values(data.audio).some(clip => typeof clip.file !== 'string' || !new URL(clip.file, location.href).href.startsWith(ownAudioRoot))) { fail(); return; }
      if (data.listening.sets.some(set => set.groups.some(group => !Object.hasOwn(data.audio, group.clipId)))) { fail(); return; }
    } catch { fail(); return; }
    window.ACTIVE_PROFESSOR = course;
    document.title = `${course.name} · Global English 모의고사`;
    document.getElementById('professor-label').textContent = course.name;
    document.getElementById('course-scope').textContent = course.scope;
    document.getElementById('semester-label').textContent = course.semester;
    document.getElementById('set-count').textContent = data.reading.sets.length;
    const appScript = document.createElement('script');
    appScript.src = window.practiceAsset('app.js');
    appScript.onerror = fail;
    document.body.appendChild(appScript);
  };
  document.body.appendChild(dataScript);
})();
