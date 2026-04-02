const { app, BrowserWindow, ipcMain, dialog, clipboard, net, shell } = require('electron');
const path = require('path');
const fs = require('fs');

var MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
var MAX_USER_TEMPLATES = 50;
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

let mainWindow;
let TEMPLATES_DIR;
let TEMPLATES_FILE;

const IMAGE_FILTERS = [
  {
    name: 'Image Files',
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff', 'tif',
                 'ico', 'avif', 'heif', 'heic', 'svg']
  },
  { name: 'All Files', extensions: ['*'] }
];

const DEFAULT_TEMPLATES = [
  { id: 'builtin-fhd', name: 'FHD', width: 1920, height: 1080, isBuiltIn: true },
  { id: 'builtin-hd', name: 'HD', width: 1280, height: 720, isBuiltIn: true },
  { id: 'builtin-4k', name: '4K UHD', width: 3840, height: 2160, isBuiltIn: true },
  { id: 'builtin-insta-sq', name: 'Instagram Square', width: 1080, height: 1080, isBuiltIn: true },
  { id: 'builtin-insta-story', name: 'Instagram Story', width: 1080, height: 1920, isBuiltIn: true },
  { id: 'builtin-yt-thumb', name: 'YouTube Thumb', width: 1280, height: 720, isBuiltIn: true },
  { id: 'builtin-twitter', name: 'Twitter Header', width: 1500, height: 500, isBuiltIn: true },
  { id: 'builtin-favicon', name: 'Favicon', width: 64, height: 64, isBuiltIn: true },
  { id: 'builtin-icon256', name: 'Icon 256', width: 256, height: 256, isBuiltIn: true },
  { id: 'builtin-a4', name: 'A4 300dpi', width: 2480, height: 3508, isBuiltIn: true },
];

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function mapFormat(sharpFormat) {
  var map = {
    jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif',
    tiff: 'tiff', avif: 'avif', heif: 'heif', svg: 'svg', raw: 'raw',
  };
  return map[sharpFormat] || sharpFormat || 'unknown';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 680,
    minWidth: 800,
    minHeight: 560,
    frame: false,
    backgroundColor: '#f9f9f9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'app-dist', 'index.html'));
  }
}

app.whenReady().then(function() {
  TEMPLATES_DIR = path.join(app.getPath('userData'), 'maddit-image-editor');
  TEMPLATES_FILE = path.join(TEMPLATES_DIR, 'templates.json');
  createWindow();
});
app.on('window-all-closed', function() { app.quit(); });

