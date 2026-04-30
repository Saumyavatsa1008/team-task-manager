import { db } from '../config/firebase';
import { Timestamp } from 'firebase-admin/firestore';

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const col = () => db.collection('users');

export const usersRepo = {
  async get(uid: string): Promise<UserDoc | null> {
    const snap = await col().doc(uid).get();
    return snap.exists ? (snap.data() as UserDoc) : null;
  },

  async upsert(input: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string | null;
  }): Promise<UserDoc> {
    const ref = col().doc(input.uid);
    const now = Timestamp.now();
    const existing = await ref.get();
    if (existing.exists) {
      const updates: Partial<UserDoc> = {
        email: input.email,
        displayName: input.displayName,
        photoURL: input.photoURL ?? null,
        updatedAt: now,
      };
      await ref.set(updates, { merge: true });
      return { ...(existing.data() as UserDoc), ...updates } as UserDoc;
    }
    const doc: UserDoc = {
      uid: input.uid,
      email: input.email,
      displayName: input.displayName,
      photoURL: input.photoURL ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(doc);
    return doc;
  },

  async update(uid: string, patch: { displayName?: string; photoURL?: string | null }): Promise<UserDoc> {
    const ref = col().doc(uid);
    const updates = { ...patch, updatedAt: Timestamp.now() };
    await ref.set(updates, { merge: true });
    const snap = await ref.get();
    return snap.data() as UserDoc;
  },

  async findByEmail(email: string): Promise<UserDoc | null> {
    const snap = await col().where('email', '==', email.toLowerCase()).limit(1).get();
    return snap.empty ? null : (snap.docs[0].data() as UserDoc);
  },
};
