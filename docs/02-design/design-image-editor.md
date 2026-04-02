# Design: Maddit Image Editor

**Created:** 2026-03-29
**Status:** Draft
**Plan Reference:** [plan-image-editor.md](../01-plan/plan-image-editor.md)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              Tauri v2 Application                │
│                                                  │
│  ┌──────────────────┐  ┌─────────────────────┐  │
│  │  React Frontend   │  │   Rust Backend       │  │
│  │  (WebView2)       │←→│   (Tauri Core)       │  │
│  │                   │IPC│                      │  │
│  │  - UI Rendering   │  │  - Image Processing  │  │
│  │  - User Input     │  │  - File I/O          │  │
│  │  - State Mgmt     │  │  - Template Storage  │  │
│  │  - DnD / Paste    │  │  - System Dialogs    │  │
│  └──────────────────┘  └─────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  Local Storage (AppData)                  │   │
│  │  - templates.json                         │   │
│  │  - settings.json (향후 확장)               │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 1.1 통신 흐름

```
User Action → React Component → invoke() IPC → Rust Command → 처리 → Response → React State 업데이트 → UI 반영
```

## 2. Data Models

### 2.1 ImageInfo (Rust → Frontend)

```typescript
interface ImageInfo {
  fileName: string;        // "photo.png"
  filePath: string;        // "C:/Users/.../photo.png" (null if clipboard)
  fileSize: number;        // bytes
  width: number;           // original width px
  height: number;          // original height px
  format: ImageFormat;     // "png" | "jpg" | "webp" | "bmp" | "gif" | "tiff" | "ico"
  base64Preview: string;   // base64 encoded image for frontend display
}
```

### 2.2 ResizeRequest (Frontend → Rust)

```typescript
interface ResizeRequest {
  sourcePath: string | null;   // null이면 클립보드에서 온 이미지
  sourceBase64: string | null; // sourcePath가 null일 때 사용
  targetWidth: number;
  targetHeight: number;
  maintainAspect: boolean;
}
```

### 2.3 SaveRequest (Frontend → Rust)

```typescript
interface SaveRequest {
  sourcePath: string | null;
  sourceBase64: string | null;
  targetWidth: number;
  targetHeight: number;
  outputFormat: "png" | "jpg" | "webp" | "bmp";
  quality: number;         // 1-100, JPG/WebP only
  outputPath: string;      // Save dialog에서 선택된 경로
}
```

### 2.4 SizeTemplate

```typescript
interface SizeTemplate {
  id: string;              // UUID
  name: string;            // "FHD", "인스타 정사각형" 등
  width: number;
  height: number;
  isBuiltIn: boolean;      // 기본 템플릿 여부 (삭제 불가)
  createdAt: string;       // ISO 8601
}
```

### 2.5 기본 제공 템플릿

| Name | Width | Height | 용도 |
|------|-------|--------|------|
| FHD | 1920 | 1080 | 풀HD 모니터 |
| HD | 1280 | 720 | HD 영상 |
| 4K UHD | 3840 | 2160 | 4K 모니터 |
| Instagram Square | 1080 | 1080 | 인스타 정사각형 |
| Instagram Story | 1080 | 1920 | 인스타 스토리 |
| YouTube Thumb | 1280 | 720 | 유튜브 썸네일 |
| Twitter Header | 1500 | 500 | 트위터 헤더 |
| Favicon | 64 | 64 | 파비콘 |
| Icon 256 | 256 | 256 | 아이콘 |
| A4 300dpi | 2480 | 3508 | 인쇄 A4 |

## 3. Rust Backend (Tauri Commands)

### 3.1 IPC Command 정의

