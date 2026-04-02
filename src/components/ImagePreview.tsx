import { useCallback, useRef, useState, useEffect } from 'react';
import type { CropValues } from '../types';

interface Props {
  previewBase64: string | null;
  isLoading: boolean;
  error: string | null;
  targetWidth: number;
  targetHeight: number;
  maintainAspect: boolean;
  originalWidth: number;
  originalHeight: number;
  hasUncropped: boolean;
  onFileOpen: () => void;
  onFileDrop: (path: string) => void;
  onBytesDrop: (bytes: number[]) => void;
  onClipboardPaste: () => void;
  onClear: () => void;
  onResize: (w: number, h: number) => void;
  onCropApply: (crop: CropValues) => void;
  onRevertUncropped: () => void;
}

function extractImageUrl(dt: DataTransfer): string | null {
  const uri = dt.getData('text/uri-list');
  if (uri) { const u = uri.split('\n').find(l => l.trim().startsWith('http')); if (u) return u.trim(); }
  const html = dt.getData('text/html');
  if (html) { const m = html.match(/<img[^>]+src=["']([^"']+)["']/i); if (m?.[1]?.startsWith('http')) return m[1]; }
  const plain = dt.getData('text/plain');
  if (plain?.startsWith('http')) return plain.trim();
  return null;
}

type Mode = 'resize' | 'crop';
type Corner = 'nw' | 'ne' | 'sw' | 'se';
interface CropRect { x: number; y: number; w: number; h: number }

