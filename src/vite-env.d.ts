/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    loadImage: (filePath: string) => Promise<import('./types').ImageInfo>;
    loadImageFromBytes: (bytes: number[]) => Promise<import('./types').ImageInfo>;
    loadImageFromClipboard: () => Promise<import('./types').ImageInfo | null>;
    resizePreview: (request: import('./types').ResizeRequest) => Promise<string>;
    saveImage: (request: import('./types').SaveRequest) => Promise<string>;
    cropImage: (request: import('./types').CropRequest) => Promise<{ width: number; height: number; fileSize: number; fileSizeFormatted: string; base64Preview: string; originalBase64: string }>;
    fetchImageUrl: (url: string) => Promise<number[]>;
    openFileDialog: () => Promise<string | null>;
    saveFileDialog: (defaultName: string, format: string) => Promise<string | null>;
    getTemplates: () => Promise<import('./types').SizeTemplate[]>;
    addTemplate: (name: string, width: number, height: number) => Promise<import('./types').SizeTemplate>;
    updateTemplate: (id: string, name: string, width: number, height: number) => Promise<import('./types').SizeTemplate>;
    deleteTemplate: (id: string) => Promise<void>;
    restoreBuiltInTemplates: () => Promise<import('./types').SizeTemplate[]>;
    fetchBanners: () => Promise<any>;
    openExternal: (url: string) => Promise<void>;
    onFileDrop: (callback: (filePath: string) => void) => void;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
  };
}
