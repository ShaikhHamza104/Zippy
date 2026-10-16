// server/prisma.config.js
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load root .env relative to this configuration file location
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export default {};