// Window controls
ipcMain.handle('window:minimize', function() { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle('window:maximize', function() {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle('window:close', function() { if (mainWindow) mainWindow.close(); });

// Load image from file path
ipcMain.handle('image:load', async function(_event, filePath) {
  var stats = fs.statSync(filePath);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기가 50MB를 초과합니다 (' + formatFileSize(stats.size) + ')');
  }
  var buffer = fs.readFileSync(filePath);
  var image = sharp(buffer);
  var metadata = await image.metadata();
  var previewWidth = Math.min(metadata.width || 800, 1200);
  var previewBuffer = await image
    .resize({ width: previewWidth, withoutEnlargement: true })
    .png()
    .toBuffer();
  var base64Preview = 'data:image/png;base64,' + previewBuffer.toString('base64');
  // File-based: originalBase64 not needed (use filePath for lossless ops)
  var originalBase64 = 'data:image/png;base64,' + buffer.toString('base64');
  return {
    fileName: path.basename(filePath),
    filePath: filePath,
    fileSize: stats.size,
    fileSizeFormatted: formatFileSize(stats.size),
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: mapFormat(metadata.format),
    base64Preview: base64Preview,
    originalBase64: originalBase64,
  };
});

// Load image from bytes
ipcMain.handle('image:loadFromBytes', async function(_event, bytes) {
  var buffer = Buffer.from(bytes);
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('이미지 크기가 50MB를 초과합니다 (' + formatFileSize(buffer.length) + ')');
  }
  var image = sharp(buffer);
  var metadata = await image.metadata();
  var previewWidth = Math.min(metadata.width || 800, 1200);
  var previewBuffer = await image
    .resize({ width: previewWidth, withoutEnlargement: true })
    .png()
    .toBuffer();
  var base64Preview = 'data:image/png;base64,' + previewBuffer.toString('base64');
  // Store full-resolution original for lossless operations
  var fullResPng = await sharp(buffer).png().toBuffer();
  var originalBase64 = 'data:image/png;base64,' + fullResPng.toString('base64');
  return {
    fileName: 'clipboard-image.png',
    filePath: null,
    fileSize: buffer.length,
    fileSizeFormatted: formatFileSize(buffer.length),
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: mapFormat(metadata.format),
    base64Preview: base64Preview,
    originalBase64: originalBase64,
  };
});

// Load image from clipboard
ipcMain.handle('image:loadFromClipboard', async function() {
  var img = clipboard.readImage();
  if (img.isEmpty()) return null;
  var pngBuffer = img.toPNG();
  var image = sharp(pngBuffer);
  var metadata = await image.metadata();
  var previewWidth = Math.min(metadata.width || 800, 1200);
  var previewBuffer = await image
    .resize({ width: previewWidth, withoutEnlargement: true })
    .png()
    .toBuffer();
  var base64Preview = 'data:image/png;base64,' + previewBuffer.toString('base64');
  var originalBase64 = 'data:image/png;base64,' + pngBuffer.toString('base64');
  return {
    fileName: 'clipboard-image.png',
    filePath: null,
    fileSize: pngBuffer.length,
    fileSizeFormatted: formatFileSize(pngBuffer.length),
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: 'png',
    base64Preview: base64Preview,
    originalBase64: originalBase64,
  };
});

// Fetch image from URL (CORS proxy)
ipcMain.handle('image:fetchUrl', async function(_event, url) {
  return new Promise(function(resolve, reject) {
    var chunks = [];
    var request = net.request(url);
    request.on('response', function(response) {
      if (response.statusCode !== 200) {
        reject(new Error('이미지 다운로드 실패: HTTP ' + response.statusCode));
        return;
      }
      response.on('data', function(chunk) { chunks.push(chunk); });
      response.on('end', function() {
        var buffer = Buffer.concat(chunks);
        if (buffer.length > MAX_FILE_SIZE) {
          reject(new Error('이미지 크기가 50MB를 초과합니다'));
          return;
        }
        resolve(Array.from(buffer));
      });
    });
    request.on('error', function(err) {
      reject(new Error('이미지 다운로드 실패: ' + err.message));
    });
    request.end();
  });
});

// Helper: get source buffer from request (always use original quality)
function getSourceBuffer(request) {
  if (request.sourcePath) {
    return fs.readFileSync(request.sourcePath);
  } else if (request.sourceBase64) {
    var base64Data = request.sourceBase64.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }
  throw new Error('No source image');
}

// Resize preview (always from original, never from a previous resize)
ipcMain.handle('image:resizePreview', async function(_event, request) {
  var buffer = getSourceBuffer(request);
  var pipeline = sharp(buffer);
  // Apply crop first if present
  if (request.crop && (request.crop.top || request.crop.bottom || request.crop.left || request.crop.right)) {
    var meta = await sharp(buffer).metadata();
    var cropW = (meta.width || 0) - (request.crop.left || 0) - (request.crop.right || 0);
    var cropH = (meta.height || 0) - (request.crop.top || 0) - (request.crop.bottom || 0);
    if (cropW > 0 && cropH > 0) {
      pipeline = pipeline.extract({
        left: request.crop.left || 0,
        top: request.crop.top || 0,
        width: cropW,
        height: cropH,
      });
    }
  }
  var resized = await pipeline
    .resize({ width: request.targetWidth, height: request.targetHeight, fit: 'fill' })
    .png()
    .toBuffer();
  return 'data:image/png;base64,' + resized.toString('base64');
});

// Crop only (returns cropped image info for updating state)
ipcMain.handle('image:crop', async function(_event, request) {
  var buffer = getSourceBuffer(request);
  var meta = await sharp(buffer).metadata();
  var cropW = (meta.width || 0) - (request.left || 0) - (request.right || 0);
  var cropH = (meta.height || 0) - (request.top || 0) - (request.bottom || 0);
  if (cropW <= 0 || cropH <= 0) {
    throw new Error('잘라낼 영역이 원본보다 큽니다');
  }
  var cropped = await sharp(buffer)
    .extract({ left: request.left || 0, top: request.top || 0, width: cropW, height: cropH })
    .png()
    .toBuffer();
  var previewWidth = Math.min(cropW, 1200);
  var previewBuffer = await sharp(cropped)
    .resize({ width: previewWidth, withoutEnlargement: true })
    .png()
    .toBuffer();
  return {
    width: cropW,
    height: cropH,
    fileSize: cropped.length,
    fileSizeFormatted: formatFileSize(cropped.length),
    base64Preview: 'data:image/png;base64,' + previewBuffer.toString('base64'),
    originalBase64: 'data:image/png;base64,' + cropped.toString('base64'),
  };
});

// Save image (crop first if needed, then resize from original → no quality loss)
ipcMain.handle('image:save', async function(_event, request) {
  var buffer = getSourceBuffer(request);
  var pipeline = sharp(buffer);
  // Apply crop first
  if (request.crop && (request.crop.top || request.crop.bottom || request.crop.left || request.crop.right)) {
    var meta = await sharp(buffer).metadata();
    var cropW = (meta.width || 0) - (request.crop.left || 0) - (request.crop.right || 0);
    var cropH = (meta.height || 0) - (request.crop.top || 0) - (request.crop.bottom || 0);
    if (cropW > 0 && cropH > 0) {
      pipeline = pipeline.extract({
        left: request.crop.left || 0,
        top: request.crop.top || 0,
        width: cropW,
        height: cropH,
      });
    }
  }
  // Then resize
  pipeline = pipeline.resize({
    width: request.targetWidth,
    height: request.targetHeight,
    fit: 'fill',
  });
  switch (request.outputFormat) {
    case 'png': pipeline = pipeline.png(); break;
    case 'jpg': pipeline = pipeline.jpeg({ quality: request.quality || 90 }); break;
    case 'webp': pipeline = pipeline.webp({ quality: request.quality || 90 }); break;
    case 'avif': pipeline = pipeline.avif({ quality: request.quality || 50 }); break;
    case 'tiff': pipeline = pipeline.tiff({ quality: request.quality || 80 }); break;
    default: pipeline = pipeline.png();
  }
  var outputBuffer = await pipeline.toBuffer();
  fs.writeFileSync(request.outputPath, outputBuffer);
  return request.outputPath;
});

// File dialogs
ipcMain.handle('dialog:openFile', async function() {
  var result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: IMAGE_FILTERS,
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:saveFile', async function(_event, defaultName, format) {
  var extMap = { png: 'png', jpg: 'jpg', webp: 'webp', bmp: 'bmp', avif: 'avif', tiff: 'tiff' };
  var ext = extMap[format] || 'png';
  var result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: format.toUpperCase() + ' Image', extensions: [ext] }],
  });
  if (result.canceled) return null;
  return result.filePath;
});

