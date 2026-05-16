import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Loader2, ArrowRight, Crown, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTeams, useCreateTeam } from '@/hooks/useTeams';
import type { TeamDoc } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/features/auth/AuthProvider';
import { ApiClientError } from '@/lib/api';

const schema = z.object({
  name: z.string().trim().min(1, 'Required').max(80),
  description: z.string().trim().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

export function TeamsPage() {
  const { data: teams, isLoading } = useTeams();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-muted-foreground">Workspaces you belong to. Create a team to start adding projects and members.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 font-semibold">
                <Plus className="h-4 w-4" /> New Team
              </Button>
            </DialogTrigger>
            <CreateTeamDialog onCreated={() => setOpen(false)} />
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : !teams || teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description="Create your first team — you'll be the admin and can invite members by email."
          action={
            <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New team
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => <TeamCard key={t.id} team={t} />)}
        </div>
      )}
    </div>
  );
}

function TeamCard({ team }: { team: TeamDoc }) {
  const { user } = useAuth();
  const role = user ? team.roles[user.uid] : undefined;
  const isAdmin = role === 'admin';
  const isOwner = user?.uid === team.ownerId;

  return (
    <Link
      to={`/teams/${team.id}`}
      className="group block rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shrink-0">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1.5">
          {isOwner && (
            <span className="flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              <Crown className="h-2.5 w-2.5" /> Owner
            </span>
          )}
          {isAdmin && !isOwner && (
            <span className="flex items-center gap-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-2 py-0.5 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
              <Shield className="h-2.5 w-2.5" /> Admin
            </span>
          )}
          {!isAdmin && (
            <span className="rounded-lg bg-muted border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Member</span>
          )}
        </div>
      </div>

      <h3 className="font-bold text-base tracking-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{team.name}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{team.description || 'No description'}</p>

      <div className="mt-4 flex items-center justify-between pt-4 border-t border-border/40">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{team.memberIds.length} member{team.memberIds.length !== 1 ? 's' : ''}</span>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
          Open <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

function CreateTeamDialog({ onCreated }: { onCreated: () => void }) {
  const create = useCreateTeam();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await create.mutateAsync(values);
      toast.success('Team created successfully!');
      reset();
      onCreated();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to create team');
    }
  };

  return (
    <DialogContent className="rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">Create a team</DialogTitle>
        <DialogDescription>You'll be the team admin. You can invite members afterwards by email.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-semibold">Team Name</Label>
          <Input id="name" placeholder="e.g. Acme Engineering" className="rounded-xl" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-semibold">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea id="description" rows={3} placeholder="What is this team about?" className="rounded-xl resize-none" {...register('description')} />
        </div>
        <DialogFooter>
          <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 font-semibold" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Team
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}