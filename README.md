# Global English · 교수님별 모의고사

[웹에서 열기](https://o3oc4t.github.io/global-english-practice/) · [GitHub 저장소](https://github.com/o3oC4T/global-english-practice)

첫 화면의 **Enter code?**에 교수님 코드를 입력하면 해당 교수님의 모의고사로 이동합니다. 현재 등록된 코드는 **yjy**입니다. 대소문자와 앞뒤 공백은 무시합니다. 등록되지 않은 코드에는 다른 교수님 자료를 대신 보여 주지 않습니다.

코드는 교수님 자료를 선택하는 기능입니다. 공개 사이트의 접근 인증이나 개인 계정 기능은 아닙니다.

## YJY 구성

- 10회 × Reading 30 + Listening 30문항, 한국어 해설
- 제공된 TEST 5·6 음원을 분할한 MP3 92개
- 실제 말하기 질문 10개, 예시 답변 6개, 뜻풀이·60초 타이머
- 본문 암기: UNIT 6·7 원문 4개, 50단락·167문장과 한국어 학습용 해석
- 자동 저장, 이어 풀기, 오답 노트, 기록 내보내기·가져오기

600문항 자리 중 570개가 서로 다른 문항입니다. 듣기 Part 2는 서로 다른 원문 60개와 복습 30개이며, Part 3·4는 원본 대화·담화에 대해 새로 작성한 210문항입니다. 반복 음원은 표시됩니다. 실제 시험의 세부 유형 비율과 제한 시간은 제공 안내에 없어 연습용으로 구성했습니다.

## 본문 암기

`yjy`로 들어온 뒤 **본문 암기**를 선택합니다. 모의고사용으로 줄인 지문이 아닌, 제공된 HWP의 원문 순서를 따라 학습합니다.

| 본문 | 단락 | 문장 |
| --- | ---: | ---: |
| Is Joy the Same in Every Language? | 26 | 66 |
| Our Words Are Our Reality | 7 | 22 |
| The Shape of Africa | 14 | 70 |
| UNIT 7 추가 인구 지문 | 3 | 9 |

- 한 문장 / 한 단락을 전환하고 영어와 해석을 함께 봅니다.
- 영어 또는 해석을 가리고 떠올린 뒤 확인합니다. 다음으로 넘기면 다시 가려집니다.
- **전체 흐름**에서 단락별 핵심 내용을 보고 원하는 단락으로 이동합니다.
- **외웠어요** 표시와 마지막 위치가 저장되며, 기록 내보내기·가져오기에도 포함됩니다.
- 방향키로 이전·다음, Space로 가린 내용을 확인합니다. 입력창에서는 기본 키 동작을 유지하며, 버튼에 초점이 있으면 Space는 그 버튼을 실행합니다.
- 영어 듣기는 기기의 영어 음성을 사용합니다.

한국어 해석과 흐름 단서는 새로 작성한 **학습용 번역**입니다. 원문 오탈자 처리와 시점 표현은 각 본문의 **원문 확인 메모**에서 확인할 수 있습니다. UNIT 7 추가 지문의 `8 million`은 원문 그대로 보존하고 오기 가능성을 안내합니다.

## 교수님별 자료 분리

문항·지문·해설·음원·스크립트·스피킹 답변·시험 안내·출처 목록은 **교수님 전용**입니다. 현재 결과물 전체는 YJY에 속합니다. 같은 교재 단원을 다루어도 YJY 자료에서 만든 문항을 다른 교수님 버전으로 복사하지 않습니다.

공유 가능한 원본은 아래 **PDF 한 개뿐**입니다.

```text
Pathways_4__Reading_and_Writing_Skills___PDF___Robot___Robotics.pdf
SHA-256: 38ab66883b70234cdf24f8a5c4e1a0503baf923199ad0a7959f8c215234f98c6
```

`shared/textbook.json`에 이름과 해시를 기록했습니다. PDF 원본은 로컬 자료에 있으며 사이트에 복사하거나 업로드하지 않았습니다. 교재 정답 PDF, 교재 MP3, ZIP 내부 자료는 공유 예외가 아닙니다. 기존 자료의 소속은 `professors/yjy/sources.json`에 있습니다.

```text
index.html                   # 교수님 코드 입력
entry.css / entry.js
courses.js                   # 준비 완료된 교수님 코드 목록
study.html                   # 공통 학습 화면
professor-loader.js          # 선택한 교수님 데이터만 로드
app.js / styles.css          # 공통 UI와 채점 기능
memorize.js / memorize.css   # 공통 본문 암기 화면 (메뉴 진입 시 로드)
assets/favicon.svg
professors/
  yjy/
    data.js                  # 문제·해설·스피킹·YJY 시험 안내
    memory.js                # YJY 원문·문장별 번역·단락 흐름
    audio/                   # YJY 전용 MP3 92개
    sources.json             # 원본 자료 소속
shared/
  textbook.json              # 공유 허용 PDF 한 개의 출처 기록
```

화면 코드·CSS·아이콘은 강의 자료가 아니므로 공통으로 사용합니다. 새 교수님은 그 교수님의 실제 자료와 코드를 받은 뒤 별도 폴더로 추가합니다. 자료가 없는 교수님을 YJY 복사본으로 등록하지 않습니다. 유지 규칙은 `AGENTS.md`에 있습니다.

## 기록 유지

교수님별로 별도 저장합니다. YJY 키는 `global-english-practice:yjy:v1`이며 내보낸 JSON에도 `professorCode`가 들어 있습니다. 다른 교수님 코드의 백업은 문항 ID가 같아도 가져오기를 거부합니다.

기존 `global-english-practice-v1` 기록은 새 YJY 기록이 없을 때만 불러옵니다. 원래 기록은 삭제하지 않으며 이미 새 기록이 있으면 덮어쓰지 않습니다. 교수님 코드 없는 구형 백업도 YJY에서만 가져올 수 있습니다.

본문 암기 기록은 같은 교수님 키의 `memory` 필드에 추가됩니다. 기존 답안·오답·성적과 구분하며 구형 기록에 해당 필드가 없어도 정상적으로 불러옵니다. 본문 파일은 `courses.js`의 해당 교수님 `memorizationPath`가 있을 때만 읽으며, 다른 교수님 경로나 데이터 소속이 다르면 불러오지 않습니다. 본문 자료가 없는 교수님에게 YJY 자료를 대신 보여 주지 않습니다.

저장은 기기·브라우저별입니다. 이동 전 기록을 내보내고 새 기기에서 같은 교수님 코드를 선택한 뒤 가져오세요. GitHub Pages의 기록은 같은 사이트에서 이어집니다. 로컬 `file://` 저장 방식은 브라우저에 따라 다를 수 있으므로 파일 위치를 옮길 때는 백업을 사용하세요.

## 로컬 실행

ZIP을 전체 해제한 뒤 `index.html`을 Chrome 또는 Edge로 열고 `yjy`를 입력합니다. 폴더 구조를 유지하면 서버나 설치 없이 문제 풀이·듣기·채점이 작동합니다. 영어 읽기는 기기의 음성 지원 여부에 따라 달라집니다.

## GitHub Pages 업데이트

현재 저장소는 `main` 브랜치 최상위에서 배포합니다. 앱 폴더에서 변경을 커밋하고 푸시하면 됩니다.

```bash
git add .
git commit -m "Update professor practice materials"
git push
```

다른 저장소로 옮길 때도 폴더 구조를 유지하고 `index.html`을 최상위에 둡니다. Settings → Pages에서 **Deploy from a branch**, 실제 기본 브랜치, **/(root)**를 선택합니다. [GitHub Pages 설정 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

원본 HWP·PPTX·ZIP, 작업용 `.exam_work`, 개인 학습 기록은 업로드할 필요가 없습니다.