// Template CRUD
function ensureTemplatesDir() {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  }
}

var HIDDEN_FILE;

function loadHiddenBuiltInIds() {
  if (!HIDDEN_FILE) HIDDEN_FILE = path.join(TEMPLATES_DIR, 'hidden-builtins.json');
  try {
    if (fs.existsSync(HIDDEN_FILE)) {
      return JSON.parse(fs.readFileSync(HIDDEN_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveHiddenBuiltInIds(ids) {
  if (!HIDDEN_FILE) HIDDEN_FILE = path.join(TEMPLATES_DIR, 'hidden-builtins.json');
  ensureTemplatesDir();
  fs.writeFileSync(HIDDEN_FILE, JSON.stringify(ids), 'utf8');
}

function loadTemplates() {
  ensureTemplatesDir();
  var hiddenIds = loadHiddenBuiltInIds();
  var builtIns = DEFAULT_TEMPLATES.filter(function(t) {
    return hiddenIds.indexOf(t.id) === -1;
  });
  if (!fs.existsSync(TEMPLATES_FILE)) {
    return builtIns;
  }
  try {
    var data = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8'));
    return builtIns.concat(data);
  } catch (e) {
    return builtIns;
  }
}

function saveUserTemplates(templates) {
  ensureTemplatesDir();
  var userTemplates = templates.filter(function(t) { return !t.isBuiltIn; });
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(userTemplates, null, 2), 'utf8');
}

ipcMain.handle('template:getAll', async function() { return loadTemplates(); });

ipcMain.handle('template:add', async function(_event, name, width, height) {
  var all = loadTemplates();
  var userCount = all.filter(function(t) { return !t.isBuiltIn; }).length;
  if (userCount >= MAX_USER_TEMPLATES) {
    throw new Error('사용자 템플릿은 최대 ' + MAX_USER_TEMPLATES + '개까지 추가할 수 있습니다');
  }
  var newTemplate = {
    id: uuidv4(), name: name, width: width, height: height, isBuiltIn: false,
    createdAt: new Date().toISOString(),
  };
  all.push(newTemplate);
  saveUserTemplates(all);
  return newTemplate;
});

ipcMain.handle('template:update', async function(_event, id, name, width, height) {
  var all = loadTemplates();
  var idx = -1;
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === id) { idx = i; break; }
  }
  if (idx === -1) throw new Error('Template not found');
  if (all[idx].isBuiltIn) throw new Error('Cannot edit built-in template');
  all[idx] = Object.assign({}, all[idx], { name: name, width: width, height: height });
  saveUserTemplates(all);
  return all[idx];
});

ipcMain.handle('template:delete', async function(_event, id) {
  var all = loadTemplates();
  var target = null;
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === id) { target = all[i]; break; }
  }
  if (!target) throw new Error('Template not found');
  if (target.isBuiltIn) {
    // Hide built-in template instead of deleting
    var hiddenIds = loadHiddenBuiltInIds();
    hiddenIds.push(id);
    saveHiddenBuiltInIds(hiddenIds);
  } else {
    var filtered = all.filter(function(t) { return t.id !== id; });
    saveUserTemplates(filtered);
  }
});

// Restore all hidden built-in templates
ipcMain.handle('template:restoreBuiltIns', async function() {
  saveHiddenBuiltInIds([]);
  return loadTemplates();
});

// Fetch banner ads from REST API
ipcMain.handle('banner:fetch', async function() {
  return new Promise(function(resolve, reject) {
    var url = 'http://wontherads.cafe24.com/api/banner/list?platformCode=WIN_APP&placementCode=WIN_APP_BOTTOM';
    var request = net.request(url);
    var body = '';
    request.on('response', function(response) {
      response.on('data', function(chunk) { body += chunk.toString(); });
      response.on('end', function() {
        try {
          var data = JSON.parse(body);
          resolve(data);
        } catch (e) {
          reject(new Error('Banner JSON parse error'));
        }
      });
    });
    request.on('error', function(err) { reject(err); });
    request.end();
  });
});

// Open URL in external browser
ipcMain.handle('shell:openExternal', async function(_event, url) {
  await shell.openExternal(url);
});
