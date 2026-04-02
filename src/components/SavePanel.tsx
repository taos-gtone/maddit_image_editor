import type { OutputFormat } from '../types';

interface Props {
  outputFormat: OutputFormat;
  quality: number;
  disabled: boolean;
  isLoading: boolean;
  onFormatChange: (f: OutputFormat) => void;
  onQualityChange: (q: number) => void;
  onSave: () => void;
}

const FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'tiff', label: 'TIFF' },
  { value: 'bmp', label: 'BMP' },
];

const showQuality = (format: OutputFormat) => ['jpg', 'webp', 'avif', 'tiff'].includes(format);

export default function SavePanel({
  outputFormat,
  quality,
  disabled,
  isLoading,
  onFormatChange,
  onQualityChange,
  onSave,
}: Props) {
  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-text mb-3">저장 옵션</h3>

      {/* Format select */}
      <div className="mb-3">
        <label className="block text-xs text-text-sub mb-1">출력 포맷</label>
        <select
          value={outputFormat}
          onChange={e => onFormatChange(e.target.value as OutputFormat)}
          disabled={disabled}
          className="w-full h-9 px-3 border border-border rounded-md text-sm text-text bg-white focus:border-secondary focus:outline-none disabled:opacity-50"
        >
          {FORMATS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Quality slider */}
      {showQuality(outputFormat) && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-text-sub">품질</label>
            <span className="text-sm font-semibold text-text">{quality}</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={e => onQualityChange(parseInt(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-primary disabled:opacity-50"
          />
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-text-muted">낮음</span>
            <span className="text-[10px] text-text-muted">높음</span>
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={disabled || isLoading}
        className="w-full h-11 bg-primary text-white rounded-lg text-[15px] font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            저장 중...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            저장하기
          </>
        )}
      </button>
    </div>
  );
}
