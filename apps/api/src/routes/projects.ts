import { Router, type Request } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
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

// List projects for a user's teams
router.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const userTeams = await teamsRepo.listForUser(req.user!.uid);
    const teamIds = userTeams.map(t => t.id);
    const projects = await projectsRepo.listByTeams(teamIds);
    res.json({ projects });
  }),
);

// Create a project — user must be admin of ALL provided teamIds.
router.post(
  '/projects',
  validate(projectCreateSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { teamIds } = req.body;
    const userTeams = await teamsRepo.listForUser(req.user!.uid);
    
    // Check admin status for every requested team
    for (const tid of teamIds) {
      const team = userTeams.find(t => t.id === tid);
      if (!team) throw ApiError.notFound(`Team ${tid} not found`);
      if (team.roles[req.user!.uid] !== 'admin') {
        throw ApiError.forbidden(`Admin role required for team ${team.name}`);
      }
    }

    const project = await projectsRepo.create({
      teamIds: req.body.teamIds,
      ownerId: req.user!.uid,
      name: req.body.name,
      description: req.body.description,
    });
    res.status(201).json({ project });
  }),
);

router.get(
  '/projects/:projectId',
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    const project = (req as Request & { project?: ProjectDoc }).project!;
    const projectTeams = await Promise.all(project.teamIds.map(id => teamsRepo.get(id)));
    const teams = projectTeams.filter(Boolean);
    res.json({ project, teams });
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
