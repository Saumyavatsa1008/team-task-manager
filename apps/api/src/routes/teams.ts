import { Router, type Request } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { teamsRepo } from '../repos/teams';
import { usersRepo } from '../repos/users';
import { invitesRepo } from '../repos/invites';
import { projectsRepo } from '../repos/projects';
import { tasksRepo } from '../repos/tasks';
import {
  teamCreateSchema,
  teamUpdateSchema,
  memberAddSchema,
  memberUpdateSchema,
} from '../schemas';
import {
  requireTeamMembership,
  requireTeamAdmin,
  requireTeamOwner,
  type TeamRole,
} from '../middleware/rbac';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const teams = await teamsRepo.listForUser(req.user!.uid);
    res.json({ teams });
  }),
);

router.post(
  '/',
  validate(teamCreateSchema, 'body'),
  asyncHandler(async (req, res) => {
    const team = await teamsRepo.create({ ...req.body, ownerId: req.user!.uid });
    res.status(201).json({ team });
  }),
);

router.get(
  '/:teamId',
  requireTeamMembership,
  asyncHandler(async (req, res) => {
    const team = await teamsRepo.get(req.params.teamId);
    if (!team) throw ApiError.notFound('Team');
    const role = (req as Request & { teamRole?: TeamRole }).teamRole;
    const [members, invites] = await Promise.all([
      Promise.all(team.memberIds.map((uid) => usersRepo.get(uid))),
      role === 'admin' ? invitesRepo.listPendingByTeam(req.params.teamId) : Promise.resolve([]),
    ]);
    res.json({
      team,
      members: members
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .map((u) => ({ ...u, role: team.roles[u.uid] })),
      invites,
    });
  }),
);

router.patch(
  '/:teamId',
  requireTeamAdmin,
  validate(teamUpdateSchema, 'body'),
  asyncHandler(async (req, res) => {
    const team = await teamsRepo.update(req.params.teamId, req.body);
    res.json({ team });
  }),
);

router.delete(
  '/:teamId',
  requireTeamOwner,
  asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const projectIds = await projectsRepo.deleteByTeam(teamId);
    await Promise.all(projectIds.map((pid) => tasksRepo.deleteByProject(pid)));
    await invitesRepo.deleteByTeam(teamId);
    await teamsRepo.delete(teamId);
    res.status(204).send();
  }),
);

// ---- members ----
router.post(
  '/:teamId/members',
  requireTeamAdmin,
  validate(memberAddSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { email, role } = req.body as { email: string; role: 'admin' | 'member' };
    const teamId = req.params.teamId;
    const team = await teamsRepo.get(teamId);
    if (!team) throw ApiError.notFound('Team');

    const user = await usersRepo.findByEmail(email);
    if (user) {
      if (team.roles[user.uid]) throw ApiError.conflict('User is already a member of this team');
      const updated = await teamsRepo.addMember(teamId, user.uid, role);
      return res.status(201).json({ team: updated, status: 'added' });
    }

    // No account yet — record a pending invite that will be auto-accepted on signup.
    const existing = await invitesRepo.findPendingByTeamAndEmail(teamId, email);
    if (existing) throw ApiError.conflict('An invite is already pending for this email');
    const invite = await invitesRepo.create({
      teamId,
      email,
      role,
      invitedBy: req.user!.uid,
    });
    return res.status(201).json({ team, invite, status: 'invited' });
  }),
);

router.patch(
  '/:teamId/members/:uid',
  requireTeamAdmin,
  validate(memberUpdateSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { teamId, uid } = req.params;
    const team = await teamsRepo.get(teamId);
    if (!team) throw ApiError.notFound('Team');
    if (!team.roles[uid]) throw ApiError.notFound('Member');
    if (team.ownerId === uid) {
      throw ApiError.forbidden("The team owner's role cannot be changed");
    }
    const updated = await teamsRepo.setRole(teamId, uid, req.body.role);
    res.json({ team: updated });
  }),
);

router.delete(
  '/:teamId/members/:uid',
  asyncHandler(async (req, res) => {
    const callerUid = req.user!.uid;
    const { teamId, uid } = req.params;
    const team = await teamsRepo.get(teamId);
    if (!team) throw ApiError.notFound('Team');
    if (!team.roles[uid]) throw ApiError.notFound('Member');
    if (team.ownerId === uid) {
      throw ApiError.forbidden('The team owner cannot be removed');
    }
    const isAdmin = team.roles[callerUid] === 'admin';
    const isSelf = callerUid === uid;
    if (!isAdmin && !isSelf) {
      throw ApiError.forbidden('Only an admin can remove other members');
    }
    const updated = await teamsRepo.removeMember(teamId, uid);
    res.json({ team: updated });
  }),
);

// ---- invites ----
router.delete(
  '/:teamId/invites/:inviteId',
  requireTeamAdmin,
  asyncHandler(async (req, res) => {
    await invitesRepo.cancel(req.params.inviteId);
    res.status(204).send();
  }),
);

export default router;
