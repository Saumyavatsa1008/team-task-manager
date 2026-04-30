import { Router, type Request } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { projectsRepo, type ProjectDoc } from '../repos/projects';
import { teamsRepo } from '../repos/teams';
import { tasksRepo } from '../repos/tasks';
import { projectCreateSchema, projectUpdateSchema } from '../schemas';
import {
  requireTeamAdmin,
  requireTeamMembership,
  requireProjectAccess,
  requireProjectAdmin,
} from '../middleware/rbac';

const router = Router();

router.use(requireAuth);

// List projects in a team — members only.
router.get(
  '/teams/:teamId/projects',
  requireTeamMembership,
  asyncHandler(async (req, res) => {
    const projects = await projectsRepo.listByTeam(req.params.teamId);
    res.json({ projects });
  }),
);

// Create a project in a team — admins only.
router.post(
  '/teams/:teamId/projects',
  requireTeamAdmin,
  validate(projectCreateSchema, 'body'),
  asyncHandler(async (req, res) => {
    const project = await projectsRepo.create({
      teamId: req.params.teamId,
      ownerId: req.user!.uid,
      ...req.body,
    });
    res.status(201).json({ project });
  }),
);

router.get(
  '/projects/:projectId',
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    const project = (req as Request & { project?: ProjectDoc }).project!;
    const team = await teamsRepo.get(project.teamId);
    res.json({ project, team });
  }),
);

router.patch(
  '/projects/:projectId',
  requireProjectAdmin,
  validate(projectUpdateSchema, 'body'),
  asyncHandler(async (req, res) => {
    const project = await projectsRepo.update(req.params.projectId, req.body);
    res.json({ project });
  }),
);

router.delete(
  '/projects/:projectId',
  requireProjectAdmin,
  asyncHandler(async (req, res) => {
    await tasksRepo.deleteByProject(req.params.projectId);
    await projectsRepo.delete(req.params.projectId);
    res.status(204).send();
  }),
);

export default router;
