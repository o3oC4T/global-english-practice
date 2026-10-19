# Global English II 모의고사

`index.html`을 더블클릭하면 바로 실행됩니다. 설치나 서버 없이 노트북에서 문제를 풀 수 있고, 같은 파일을 GitHub Pages에도 올릴 수 있습니다.

- [웹에서 모의고사 풀기](https://o3oc4t.github.io/global-english-practice/)
- [GitHub 저장소](https://github.com/o3oC4T/global-english-practice)

## 들어 있는 내용

- 모의고사 10회: 회차당 Reading 30 + Listening 30문항, 총 600문항 자리
- Reading: UNIT 6–7 지문 발췌, 서로 다른 300문항, 한국어 해설
- Listening: 제공된 TEST 5·6 실제 음원, Part 2·3·4, 정답·해설·영어 스크립트
- Speaking: 공식 질문 10개, 그중 6개의 1분 내외 답변·뜻풀이·답변 흐름·60초 타이머
- 자동 저장, 이어 풀기, 다시 볼 문제 표시, 오답 노트, 기록 내보내기·가져오기

듣기는 제공 자료의 음원을 여러 회차에서 사용합니다. Part 2는 서로 다른 원문 60개와 복습 30개, Part 3·4는 서로 다른 새 문항 210개입니다. 전체 600문항 자리 중 570개가 서로 다른 문항이며, 반복 음원은 화면에 표시됩니다. Part 2 선택지 순서는 원본 음원과 같습니다. Part 3·4 클립에는 대화·담화 본문만 들어 있고, 새 질문과 보기는 화면에서 읽습니다.

실제 시험의 세부 유형 비율과 제한 시간은 제공 안내에 없으므로 연습용으로 구성했습니다. 점수는 모의고사 정답률이며 TOEIC 환산 점수가 아닙니다. UNIT 7의 수치·전망은 교재에 인용된 2005년 글의 내용입니다.

## 노트북에서 실행

1. ZIP으로 받았다면 먼저 **전체 압축을 풉니다**.
2. 폴더 안의 **index.html**을 Chrome 또는 Edge로 엽니다.
3. `audio`, `assets`, `data.js`, `app.js`, `styles.css`를 함께 유지합니다.

문제 풀이·듣기·채점은 오프라인에서 작동합니다. 스피킹의 ‘영어로 듣기’는 브라우저 및 운영체제 음성 기능을 사용하므로, 설치된 영어 음성에 따라 지원 여부가 달라지거나 인터넷이 필요할 수 있습니다.

기록은 브라우저의 localStorage에 저장됩니다. 다른 브라우저, 기기, 파일 위치 또는 GitHub Pages 주소에서는 별도 기록으로 취급될 수 있습니다. 옮기기 전에 **학습 안내 → 기록 내보내기**, 새 화면에서 **기록 가져오기**를 사용하세요. 가져오기는 해당 브라우저의 현재 기록을 교체합니다.

## GitHub Pages 배포 및 업데이트

이 저장소는 `main` 브랜치의 최상위 폴더를 GitHub Pages로 배포합니다. 수정한 파일을 `main`에 커밋하고 푸시하면 사이트가 갱신됩니다. 기존 저장소에 변경을 반영할 때는 아래처럼 실행합니다.

```bash
git add .
git commit -m "Update practice app"
git push
```

아래 내용은 다른 저장소에 새로 올릴 때의 안내입니다.

이 폴더가 곧 배포할 사이트입니다. 상위 폴더의 원본 교재나 `.exam_work`는 필요하지 않습니다. 별도 빌드, npm 설치, 서버 설정, 환경 변수 또는 API 키도 없습니다.

폴더 구성:

```text
index.html
styles.css
app.js
data.js
assets/
  favicon.svg
audio/
  T5-11.mp3
  ...
.nojekyll
.gitignore
README.md
```

### 웹 화면으로 업로드

1. GitHub에서 빈 저장소를 만듭니다. 예: `global-english-practice`.
2. 이 폴더의 **내용물**을 저장소 최상위에 업로드합니다. `index.html`이 최상위에 보여야 합니다.
3. 오디오 파일이 많으므로 먼저 HTML·JS·CSS·README·assets를 올리고, `audio` 폴더는 별도로 올리면 편합니다. 한 번에 100개보다 많은 파일을 올리지 마세요. 필요하면 `audio` 폴더를 만든 뒤 파일을 두 번으로 나누어 올립니다. [GitHub 파일 업로드 안내](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
4. 저장소 **Settings → Pages → Build and deployment**를 엽니다.
5. Source를 **Deploy from a branch**, Branch를 **main**, 폴더를 **/(root)**로 고르고 Save를 누릅니다. main이 없다면 파일을 먼저 커밋한 뒤 실제 기본 브랜치를 선택합니다.
6. 배포가 완료되면 GitHub가 표시하는 Pages 주소로 접속합니다. [GitHub Pages 게시 소스 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

GitHub Pages 지원 범위는 계정 요금제와 저장소 공개 범위에 따라 달라집니다. 이 모의고사의 HTML·문항·음원은 게시한 사이트의 방문자가 접근할 수 있습니다. 저장소를 비공개로 만들었다고 Pages의 접속도 비공개가 되는 것은 아닙니다. 위 공식 설정 안내에서 현재 조건을 확인할 수 있습니다.

### Git으로 업로드

빈 원격 저장소를 만든 뒤, 이 폴더에서 실행합니다. `YOUR_ACCOUNT`와 저장소 이름을 본인 것으로 바꾸세요. 이미 Git 저장소로 사용하는 폴더라면 새로 초기화하지 않고 해당 저장소 방식으로 커밋합니다.

```bash
git init -b main
git add .
git commit -m "Add Global English practice app"
git remote add origin https://github.com/YOUR_ACCOUNT/global-english-practice.git
git push -u origin main
```

업로드 후 Pages 설정은 위와 같습니다. 모든 자산에 상대 경로를 사용하므로 저장소 이름을 바꿔도 파일 경로를 수정할 필요가 없습니다. `.nojekyll`을 포함했습니다.

## 자료 기준

Reading은 제공된 UNIT 6–7 본문과 어휘·문법·질문 자료를 기준으로 작성했습니다. Listening은 `중간시험 자료.zip`의 TEST 5·6 문제지와 완성 스크립트, `TOEIC Master2_AT5.mp3`, `TOEIC Master2_AT6.mp3`를 사용했습니다. Speaking은 `2026-2 고려대 GE II 중간 시험(말하기).hwp`를 따릅니다. 구체적인 반영 범위는 앱의 학습 안내에 있습니다.

이 폴더에는 원본 자료를 수정하지 않고 만든 연습 앱과 필요한 음원만 들어 있습니다. 스피킹 시험 영상은 별도로 녹화하여 제출해야 합니다.
