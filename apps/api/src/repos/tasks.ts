import { db } from '../config/firebase';
import { Timestamp } from 'firebase-admin/firestore';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskDoc {
  id: string;
  projectId: string;
  teamIds: string[];
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Timestamp | null;
  assigneeIds: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const col = () => db.collection('tasks');

export const tasksRepo = {
  async get(id: string): Promise<TaskDoc | null> {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as Omit<TaskDoc, 'id'>) };
  },

  async listByProject(projectId: string, filters: { status?: TaskStatus; assigneeId?: string } = {}): Promise<TaskDoc[]> {
    let q = col().where('projectId', '==', projectId) as FirebaseFirestore.Query;
    if (filters.status) q = q.where('status', '==', filters.status);
    if (filters.assigneeId) q = q.where('assigneeIds', 'array-contains', filters.assigneeId);
    q = q.orderBy('createdAt', 'desc');
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TaskDoc, 'id'>) }));
  },

  async listByAssignee(uid: string): Promise<TaskDoc[]> {
    const snap = await col().where('assigneeIds', 'array-contains', uid).orderBy('dueDate', 'asc').get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TaskDoc, 'id'>) }));
  },

  async listByTeams(teamIds: string[]): Promise<TaskDoc[]> {
    if (teamIds.length === 0) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < teamIds.length; i += 10) chunks.push(teamIds.slice(i, i + 10));
    const results = await Promise.all(
      chunks.map((c) => col().where('teamIds', 'array-contains-any', c).get()),
    );
    const uniqueMap = new Map<string, TaskDoc>();
    results.flatMap((s) => s.docs).forEach((d) => {
      if (!uniqueMap.has(d.id)) {
        uniqueMap.set(d.id, { id: d.id, ...(d.data() as Omit<TaskDoc, 'id'>) });
      }
    });
    return Array.from(uniqueMap.values());
  },

  async create(input: {
    projectId: string;
    teamIds: string[];
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    assigneeIds: string[];
    createdBy: string;
  }): Promise<TaskDoc> {
    const ref = col().doc();
    const now = Timestamp.now();
    const doc: Omit<TaskDoc, 'id'> = {
      projectId: input.projectId,
      teamIds: input.teamIds,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
      assigneeIds: input.assigneeIds,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(doc);
    return { id: ref.id, ...doc };
  },

  async update(
    id: string,
    patch: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      dueDate: Date | null;
      assigneeIds: string[];
    }>,
  ): Promise<TaskDoc> {
    const ref = col().doc(id);
    const data: Record<string, unknown> = { ...patch, updatedAt: Timestamp.now() };
    if ('dueDate' in patch) {
      data.dueDate = patch.dueDate ? Timestamp.fromDate(patch.dueDate as Date) : null;
    }
    await ref.set(data, { merge: true });
    const snap = await ref.get();
    return { id: snap.id, ...(snap.data() as Omit<TaskDoc, 'id'>) };
  },

  async delete(id: string): Promise<void> {
    await col().doc(id).delete();
  },

  async deleteByProject(projectId: string): Promise<number> {
    const snap = await col().where('projectId', '==', projectId).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (snap.size) await batch.commit();
    return snap.size;
  },
};
