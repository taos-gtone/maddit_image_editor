import type { ImageInfo as ImageInfoType } from '../types';

interface Props {
  info: ImageInfoType | null;
}

export default function ImageInfo({ info }: Props) {
  if (!info) {
    return (
      <div className="bg-surface rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-text mb-3">파일 정보</h3>
        <p className="text-text-muted text-xs">이미지를 불러오면 정보가 표시됩니다</p>
      </div>
    );
  }

  const rows = [
    { label: '파일명', value: info.fileName },
    { label: '용량', value: info.fileSizeFormatted },
    { label: '크기', value: `${info.width} x ${info.height} px` },
    { label: '포맷', value: info.format.toUpperCase() },
  ];

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-text mb-3">파일 정보</h3>
      <div className="flex flex-col gap-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between">
            <span className="text-xs text-text-sub">{r.label}</span>
            <span className="text-sm font-medium text-text truncate ml-3 max-w-[180px] text-right" title={r.value}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
