// Cloudinary storage for uploaded files. Render's free disk is wiped on every deploy,
// so when Cloudinary keys are set, files go to the cloud and the database keeps the full https link.
// Without keys the upload controller falls back to the local uploads folder (handy for local dev).
//
// Keys (Render > Environment), either one variable:
//   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
// or three:
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
const crypto = require('crypto');

function readConfig() {
  const url = process.env.CLOUDINARY_URL;
  if (url) {
    const match = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url.trim());
    if (match) return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (cloudName && apiKey && apiSecret) return { cloudName: cloudName.trim(), apiKey: apiKey.trim(), apiSecret: apiSecret.trim() };
  return null;
}

function isCloudStorageEnabled() {
  return Boolean(readConfig());
}

function sign(params, apiSecret) {
  const toSign = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

// buffer: file bytes; folder: e.g. "nanny/avatars/12"; mimeType decides image vs raw (PDF).
async function uploadToCloud({ buffer, mimeType, folder }) {
  const config = readConfig();
  if (!config) throw new Error('Cloud storage is not configured');

  // PDFs go as "raw": new Cloudinary accounts block PDF delivery for the image type.
  const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image';
  // A random id, so nobody can guess the link to someone else's document.
  const publicId = crypto.randomBytes(16).toString('hex') + (resourceType === 'raw' ? '.pdf' : '');
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, public_id: publicId, timestamp };

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), publicId);
  form.append('api_key', config.apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('public_id', publicId);
  form.append('signature', sign(params, config.apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    const reason = data?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Cloud upload failed: ${reason}`);
  }
  return { url: data.secure_url, publicId: data.public_id };
}

module.exports = { isCloudStorageEnabled, uploadToCloud };
