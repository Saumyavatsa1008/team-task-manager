export type TeamRole = 'admin' | 'member';
export type ProjectStatus = 'active' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface FsTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: FsTimestamp;
  updatedAt: FsTimestamp;
}

export interface TeamMember extends UserDoc {
  role: TeamRole;
}

export interface TeamDoc {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  roles: Record<string, TeamRole>;
  createdAt: FsTimestamp;
  updatedAt: FsTimestamp;
}

export interface ProjectDoc {
  id: string;
  teamId: string;
  name: string;
  description: string;
  ownerId: string;
  status: ProjectStatus;
  createdAt: FsTimestamp;
  updatedAt: FsTimestamp;
}

export interface TaskDoc {
  id: string;
  projectId: string;
  teamId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: FsTimestamp | null;
  assigneeId: string | null;
  createdBy: string;
  createdAt: FsTimestamp;
  updatedAt: FsTimestamp;
}

export interface InviteDoc {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  status: 'pending' | 'accepted';
  createdAt: FsTimestamp;
}

export interface TeamDetail {
  team: TeamDoc;
  members: TeamMember[];
  invites: InviteDoc[];
}

export interface DashboardData {
  counts: {
    teams: number;
    projects: number;
    tasks: number;
    myTasks: number;
    overdue: number;
    byStatus: { todo: number; in_progress: number; done: number };
    myByStatus: { todo: number; in_progress: number; done: number };
  };
  overdue: TaskDoc[];
  dueSoon: TaskDoc[];
  recent: TaskDoc[];
  teams: TeamDoc[];
  projects: ProjectDoc[];
}
