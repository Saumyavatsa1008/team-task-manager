import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, FolderKanban, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useProject } from '@/hooks/useProjects';
import { useTeam } from '@/hooks/useTeams';
import { useProjectTasks, useCreateTask } from '@/hooks/useTasks';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { KanbanBoard } from '@/features/tasks/KanbanBoard';
import { TaskForm } from '@/features/tasks/TaskForm';
import { ApiClientError } from '@/lib/api';
import { EmptyState } from '@/components/ui/empty-state';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { data: projectData, isLoading: pLoading, isError: pError } = useProject(projectId);
  const { data: teamData } = useTeam(projectData?.team.id);
  const { data: tasks, isLoading: tLoading, isError: tError, error: tErr } = useProjectTasks(projectId);
  const create = useCreateTask(projectId ?? '');
  const [open, setOpen] = useState(false);

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
          <Button asChild variant="outline">
            <Link to="/teams">
              <ArrowLeft className="h-4 w-4" /> Back to teams
            </Link>
          </Button>
        }
      />
    );
  }

  const isAdmin = user && teamData ? teamData.team.roles[user.uid] === 'admin' : false;
  const members = teamData?.members ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <Link
            to={`/teams/${projectData.team.id}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {projectData.team.name}
          </Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{projectData.project.name}</h1>
          <p className="text-sm text-muted-foreground">{projectData.project.description || 'No description'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient">
              <Plus className="h-4 w-4" /> New task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>New task</DialogTitle>
            </DialogHeader>
            <TaskForm
              members={members}
              submittingLabel="Create task"
              onSubmit={async (values) => {
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

      {tLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[60vh]" />
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
            <Button variant="gradient" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New task
            </Button>
          }
        />
      ) : (
        <KanbanBoard
          projectId={projectId!}
          tasks={tasks}
          members={members}
          canManage={isAdmin}
          currentUid={user?.uid}
        />
      )}

      {create.isPending ? (
        <div className="pointer-events-none fixed bottom-4 right-4 flex items-center gap-2 rounded-md bg-card px-3 py-2 text-xs shadow-md">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
        </div>
      ) : null}
    </div>
  );
}
