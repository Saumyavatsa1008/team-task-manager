import { db } from '../config/firebase';
import { Timestamp } from 'firebase-admin/firestore';

export type ProjectStatus = 'active' | 'archived';

export interface ProjectDoc {
  id: string;
  teamIds: string[];
  name: string;
  description: string;
  ownerId: string;
  status: ProjectStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const col = () => db.collection('projects');

export const projectsRepo = {
  async get(id: string): Promise<ProjectDoc | null> {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as Omit<ProjectDoc, 'id'>) };
  },

  async listByTeam(teamId: string): Promise<ProjectDoc[]> {
    const snap = await col()
      .where('teamIds', 'array-contains', teamId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectDoc, 'id'>) }));
  },

  async listByTeams(teamIds: string[]): Promise<ProjectDoc[]> {
    if (teamIds.length === 0) return [];
    // array-contains-any is capped at 10 values per query.
    const chunks: string[][] = [];
    for (let i = 0; i < teamIds.length; i += 10) chunks.push(teamIds.slice(i, i + 10));
    const results = await Promise.all(
      chunks.map((c) => col().where('teamIds', 'array-contains-any', c).get()),
    );
    // Remove duplicates manually since chunks could overlap project results
    const uniqueMap = new Map<string, ProjectDoc>();
    results.flatMap((s) => s.docs).forEach((d) => {
      if (!uniqueMap.has(d.id)) {
        uniqueMap.set(d.id, { id: d.id, ...(d.data() as Omit<ProjectDoc, 'id'>) });
      }
    });
    return Array.from(uniqueMap.values());
  },

  async create(input: {
    teamIds: string[];
    name: string;
    description: string;
    ownerId: string;
  }): Promise<ProjectDoc> {
    const ref = col().doc();
    const now = Timestamp.now();
    const doc: Omit<ProjectDoc, 'id'> = {
      teamIds: input.teamIds,
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(doc);
    return { id: ref.id, ...doc };
  },

  async update(
    id: string,
    patch: Partial<Pick<ProjectDoc, 'name' | 'description' | 'status'>>,
  ): Promise<ProjectDoc> {
    const ref = col().doc(id);
    await ref.set({ ...patch, updatedAt: Timestamp.now() }, { merge: true });
    const snap = await ref.get();
    return { id: snap.id, ...(snap.data() as Omit<ProjectDoc, 'id'>) };
  },

  async delete(id: string): Promise<void> {
    await col().doc(id).delete();
  },

  async deleteByTeam(teamId: string): Promise<string[]> {
    const snap = await col().where('teamIds', 'array-contains', teamId).get();
    const ids = snap.docs.map((d) => d.id);
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (ids.length) await batch.commit();
    return ids;
  },
};
