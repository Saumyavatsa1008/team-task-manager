import { db } from '../config/firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export type TeamRole = 'admin' | 'member';

export interface TeamDoc {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  roles: Record<string, TeamRole>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const col = () => db.collection('teams');

export const teamsRepo = {
  async get(id: string): Promise<TeamDoc | null> {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as Omit<TeamDoc, 'id'>) };
  },

  async listForUser(uid: string): Promise<TeamDoc[]> {
    const snap = await col().where('memberIds', 'array-contains', uid).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TeamDoc, 'id'>) }));
  },

  async create(input: {
    name: string;
    description: string;
    ownerId: string;
  }): Promise<TeamDoc> {
    const ref = col().doc();
    const now = Timestamp.now();
    const doc: Omit<TeamDoc, 'id'> = {
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
      memberIds: [input.ownerId],
      roles: { [input.ownerId]: 'admin' },
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(doc);
    return { id: ref.id, ...doc };
  },

  async update(id: string, patch: Partial<Pick<TeamDoc, 'name' | 'description'>>): Promise<TeamDoc> {
    const ref = col().doc(id);
    await ref.set({ ...patch, updatedAt: Timestamp.now() }, { merge: true });
    const snap = await ref.get();
    return { id: snap.id, ...(snap.data() as Omit<TeamDoc, 'id'>) };
  },

  async delete(id: string): Promise<void> {
    // Cascade is handled by services (delete projects + tasks); here we just remove the team doc.
    await col().doc(id).delete();
  },

  async addMember(teamId: string, uid: string, role: TeamRole): Promise<TeamDoc> {
    const ref = col().doc(teamId);
    await ref.update({
      memberIds: FieldValue.arrayUnion(uid),
      [`roles.${uid}`]: role,
      updatedAt: Timestamp.now(),
    });
    const snap = await ref.get();
    return { id: snap.id, ...(snap.data() as Omit<TeamDoc, 'id'>) };
  },

  async setRole(teamId: string, uid: string, role: TeamRole): Promise<TeamDoc> {
    const ref = col().doc(teamId);
    await ref.update({ [`roles.${uid}`]: role, updatedAt: Timestamp.now() });
    const snap = await ref.get();
    return { id: snap.id, ...(snap.data() as Omit<TeamDoc, 'id'>) };
  },

  async removeMember(teamId: string, uid: string): Promise<TeamDoc> {
    const ref = col().doc(teamId);
    await ref.update({
      memberIds: FieldValue.arrayRemove(uid),
      [`roles.${uid}`]: FieldValue.delete(),
      updatedAt: Timestamp.now(),
    });
    const snap = await ref.get();
    return { id: snap.id, ...(snap.data() as Omit<TeamDoc, 'id'>) };
  },
};
