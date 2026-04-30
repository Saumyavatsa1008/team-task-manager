import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as admin from 'firebase-admin';
import { env } from './env';
import { logger } from '../utils/logger';

function loadServiceAccount(): admin.ServiceAccount {
  if (env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const json = Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
    return JSON.parse(json) as admin.ServiceAccount;
  }
  const localPath = resolve(process.cwd(), 'serviceAccount.json');
  if (existsSync(localPath)) {
    return JSON.parse(readFileSync(localPath, 'utf8')) as admin.ServiceAccount;
  }
  throw new Error(
    'Firebase service account missing. Set FIREBASE_SERVICE_ACCOUNT_B64 or place serviceAccount.json next to package.json.',
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
    projectId: env.FIREBASE_PROJECT_ID,
  });
  logger.info({ projectId: env.FIREBASE_PROJECT_ID }, 'firebase-admin initialized');
}

export const firebaseAuth = admin.auth();
export const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

export { admin };
