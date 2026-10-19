(() => {
  'use strict';

  const form = document.getElementById('code-form');
  const input = document.getElementById('professor-code');
  const error = document.getElementById('code-error');

  function showError(message) {
    error.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }

  input.addEventListener('input', () => {
    error.textContent = '';
    input.setAttribute('aria-invalid', 'false');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const code = input.value.trim().toLowerCase();

    if (!code) {
      showError('교수님 코드를 입력해 주세요.');
      return;
    }

    const courses = window.PROFESSOR_COURSES;
    if (!courses || typeof courses !== 'object') {
      showError('교수님 목록을 불러오지 못했어요. 페이지를 새로고침해 주세요.');
      return;
    }

    if (!Object.hasOwn(courses, code)) {
      showError('등록되지 않은 코드예요. 교수님 코드를 다시 확인해 주세요.');
      return;
    }

    window.location.assign(`study.html?professor=${encodeURIComponent(code)}#home`);
  });
})();
