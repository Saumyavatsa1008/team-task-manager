import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Users,
  Trash2,
  Loader2,
  Crown,
  ShieldCheck,
  MailPlus,
  X,
  Clock,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  useTeam,
  useAddMember,
  useChangeMemberRole,
  useRemoveMember,
  useCancelInvite,
} from '@/hooks/useTeams';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { initials } from '@/lib/utils';
import { ApiClientError } from '@/lib/api';
import type { TeamMember, InviteDoc } from '@/lib/types';

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const { data, isLoading } = useTeam(teamId);
  const isAdmin = data?.team && user ? data.team.roles[user.uid] === 'admin' : false;

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.team.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {data.team.description || 'No description'}
          </p>
        </div>
        <Badge variant={isAdmin ? 'default' : 'secondary'} className="self-start gap-1">
          {isAdmin ? <ShieldCheck className="h-3 w-3" /> : null}
          {isAdmin ? 'You are an admin' : 'You are a member'}
        </Badge>
      </div>

      <div className="mt-8">
        <MembersTab
          teamId={teamId!}
          ownerId={data.team.ownerId}
          members={data.members}
          invites={data.invites}
          canManage={isAdmin}
        />
      </div>
    </div>
  );
}

// ---------- Members tab ----------
function MembersTab({
  teamId,
  ownerId,
  members,
  invites,
  canManage,
}: {
  teamId: string;
  ownerId: string;
  members: TeamMember[];
  invites: InviteDoc[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Users className="h-5 w-5 text-teal-600" />
          Team Members
          <Badge variant="secondary" className="ml-2 font-normal">
            {members.length}
            {canManage && invites.length > 0 ? ` + ${invites.length} pending` : ''}
          </Badge>
        </div>
        {canManage ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 font-semibold">
                <MailPlus className="h-4 w-4" /> Invite member
              </Button>
            </DialogTrigger>
            <InviteMemberDialog teamId={teamId} onClose={() => setOpen(false)} />
          </Dialog>
        ) : null}
      </div>

      <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <ul className="divide-y divide-border/60">
            {members.map((m) => (
              <MemberRow
                key={m.uid}
                teamId={teamId}
                ownerId={ownerId}
                member={m}
                canManage={canManage}
              />
            ))}
            {canManage
              ? invites.map((inv) => (
                  <InviteRow key={inv.id} teamId={teamId} invite={inv} />
                ))
              : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function MemberRow({
  teamId,
  ownerId,
  member,
  canManage,
}: {
  teamId: string;
  ownerId: string;
  member: TeamMember;
  canManage: boolean;
}) {
  const changeRole = useChangeMemberRole(teamId);
  const remove = useRemoveMember(teamId);
  const isOwner = member.uid === ownerId;
  const { user } = useAuth();

  const onRoleChange = async (role: 'admin' | 'member') => {
    try {
      await changeRole.mutateAsync({ uid: member.uid, role });
      toast.success(`Role updated to ${role}`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to update role');
    }
  };

  const onRemove = async () => {
    if (!confirm(`Remove ${member.displayName || member.email} from the team?`)) return;
    try {
      await remove.mutateAsync(member.uid);
      toast.success('Member removed');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to remove');
    }
  };

  return (
    <li className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-muted/30 transition-colors">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="h-10 w-10">
          {member.photoURL ? <AvatarImage src={member.photoURL} alt={member.displayName} /> : null}
          <AvatarFallback className="bg-teal-50 text-teal-700">{initials(member.displayName || member.email)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">{member.displayName || member.email}</span>
            {isOwner ? (
              <Badge className="bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200 gap-1 rounded-md px-1.5 py-0 items-center">
                <Crown className="h-3 w-3" /> owner
              </Badge>
            ) : null}
            {user?.uid === member.uid ? <Badge variant="outline" className="rounded-md px-1.5 py-0 text-muted-foreground border-border/60">you</Badge> : null}
          </div>
          <div className="truncate text-xs text-muted-foreground mt-0.5">{member.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canManage && !isOwner ? (
          <Select value={member.role} onValueChange={(v) => void onRoleChange(v as 'admin' | 'member')}>
            <SelectTrigger className="h-9 w-[110px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="rounded-md">
            {member.role}
          </Badge>
        )}
        {(canManage || user?.uid === member.uid) && !isOwner ? (
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove member" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-9 w-9">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function InviteRow({ teamId, invite }: { teamId: string; invite: InviteDoc }) {
  const cancel = useCancelInvite(teamId);
  const onCancel = async () => {
    if (!confirm(`Cancel the invite for ${invite.email}?`)) return;
    try {
      await cancel.mutateAsync(invite.id);
      toast.success('Invite cancelled');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to cancel');
    }
  };
  return (
    <li className="flex items-center justify-between gap-3 bg-muted/30 px-6 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-600">
          <Clock className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">{invite.email}</span>
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 gap-1 rounded-md px-1.5 py-0 items-center">
              <Clock className="h-3 w-3" /> pending
            </Badge>
          </div>
          <div className="truncate text-xs text-muted-foreground mt-0.5">
            invited as <span className="font-medium text-foreground">{invite.role}</span>
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel invite" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-9 w-9">
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['admin', 'member']).default('member'),
});

function InviteMemberDialog({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const add = useAddMember(teamId);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'member' },
  });
  const role = watch('role');

  const onSubmit = async (values: z.infer<typeof inviteSchema>) => {
    try {
      const result = await add.mutateAsync(values);
      if (result.status === 'invited' || result.status === 'added') {
        try {
          const { sendSignInLinkToEmail } = await import('firebase/auth');
          const { firebaseAuth } = await import('@/lib/firebase');
          await sendSignInLinkToEmail(firebaseAuth, values.email, {
            url: `${window.location.origin}/login?email=${encodeURIComponent(values.email)}`,
            handleCodeInApp: true,
          });
          if (result.status === 'invited') {
            toast.success(`Invite sent — ${values.email} will receive a login link.`);
          } else {
            toast.success(`Member added and notified — ${values.email} will receive a login link.`);
          }
        } catch (e) {
          console.error('Failed to send email link', e);
          if (result.status === 'invited') {
            toast.success(`Invite created, but failed to send email link. They can join by signing up.`);
          } else {
            toast.success('Member added, but failed to send email link.');
          }
        }
      }
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to invite');
    }
  };

  return (
    <DialogContent className="rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">Invite a member</DialogTitle>
        <DialogDescription>
          We'll add them right away if they already have an account. Otherwise we'll keep the
          invite pending and they'll join automatically the moment they sign up with this email.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
        <div className="space-y-2">
          <Label htmlFor="email" className="font-semibold text-sm">Email</Label>
          <Input id="email" type="email" placeholder="teammate@company.com" className="rounded-xl" {...register('email')} />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-sm">Role</Label>
          <Select value={role} onValueChange={(v) => setValue('role', v as 'admin' | 'member')}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="pt-2">
          <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 font-semibold w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <MailPlus className="h-4 w-4" />}
            Send invite
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
