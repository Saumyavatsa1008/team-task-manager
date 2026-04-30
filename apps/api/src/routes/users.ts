import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { usersRepo } from '../repos/users';
import { invitesRepo } from '../repos/invites';
import { teamsRepo } from '../repos/teams';
import { profileUpdateSchema, userSearchQuerySchema } from '../schemas';
import { logger } from '../utils/logger';

const router = Router();

// Called by the web app right after Firebase login to ensure /users/{uid} exists
// AND to auto-accept any pending team invitations sent to this email.
router.post(
  '/auth/sync',
  requireAuth,
  asyncHandler(async (req, res) => {
    const u = req.user!;
    if (!u.email) throw ApiError.validation({ email: ['missing on token'] });
    const userDoc = await usersRepo.upsert({
      uid: u.uid,
      email: u.email.toLowerCase(),
      displayName: u.displayName?.trim() || u.email.split('@')[0],
      photoURL: u.photoURL,
    });

    const pending = await invitesRepo.findPendingByEmail(u.email);
    let joinedTeams = 0;
    for (const invite of pending) {
      try {
        const team = await teamsRepo.get(invite.teamId);
        if (!team) {
          await invitesRepo.cancel(invite.id);
          continue;
        }
        if (!team.roles[u.uid]) {
          await teamsRepo.addMember(invite.teamId, u.uid, invite.role);
        }
        await invitesRepo.markAccepted(invite.id);
        joinedTeams += 1;
      } catch (err) {
        logger.warn({ err, inviteId: invite.id }, 'auto-accept invite failed');
      }
    }

    res.json({ user: userDoc, joinedTeams });
  }),
);

router.get(
  '/users/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await usersRepo.get(req.user!.uid);
    if (!doc) throw ApiError.notFound('User profile');
    res.json({ user: doc });
  }),
);

router.patch(
  '/users/me',
  requireAuth,
  validate(profileUpdateSchema, 'body'),
  asyncHandler(async (req, res) => {
    const doc = await usersRepo.update(req.user!.uid, req.body);
    res.json({ user: doc });
  }),
);

// Looks up a user by email — used by the invite-member dialog.
router.get(
  '/users/search',
  requireAuth,
  validate(userSearchQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const email = (req.query as unknown as { email: string }).email;
    const doc = await usersRepo.findByEmail(email);
    res.json({ user: doc });
  }),
);

export default router;
