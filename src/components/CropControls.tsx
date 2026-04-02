import type { CropValues } from '../types';

interface Props {
  crop: CropValues;
  originalWidth: number;
  originalHeight: number;
  disabled: boolean;
  onChange: (crop: CropValues) => void;
  onApply: (crop: CropValues) => void;
}

export default function CropControls({
  crop,
  originalWidth,
  originalHeight,
  disabled,
  onChange,
  onApply,
}: Props) {
  const hasCrop = crop.top > 0 || crop.bottom > 0 || crop.left > 0 || crop.right > 0;
  const resultW = Math.max(0, originalWidth - crop.left - crop.right);
  const resultH = Math.max(0, originalHeight - crop.top - crop.bottom);
  const isValid = resultW > 0 && resultH > 0;

  const updateField = (field: keyof CropValues, value: number) => {
    onChange({ ...crop, [field]: Math.max(0, value) });
  };

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">이미지 잘라내기</h3>
        {hasCrop && (
          <button
            onClick={() => onChange({ top: 0, bottom: 0, left: 0, right: 0 })}
            className="text-xs text-text-muted hover:text-text-sub transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* Top */}
      <div className="flex flex-col items-center gap-1.5 mb-2">
        <label className="text-[10px] text-text-muted uppercase tracking-wide">위</label>
        <input
          type="number"
          value={crop.top || ''}
          onChange={e => updateField('top', parseInt(e.target.value) || 0)}
          disabled={disabled}
          min={0}
          max={originalHeight - crop.bottom - 1}
          placeholder="0"
          className="w-20 h-7 px-2 border border-border rounded text-center text-xs text-text focus:border-secondary focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Left - visual - Right */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="flex flex-col items-center gap-1">
          <label className="text-[10px] text-text-muted uppercase tracking-wide">좌</label>
          <input
            type="number"
            value={crop.left || ''}
            onChange={e => updateField('left', parseInt(e.target.value) || 0)}
            disabled={disabled}
            min={0}
            max={originalWidth - crop.right - 1}
            placeholder="0"
            className="w-16 h-7 px-2 border border-border rounded text-center text-xs text-text focus:border-secondary focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Mini preview box */}
        <div className="w-16 h-12 border-2 border-dashed border-primary/40 rounded flex items-center justify-center relative mx-1">
          {hasCrop && (
            <div
              className="bg-primary/20 rounded-sm absolute"
              style={{
                top: `${(crop.top / originalHeight) * 100}%`,
                left: `${(crop.left / originalWidth) * 100}%`,
                right: `${(crop.right / originalWidth) * 100}%`,
                bottom: `${(crop.bottom / originalHeight) * 100}%`,
              }}
            />
          )}
          {!hasCrop && <span className="text-[9px] text-text-muted">원본</span>}
        </div>

        <div className="flex flex-col items-center gap-1">
          <label className="text-[10px] text-text-muted uppercase tracking-wide">우</label>
          <input
            type="number"
            value={crop.right || ''}
            onChange={e => updateField('right', parseInt(e.target.value) || 0)}
            disabled={disabled}
            min={0}
            max={originalWidth - crop.left - 1}
            placeholder="0"
            className="w-16 h-7 px-2 border border-border rounded text-center text-xs text-text focus:border-secondary focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-1.5 mb-3">
        <input
          type="number"
          value={crop.bottom || ''}
          onChange={e => updateField('bottom', parseInt(e.target.value) || 0)}
          disabled={disabled}
          min={0}
          max={originalHeight - crop.top - 1}
          placeholder="0"
          className="w-20 h-7 px-2 border border-border rounded text-center text-xs text-text focus:border-secondary focus:outline-none disabled:opacity-50"
        />
        <label className="text-[10px] text-text-muted uppercase tracking-wide">아래</label>
      </div>

      {/* Result info + Apply button */}
      {hasCrop && (
        <div className="border-t border-border-light pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-sub">결과 크기</span>
            <span className={`text-xs font-medium ${isValid ? 'text-text' : 'text-error'}`}>
              {resultW} x {resultH} px
            </span>
          </div>
          <button
            onClick={() => onApply(crop)}
            disabled={disabled || !isValid}
            className="w-full h-9 bg-secondary text-white rounded-lg text-xs font-semibold hover:bg-secondary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
            </svg>
            잘라내기 적용
          </button>
        </div>
      )}

      {/* px unit hint */}
      <p className="text-[10px] text-text-muted text-center mt-2">단위: 픽셀(px)</p>
    </div>
  );
}