```rust
// === Image Operations ===

#[tauri::command]
async fn load_image(path: String) -> Result<ImageInfo, String>
// 파일 경로로 이미지 로드, 메타데이터 + base64 미리보기 반환

#[tauri::command]
async fn load_image_from_bytes(bytes: Vec<u8>) -> Result<ImageInfo, String>
// 클립보드/웹 드래그 바이트 데이터로부터 이미지 로드

#[tauri::command]
async fn resize_preview(request: ResizeRequest) -> Result<String, String>
// 리사이즈된 이미지의 base64 미리보기 반환 (저장 전 프리뷰)

#[tauri::command]
async fn save_image(request: SaveRequest) -> Result<String, String>
// 리사이즈 + 포맷 변환 후 파일 저장, 저장된 경로 반환

#[tauri::command]
async fn open_file_dialog() -> Result<Option<String>, String>
// 파일 열기 다이얼로그, 선택된 파일 경로 반환

#[tauri::command]
async fn save_file_dialog(default_name: String, format: String) -> Result<Option<String>, String>
// 파일 저장 다이얼로그, 저장할 경로 반환

// === Template Operations ===

#[tauri::command]
async fn get_templates() -> Result<Vec<SizeTemplate>, String>
// 전체 템플릿 목록 반환 (기본 + 사용자)

#[tauri::command]
async fn add_template(name: String, width: u32, height: u32) -> Result<SizeTemplate, String>
// 새 사용자 템플릿 추가

#[tauri::command]
async fn update_template(id: String, name: String, width: u32, height: u32) -> Result<SizeTemplate, String>
// 사용자 템플릿 수정

#[tauri::command]
async fn delete_template(id: String) -> Result<(), String>
// 사용자 템플릿 삭제 (isBuiltIn=true인 경우 에러)
```

### 3.2 이미지 처리 로직

```
Load:
  1. 파일 읽기 (path) 또는 바이트 수신 (clipboard/web)
  2. image::load_from_memory() 또는 image::open()
  3. 원본 크기, 포맷 추출
  4. 미리보기용 base64 생성 (max 1200px로 축소)
  5. ImageInfo 반환

Resize:
  1. 원본 이미지 로드
  2. image::imageops::resize() with Lanczos3 filter
  3. 리사이즈된 이미지 base64 반환

Save:
  1. 원본 이미지 로드
  2. 리사이즈 (target width/height)
  3. 포맷 변환 (PNG/JPG/WebP/BMP)
  4. JPG/WebP: quality 파라미터 적용
  5. 파일 쓰기
```

### 3.3 템플릿 저장 경로

```
Windows: %APPDATA%/co.kr.maddit.image-editor/templates.json
```

## 4. React Frontend

### 4.1 Component Tree

```
App
├── TitleBar                      # 커스텀 윈도우 타이틀바
│   ├── Logo
│   └── WindowControls            # 최소화/최대화/닫기
│
├── MainLayout                    # 2-column 레이아웃
│   ├── LeftPanel                 # 이미지 미리보기 영역 (flex: 1)
│   │   └── ImagePreview
│   │       ├── DropZone          # DnD + Click 영역 (이미지 없을 때)
│   │       └── PreviewCanvas     # 이미지 표시 (이미지 있을 때)
│   │
│   └── RightPanel                # 컨트롤 패널 (width: 320px)
│       ├── ImageInfo             # 파일 정보 표시
│       ├── ResizeControls        # 크기 변경 컨트롤
│       │   ├── DimensionInput    # W x H 입력
│       │   └── AspectToggle      # 비율 고정 토글
│       ├── TemplateList          # 사이즈 템플릿 목록
│       │   ├── TemplateChip[]    # 각 템플릿 칩
│       │   └── AddTemplateBtn    # + 새 템플릿
│       └── SavePanel             # 저장 옵션
│           ├── FormatSelect      # 포맷 선택 드롭다운
│           ├── QualitySlider     # 품질 슬라이더 (JPG/WebP)
│           └── SaveButton        # 저장하기 버튼
│
└── TemplateModal                 # 템플릿 추가/수정 모달 (overlay)
    ├── NameInput
    ├── WidthInput
    ├── HeightInput
    └── ActionButtons             # 저장/취소
```

### 4.2 State Design

```typescript
// useImage.ts - 이미지 상태 관리 Hook
interface ImageState {
  // 원본 이미지 정보
  original: ImageInfo | null;

  // 현재 리사이즈 설정
  targetWidth: number;
  targetHeight: number;
  maintainAspect: boolean;

  // 미리보기
  previewBase64: string | null;

  // 저장 설정
  outputFormat: "png" | "jpg" | "webp" | "bmp";
  quality: number;  // 1-100

  // UI 상태
  isLoading: boolean;
  error: string | null;
}

// useTemplates.ts - 템플릿 상태 관리 Hook
interface TemplateState {
  templates: SizeTemplate[];
  isModalOpen: boolean;
  editingTemplate: SizeTemplate | null;  // null이면 새 템플릿
}
```

### 4.3 주요 인터랙션 흐름

#### 이미지 불러오기 (4가지 방법)

