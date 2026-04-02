# Plan: Maddit Image Editor

**Created:** 2026-03-29
**Status:** Draft
**Level:** Dynamic

---

## 1. Overview

Windows 데스크톱 이미지 편집기. 이미지를 불러와서 크기를 확인/변경하고, 템플릿 기반으로 빠르게 리사이즈하여 저장하는 프로그램.

## 2. Core Requirements

### 2.1 이미지 불러오기
| 방법 | 설명 |
|------|------|
| 파일 찾기 | 파일 탐색기를 통한 이미지 선택 (Open File Dialog) |
| 로컬 파일 드래그 | 탐색기에서 프로그램 영역으로 Drag & Drop |
| 웹 이미지 드래그 | 브라우저에서 이미지를 직접 Drag & Drop |
| 클립보드 붙여넣기 | Ctrl+V로 클립보드 이미지 붙여넣기 |

**지원 포맷:** PNG, JPG/JPEG, GIF, BMP, WebP, TIFF, ICO

### 2.2 이미지 정보 표시
- 파일 용량 (KB/MB 단위 자동 변환)
- 가로(Width) x 세로(Height) 픽셀 단위
- 파일 포맷
- 파일명

### 2.3 이미지 리사이즈
- **비율 고정 모드:** 가로/세로 중 하나를 변경하면 나머지가 자동 계산
- **자유 변경 모드:** 가로/세로를 독립적으로 변경
- 입력 필드에 직접 숫자 입력 가능
- 변경된 크기가 미리보기에 실시간 반영

### 2.4 사이즈 템플릿
- 사전 정의 템플릿: 일반적인 사이즈 (예: 1920x1080, 1280x720, 800x600, 아이콘 크기 등)
- 사용자 정의 템플릿: 이름 + 가로 x 세로로 저장
- 템플릿 목록에서 클릭 시 해당 크기로 즉시 변환 (미리보기)
- 템플릿 추가/수정/삭제 가능
- 템플릿 데이터는 로컬에 JSON으로 저장

### 2.5 저장
- "저장" 버튼으로 리사이즈된 이미지를 파일로 저장
- 저장 위치 선택 (Save As Dialog)
- 출력 포맷 선택 (PNG, JPG, WebP, BMP)
- JPG 저장 시 품질(Quality) 설정 가능 (1~100)

## 3. Tech Stack

### 3.1 선정 기준
> **"사용자들이 다른 프로그램을 설치하지 않고도 윈도우에서 바로 실행"**

| 기술 | 장점 | 단점 | 선택 |
|------|------|------|------|
| C# WPF (.NET Framework 4.x) | Windows 내장, 설치 불필요 | 웹 디자인 재현 어려움 | - |
| C# WinForms | Windows 내장 | UI 디자인 자유도 낮음 | - |
| Electron | 웹 기술 UI, 디자인 자유도 높음 | 번들 크기 큼 (~150MB) | - |
| **Tauri v2 + React** | **WebView2 내장(Win10/11), 작은 바이너리(~5MB), 웹 기술 UI** | Rust 빌드 필요 | **채택** |

### 3.2 최종 기술 스택

| 구분 | 기술 |
|------|------|
| **Framework** | Tauri v2 |
| **Backend** | Rust (Tauri Core) |
| **Frontend** | React 18 + TypeScript |
| **UI 스타일링** | Tailwind CSS (maddit.co.kr 디자인 참고) |
| **이미지 처리** | Rust `image` crate (리사이즈, 포맷 변환) |
| **상태 관리** | React useState/useReducer (간단한 앱이므로) |
| **빌드/배포** | Tauri Bundler → .exe 또는 .msi 인스톨러 |

