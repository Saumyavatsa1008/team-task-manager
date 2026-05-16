import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { teamsRepo } from '../repos/teams';
import { projectsRepo } from '../repos/projects';
import { tasksRepo } from '../repos/tasks';

export type TeamRole = 'admin' | 'member';

const ensureUid = (req: Request): string => {
  const uid = req.user?.uid;
  if (!uid) throw ApiError.unauthenticated();
  return uid;
};

/** Confirms the caller is a member of the team in :teamId; attaches role. */
export const requireTeamMembership = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const uid = ensureUid(req);
    const teamId = req.params.teamId;
    if (!teamId) throw ApiError.validation({ teamId: ['required'] });
    const team = await teamsRepo.get(teamId);
    if (!team) throw ApiError.notFound('Team');
    const role = team.roles[uid];
    if (!role) throw ApiError.forbidden('You are not a member of this team');
    (req as Request & { teamRole?: TeamRole }).teamRole = role;
    next();
  },
);

/** Confirms the caller is admin of :teamId. */
export const requireTeamAdmin = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const uid = ensureUid(req);
    const teamId = req.params.teamId;
    if (!teamId) throw ApiError.validation({ teamId: ['required'] });
    const team = await teamsRepo.get(teamId);
    if (!team) throw ApiError.notFound('Team');
    if (team.roles[uid] !== 'admin') throw ApiError.forbidden('Admin role required');
    next();
  },
);

/** Confirms the caller is the team owner of :teamId. */
export const requireTeamOwner = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const uid = ensureUid(req);
    const teamId = req.params.teamId;
    if (!teamId) throw ApiError.validation({ teamId: ['required'] });
    const team = await teamsRepo.get(teamId);
    if (!team) throw ApiError.notFound('Team');
    if (team.ownerId !== uid) throw ApiError.forbidden('Only the team owner can do this');
    next();
  },
);

/** Confirms the caller is a member of AT LEAST ONE team that owns :projectId. */
export const requireProjectAccess = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const uid = ensureUid(req);
    const projectId = req.params.projectId;
    if (!projectId) throw ApiError.validation({ projectId: ['required'] });
    const project = await projectsRepo.get(projectId);
    if (!project) throw ApiError.notFound('Project');
    
    // User must be a member of at least one of the project's teams
    const userTeams = await teamsRepo.listForUser(uid);
    const userTeamIds = userTeams.map(t => t.id);
    const hasAccess = project.teamIds.some(id => userTeamIds.includes(id));
    
    if (!hasAccess) throw ApiError.forbidden('You do not have access to this project');
    
    (req as Request & { project?: typeof project }).project = project;
    next();
  },
);

/** Stricter: project access AND admin role in at least one of its teams. */
export const requireProjectAdmin = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const uid = ensureUid(req);
    const projectId = req.params.projectId;
    if (!projectId) throw ApiError.validation({ projectId: ['required'] });
    const project = await projectsRepo.get(projectId);
    if (!project) throw ApiError.notFound('Project');
    
    const userTeams = await teamsRepo.listForUser(uid);
    const hasAdminAccess = project.teamIds.some(id => {
      const t = userTeams.find(team => team.id === id);
      return t && t.roles[uid] === 'admin';
    });

    if (!hasAdminAccess) throw ApiError.forbidden('Admin role required in at least one project team');
    (req as Request & { project?: typeof project }).project = project;
    next();
  },
);

/** Confirms the caller can see :taskId (member of at least one of its teams). Attaches task. */
export const requireTaskAccess = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const uid = ensureUid(req);
    const taskId = req.params.taskId;
    if (!taskId) throw ApiError.validation({ taskId: ['required'] });
    const task = await tasksRepo.get(taskId);
    if (!task) throw ApiError.notFound('Task');
    
    const userTeams = await teamsRepo.listForUser(uid);
    const userTeamIds = userTeams.map(t => t.id);
    const hasAccess = task.teamIds.some(id => userTeamIds.includes(id));
    
    if (!hasAccess) throw ApiError.forbidden('You do not have access to this task');
    
    (req as Request & { task?: typeof task }).task = task;
    next();
  },
);
