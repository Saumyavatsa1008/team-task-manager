import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Flag,
  ListChecks,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMyTasks } from '@/hooks/useMyTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn, formatDate, formatRelative, isOverdue, tsToDate } from '@/lib/utils';
import { api, ApiClientError } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import type { TaskDoc, TaskStatus, ProjectDoc, TeamDoc } from '@/lib/types';

type Bucket = 'all' | 'active' | 'overdue' | 'done';

export function MyTasksPage() {
  const { data, isLoading, isError } = useMyTasks();
  const [bucket, setBucket] = useState<Bucket>('active');

  const filtered = useMemo(() => {
    if (!data?.tasks) return [];
    switch (bucket) {
      case 'active':
        return data.tasks.filter((t) => t.status !== 'done');
      case 'overdue':
        return data.tasks.filter((t) => isOverdue(tsToDate(t.dueDate), t.status));
      case 'done':
        return data.tasks.filter((t) => t.status === 'done');
      default:
        return data.tasks;
    }
  }, [data?.tasks, bucket]);

  const projectsById = useMemo(() => new Map(data?.projects?.map((p) => [p.id, p]) ?? []), [data?.projects]);
  const teamsById = useMemo(() => new Map(data?.teams?.map((t) => [t.id, t]) ?? []), [data?.teams]);

  const grouped = useMemo(() => {
    const map = new Map<string, TaskDoc[]>();
    for (const t of filtered) {
      const arr = map.get(t.projectId) ?? [];
      arr.push(t);
      map.set(t.projectId, arr);
    }
    return [...map.entries()].sort((a, b) => {
      const pa = projectsById.get(a[0])?.name ?? '';
      const pb = projectsById.get(b[0])?.name ?? '';
      return pa.localeCompare(pb);
    });
  }, [filtered, projectsById]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not load your tasks"
        description="Please retry — if it keeps failing, sign out and back in."
      />
    );
  }

  const counts = {
    all: data?.tasks?.length ?? 0,
    active: data?.tasks?.filter((t) => t.status !== 'done').length ?? 0,
    overdue: data?.tasks?.filter((t) => isOverdue(tsToDate(t.dueDate), t.status)).length ?? 0,
    done: data?.tasks?.filter((t) => t.status === 'done').length ?? 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My tasks</h1>
        <p className="text-sm text-muted-foreground">
          Everything assigned to you across your teams. Update status with one click.
        </p>
      </div>

      <Tabs value={bucket} onValueChange={(v) => setBucket(v as Bucket)}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Clock className="h-4 w-4" /> Active
            <Badge variant="secondary" className="ml-1">{counts.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertTriangle className="h-4 w-4" /> Overdue
            <Badge variant={counts.overdue > 0 ? 'destructive' : 'secondary'} className="ml-1">
              {counts.overdue}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="done" className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Done
            <Badge variant="secondary" className="ml-1">{counts.done}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <ListChecks className="h-4 w-4" /> All
            <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={bucket}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={
                bucket === 'overdue'
                  ? 'Nothing overdue'
                  : bucket === 'done'
                    ? 'No completed tasks yet'
                    : 'No tasks assigned to you'
              }
              description={
                bucket === 'active'
                  ? "You're all caught up. Tasks assigned to you will show up here."
                  : 'Switch tabs to see other states.'
              }
            />
          ) : (
            <div className="space-y-5">
              {grouped.map(([projectId, items]) => (
                <ProjectGroup
                  key={projectId}
                  project={projectsById.get(projectId)}
                  team={
                    items[0]?.teamId ? teamsById.get(items[0].teamId) : undefined
                  }
                  tasks={items}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectGroup({
  project,
  team,
  tasks,
}: {
  project: ProjectDoc | undefined;
  team: TeamDoc | undefined;
  tasks: TaskDoc[];
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {team ? <span className="truncate">{team.name}</span> : null}
              {team && project ? <ChevronRight className="h-3 w-3" /> : null}
              {project ? (
                <Link to={`/projects/${project.id}`} className="hover:text-foreground hover:underline">
                  {project.name}
                </Link>
              ) : (
                <span>Unknown project</span>
              )}
            </div>
          </div>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
        <ul className="divide-y divide-border/60">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function TaskRow({ task }: { task: TaskDoc }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const overdue = isOverdue(tsToDate(task.dueDate), task.status);

  const cycleStatus = (current: TaskStatus): TaskStatus =>
    current === 'todo' ? 'in_progress' : current === 'in_progress' ? 'done' : 'todo';

  const onToggle = async () => {
    setPending(true);
    const next = cycleStatus(task.status);
    try {
      await api.patch(`/tasks/${task.id}`, { status: next });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['my-tasks'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['tasks', 'project', task.projectId] }),
      ]);
      if (next === 'done') toast.success('Task completed');
      else toast.success(`Status → ${next.replace('_', ' ')}`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to update task');
    } finally {
      setPending(false);
    }
  };

  return (
    <li className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-accent/30">
      <button
        type="button"
        aria-label="Cycle status"
        onClick={onToggle}
        disabled={pending}
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all',
          task.status === 'done' && 'border-emerald-500 bg-emerald-500 text-white',
          task.status === 'in_progress' && 'border-violet-500 text-violet-500',
          task.status === 'todo' && 'border-muted-foreground/40 text-muted-foreground',
        )}
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : task.status === 'done' ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : task.status === 'in_progress' ? (
          <Circle className="h-2.5 w-2.5 fill-current" />
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <Link
          to={`/projects/${task.projectId}`}
          className={cn(
            'block truncate text-sm font-medium hover:underline',
            task.status === 'done' && 'text-muted-foreground line-through',
          )}
        >
          {task.title}
        </Link>
        {task.description ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <PriorityChip priority={task.priority} />
          {task.dueDate ? (
            <Badge variant={overdue ? 'destructive' : 'outline'} className="gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(tsToDate(task.dueDate))}
            </Badge>
          ) : null}
          <span>updated {formatRelative(tsToDate(task.updatedAt))}</span>
        </div>
      </div>
      <Button asChild variant="ghost" size="sm" className="shrink-0">
        <Link to={`/projects/${task.projectId}`}>Open</Link>
      </Button>
    </li>
  );
}

function PriorityChip({ priority }: { priority: 'low' | 'medium' | 'high' }) {
  const tone =
    priority === 'high' ? 'destructive' : priority === 'medium' ? 'warning' : 'secondary';
  return (
    <Badge variant={tone} className="gap-1">
      <Flag className="h-3 w-3" /> {priority}
    </Badge>
  );
}
