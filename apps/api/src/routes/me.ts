import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { tasksRepo } from '../repos/tasks';
import { projectsRepo } from '../repos/projects';
import { teamsRepo } from '../repos/teams';

const router = Router();

router.use(requireAuth);

// All tasks assigned to the current user, hydrated with project + team names.
router.get(
  '/me/tasks',
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const tasks = await tasksRepo.listByAssignee(uid);
    const projectIds = [...new Set(tasks.map((t) => t.projectId))];
    const teamIds = [...new Set(tasks.map((t) => t.teamId))];
    const [projects, teams] = await Promise.all([
      Promise.all(projectIds.map((id) => projectsRepo.get(id))),
      Promise.all(teamIds.map((id) => teamsRepo.get(id))),
    ]);
    res.json({
      tasks,
      projects: projects.filter((p): p is NonNullable<typeof p> => p !== null),
      teams: teams.filter((t): t is NonNullable<typeof t> => t !== null),
    });
  }),
);

export default router;
