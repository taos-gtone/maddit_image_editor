export interface ImageInfo {
  fileName: string;
  filePath: string | null;
  fileSize: number;
  fileSizeFormatted: string;
  width: number;
  height: number;
  format: string;
  base64Preview: string;
  originalBase64: string; // full-resolution base64 for lossless operations
}

export interface ResizeRequest {
  sourcePath: string | null;
  sourceBase64: string | null;
  targetWidth: number;
  targetHeight: number;
}

export interface CropRequest {
  sourcePath: string | null;
  sourceBase64: string | null;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SaveRequest {
  sourcePath: string | null;
  sourceBase64: string | null;
  targetWidth: number;
  targetHeight: number;
  outputFormat: OutputFormat;
  quality: number;
  outputPath: string;
  crop?: { top: number; bottom: number; left: number; right: number };
}

export interface SizeTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  isBuiltIn: boolean;
  createdAt?: string;
}

export type OutputFormat = 'png' | 'jpg' | 'webp' | 'avif' | 'tiff' | 'bmp';

export interface CropValues {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ImageState {
  original: ImageInfo | null;
  uncropped: ImageInfo | null; // backup of original before any crop
  targetWidth: number;
  targetHeight: number;
  maintainAspect: boolean;
  previewBase64: string | null;
  outputFormat: OutputFormat;
  quality: number;
  isLoading: boolean;
  error: string | null;
  crop: CropValues;
}
