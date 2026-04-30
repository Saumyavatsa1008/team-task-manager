import type { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../config/firebase';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthenticated('Missing bearer token');
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) throw ApiError.unauthenticated('Missing bearer token');

  try {
    const decoded = await firebaseAuth.verifyIdToken(token, true);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: (decoded.name as string | undefined) ?? null,
      photoURL: (decoded.picture as string | undefined) ?? null,
      emailVerified: decoded.email_verified ?? false,
    };
    next();
  } catch (err) {
    throw ApiError.unauthenticated('Invalid or expired token');
  }
});
