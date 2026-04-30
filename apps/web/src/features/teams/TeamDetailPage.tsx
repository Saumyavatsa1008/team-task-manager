import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Plus,
  Users,
  FolderKanban,
  Trash2,
  Loader2,
  Crown,
  ArrowRight,
  ShieldCheck,
  MailPlus,
  X,
  Clock,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import {
  useTeam,
  useAddMember,
  useChangeMemberRole,
  useRemoveMember,
  useCancelInvite,
} from '@/hooks/useTeams';
import { useTeamProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { initials, formatDate, tsToDate } from '@/lib/utils';
import { ApiClientError } from '@/lib/api';
import type { ProjectDoc, TeamMember, InviteDoc } from '@/lib/types';

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const { data, isLoading } = useTeam(teamId);
  const { data: projects } = useTeamProjects(teamId);
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

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-4 w-4" /> Projects
            <Badge variant="secondary" className="ml-1">{(projects ?? []).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" /> Members
            <Badge variant="secondary" className="ml-1">
              {data.members.length}
              {isAdmin && data.invites.length > 0 ? ` + ${data.invites.length}` : ''}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <ProjectsTab teamId={teamId!} canCreate={isAdmin} projects={projects ?? []} />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab
            teamId={teamId!}
            ownerId={data.team.ownerId}
            members={data.members}
            invites={data.invites}
            canManage={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Projects tab ----------
function ProjectsTab({
  teamId,
  canCreate,
  projects,
}: {
  teamId: string;
  canCreate: boolean;
  projects: ProjectDoc[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {projects.length} project{projects.length === 1 ? '' : 's'}
        </p>
        {canCreate ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="h-4 w-4" /> New project
              </Button>
            </DialogTrigger>
            <CreateProjectDialog teamId={teamId} onCreated={() => setOpen(false)} />
          </Dialog>
        ) : null}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={
            canCreate
              ? 'Create a project to start adding tasks. Projects belong to this team.'
              : 'No projects yet. Ask a team admin to create one.'
          }
          action={
            canCreate ? (
              <Button variant="gradient" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> New project
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="group transition-all hover:border-primary/40 hover:shadow-glow">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div>
                  <h3 className="truncate text-base font-semibold tracking-tight">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {p.description || 'No description'}
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                  <span>created {formatDate(tsToDate(p.createdAt))}</span>
                  <div className="flex items-center gap-1">
                    {canCreate ? <DeleteProjectButton projectId={p.id} /> : null}
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/projects/${p.id}`}>
                        Open <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const projectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(1000).optional(),
});

function CreateProjectDialog({ teamId, onCreated }: { teamId: string; onCreated: () => void }) {
  const create = useCreateProject(teamId);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<typeof projectSchema>>({ resolver: zodResolver(projectSchema) });

  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    try {
      await create.mutateAsync(values);
      toast.success('Project created');
      reset();
      onCreated();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to create project');
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New project</DialogTitle>
        <DialogDescription>Projects organize tasks within a team.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="e.g. Q2 Launch" {...register('name')} />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" rows={3} {...register('description')} />
        </div>
        <DialogFooter>
          <Button type="submit" variant="gradient" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus className="h-4 w-4" />}
            Create project
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function DeleteProjectButton({ projectId }: { projectId: string }) {
  const del = useDeleteProject();
  const onClick = async () => {
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      await del.mutateAsync(projectId);
      toast.success('Project deleted');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to delete');
    }
  };
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label="Delete project">
      <Trash2 className="h-4 w-4" />
    </Button>
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
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length === 1 ? '' : 's'}
          {canManage && invites.length > 0
            ? ` · ${invites.length} pending invite${invites.length === 1 ? '' : 's'}`
            : ''}
        </p>
        {canManage ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <MailPlus className="h-4 w-4" /> Invite member
              </Button>
            </DialogTrigger>
            <InviteMemberDialog teamId={teamId} onClose={() => setOpen(false)} />
          </Dialog>
        ) : null}
      </div>

      <Card>
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
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar>
          {member.photoURL ? <AvatarImage src={member.photoURL} alt={member.displayName} /> : null}
          <AvatarFallback>{initials(member.displayName || member.email)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{member.displayName || member.email}</span>
            {isOwner ? (
              <Badge variant="warning" className="gap-1">
                <Crown className="h-3 w-3" /> owner
              </Badge>
            ) : null}
            {user?.uid === member.uid ? <Badge variant="outline">you</Badge> : null}
          </div>
          <div className="truncate text-xs text-muted-foreground">{member.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canManage && !isOwner ? (
          <Select value={member.role} onValueChange={(v) => void onRoleChange(v as 'admin' | 'member')}>
            <SelectTrigger className="h-8 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>{member.role}</Badge>
        )}
        {(canManage || user?.uid === member.uid) && !isOwner ? (
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove member">
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
    <li className="flex items-center justify-between gap-3 bg-muted/20 px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-500/15 text-amber-500">
          <Clock className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{invite.email}</span>
            <Badge variant="warning" className="gap-1">
              <Clock className="h-3 w-3" /> pending
            </Badge>
          </div>
          <div className="truncate text-xs text-muted-foreground">
            invited as {invite.role} · joins automatically when they sign up
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel invite">
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
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Invite a member</DialogTitle>
        <DialogDescription>
          We'll add them right away if they already have an account. Otherwise we'll keep the
          invite pending and they'll join automatically the moment they sign up with this email.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="teammate@company.com" {...register('email')} />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setValue('role', v as 'admin' | 'member')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" variant="gradient" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <MailPlus className="h-4 w-4" />}
            Send invite
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
