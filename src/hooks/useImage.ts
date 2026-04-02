import { useState, useCallback, useRef } from 'react';
import type { ImageInfo, ImageState, OutputFormat, CropValues } from '../types';

const initialCrop: CropValues = { top: 0, bottom: 0, left: 0, right: 0 };

const initialState: ImageState = {
  original: null,
  uncropped: null,
  targetWidth: 0,
  targetHeight: 0,
  maintainAspect: true,
  previewBase64: null,
  outputFormat: 'png',
  quality: 90,
  isLoading: false,
  error: null,
  crop: { ...initialCrop },
};

export function useImage() {
  const [state, setState] = useState<ImageState>(initialState);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSource = useCallback((info: ImageInfo) => ({
    sourcePath: info.filePath,
    sourceBase64: info.filePath ? null : info.originalBase64,
  }), []);

  const setImage = useCallback((info: ImageInfo) => {
    setState({
      ...initialState,
      original: info,
      uncropped: null, // no crop yet, uncropped not needed
      targetWidth: info.width,
      targetHeight: info.height,
      previewBase64: info.base64Preview,
    });
  }, []);

  const loadFromFile = useCallback(async () => {
    try {
      setState(s => ({ ...s, isLoading: true, error: null }));
      const filePath = await window.electronAPI.openFileDialog();
      if (!filePath) {
        setState(s => ({ ...s, isLoading: false }));
        return;
      }
      const info = await window.electronAPI.loadImage(filePath);
      setImage(info);
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err.message || '이미지 로드 실패' }));
    }
  }, [setImage]);

  const loadFromPath = useCallback(async (filePath: string) => {
    try {
      setState(s => ({ ...s, isLoading: true, error: null }));
      const info = await window.electronAPI.loadImage(filePath);
      setImage(info);
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err.message || '이미지 로드 실패' }));
    }
  }, [setImage]);

  const loadFromBytes = useCallback(async (bytes: number[]) => {
    try {
      setState(s => ({ ...s, isLoading: true, error: null }));
      const info = await window.electronAPI.loadImageFromBytes(bytes);
      setImage(info);
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err.message || '이미지 로드 실패' }));
    }
  }, [setImage]);

  const loadFromClipboard = useCallback(async () => {
    try {
      setState(s => ({ ...s, isLoading: true, error: null }));
      const info = await window.electronAPI.loadImageFromClipboard();
      if (!info) {
        setState(s => ({ ...s, isLoading: false, error: '클립보드에 이미지가 없습니다' }));
        return;
      }
      setImage(info);
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err.message || '클립보드 로드 실패' }));
    }
  }, [setImage]);

  const updatePreview = useCallback(async (width: number, height: number) => {
    if (!state.original) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const preview = await window.electronAPI.resizePreview({
          ...getSource(state.original!),
          targetWidth: width,
          targetHeight: height,
        } as any);
        setState(s => ({ ...s, previewBase64: preview, error: null }));
      } catch (err: any) {
        setState(s => ({ ...s, error: err.message || '리사이즈 미리보기 실패' }));
      }
    }, 300);
  }, [state.original, getSource]);

  const setTargetWidth = useCallback((w: number) => {
    setState(s => {
      const newWidth = Math.max(1, Math.min(w, 10000));
      let newHeight = s.targetHeight;
      if (s.maintainAspect && s.original && s.original.width > 0) {
        newHeight = Math.round(newWidth * (s.original.height / s.original.width));
      }
      return { ...s, targetWidth: newWidth, targetHeight: newHeight };
    });
    if (state.original) {
      const newHeight = state.maintainAspect && state.original.width > 0
        ? Math.round(w * (state.original.height / state.original.width))
        : state.targetHeight;
      updatePreview(w, newHeight);
    }
  }, [state.original, state.maintainAspect, state.targetHeight, updatePreview]);

  const setTargetHeight = useCallback((h: number) => {
    setState(s => {
      const newHeight = Math.max(1, Math.min(h, 10000));
      let newWidth = s.targetWidth;
      if (s.maintainAspect && s.original && s.original.height > 0) {
        newWidth = Math.round(newHeight * (s.original.width / s.original.height));
      }
      return { ...s, targetWidth: newWidth, targetHeight: newHeight };
    });
    if (state.original) {
      const newWidth = state.maintainAspect && state.original.height > 0
        ? Math.round(h * (state.original.width / state.original.height))
        : state.targetWidth;
      updatePreview(newWidth, h);
    }
  }, [state.original, state.maintainAspect, state.targetWidth, updatePreview]);

  const setMaintainAspect = useCallback((v: boolean) => {
    setState(s => ({ ...s, maintainAspect: v }));
  }, []);

  const applyTemplate = useCallback((width: number, height: number) => {
    setState(s => {
      let w = width;
      let h = height;
      if (s.original && (w === 0 || h === 0)) {
        const origW = s.original.width;
        const origH = s.original.height;
        if (w === 0 && h > 0 && origH > 0) {
          w = Math.round(h * (origW / origH));
        } else if (h === 0 && w > 0 && origW > 0) {
          h = Math.round(w * (origH / origW));
        }
      }
      updatePreview(w, h);
      return { ...s, targetWidth: w, targetHeight: h, maintainAspect: false };
    });
  }, [updatePreview]);

  const setOutputFormat = useCallback((f: OutputFormat) => {
    setState(s => ({ ...s, outputFormat: f }));
  }, []);

  const setQuality = useCallback((q: number) => {
    setState(s => ({ ...s, quality: q }));
  }, []);

  const clearImage = useCallback(() => {
    setState(initialState);
  }, []);

  const resetToOriginal = useCallback(() => {
    if (!state.original) return;
    setState(s => ({
      ...s,
      targetWidth: s.original!.width,
      targetHeight: s.original!.height,
      previewBase64: s.original!.base64Preview,
      maintainAspect: true,
      crop: { ...initialCrop },
    }));
  }, [state.original]);

  // Revert to uncropped original (undo all crops)
  const revertToUncropped = useCallback(() => {
    if (!state.uncropped) return;
    const info = state.uncropped;
    setState(s => ({
      ...s,
      original: info,
      uncropped: null,
      targetWidth: info.width,
      targetHeight: info.height,
      previewBase64: info.base64Preview,
      maintainAspect: true,
      crop: { ...initialCrop },
    }));
  }, [state.uncropped]);

  // Crop: apply crop rect (pixel values relative to current original)
  const applyCrop = useCallback(async (crop: CropValues) => {
    if (!state.original) return;
    const { top, bottom, left, right } = crop;
    if (top === 0 && bottom === 0 && left === 0 && right === 0) return;
    try {
      setState(s => ({ ...s, isLoading: true, error: null }));
      const result = await window.electronAPI.cropImage({
        ...getSource(state.original),
        top, bottom, left, right,
      });
      setState(s => ({
        ...s,
        isLoading: false,
        // Save first uncropped backup (only if not already saved)
        uncropped: s.uncropped || s.original,
        original: {
          ...s.original!,
          width: result.width,
          height: result.height,
          fileSize: result.fileSize,
          fileSizeFormatted: result.fileSizeFormatted,
          base64Preview: result.base64Preview,
          originalBase64: result.originalBase64,
          filePath: null,
        },
        targetWidth: result.width,
        targetHeight: result.height,
        previewBase64: result.base64Preview,
        crop: { ...initialCrop },
      }));
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err.message || '크롭 실패' }));
    }
  }, [state.original, getSource]);

  const setCrop = useCallback((crop: CropValues) => {
    setState(s => ({ ...s, crop }));
  }, []);

  const saveImage = useCallback(async () => {
    if (!state.original) return;
    try {
      setState(s => ({ ...s, isLoading: true, error: null }));
      const baseName = state.original.fileName.replace(/\.[^.]+$/, '');
      const defaultName = `${baseName}_${state.targetWidth}x${state.targetHeight}.${state.outputFormat}`;
      const outputPath = await window.electronAPI.saveFileDialog(defaultName, state.outputFormat);
      if (!outputPath) {
        setState(s => ({ ...s, isLoading: false }));
        return;
      }
      await window.electronAPI.saveImage({
        ...getSource(state.original),
        targetWidth: state.targetWidth,
        targetHeight: state.targetHeight,
        outputFormat: state.outputFormat,
        quality: state.quality,
        outputPath,
      });
      setState(s => ({ ...s, isLoading: false, error: null }));
      return outputPath;
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err.message || '저장 실패' }));
      return null;
    }
  }, [state, getSource]);

  return {
    state,
    loadFromFile,
    loadFromPath,
    loadFromBytes,
    loadFromClipboard,
    clearImage,
    setTargetWidth,
    setTargetHeight,
    setMaintainAspect,
    applyTemplate,
    setOutputFormat,
    setQuality,
    resetToOriginal,
    revertToUncropped,
    saveImage,
    applyCrop,
    setCrop,
  };
}
