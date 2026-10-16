// scripts/mongo-backup.js
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
  console.error('[BACKUP ERROR] MONGODB_URI is not defined in .env or environment');
  process.exit(1);
}

// Dynamically resolve mongoose from server package
const mongooseModulePath = path.resolve(process.cwd(), 'server/node_modules/mongoose/index.js');
const mongooseModule = await import(`file://${mongooseModulePath.replace(/\\/g, '/')}`);
const mongoose = mongooseModule.default || mongooseModule;

const outputFile =
  process.argv[2] || path.join(process.cwd(), 'backups', `mongo_backup_${Date.now()}.json.gz`);

async function runBackup() {
  console.log(`[MONGO BACKUP] Connecting to MongoDB (${uri.split('@').pop()})...`);
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      database: db.databaseName,
      collectionCount: collections.length,
    },
    collections: {},
  };

  for (const col of collections) {
    if (col.name.startsWith('system.')) continue;
    console.log(`[MONGO BACKUP] Exporting collection "${col.name}"...`);
    const docs = await db.collection(col.name).find({}).toArray();
    const indexes = await db.collection(col.name).indexes();
    backupData.collections[col.name] = {
      indexes,
      documents: docs,
    };
  }

  // Ensure backups directory exists
  const outDir = path.dirname(outputFile);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Compress with gzip using EJSON for full BSON type fidelity (ObjectIds, Dates)
  const jsonBuffer = Buffer.from(mongoose.mongo.BSON.EJSON.stringify(backupData));
  const compressed = zlib.gzipSync(jsonBuffer);
  fs.writeFileSync(outputFile, compressed);

  const sizeKb = (compressed.length / 1024).toFixed(2);
  console.log(`[MONGO BACKUP] Backup saved successfully to: ${outputFile} (${sizeKb} KB)`);

  await mongoose.disconnect();
}

runBackup().catch((err) => {
  console.error('[MONGO BACKUP FAILED]', err);
  process.exit(1);
});
