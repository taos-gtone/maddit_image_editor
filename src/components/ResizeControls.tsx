interface Props {
  targetWidth: number;
  targetHeight: number;
  maintainAspect: boolean;
  originalWidth: number;
  originalHeight: number;
  disabled: boolean;
  onWidthChange: (w: number) => void;
  onHeightChange: (h: number) => void;
  onMaintainAspectChange: (v: boolean) => void;
  onReset: () => void;
}

export default function ResizeControls({
  targetWidth,
  targetHeight,
  maintainAspect,
  originalWidth,
  originalHeight,
  disabled,
  onWidthChange,
  onHeightChange,
  onMaintainAspectChange,
  onReset,
}: Props) {
  const isChanged = targetWidth !== originalWidth || targetHeight !== originalHeight;

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">크기 변경</h3>
        {isChanged && !disabled && (
          <button
            onClick={onReset}
            className="text-xs text-secondary hover:text-secondary-hover transition-colors"
          >
            원본 크기로
          </button>
        )}
      </div>

      {/* Width x Height inputs */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-xs text-text-sub mb-1">W</label>
          <input
            type="number"
            value={targetWidth || ''}
            onChange={e => onWidthChange(parseInt(e.target.value) || 0)}
            disabled={disabled}
            min={1}
            max={10000}
            className="w-full h-9 px-3 border border-border rounded-md text-center text-sm font-medium text-text focus:border-secondary focus:outline-none disabled:opacity-50 disabled:bg-gray-50"
          />
        </div>

        {/* Link icon */}
        <div className="flex flex-col items-center pt-4">
          <button
            onClick={() => onMaintainAspectChange(!maintainAspect)}
            disabled={disabled}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              maintainAspect
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-muted hover:bg-gray-200'
            } disabled:opacity-50`}
            title={maintainAspect ? '비율 고정 해제' : '비율 고정'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {maintainAspect ? (
                <>
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </>
              ) : (
                <>
                  <path d="M18.84 12.25l1.72-1.71a5 5 0 00-7.07-7.07l-3 3a5 5 0 00.54 7.54"/>
                  <path d="M5.16 11.75l-1.72 1.71a5 5 0 007.07 7.07l3-3a5 5 0 00-.54-7.54"/>
                  <line x1="2" y1="2" x2="22" y2="22"/>
                </>
              )}
            </svg>
          </button>
        </div>

        <div className="flex-1">
          <label className="block text-xs text-text-sub mb-1">H</label>
          <input
            type="number"
            value={targetHeight || ''}
            onChange={e => onHeightChange(parseInt(e.target.value) || 0)}
            disabled={disabled}
            min={1}
            max={10000}
            className="w-full h-9 px-3 border border-border rounded-md text-center text-sm font-medium text-text focus:border-secondary focus:outline-none disabled:opacity-50 disabled:bg-gray-50"
          />
        </div>

        <span className="text-xs text-text-muted pt-4">px</span>
      </div>

      {/* Aspect ratio toggle label */}
      <div className="flex items-center gap-2">
        <span className={`text-xs ${maintainAspect ? 'text-primary font-medium' : 'text-text-muted'}`}>
          {maintainAspect ? '비율 고정 ON' : '비율 고정 OFF'}
        </span>
        {isChanged && (
          <span className="text-xs text-text-muted ml-auto">
            {originalWidth}x{originalHeight} → {targetWidth}x{targetHeight}
          </span>
        )}
      </div>
    </div>
  );
}
