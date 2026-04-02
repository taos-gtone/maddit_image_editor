export default function TitleBar() {
  return (
    <div
      className="h-10 bg-surface border-b border-border flex items-center px-4 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Logo */}
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-primary font-bold text-base tracking-tight">Maddit</span>
        <span className="text-text font-normal text-sm">Image Editor v1.0.0</span>
      </div>

      {/* Window Controls */}
      <div
        className="flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-text-sub"
          title="최소화"
        >
          <svg width="12" height="1" viewBox="0 0 12 1"><rect width="12" height="1" fill="currentColor"/></svg>
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-text-sub"
          title="최대화"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9"/>
          </svg>
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="w-10 h-10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-text-sub"
          title="닫기"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10"/><line x1="10" y1="0" x2="0" y2="10"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