### 3.3 왜 Tauri인가?
1. **WebView2 기반:** Windows 10/11에 기본 탑재 → 추가 런타임 설치 불필요
2. **작은 실행 파일:** Electron 대비 1/30 크기
3. **웹 기술 UI:** maddit.co.kr의 디자인을 HTML/CSS로 그대로 재현 가능
4. **Rust 이미지 처리:** 고성능 이미지 리사이즈 (네이티브 속도)
5. **보안:** 프론트엔드/백엔드 분리, IPC 기반 통신

## 4. Design Reference (maddit.co.kr)

분석된 디자인 특징:

| 요소 | 값 |
|------|-----|
| Primary Color | `#e94560` (레드-핑크) |
| Secondary Color | `#065fd4` (블루) |
| Text Color | `#0f0f0f` (거의 블랙) |
| Background | `#f9f9f9` (라이트 그레이) |
| Surface | `#ffffff` |
| Border | `#e5e5e5` |
| Sub Text | `#606060` |
| Font | -apple-system, 'Segoe UI', 'Noto Sans KR', sans-serif |
| Border Radius | 8~20px (둥근 모서리) |
| 톤앤매너 | 클린, 모던, 미니멀 |

## 5. UI Layout (Wireframe)

```
+----------------------------------------------------------+
|  [Logo: Maddit Image Editor]           [최소화][최대화][X] |
+----------------------------------------------------------+
|                                                          |
|  +---------------------+  +----------------------------+ |
|  |                     |  | 파일 정보                    | |
|  |                     |  | 파일명: example.png          | |
|  |   이미지 미리보기     |  | 용량: 1.2 MB                | |
|  |   (Drag & Drop 영역) |  | 크기: 1920 x 1080 px       | |
|  |                     |  | 포맷: PNG                   | |
|  |                     |  +----------------------------+ |
|  |                     |  | 크기 변경                    | |
|  |                     |  | W: [____] x H: [____] px   | |
|  |                     |  | [x] 비율 고정                | |
|  +---------------------+  +----------------------------+ |
|                           | 사이즈 템플릿                 | |
|                           | [FHD 1920x1080]  [HD 1280x720]|
|                           | [+ 새 템플릿]                 | |
|                           +----------------------------+ |
|                           | 저장 옵션                    | |
|                           | 포맷: [PNG v]  품질: [90]    | |
|                           | [     저장하기     ]          | |
+----------------------------------------------------------+
```

## 6. Project Structure

