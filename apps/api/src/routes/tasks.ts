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
// Members cannot assign to others; if they pass an assigneeId other than self, reject.
router.post(
  '/projects/:projectId/tasks',
  requireProjectAccess,
  validate(taskCreateSchema, 'body'),
  asyncHandler(async (req, res) => {
    const role = (req as Request & { teamRole?: TeamRole }).teamRole;
    const project = (req as Request & { project?: ProjectDoc }).project!;
    const body = req.body as ReturnType<typeof taskCreateSchema.parse>;

    if (body.assigneeId) {
      const team = await teamsRepo.get(project.teamId);
      if (!team || !team.roles[body.assigneeId]) {
        throw ApiError.validation({ assigneeId: ['must be a member of the team'] });
      }
    }
    if (role === 'member' && body.assigneeId && body.assigneeId !== req.user!.uid) {
      throw ApiError.forbidden('Members can only assign tasks to themselves');
    }

    const task = await tasksRepo.create({
      projectId: project.id,
      teamId: project.teamId,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      dueDate: body.dueDate,
      assigneeId: body.assigneeId,
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
    const role = (req as Request & { teamRole?: TeamRole }).teamRole;
    const task = (req as Request & { task?: TaskDoc }).task!;
    const callerUid = req.user!.uid;
    const body = req.body as ReturnType<typeof taskUpdateSchema.parse>;
    const fields = Object.keys(body) as (keyof typeof body)[];

    if (role === 'admin') {
      // Admins can edit anything. Validate assignee is a team member.
      if (body.assigneeId) {
        const team = await teamsRepo.get(task.teamId);
        if (!team || !team.roles[body.assigneeId]) {
          throw ApiError.validation({ assigneeId: ['must be a member of the team'] });
        }
      }
    } else {
      // Members:
      //  - can update status (and only status) on tasks assigned to them
      //  - can edit any field on tasks they created BEFORE assignment to someone else
      const isAssignee = task.assigneeId === callerUid;
      const isCreator = task.createdBy === callerUid;
      const onlyStatusChange = fields.length === 1 && fields[0] === 'status';

      if (onlyStatusChange) {
        if (!isAssignee && !isCreator) {
          throw ApiError.forbidden('Only the assignee or creator can change a task status');
        }
      } else {
        if (!isCreator) {
          throw ApiError.forbidden('Only the task creator (or an admin) can edit task fields');
        }
        if (task.assigneeId && task.assigneeId !== callerUid) {
          throw ApiError.forbidden(
            'This task is already assigned; only an admin can edit it now',
          );
        }
        if (body.assigneeId && body.assigneeId !== callerUid) {
          throw ApiError.forbidden('Members can only assign tasks to themselves');
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
    const role = (req as Request & { teamRole?: TeamRole }).teamRole;
    const task = (req as Request & { task?: TaskDoc }).task!;
    if (role !== 'admin' && task.createdBy !== req.user!.uid) {
      throw ApiError.forbidden('Only the task creator or an admin can delete a task');
    }
    await tasksRepo.delete(task.id);
    res.status(204).send();
  }),
);

// Convenience: re-export project ref to avoid an unused import warning.
export default router;
