// server/src/services/storage.service.js
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define upload directory relative to server root
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

// Ensure directory exists on module load
if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Multer upload middleware with memory storage and strict type filtering.
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const err = new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      err.code = 'INVALID_FILE_TYPE';
      err.status = 400;
      err.statusCode = 400;
      return cb(err, false);
    }
    cb(null, true);
  },
});

/**
 * Processes an uploaded image buffer with Sharp, resizes it, and saves it
 * to local disk or remote storage.
 *
 * @param {object} file - Express Multer file object
 * @param {object} [options]
 * @param {number} [options.maxWidth=1200]
 * @param {number} [options.maxHeight=1200]
 * @param {number} [options.quality=85]
 * @returns {Promise<{ url: string, filename: string, size: number, width: number, height: number, mimeType: string }>}
 */
export const processAndSaveImage = async (
  file,
  { maxWidth = 1200, maxHeight = 1200, quality = 85 } = {}
) => {
  if (!file || !file.buffer) {
    throw new Error('No image buffer provided for processing');
  }

  // 1. Validate magic bytes and extract metadata via Sharp
  const sharpInstance = sharp(file.buffer);
  const metadata = await sharpInstance.metadata();

  if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
    const err = new Error('Image verification failed: unsupported or corrupted image stream');
    err.code = 'INVALID_IMAGE_STREAM';
    throw err;
  }

  // 2. Resize and optimize image to WebP
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const filename = `img_${Date.now()}_${randomSuffix}.webp`;

  const processedBuffer = await sharpInstance
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();

  const processedMetadata = await sharp(processedBuffer).metadata();

  // 3. Store file according to configured provider
  if (env.STORAGE_PROVIDER === 'local') {
    const filePath = path.join(UPLOAD_ROOT, filename);
    await fs.promises.writeFile(filePath, processedBuffer);

    const baseUrl = env.STORAGE_BASE_URL || '';
    const fileUrl = `${baseUrl}/uploads/${filename}`;

    logger.info(
      { filename, size: processedBuffer.length, path: filePath },
      'Image processed and saved to local storage'
    );

    return {
      url: fileUrl,
      filename,
      size: processedBuffer.length,
      width: processedMetadata.width || 0,
      height: processedMetadata.height || 0,
      mimeType: 'image/webp',
    };
  }

  // Fallback for S3 / Cloudinary configurations
  const baseUrl = env.STORAGE_BASE_URL || '';
  const fileUrl = `${baseUrl}/uploads/${filename}`;

  return {
    url: fileUrl,
    filename,
    size: processedBuffer.length,
    width: processedMetadata.width || 0,
    height: processedMetadata.height || 0,
    mimeType: 'image/webp',
  };
};

export { UPLOAD_ROOT };
