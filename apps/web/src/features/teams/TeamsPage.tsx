import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Loader2, ArrowRight } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground">
            Workspaces you belong to. Create a team to start adding projects and members.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient">
              <Plus className="h-4 w-4" />
              New team
            </Button>
          </DialogTrigger>
          <CreateTeamDialog onCreated={() => setOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !teams || teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description="Create your first team — you'll be the admin and can invite members by email."
          action={
            <Button variant="gradient" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New team
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamCard({ team }: { team: TeamDoc }) {
  const { user } = useAuth();
  const role = user ? team.roles[user.uid] : undefined;
  return (
    <Card className="group transition-all hover:border-primary/40 hover:shadow-glow">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight">{team.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {team.description || 'No description'}
            </p>
          </div>
          {role ? (
            <Badge variant={role === 'admin' ? 'default' : 'secondary'}>{role}</Badge>
          ) : null}
        </div>
        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>{team.memberIds.length} member{team.memberIds.length === 1 ? '' : 's'}</span>
          <Button asChild variant="ghost" size="sm" className="opacity-70 group-hover:opacity-100">
            <Link to={`/teams/${team.id}`}>
              Open <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateTeamDialog({ onCreated }: { onCreated: () => void }) {
  const create = useCreateTeam();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await create.mutateAsync(values);
      toast.success('Team created');
      reset();
      onCreated();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to create team');
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create a team</DialogTitle>
        <DialogDescription>You'll be the team admin. You can invite members afterwards.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="e.g. Acme Engineering" {...register('name')} />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" rows={3} placeholder="What is this team about?" {...register('description')} />
          {errors.description ? (
            <p className="text-xs text-destructive">{errors.description.message}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="submit" variant="gradient" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus className="h-4 w-4" />}
            Create team
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
