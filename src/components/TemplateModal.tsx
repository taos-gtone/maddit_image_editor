import { useState, useEffect } from 'react';
import type { SizeTemplate } from '../types';

interface Props {
  isOpen: boolean;
  editingTemplate: SizeTemplate | null;
  onSave: (name: string, width: number, height: number) => void;
  onUpdate: (id: string, name: string, width: number, height: number) => void;
  onClose: () => void;
}

export default function TemplateModal({ isOpen, editingTemplate, onSave, onUpdate, onClose }: Props) {
  const [name, setName] = useState('');
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name);
      setWidth(editingTemplate.width);
      setHeight(editingTemplate.height);
    } else {
      setName('');
      setWidth(1920);
      setHeight(1080);
    }
    setError('');
  }, [editingTemplate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) { setError('이름을 입력해주세요'); return; }
    if (name.length > 30) { setError('이름은 30자 이내여야 합니다'); return; }
    if (width < 0 || width > 10000) { setError('가로 크기는 0~10000 사이여야 합니다'); return; }
    if (height < 0 || height > 10000) { setError('세로 크기는 0~10000 사이여야 합니다'); return; }
    if (width === 0 && height === 0) { setError('가로와 세로를 동시에 0으로 설정할 수 없습니다'); return; }

    if (editingTemplate) {
      onUpdate(editingTemplate.id, name.trim(), width, height);
    } else {
      onSave(name.trim(), width, height);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-lg p-6 w-[400px] max-w-[90vw]"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 className="text-lg font-bold text-text mb-5">
          {editingTemplate ? '템플릿 수정' : '새 템플릿'}
        </h2>

        <div className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-text-sub mb-1.5">템플릿 이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 블로그 헤더"
              className="w-full h-10 px-3 border border-border rounded-md text-sm text-text focus:border-secondary focus:outline-none"
              autoFocus
            />
          </div>

          {/* Width x Height */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-sub mb-1.5">가로 (px)</label>
              <input
                type="number"
                value={width === 0 ? '' : width}
                onChange={e => setWidth(parseInt(e.target.value) || 0)}
                min={0}
                max={10000}
                placeholder="0 = 자동"
                className="w-full h-10 px-3 border border-border rounded-md text-sm text-text text-center focus:border-secondary focus:outline-none"
              />
            </div>
            <span className="text-text-muted text-sm pb-2.5">x</span>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-sub mb-1.5">세로 (px)</label>
              <input
                type="number"
                value={height === 0 ? '' : height}
                onChange={e => setHeight(parseInt(e.target.value) || 0)}
                min={0}
                max={10000}
                placeholder="0 = 자동"
                className="w-full h-10 px-3 border border-border rounded-md text-sm text-text text-center focus:border-secondary focus:outline-none"
              />
            </div>
          </div>

          <p className="text-xs text-text-muted">0을 입력하면 원본 비율에 맞춰 자동 계산됩니다</p>

          {error && (
            <p className="text-error text-xs bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg text-sm text-text-sub hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            {editingTemplate ? '수정' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
