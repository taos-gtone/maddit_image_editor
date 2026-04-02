import { useState, useEffect, useCallback, useRef } from 'react';
import TitleBar from './components/TitleBar';
import ImagePreview from './components/ImagePreview';
import ImageInfo from './components/ImageInfo';
import ResizeControls from './components/ResizeControls';
import TemplateList from './components/TemplateList';
import TemplateModal from './components/TemplateModal';
import SavePanel from './components/SavePanel';
import { useImage } from './hooks/useImage';
import { useTemplates } from './hooks/useTemplates';
import type { SizeTemplate } from './types';

export default function App() {
  const image = useImage();
  const tmpl = useTemplates();
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        image.loadFromFile();
      }
      if (e.ctrlKey && e.key === 'v') {
        image.loadFromClipboard();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleSave();
        return;
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        image.resetToOriginal();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // Show toast
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    const result = await image.saveImage();
    if (result) {
      showToast('이미지가 저장되었습니다', 'success');
    } else if (image.state.error) {
      showToast(image.state.error, 'error');
    }
  }, [image, showToast]);

  // Template apply
  const handleTemplateApply = useCallback((template: SizeTemplate) => {
    setActiveTemplateId(template.id);
    image.applyTemplate(template.width, template.height);
  }, [image]);

  // Reset active template when manually changing size
  useEffect(() => {
    setActiveTemplateId(null);
  }, [image.state.maintainAspect]);

  // Banner state
  const [banner, setBanner] = useState<{
    imageUrl: string;
    clickUrl: string;
    mediaType?: string;
    mediaUrl?: string;
  } | null>(null);
  const bannerFetched = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (bannerFetched.current) return;
    bannerFetched.current = true;
    window.electronAPI.fetchBanners()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.data ?? data?.list ?? data?.banners;
        if (Array.isArray(list) && list.length > 0) {
          const item = list[0];
          if (item.imageUrl || item.mediaUrl) {
            setBanner({
              imageUrl: item.imageUrl || '',
              clickUrl: item.clickUrl || '',
              mediaType: item.mediaType || 'IMAGE',
              mediaUrl: item.mediaUrl || '',
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  const hasImage = !!image.state.original;

  return (
    <div className="h-screen flex flex-col bg-bg">
      <TitleBar />

      {/* Main content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left: Image Preview + Ad */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <ImagePreview
            previewBase64={image.state.previewBase64}
            isLoading={image.state.isLoading}
            error={image.state.error}
            targetWidth={image.state.targetWidth}
            targetHeight={image.state.targetHeight}
            maintainAspect={image.state.maintainAspect}
            originalWidth={image.state.original?.width ?? 0}
            originalHeight={image.state.original?.height ?? 0}
            hasUncropped={!!image.state.uncropped}
            onFileOpen={image.loadFromFile}
            onFileDrop={image.loadFromPath}
            onBytesDrop={image.loadFromBytes}
            onClipboardPaste={image.loadFromClipboard}
            onClear={image.clearImage}
            onResize={(w, h) => { setActiveTemplateId(null); image.setTargetWidth(w); setTimeout(() => image.setTargetHeight(h), 0); }}
            onCropApply={image.applyCrop}
            onRevertUncropped={image.revertToUncropped}
          />

          {/* Ad Banner Area */}
          <div className="h-[90px] flex-shrink-0 bg-surface rounded-lg border border-border flex items-center justify-center overflow-hidden">
            {banner ? (
              banner.mediaType === 'VIDEO' && banner.mediaUrl ? (
                <video
                  ref={videoRef}
                  src={banner.mediaUrl}
                  className="h-full w-full object-contain cursor-pointer"
                  muted
                  autoPlay
                  loop
                  playsInline
                  onClick={() => banner.clickUrl && window.electronAPI.openExternal(banner.clickUrl)}
                />
              ) : (
                <img
                  src={banner.imageUrl}
                  alt="ad"
                  className="h-full w-full object-contain cursor-pointer"
                  onClick={() => banner.clickUrl && window.electronAPI.openExternal(banner.clickUrl)}
                />
              )
            ) : (
              <div className="text-text-muted text-xs text-center">
                <p className="font-medium">AD SPACE</p>
                <p className="mt-0.5">728 x 90</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Control Panel */}
        <div className="w-[320px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
          <ImageInfo info={image.state.original} />

          <ResizeControls
            targetWidth={image.state.targetWidth}
            targetHeight={image.state.targetHeight}
            maintainAspect={image.state.maintainAspect}
            originalWidth={image.state.original?.width ?? 0}
            originalHeight={image.state.original?.height ?? 0}
            disabled={!hasImage}
            onWidthChange={w => { setActiveTemplateId(null); image.setTargetWidth(w); }}
            onHeightChange={h => { setActiveTemplateId(null); image.setTargetHeight(h); }}
            onMaintainAspectChange={image.setMaintainAspect}
            onReset={image.resetToOriginal}
          />

          <TemplateList
            templates={tmpl.templates}
            disabled={!hasImage}
            activeTemplateId={activeTemplateId}
            onApply={handleTemplateApply}
            onAdd={tmpl.openAddModal}
            onEdit={tmpl.openEditModal}
            onDelete={tmpl.deleteTemplate}
            onRestoreBuiltIns={tmpl.restoreBuiltIns}
          />

          <SavePanel
            outputFormat={image.state.outputFormat}
            quality={image.state.quality}
            disabled={!hasImage}
            isLoading={image.state.isLoading}
            onFormatChange={image.setOutputFormat}
            onQualityChange={image.setQuality}
            onSave={handleSave}
          />
        </div>
      </div>

      {/* Template Modal */}
      <TemplateModal
        isOpen={tmpl.isModalOpen}
        editingTemplate={tmpl.editingTemplate}
        onSave={tmpl.addTemplate}
        onUpdate={tmpl.updateTemplate}
        onClose={tmpl.closeModal}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium toast-enter z-50 ${
          toast.type === 'success'
            ? 'bg-success text-white'
            : 'bg-error text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
