import { db } from '../config/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { TeamRole } from './teams';

export interface InviteDoc {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  status: 'pending' | 'accepted';
  createdAt: Timestamp;
}

const col = () => db.collection('invites');

export const invitesRepo = {
  async findPendingByEmail(email: string): Promise<InviteDoc[]> {
    const snap = await col()
      .where('email', '==', email.toLowerCase())
      .where('status', '==', 'pending')
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InviteDoc, 'id'>) }));
  },

  async findPendingByTeamAndEmail(teamId: string, email: string): Promise<InviteDoc | null> {
    const snap = await col()
      .where('teamId', '==', teamId)
      .where('email', '==', email.toLowerCase())
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    return snap.empty
      ? null
      : { id: snap.docs[0].id, ...(snap.docs[0].data() as Omit<InviteDoc, 'id'>) };
  },

  async listPendingByTeam(teamId: string): Promise<InviteDoc[]> {
    const snap = await col()
      .where('teamId', '==', teamId)
      .where('status', '==', 'pending')
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InviteDoc, 'id'>) }));
  },

  async create(input: {
    teamId: string;
    email: string;
    role: TeamRole;
    invitedBy: string;
  }): Promise<InviteDoc> {
    const ref = col().doc();
    const doc: Omit<InviteDoc, 'id'> = {
      teamId: input.teamId,
      email: input.email.toLowerCase(),
      role: input.role,
      invitedBy: input.invitedBy,
      status: 'pending',
      createdAt: Timestamp.now(),
    };
    await ref.set(doc);
    return { id: ref.id, ...doc };
  },

  async markAccepted(id: string): Promise<void> {
    await col().doc(id).update({ status: 'accepted' });
  },

  async cancel(id: string): Promise<void> {
    await col().doc(id).delete();
  },

  async deleteByTeam(teamId: string): Promise<void> {
    const snap = await col().where('teamId', '==', teamId).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (snap.size) await batch.commit();
  },
};
