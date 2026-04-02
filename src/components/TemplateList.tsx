import type { SizeTemplate } from '../types';

interface Props {
  templates: SizeTemplate[];
  disabled: boolean;
  activeTemplateId: string | null;
  onApply: (template: SizeTemplate) => void;
  onAdd: () => void;
  onEdit: (template: SizeTemplate) => void;
  onDelete: (id: string) => void;
  onRestoreBuiltIns: () => void;
}

export default function TemplateList({
  templates,
  disabled,
  activeTemplateId,
  onApply,
  onAdd,
  onEdit,
  onDelete,
  onRestoreBuiltIns,
}: Props) {
  const builtIn = templates.filter(t => t.isBuiltIn);
  const custom = templates.filter(t => !t.isBuiltIn);
  const hasHiddenBuiltIns = builtIn.length < 10;

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">사이즈 템플릿</h3>
        <div className="flex items-center gap-2">
          {hasHiddenBuiltIns && (
            <button
              onClick={onRestoreBuiltIns}
              className="text-xs text-text-muted hover:text-text-sub transition-colors"
              title="삭제된 기본 템플릿 복원"
            >
              복원
            </button>
          )}
          <button
            onClick={onAdd}
            className="text-xs text-secondary hover:text-secondary-hover transition-colors"
          >
            + 새 템플릿
          </button>
        </div>
      </div>

      {/* Built-in templates */}
      {builtIn.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {builtIn.map(t => (
            <div key={t.id} className="group relative">
              <button
                onClick={() => onApply(t)}
                disabled={disabled}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border ${
                  activeTemplateId === t.id
                    ? 'bg-text text-white border-text'
                    : 'bg-white text-text border-border hover:border-text-sub'
                } disabled:opacity-50`}
                title={`${t.width || '자동'} x ${t.height || '자동'}`}
              >
                {t.name}
              </button>
              <div className="hidden group-hover:flex absolute -top-7 left-0 bg-white shadow-md rounded border border-border text-xs z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                  className="px-2 py-1 hover:bg-red-50 text-error whitespace-nowrap"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom templates */}
      {custom.length > 0 && (
        <>
          <div className="border-t border-border-light my-2" />
          <div className="flex flex-wrap gap-1.5">
            {custom.map(t => (
              <div key={t.id} className="group relative">
                <button
                  onClick={() => onApply(t)}
                  disabled={disabled}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border ${
                    activeTemplateId === t.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-primary-light text-primary border-primary/20 hover:border-primary'
                  } disabled:opacity-50`}
                  title={`${t.width || '자동'} x ${t.height || '자동'}`}
                >
                  {t.name}
                </button>
                <div className="hidden group-hover:flex absolute -top-7 left-0 bg-white shadow-md rounded border border-border text-xs z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                    className="px-2 py-1 hover:bg-gray-50 text-text-sub"
                  >
                    수정
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                    className="px-2 py-1 hover:bg-red-50 text-error"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
