import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { teamsRepo } from '../repos/teams';
import { projectsRepo } from '../repos/projects';
import { tasksRepo } from '../repos/tasks';
import type { TaskDoc } from '../repos/tasks';

const router = Router();

router.use(requireAuth);

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const teams = await teamsRepo.listForUser(uid);
    const teamIds = teams.map((t) => t.id);
    const [projects, allTasks] = await Promise.all([
      projectsRepo.listByTeams(teamIds),
      tasksRepo.listByTeams(teamIds),
    ]);

    const myTasks = allTasks.filter((t) => t.assigneeIds && t.assigneeIds.includes(uid));
    const now = Date.now();
    const isOverdue = (t: TaskDoc) =>
      t.dueDate != null && t.status !== 'done' && t.dueDate.toMillis() < now;

    const overdue = myTasks.filter(isOverdue);
    const dueSoon = myTasks
      .filter((t) => t.dueDate != null && t.status !== 'done' && !isOverdue(t))
      .sort((a, b) => (a.dueDate!.toMillis() - b.dueDate!.toMillis()))
      .slice(0, 5);

    const counts = {
      teams: teams.length,
      projects: projects.length,
      tasks: allTasks.length,
      myTasks: myTasks.length,
      overdue: overdue.length,
      byStatus: {
        todo: allTasks.filter((t) => t.status === 'todo').length,
        in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
        done: allTasks.filter((t) => t.status === 'done').length,
      },
      myByStatus: {
        todo: myTasks.filter((t) => t.status === 'todo').length,
        in_progress: myTasks.filter((t) => t.status === 'in_progress').length,
        done: myTasks.filter((t) => t.status === 'done').length,
      },
    };

    const recent = [...allTasks]
      .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())
      .slice(0, 8);

    res.json({ counts, overdue, dueSoon, recent, teams, projects });
  }),
);

export default router;