export default function ImagePreview({
  previewBase64, isLoading, error, targetWidth, targetHeight,
  maintainAspect, originalWidth, originalHeight, hasUncropped,
  onFileOpen, onFileDrop, onBytesDrop, onClipboardPaste,
  onClear, onResize, onCropApply, onRevertUncropped,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('resize');
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);

  // Resize drag state
  const [resizeDrag, setResizeDrag] = useState<{ corner: Corner; startX: number; startY: number; startW: number; startH: number } | null>(null);

  // Crop drag state
  const [cropDrag, setCropDrag] = useState<{ startX: number; startY: number } | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);

  // Display size calculation
  const getDisplaySize = useCallback(() => {
    if (!containerRef.current || !targetWidth || !targetHeight) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const maxW = rect.width - 80;
    const maxH = rect.height - 80;
    const scale = Math.min(1, maxW / targetWidth, maxH / targetHeight);
    return { w: Math.round(targetWidth * scale), h: Math.round(targetHeight * scale) };
  }, [targetWidth, targetHeight]);

  useEffect(() => { setDisplaySize(getDisplaySize()); }, [getDisplaySize]);
  useEffect(() => {
    const h = () => setDisplaySize(getDisplaySize());
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [getDisplaySize]);

  // Clear crop rect when switching modes
  useEffect(() => { setCropRect(null); }, [mode]);

  // ── RESIZE drag logic ──
  const handleCornerDown = useCallback((corner: Corner, e: React.MouseEvent) => {
    if (mode !== 'resize') return;
    e.preventDefault(); e.stopPropagation();
    setResizeDrag({ corner, startX: e.clientX, startY: e.clientY, startW: targetWidth, startH: targetHeight });
  }, [mode, targetWidth, targetHeight]);

  useEffect(() => {
    if (!resizeDrag) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeDrag.startX;
      const dy = e.clientY - resizeDrag.startY;
      const ds = displaySize;
      if (!ds || !ds.w || !ds.h) return;
      const sx = resizeDrag.startW / ds.w, sy = resizeDrag.startH / ds.h;
      let dw = 0, dh = 0;
      switch (resizeDrag.corner) {
        case 'se': dw = dx * sx; dh = dy * sy; break;
        case 'sw': dw = -dx * sx; dh = dy * sy; break;
        case 'ne': dw = dx * sx; dh = -dy * sy; break;
        case 'nw': dw = -dx * sx; dh = -dy * sy; break;
      }
      let nw = Math.round(Math.max(1, Math.min(10000, resizeDrag.startW + dw)));
      let nh = Math.round(Math.max(1, Math.min(10000, resizeDrag.startH + dh)));
      if (maintainAspect && originalWidth > 0 && originalHeight > 0) {
        const r = originalWidth / originalHeight;
        if (Math.abs(dw) > Math.abs(dh)) { nh = Math.round(nw / r); } else { nw = Math.round(nh * r); }
        nw = Math.max(1, Math.min(10000, nw));
        nh = Math.max(1, Math.min(10000, nh));
      }
      onResize(nw, nh);
    };
    const onUp = () => setResizeDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [resizeDrag, displaySize, maintainAspect, originalWidth, originalHeight, onResize]);

  // ── CROP drag logic ──
  const handleCropMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode !== 'crop' || !imgRef.current) return;
    e.preventDefault();
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropDrag({ startX: x, startY: y });
    setCropRect({ x, y, w: 0, h: 0 });
  }, [mode]);

  useEffect(() => {
    if (!cropDrag || !imgRef.current) return;
    const imgEl = imgRef.current;
    const onMove = (e: MouseEvent) => {
      const rect = imgEl.getBoundingClientRect();
      const cx = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const cy = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
      const x = Math.min(cropDrag.startX, cx);
      const y = Math.min(cropDrag.startY, cy);
      const w = Math.abs(cx - cropDrag.startX);
      const h = Math.abs(cy - cropDrag.startY);
      setCropRect({ x, y, w, h });
    };
    const onUp = () => setCropDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [cropDrag]);

  // Convert crop rect (display px) to actual image pixels
  const getCropValues = useCallback((): CropValues | null => {
    if (!cropRect || !displaySize || !displaySize.w || !displaySize.h) return null;
    if (cropRect.w < 5 || cropRect.h < 5) return null;
    const sx = originalWidth / displaySize.w;
    const sy = originalHeight / displaySize.h;
    const left = Math.round(cropRect.x * sx);
    const top = Math.round(cropRect.y * sy);
    const right = Math.round((displaySize.w - cropRect.x - cropRect.w) * sx);
    const bottom = Math.round((displaySize.h - cropRect.y - cropRect.h) * sy);
    return {
      top: Math.max(0, top),
      bottom: Math.max(0, bottom),
      left: Math.max(0, left),
      right: Math.max(0, right),
    };
  }, [cropRect, displaySize, originalWidth, originalHeight]);

  const handleCropApply = useCallback(() => {
    const vals = getCropValues();
    if (vals) {
      onCropApply(vals);
      setCropRect(null);
      setMode('resize');
    }
  }, [getCropValues, onCropApply]);

  const handleCropCancel = useCallback(() => {
    setCropRect(null);
  }, []);

  // ── Drag & Drop ──
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const f = files[0]; const p = (f as any).path;
      if (p) { onFileDrop(p); return; }
      if (f.type.startsWith('image/')) { onBytesDrop(Array.from(new Uint8Array(await f.arrayBuffer()))); return; }
    }
    const url = extractImageUrl(e.dataTransfer);
    if (url) { try { onBytesDrop(await window.electronAPI.fetchImageUrl(url)); } catch {} }
  }, [onFileDrop, onBytesDrop]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'v') onClipboardPaste();
    if (e.ctrlKey && e.key === 'o') { e.preventDefault(); onFileOpen(); }
    if (e.key === 'Escape') { setCropRect(null); setMode('resize'); }
  }, [onClipboardPaste, onFileOpen]);

  // Corner handle
  const CH = ({ corner }: { corner: Corner }) => {
    const cls: Record<Corner, string> = {
      nw: '-top-1.5 -left-1.5 cursor-nw-resize',
      ne: '-top-1.5 -right-1.5 cursor-ne-resize',
      sw: '-bottom-1.5 -left-1.5 cursor-sw-resize',
      se: '-bottom-1.5 -right-1.5 cursor-se-resize',
    };
    return <div className={`absolute w-3 h-3 bg-white border-2 border-primary rounded-sm z-10 ${cls[corner]} hover:scale-125 transition-transform`} onMouseDown={e => handleCornerDown(corner, e)} />;
  };

  // Loading
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface rounded-lg border border-border">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-sub text-sm">이미지 처리 중...</span>
        </div>
      </div>
    );
  }

  // Empty
  if (!previewBase64) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface rounded-lg border-2 border-dashed border-border transition-colors cursor-pointer hover:border-secondary hover:bg-secondary-light/30"
        onDragOver={handleDragOver} onDrop={handleDrop} onKeyDown={handleKeyDown} onClick={onFileOpen} tabIndex={0}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          </div>
          <div className="text-center">
            <button className="px-5 py-2 bg-secondary text-white rounded-xl text-sm font-medium hover:bg-secondary-hover transition-colors mb-3">파일 열기</button>
            <p className="text-text-sub text-sm">또는 여기에 이미지를 드래그하세요</p>
            <p className="text-text-muted text-xs mt-1">Ctrl+V로 붙여넣기 가능</p>
          </div>
          {error && <p className="text-error text-xs mt-2 px-4 py-2 bg-red-50 rounded-md">{error}</p>}
        </div>
      </div>
    );
  }

  const cropVals = getCropValues();
  const cropW = cropVals ? originalWidth - cropVals.left - cropVals.right : 0;
  const cropH = cropVals ? originalHeight - cropVals.top - cropVals.bottom : 0;

  // Image loaded
  return (
    <div ref={containerRef}
      className="flex-1 relative bg-surface rounded-lg border border-border overflow-hidden flex items-center justify-center select-none"
      onDragOver={handleDragOver} onDrop={handleDrop} onKeyDown={handleKeyDown} tabIndex={0}
      style={{
        backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
        backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        cursor: mode === 'crop' ? 'crosshair' : resizeDrag ? `${resizeDrag.corner}-resize` : 'default',
      }}
    >
      {/* Image wrapper */}
      {displaySize && (
        <div ref={imgRef} className="relative" style={{ width: displaySize.w, height: displaySize.h }}
          onMouseDown={handleCropMouseDown}
        >
          <img src={previewBase64} alt="Preview" className="w-full h-full object-fill pointer-events-none" draggable={false} />

          {/* Resize mode: border + corner handles */}
          {mode === 'resize' && (
            <>
              <div className="absolute inset-0 border-2 border-primary/40 rounded-sm pointer-events-none" />
              <CH corner="nw" /><CH corner="ne" /><CH corner="sw" /><CH corner="se" />
            </>
          )}

          {/* Crop mode: dark overlay + selection rect */}
          {mode === 'crop' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/40" />
              {/* Bright selected area */}
              {cropRect && cropRect.w > 2 && cropRect.h > 2 && (
                <>
                  <div className="absolute bg-transparent border-2 border-white border-dashed"
                    style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}
                  />
                  {/* Crop size label */}
                  <div className="absolute px-1.5 py-0.5 bg-black/80 text-white text-[10px] rounded"
                    style={{ left: cropRect.x, top: Math.max(0, cropRect.y - 20) }}>
                    {cropW} x {cropH}
                  </div>
                </>
              )}
              {!cropRect && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-lg">드래그하여 잘라낼 영역을 선택하세요</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top toolbar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        {/* Mode tabs */}
        <div className="flex bg-black/60 rounded-lg overflow-hidden">
          <button onClick={() => setMode('resize')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${mode === 'resize' ? 'bg-primary text-white' : 'text-white/70 hover:text-white'}`}>
            리사이즈
          </button>
          <button onClick={() => setMode('crop')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${mode === 'crop' ? 'bg-secondary text-white' : 'text-white/70 hover:text-white'}`}>
            잘라내기
          </button>
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-1.5">
          {hasUncropped && (
            <button onClick={(e) => { e.stopPropagation(); onRevertUncropped(); }}
              className="px-2.5 py-1.5 bg-warning/90 hover:bg-warning text-white text-xs rounded font-medium transition-colors"
              title="크롭 전 원본으로 되돌리기">
              원본 복원
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="px-2.5 py-1.5 bg-black/70 hover:bg-error text-white text-xs rounded font-medium transition-colors flex items-center gap-1"
            title="이미지 닫기">
            <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5"><line x1="0" y1="0" x2="10" y2="10"/><line x1="10" y1="0" x2="0" y2="10"/></svg>
            닫기
          </button>
        </div>
      </div>

      {/* Crop action bar */}
      {mode === 'crop' && cropRect && cropRect.w > 5 && cropRect.h > 5 && !cropDrag && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 rounded-xl px-4 py-2">
          <span className="text-white text-xs">{cropW} x {cropH} px</span>
          <button onClick={handleCropApply}
            className="px-3 py-1 bg-secondary hover:bg-secondary-hover text-white text-xs rounded-lg font-medium transition-colors">
            적용
          </button>
          <button onClick={handleCropCancel}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg font-medium transition-colors">
            취소
          </button>
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="px-2 py-1 bg-black/70 text-white text-xs rounded font-medium">
          {targetWidth} x {targetHeight} px
          {resizeDrag && <span className="text-primary-light ml-1">(드래그 중)</span>}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onFileOpen(); }}
          className="px-3 py-1.5 bg-black/70 hover:bg-black/90 text-white text-xs rounded font-medium transition-colors flex items-center gap-1.5"
          title="다른 이미지 열기 (Ctrl+O)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          파일 열기
        </button>
      </div>

      {error && (
        <div className="absolute top-12 left-3 right-3 px-3 py-2 bg-red-50 border border-error/20 text-error text-xs rounded-md">{error}</div>
      )}
    </div>
  );
}