```
maddit_image_editor/
├── docs/                          # 문서
│   ├── 01-plan/
│   └── 02-design/
├── src-tauri/                     # Rust 백엔드
│   ├── src/
│   │   ├── main.rs                # Tauri 진입점
│   │   ├── commands/              # IPC 커맨드
│   │   │   ├── mod.rs
│   │   │   ├── image_ops.rs       # 이미지 로드/리사이즈/저장
│   │   │   └── template.rs        # 템플릿 CRUD
│   │   └── models/                # 데이터 모델
│   │       ├── mod.rs
│   │       ├── image_info.rs
│   │       └── template.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                           # React 프론트엔드
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── ImagePreview.tsx        # 이미지 미리보기 + DnD
│   │   ├── ImageInfo.tsx           # 파일 정보 표시
│   │   ├── ResizeControls.tsx      # 크기 변경 컨트롤
│   │   ├── TemplateList.tsx        # 템플릿 목록
│   │   ├── TemplateModal.tsx       # 템플릿 추가/수정 모달
│   │   ├── SavePanel.tsx           # 저장 옵션 + 버튼
│   │   └── TitleBar.tsx            # 커스텀 타이틀바
│   ├── hooks/
│   │   ├── useImage.ts             # 이미지 상태 관리
│   │   └── useTemplates.ts         # 템플릿 상태 관리
│   ├── styles/
│   │   └── globals.css             # Tailwind + 커스텀 스타일
│   └── types/
│       └── index.ts                # TypeScript 타입 정의
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 7. Feature Breakdown & Priority

| # | Feature | Priority | Complexity | Phase |
|---|---------|----------|------------|-------|
| F1 | 프로젝트 초기 설정 (Tauri + React + Tailwind) | Must | Low | 1 |
| F2 | 이미지 불러오기 (파일 열기, DnD, 클립보드) | Must | Medium | 2 |
| F3 | 이미지 미리보기 + 파일 정보 표시 | Must | Low | 2 |
| F4 | 이미지 리사이즈 (비율 고정/자유) | Must | Medium | 3 |
| F5 | 이미지 저장 (포맷 선택, 품질 설정) | Must | Medium | 3 |
| F6 | 사이즈 템플릿 관리 (CRUD) | Must | Medium | 4 |
| F7 | 템플릿 클릭 → 즉시 리사이즈 | Must | Low | 4 |
| F8 | Maddit 스타일 UI 적용 | Must | Medium | 5 |
| F9 | 커스텀 타이틀바 | Nice | Low | 5 |
| F10 | 웹 이미지 URL 드래그 지원 | Nice | Medium | 6 |
| F11 | .exe 빌드 및 인스톨러 생성 | Must | Low | 6 |

## 8. Implementation Phases

### Phase 1: 프로젝트 초기화 (F1)
- Tauri v2 + React + TypeScript + Vite 프로젝트 생성
- Tailwind CSS 설정
- maddit 디자인 토큰 (색상, 폰트, 간격) 설정

### Phase 2: 이미지 로드 & 표시 (F2, F3)
- Rust: 이미지 파일 로드 + 메타데이터 추출 커맨드
- React: Drag & Drop 영역 + 이미지 미리보기 컴포넌트
- React: 파일 정보 패널 (용량, 크기, 포맷)
- 클립보드 붙여넣기 지원

### Phase 3: 리사이즈 & 저장 (F4, F5)
- Rust: 이미지 리사이즈 (Lanczos3 알고리즘)
- React: 리사이즈 컨트롤 (비율 고정 토글, 수치 입력)
- Rust: 이미지 저장 (포맷 변환, 품질 설정)
- React: 저장 패널 UI

### Phase 4: 템플릿 시스템 (F6, F7)
- Rust: 템플릿 JSON 파일 읽기/쓰기
- React: 템플릿 목록 UI (칩 스타일)
- React: 템플릿 추가/수정 모달
- 템플릿 클릭 → 리사이즈 연동

### Phase 5: UI 폴리싱 (F8, F9)
- maddit.co.kr 디자인 스타일 완전 적용
- 커스텀 타이틀바 (드래그 이동 가능)
- 애니메이션 및 전환 효과
- 반응형 레이아웃

### Phase 6: 마무리 & 빌드 (F10, F11)
- 웹 이미지 드래그 지원 강화
- Windows .exe / .msi 빌드
- 아이콘 및 메타데이터 설정

## 9. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebView2 미설치 (Windows 10 구버전) | 앱 실행 불가 | Tauri 번들러가 WebView2 부트스트래퍼 포함 옵션 제공 |
| 대용량 이미지 처리 시 메모리 이슈 | 앱 크래시 | Rust에서 스트리밍 처리, 최대 크기 제한 설정 |
| 웹 이미지 드래그 시 CORS/보안 | 기능 동작 안 함 | Tauri의 HTTP API로 서버사이드 다운로드 |

## 10. Success Criteria

- [ ] 4가지 방법(파일 열기, 로컬 DnD, 웹 DnD, 클립보드)으로 이미지 불러오기 가능
- [ ] 파일 용량, 가로x세로 크기가 정확하게 표시됨
- [ ] 비율 고정/자유 모드로 이미지 크기 변경 가능
- [ ] 변경된 크기로 이미지 저장 가능 (PNG, JPG, WebP)
- [ ] 사이즈 템플릿 추가/수정/삭제 및 원클릭 적용 가능
- [ ] Windows 10/11에서 추가 설치 없이 .exe 실행 가능
- [ ] maddit.co.kr 스타일의 클린하고 모던한 UI
