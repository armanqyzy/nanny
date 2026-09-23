const fs = require('fs/promises');
const path = require('path');

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const UPLOAD_KINDS = {
  document: {
    folder: 'documents',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
  },
  avatar: {
    folder: 'avatars',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  'pet-photo': {
    folder: 'pets',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  'booking-photo': {
    folder: 'booking-updates',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  'product-photo': {
    folder: 'products',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
};

function sanitizeBaseName(filename) {
  return String(filename || 'file')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'file';
}

function extensionFromMime(mimeType) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  };
  return map[mimeType] || '';
}

async function uploadDocument(req, res) {
  if (!req.body || !Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).json({ error: 'No file payload received' });
  }

  if (req.body.length > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ error: 'File is too large' });
  }

  const kind = String(req.query.kind || 'document');
  const config = UPLOAD_KINDS[kind];
  if (!config) {
    return res.status(400).json({ error: 'Invalid upload kind' });
  }

  const mimeType = req.headers['content-type'] || 'application/octet-stream';
  if (!config.mimeTypes.includes(mimeType)) {
    return res.status(400).json({ error: `This file type is not allowed for ${kind}` });
  }

  const originalName = req.headers['x-file-name'] || 'document';
  const ext = (path.extname(String(originalName)) || extensionFromMime(mimeType)).toLowerCase();
  if (!config.extensions.includes(ext)) {
    return res.status(400).json({ error: `This file extension is not allowed for ${kind}` });
  }
  const safeName = sanitizeBaseName(path.basename(String(originalName), path.extname(String(originalName))));
  const relativeDir = path.join(config.folder, String(req.user.id));
  const absoluteDir = path.join(UPLOADS_DIR, relativeDir);

  await fs.mkdir(absoluteDir, { recursive: true });

  const filename = `${Date.now()}-${safeName}${ext}`;
  const absoluteFile = path.join(absoluteDir, filename);
  await fs.writeFile(absoluteFile, req.body);

  const fileUrl = `/uploads/${relativeDir.replace(/\\/g, '/')}/${filename}`;
  res.status(201).json({
    ok: true,
    kind,
    url: fileUrl,
    mime_type: mimeType,
    original_name: originalName,
    size: req.body.length,
  });
}

module.exports = {
  uploadDocument,
};
