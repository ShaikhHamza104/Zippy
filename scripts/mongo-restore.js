// scripts/mongo-restore.js
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Parse .env natively without external dependencies
const envPath = path.resolve(process.cwd(), '.env');
let uri = process.env.MONGODB_URI;

if (!uri && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed
        .substring(idx + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      if (key === 'MONGODB_URI') {
        uri = val;
        break;
      }
    }
  }
}

if (!uri) {
  console.error('[RESTORE ERROR] MONGODB_URI is not defined in .env or environment');
  process.exit(1);
}

const inputFile = process.argv[2];
if (!inputFile || !fs.existsSync(inputFile)) {
  console.error(`[RESTORE ERROR] Backup file not found: ${inputFile}`);
  process.exit(1);
}

// Dynamically resolve mongoose from server package
const mongooseModulePath = path.resolve(process.cwd(), 'server/node_modules/mongoose/index.js');
const mongooseModule = await import(`file://${mongooseModulePath.replace(/\\/g, '/')}`);
const mongoose = mongooseModule.default || mongooseModule;

async function runRestore() {
  console.log(`[MONGO RESTORE] Reading backup file: ${inputFile}...`);
  const rawData = fs.readFileSync(inputFile);
  const decompressed = zlib.gunzipSync(rawData).toString('utf-8');
  const backup = mongoose.mongo.BSON.EJSON.parse(decompressed);

  console.log(`[MONGO RESTORE] Connecting to target MongoDB...`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const colNames = Object.keys(backup.collections || {});
  console.log(`[MONGO RESTORE] Restoring ${colNames.length} collections...`);

  for (const name of colNames) {
    const colData = backup.collections[name];
    const docs = colData.documents || [];
    console.log(`[MONGO RESTORE] Restoring "${name}" (${docs.length} documents)...`);

    // Drop existing collection to ensure clean restore
    try {
      await db.collection(name).drop();
    } catch {
      // Collection did not exist yet
    }

    if (docs.length > 0) {
      // Ensure all 24-hex _id, categoryId, productId fields are genuine ObjectIds
      for (const doc of docs) {
        if (doc._id && typeof doc._id === 'string' && /^[0-9a-fA-F]{24}$/.test(doc._id)) {
          doc._id = new mongoose.Types.ObjectId(doc._id);
        }
        if (
          doc.categoryId &&
          typeof doc.categoryId === 'string' &&
          /^[0-9a-fA-F]{24}$/.test(doc.categoryId)
        ) {
          doc.categoryId = new mongoose.Types.ObjectId(doc.categoryId);
        }
        if (
          doc.productId &&
          typeof doc.productId === 'string' &&
          /^[0-9a-fA-F]{24}$/.test(doc.productId)
        ) {
          doc.productId = new mongoose.Types.ObjectId(doc.productId);
        }
      }

      // Re-insert documents
      await db.collection(name).insertMany(docs);
    }

    // Recreate indexes
    if (colData.indexes && colData.indexes.length > 0) {
      for (const idx of colData.indexes) {
        if (idx.name === '_id_') continue;
        try {
          const { key, ...options } = idx;
          delete options.v;
          delete options.ns;
          await db.collection(name).createIndex(key, options);
        } catch (idxErr) {
          console.warn(`[MONGO RESTORE] Warning recreating index on ${name}:`, idxErr.message);
        }
      }
    }
  }

  console.log(`[MONGO RESTORE] MongoDB restore completed successfully.`);
  await mongoose.disconnect();
}

runRestore().catch((err) => {
  console.error('[MONGO RESTORE FAILED]', err);
  process.exit(1);
});