```
1. 파일 열기 버튼 클릭
   → invoke("open_file_dialog")
   → 경로 수신
   → invoke("load_image", { path })
   → ImageInfo 수신 → state 업데이트

2. 로컬 파일 Drag & Drop
   → onDrop 이벤트에서 file path 추출
   → invoke("load_image", { path })
   → ImageInfo 수신 → state 업데이트

3. 웹 이미지 Drag & Drop
   → onDrop 이벤트에서 dataTransfer URL 또는 blob 추출
   → URL인 경우: fetch → arrayBuffer → bytes
   → invoke("load_image_from_bytes", { bytes })
   → ImageInfo 수신 → state 업데이트

4. 클립보드 붙여넣기 (Ctrl+V)
   → onPaste 이벤트에서 clipboardData 추출
   → blob → arrayBuffer → bytes
   → invoke("load_image_from_bytes", { bytes })
   → ImageInfo 수신 → state 업데이트
```

#### 리사이즈

```
Width 입력 변경 (비율 고정 ON):
  → newWidth 입력
  → newHeight = Math.round(newWidth * (originalHeight / originalWidth))
  → state.targetWidth = newWidth
  → state.targetHeight = newHeight
  → debounce(300ms) → invoke("resize_preview") → 미리보기 업데이트

Width 입력 변경 (비율 고정 OFF):
  → newWidth 입력
  → state.targetWidth = newWidth (height 변경 없음)
  → debounce(300ms) → invoke("resize_preview") → 미리보기 업데이트
```

#### 템플릿 적용

```
템플릿 칩 클릭:
  → state.targetWidth = template.width
  → state.targetHeight = template.height
  → state.maintainAspect = false (템플릿은 고정 크기)
  → invoke("resize_preview") → 미리보기 업데이트
```

#### 저장

```
저장하기 버튼 클릭:
  → invoke("save_file_dialog", { defaultName, format })
  → 경로 수신
  → invoke("save_image", { ...saveRequest, outputPath })
  → 성공 toast 표시
```

## 5. UI Design Specification

### 5.1 Design Tokens (maddit.co.kr 기반)

```css
:root {
  /* Colors */
  --color-primary: #e94560;
  --color-primary-hover: #d63d56;
  --color-primary-light: #fff0f3;
  --color-secondary: #065fd4;
  --color-secondary-hover: #0550b0;
  --color-secondary-light: #def1ff;

  --color-text: #0f0f0f;
  --color-text-sub: #606060;
  --color-text-muted: #aaaaaa;

  --color-bg: #f9f9f9;
  --color-surface: #ffffff;
  --color-border: #e5e5e5;
  --color-border-light: #f2f2f2;

  --color-success: #2e7d32;
  --color-warning: #f57c00;
  --color-error: #d32f2f;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-2xl: 20px;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 20px;
  --radius-full: 50%;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.08);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.12);

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
}
```

### 5.2 Window Specification

| 속성 | 값 |
|------|-----|
| 기본 창 크기 | 1000px x 680px |
| 최소 창 크기 | 800px x 560px |
| 리사이즈 가능 | Yes |
| 타이틀바 | 커스텀 (decorations: false) |
| 배경색 | #f9f9f9 |

### 5.3 Layout Detail

```
┌──────────────────────────────────────────────────────────────┐
│ TitleBar (h: 40px, bg: #fff, border-bottom: 1px #e5e5e5)     │
│ [Logo: Maddit Image Editor]           [─] [□] [X]            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────┐ ┌──────────────────────────┐    │
│  │                          │ │ 파일 정보              ▼ │    │
│  │                          │ │                          │    │
│  │                          │ │  📄 photo.png            │    │
│  │                          │ │  용량  1.2 MB            │    │
│  │    이미지 미리보기         │ │  크기  1920 x 1080 px   │    │
│  │                          │ │  포맷  PNG               │    │
│  │    ┌──────────────┐      │ ├──────────────────────────┤    │
│  │    │  📁 파일 열기  │      │ │ 크기 변경              ▼ │    │
│  │    │  또는 여기에   │      │ │                          │    │
│  │    │  이미지를     │      │ │  W [1920] x H [1080] px  │    │
│  │    │  드래그하세요  │      │ │  🔗 비율 고정    [ON]     │    │
│  │    └──────────────┘      │ ├──────────────────────────┤    │
│  │                          │ │ 사이즈 템플릿            ▼ │    │
│  │  (Ctrl+V로 붙여넣기 가능) │ │                          │    │
│  │                          │ │  [FHD] [HD] [4K] [Insta] │    │
│  │                          │ │  [Story] [YT] [Favicon]  │    │
│  │                          │ │  [+ 새 템플릿]            │    │
│  │                          │ ├──────────────────────────┤    │
│  │                          │ │ 저장 옵션               ▼ │    │
│  │                          │ │                          │    │
│  │                          │ │  포맷  [PNG        ▼]    │    │
│  │                          │ │  품질  [━━━━━━━━●━] 90   │    │
│  │                          │ │                          │    │
│  │                          │ │  [ 🔽 저장하기          ] │    │
│  └─────────────────────────┘ └──────────────────────────┘    │
│         flex: 1               width: 320px                    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
     padding: 16px           gap: 16px
```

