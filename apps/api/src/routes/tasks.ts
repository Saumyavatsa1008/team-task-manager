import { Router, type Request } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { tasksRepo, type TaskDoc } from '../repos/tasks';
import { teamsRepo } from '../repos/teams';
import { projectsRepo, type ProjectDoc } from '../repos/projects';
import { taskCreateSchema, taskUpdateSchema, taskListQuerySchema } from '../schemas';
import { requireProjectAccess, requireTaskAccess, type TeamRole } from '../middleware/rbac';

const router = Router();

router.use(requireAuth);

// List tasks for a project (members only).
router.get(
  '/projects/:projectId/tasks',
  requireProjectAccess,
  validate(taskListQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const tasks = await tasksRepo.listByProject(
      req.params.projectId,
      req.query as { status?: TaskDoc['status']; assigneeId?: string },
    );
    res.json({ tasks });
  }),
);

// Create a task in a project — both admin and member can create.
// Members cannot assign to others; if they pass assigneeIds with someone other than themselves, reject.
router.post(
  '/projects/:projectId/tasks',
  requireProjectAccess,
  validate(taskCreateSchema, 'body'),
  asyncHandler(async (req, res) => {
    // Project access means they are a member of at least one of the project's teams.
    // However, to restrict assignment, we need to know their exact role.
    // For simplicity, if they aren't admin in ANY of the project's teams, they are a 'member'.
    const project = (req as Request & { project?: ProjectDoc }).project!;
    const body = req.body as ReturnType<typeof taskCreateSchema.parse>;
    const uid = req.user!.uid;

    const userTeams = await teamsRepo.listForUser(uid);
    let isAdminAny = false;
    
    // Check if the assigned members belong to ANY of the project's teams
    const validTeamMembers = new Set<string>();
    for (const teamId of project.teamIds) {
      const team = await teamsRepo.get(teamId);
      if (team) {
        Object.keys(team.roles).forEach(memberUid => validTeamMembers.add(memberUid));
        const userTeam = userTeams.find(t => t.id === teamId);
        if (userTeam && userTeam.roles[uid] === 'admin') isAdminAny = true;
      }
    }

    if (body.assigneeIds.length > 0) {
      for (const assigneeId of body.assigneeIds) {
        if (!validTeamMembers.has(assigneeId)) {
          throw ApiError.validation({ assigneeIds: [`User ${assigneeId} must be a member of one of the project's teams`] });
        }
      }
    }

    if (!isAdminAny && body.assigneeIds.length > 0) {
       // Members can only assign to themselves. They cannot assign multiple people if it includes others.
       if (body.assigneeIds.length > 1 || body.assigneeIds[0] !== uid) {
         throw ApiError.forbidden('Members can only assign tasks to themselves');
       }
    }

    const task = await tasksRepo.create({
      projectId: project.id,
      teamIds: project.teamIds,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      dueDate: body.dueDate,
      assigneeIds: body.assigneeIds,
      createdBy: req.user!.uid,
    });
    res.status(201).json({ task });
  }),
);

router.get(
  '/tasks/:taskId',
  requireTaskAccess,
  asyncHandler(async (req, res) => {
    const task = (req as Request & { task?: TaskDoc }).task!;
    res.json({ task });
  }),
);

router.patch(
  '/tasks/:taskId',
  requireTaskAccess,
  validate(taskUpdateSchema, 'body'),
  asyncHandler(async (req, res) => {
    const task = (req as Request & { task?: TaskDoc }).task!;
    const uid = req.user!.uid;
    const body = req.body as ReturnType<typeof taskUpdateSchema.parse>;
    const fields = Object.keys(body) as (keyof typeof body)[];

    const userTeams = await teamsRepo.listForUser(uid);
    let isAdminAny = false;
    const validTeamMembers = new Set<string>();
    
    for (const teamId of task.teamIds) {
      const team = await teamsRepo.get(teamId);
      if (team) {
        Object.keys(team.roles).forEach(memberUid => validTeamMembers.add(memberUid));
        const userTeam = userTeams.find(t => t.id === teamId);
        if (userTeam && userTeam.roles[uid] === 'admin') isAdminAny = true;
      }
    }

    if (isAdminAny) {
      // Admins can edit anything. Validate assignees are team members.
      if (body.assigneeIds && body.assigneeIds.length > 0) {
        for (const assigneeId of body.assigneeIds) {
          if (!validTeamMembers.has(assigneeId)) {
            throw ApiError.validation({ assigneeIds: [`User ${assigneeId} must be a member of the project teams`] });
          }
        }
      }
    } else {
      // Members:
      const isAssignee = task.assigneeIds.includes(uid);
      const isCreator = task.createdBy === uid;
      const onlyStatusChange = fields.length === 1 && fields[0] === 'status';

      if (onlyStatusChange) {
        if (!isAssignee && !isCreator) {
          throw ApiError.forbidden('Only the assignee or creator can change a task status');
        }
      } else {
        if (!isCreator) {
          throw ApiError.forbidden('Only the task creator (or an admin) can edit task fields');
        }
        if (task.assigneeIds.length > 0 && !task.assigneeIds.includes(uid)) {
          throw ApiError.forbidden(
            'This task is already assigned; only an admin can edit it now',
          );
        }
        if (body.assigneeIds && body.assigneeIds.length > 0) {
           if (body.assigneeIds.length > 1 || body.assigneeIds[0] !== uid) {
             throw ApiError.forbidden('Members can only assign tasks to themselves');
           }
        }
      }
    }

    const updated = await tasksRepo.update(task.id, body);
    res.json({ task: updated });
  }),
);

router.delete(
  '/tasks/:taskId',
  requireTaskAccess,
  asyncHandler(async (req, res) => {
    const task = (req as Request & { task?: TaskDoc }).task!;
    const uid = req.user!.uid;
    const userTeams = await teamsRepo.listForUser(uid);
    let isAdminAny = false;
    for (const teamId of task.teamIds) {
      const userTeam = userTeams.find(t => t.id === teamId);
      if (userTeam && userTeam.roles[uid] === 'admin') isAdminAny = true;
    }

    if (!isAdminAny && task.createdBy !== uid) {
      throw ApiError.forbidden('Only the task creator or an admin can delete a task');
    }
    await tasksRepo.delete(task.id);
    res.status(204).send();
  }),
);

// Convenience: re-export project ref to avoid an unused import warning.
export default router;
