import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, FolderKanban, Loader2, Plus, Users, CheckSquare2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { useTeam } from '@/hooks/useTeams';
import { useProjectTasks, useCreateTask } from '@/hooks/useTasks';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TaskForm } from '@/features/tasks/TaskForm';
import { TaskList } from '@/features/tasks/TaskList';
import { ApiClientError } from '@/lib/api';
import { EmptyState } from '@/components/ui/empty-state';
import { initials } from '@/lib/utils';
import type { TeamMember } from '@/lib/types';
import { useDashboard } from '@/hooks/useDashboard';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: projectData, isLoading: pLoading, isError: pError } = useProject(projectId);
  const { data: dashboard } = useDashboard();
  const { data: tasks, isLoading: tLoading, isError: tError, error: tErr } = useProjectTasks(projectId);
  const create = useCreateTask(projectId ?? '');
  const updateProject = useUpdateProject(projectId ?? '');
  const [open, setOpen] = useState(false);

  // Fetch all team details to get the actual members with names/avatars
  // Since useQueries is tricky without dynamic setup, we'll just extract from dashboard's known members? No, dashboard doesn't have members.
  // Actually, we can fetch the teams individually. For simplicity, since a project usually has 1-2 teams, we'll just render a TeamSection for each team which uses useTeam internally.

  if (pLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-[60vh]" />
      </div>
    );
  }
  if (pError || !projectData) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Project not found"
        description="The project may have been deleted or you might not have access to it."
        action={
          <Button onClick={() => navigate('/projects')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to projects
          </Button>
        }
      />
    );
  }

  // Check if user is admin in ANY of the project teams
  const isAdmin = projectData.teams.some(t => t.roles[user?.uid ?? ''] === 'admin');
  
  // Available teams the user is an admin of, that are not already added to the project
  const availableTeamsToAdd = dashboard?.teams?.filter(t => t.roles[user?.uid ?? ''] === 'admin' && !projectData.project.teamIds.includes(t.id)) ?? [];

  const handleAddTeam = async (teamId: string) => {
    try {
      await updateProject.mutateAsync({
        teamIds: [...projectData.project.teamIds, teamId],
      });
      toast.success('Team added to project');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to add team');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projects
          </Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{projectData.project.name}</h1>
          <p className="text-sm text-muted-foreground">{projectData.project.description || 'No description'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl gap-2">
              <Plus className="h-4 w-4" /> New task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>New task</DialogTitle>
            </DialogHeader>
            <TaskFormWrapper 
               teamIds={projectData.project.teamIds}
               onSuccess={async (values) => {
                 try {
                   await create.mutateAsync(values);
                   toast.success('Task created');
                   setOpen(false);
                 } catch (err) {
                   toast.error(err instanceof ApiClientError ? err.message : 'Failed to create task');
                 }
               }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks" className="gap-2">
            <CheckSquare2 className="h-4 w-4" /> Tasks
            <Badge variant="secondary" className="ml-1 font-normal bg-muted text-muted-foreground">{tasks?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <Users className="h-4 w-4" /> Assigned Teams
            <Badge variant="secondary" className="ml-1 font-normal bg-muted text-muted-foreground">{projectData.project.teamIds.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-0 outline-none">
          {tLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : tError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Couldn't load tasks"
              description={
                (tErr as Error)?.message?.includes('index')
                  ? "Firestore is still building required indexes. Refresh in a minute."
                  : ((tErr as Error)?.message ?? 'Please try again in a moment.')
              }
            />
          ) : !tasks || tasks.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No tasks yet"
              description="Add the first task to get this project moving."
              action={
                <Button className="bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl" onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> New task
                </Button>
              }
            />
          ) : (
            <TaskList
              tasks={tasks}
              canManage={isAdmin}
              teamIds={projectData.project.teamIds}
            />
          )}
        </TabsContent>

        <TabsContent value="teams" className="mt-0 outline-none space-y-6">
          {isAdmin && availableTeamsToAdd.length > 0 && (
            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/40">
              <p className="text-sm font-medium text-muted-foreground flex-1">Link an existing team to this project to give its members access.</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl gap-2">
                    <Plus className="h-4 w-4" /> Add Team
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Add Team to Project</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-2 mt-4">
                    {availableTeamsToAdd.map(t => (
                      <Button key={t.id} variant="outline" className="justify-start rounded-xl" onClick={() => handleAddTeam(t.id)}>
                        {t.name}
                      </Button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          <div className="grid gap-6">
            {projectData.project.teamIds.map(teamId => (
               <TeamSection key={teamId} teamId={teamId} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {(create.isPending || updateProject.isPending) ? (
        <div className="pointer-events-none fixed bottom-4 right-4 flex items-center gap-2 rounded-md bg-card px-3 py-2 text-xs shadow-md border border-border/40 z-50">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
        </div>
      ) : null}
    </div>
  );
}

// Wrapper to fetch members for the TaskForm
function TaskFormWrapper({ teamIds, onSuccess }: { teamIds: string[], onSuccess: (v: any) => Promise<unknown> }) {
  // We need to fetch members for all these teams.
  // For simplicity, we can just use the dashboard teams if they exist? No, dashboard doesn't contain members.
  // This is a bit inefficient to fetch in a loop inside a component, but since it's only a few teams, we'll use a local state.
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // We should actually just rely on a new hook or use Queries.
  // For now, let's use a simple approach: import api directly.
  useState(() => {
    let mounted = true;
    const fetchMembers = async () => {
      try {
        const { api } = await import('@/lib/api');
        const allMembers: TeamMember[] = [];
        for (const tid of teamIds) {
          const { data } = await api.get<any>(`/teams/${tid}`);
          if (data && data.members) {
            allMembers.push(...data.members);
          }
        }
        // Deduplicate members
        const unique = Array.from(new Map(allMembers.map(m => [m.uid, m])).values());
        if (mounted) {
          setMembers(unique);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    };
    fetchMembers();
    return () => { mounted = false; };
  });

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;

  return (
    <TaskForm
      members={members}
      submittingLabel="Create task"
      onSubmit={onSuccess}
    />
  );
}

function TeamSection({ teamId }: { teamId: string }) {
  const { data, isLoading } = useTeam(teamId);

  if (isLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (!data) return null;

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
      <div className="bg-muted/30 px-6 py-3 border-b border-border/60 flex items-center justify-between">
        <h3 className="font-semibold">{data.team.name}</h3>
        <Badge variant="secondary" className="rounded-md font-normal">{data.members.length} members</Badge>
      </div>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/60">
          {data.members.map((member) => (
            <TeamMemberRow key={member.uid} member={member} />
          ))}
          {data.members.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No team members found.
            </div>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function TeamMemberRow({ member }: { member: TeamMember }) {
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
          </div>
          <div className="truncate text-xs text-muted-foreground mt-0.5">{member.email}</div>
        </div>
      </div>
      <div>
        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="rounded-md bg-muted/60 text-foreground border-none">
          {member.role}
        </Badge>
      </div>
    </li>
  );
}