### 5.4 Component Specifications

#### TitleBar
- 높이: 40px
- 배경: `#ffffff`
- 하단 border: 1px `#e5e5e5`
- 로고: "Maddit" (`#e94560`, 700) + "Image Editor" (`#0f0f0f`, 400), 16px
- 윈도우 버튼: 40x40px, hover시 배경 `#e5e5e5`, 닫기 hover시 `#e94560` + 흰 텍스트
- `data-tauri-drag-region` 속성으로 드래그 이동 가능

#### DropZone (이미지 없을 때)
- 배경: `#ffffff`
- border: 2px dashed `#e5e5e5`
- border-radius: 12px
- 중앙 정렬 콘텐츠:
  - 파일 아이콘 (48px, `#e5e5e5`)
  - "📁 파일 열기" 버튼 (secondary 스타일, border-radius: 20px)
  - "또는 여기에 이미지를 드래그하세요" (`#606060`, 14px)
  - "Ctrl+V로 붙여넣기 가능" (`#aaaaaa`, 12px)
- Drag over 상태: border-color `#065fd4`, background `#def1ff`

#### PreviewCanvas (이미지 있을 때)
- 배경: 체커보드 패턴 (투명 이미지 표시용)
- 이미지: object-fit contain, 영역 내 최대 크기로 표시
- border-radius: 12px
- 좌하단 오버레이: 현재 표시 크기 badge (`rgba(0,0,0,0.7)`, 흰색 텍스트, 11px)

#### ImageInfo 패널
- 배경: `#ffffff`
- border: 1px `#e5e5e5`
- border-radius: 12px
- padding: 16px
- 섹션 헤더: "파일 정보" (14px, 600, `#0f0f0f`)
- 정보 행: label (`#606060`, 12px) + value (`#0f0f0f`, 14px, 500)
- 행 간격: 8px

#### ResizeControls 패널
- 동일 카드 스타일 (bg white, border, radius-12)
- Width/Height 입력: border `#e5e5e5`, radius-8, height 36px, text-align center
- "x" 구분자: `#606060`, 14px
- "px" 단위: `#aaaaaa`, 12px
- 비율 고정 토글: 커스텀 toggle switch
  - ON: `#e94560` 배경
  - OFF: `#e5e5e5` 배경
  - 크기: 40x22px
- 링크 아이콘 (🔗): 비율 고정 시 W-H 사이에 표시

#### TemplateList 패널
- 동일 카드 스타일
- 템플릿 칩:
  - padding: 6px 12px
  - border: 1px `#e5e5e5`
  - border-radius: 8px
  - font-size: 13px
  - hover: border-color `#0f0f0f`
  - 선택됨(적용됨): bg `#0f0f0f`, color `#fff` (maddit의 active chip 스타일)
  - 기본 제공: 좌측 점(●) 표시 없음
  - 사용자 정의: 우클릭 메뉴로 수정/삭제
- "＋ 새 템플릿" 버튼:
  - border: 1px dashed `#e5e5e5`
  - color: `#606060`
  - hover: border-color `#065fd4`, color `#065fd4`
- FlexWrap 레이아웃, gap: 8px

#### SavePanel 패널
- 동일 카드 스타일
- 포맷 드롭다운:
  - 커스텀 select, border `#e5e5e5`, radius-8, height 36px
  - 옵션: PNG, JPG, WebP, BMP
- 품질 슬라이더:
  - range input, accent-color `#e94560`
  - 우측에 현재 값 표시 (14px, 600)
  - JPG 또는 WebP 선택 시에만 표시
- 저장하기 버튼:
  - width: 100%
  - height: 44px
  - background: `#e94560`
  - color: `#ffffff`
  - border-radius: 12px
  - font-size: 15px, font-weight: 600
  - hover: `#d63d56`
  - disabled (이미지 없을 때): opacity 0.5, cursor not-allowed
  - 아이콘: 💾 또는 다운로드 아이콘

#### TemplateModal
- Overlay: `rgba(0,0,0,0.4)`, blur(2px)
- Modal:
  - width: 400px
  - bg: `#ffffff`
  - border-radius: 16px
  - padding: 24px
  - shadow-lg
- 제목: "새 템플릿" 또는 "템플릿 수정" (18px, 700)
- 입력 필드:
  - label (12px, 600, `#606060`)
  - input (height 40px, border `#e5e5e5`, radius-8, focus border `#065fd4`)
- 버튼:
  - 취소: 기본 스타일 (border `#e5e5e5`)
  - 저장: primary 스타일 (`#e94560`)
  - gap: 8px, flex row, justify-end

## 6. Tauri Configuration

### 6.1 tauri.conf.json 주요 설정

```json
{
  "productName": "Maddit Image Editor",
  "version": "1.0.0",
  "identifier": "co.kr.maddit.image-editor",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Maddit Image Editor",
        "width": 1000,
        "height": 680,
        "minWidth": 800,
        "minHeight": 560,
        "resizable": true,
        "decorations": false,
        "center": true,
        "transparent": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.ico"
    ],
    "windows": {
      "webviewInstallMode": {
        "type": "embedBootstrapper"
      }
    }
  }
}
```

### 6.2 Cargo.toml 주요 의존성

```toml
[dependencies]
tauri = { version = "2", features = ["dialog-open", "dialog-save"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
image = "0.25"
uuid = { version = "1", features = ["v4"] }
base64 = "0.22"
dirs = "5"
```

### 6.3 Tauri Permissions

```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:allow-read",
    "fs:allow-write",
    "clipboard:allow-read"
  ]
}
```

## 7. Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18.3",
    "react-dom": "^18.3",
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "@tauri-apps/plugin-clipboard-manager": "^2"
  },
  "devDependencies": {
    "typescript": "^5.5",
    "vite": "^6",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^3.4",
    "autoprefixer": "^10",
    "postcss": "^8",
    "@tauri-apps/cli": "^2"
  }
}
```

## 8. Error Handling

### 8.1 에러 분류

| Category | Examples | UI 표현 |
|----------|----------|---------|
| Load Error | 지원하지 않는 포맷, 손상된 파일 | DropZone에 에러 메시지 표시 |
| Resize Error | 메모리 부족, 크기 제한 초과 | ResizeControls에 인라인 에러 |
| Save Error | 디스크 공간 부족, 권한 없음 | Toast 알림 |
| Template Error | 중복 이름, 유효하지 않은 크기 | Modal 내 인라인 에러 |

### 8.2 크기 제한

| 항목 | 제한 |
|------|------|
| 최대 입력 이미지 | 50MB |
| 최대 리사이즈 크기 | 10000 x 10000 px |
| 최소 리사이즈 크기 | 1 x 1 px |
| 템플릿 이름 | 1~30자 |
| 최대 사용자 템플릿 | 50개 |

## 9. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl + O | 파일 열기 |
| Ctrl + V | 클립보드 붙여넣기 |
| Ctrl + S | 저장하기 |
| Ctrl + Shift + S | 다른 이름으로 저장 |
| Ctrl + Z | 크기 변경 되돌리기 (원본 크기로) |
| Escape | 모달 닫기 |

## 10. File Structure (Final)

```
maddit_image_editor/
├── docs/
│   ├── 01-plan/
│   │   └── plan-image-editor.md
│   └── 02-design/
│       └── design-image-editor.md
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── image_ops.rs       # load, resize_preview, save
│   │   │   └── template.rs        # get, add, update, delete
│   │   └── models/
│   │       ├── mod.rs
│   │       ├── image_info.rs       # ImageInfo struct
│   │       ├── template.rs         # SizeTemplate struct
│   │       └── requests.rs         # ResizeRequest, SaveRequest
│   ├── capabilities/
│   │   └── default.json
│   ├── icons/
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Root component
│   ├── components/
│   │   ├── TitleBar.tsx
│   │   ├── ImagePreview.tsx        # DropZone + PreviewCanvas
│   │   ├── ImageInfo.tsx
│   │   ├── ResizeControls.tsx
│   │   ├── TemplateList.tsx
│   │   ├── TemplateModal.tsx
│   │   └── SavePanel.tsx
│   ├── hooks/
│   │   ├── useImage.ts
│   │   └── useTemplates.ts
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── globals.css
│
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```
