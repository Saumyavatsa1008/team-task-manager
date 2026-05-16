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
  LayoutGrid,
  List,
  Plus,
  FolderKanban,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMyTasks } from '@/hooks/useMyTasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, formatDate, formatRelative, isOverdue, tsToDate } from '@/lib/utils';
import { api, ApiClientError } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import type { TaskDoc, TaskStatus, ProjectDoc, TeamDoc } from '@/lib/types';

type Bucket = 'all' | 'active' | 'overdue' | 'done';
type ViewMode = 'board' | 'list';

export function MyTasksPage() {
  const { data, isLoading, isError } = useMyTasks();
  const [bucket, setBucket] = useState<Bucket>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const filtered = useMemo(() => {
    if (!data?.tasks) return [];
    switch (bucket) {
      case 'active': return data.tasks.filter((t) => t.status !== 'done');
      case 'overdue': return data.tasks.filter((t) => isOverdue(tsToDate(t.dueDate), t.status));
      case 'done': return data.tasks.filter((t) => t.status === 'done');
      default: return data.tasks;
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

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48 rounded-xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );

  if (isError || !data) return (
    <EmptyState icon={AlertTriangle} title="Could not load your tasks" description="Please retry — if it keeps failing, sign out and back in." />
  );

  const counts = {
    all: data?.tasks?.length ?? 0,
    active: data?.tasks?.filter((t) => t.status !== 'done').length ?? 0,
    overdue: data?.tasks?.filter((t) => isOverdue(tsToDate(t.dueDate), t.status)).length ?? 0,
    done: data?.tasks?.filter((t) => t.status === 'done').length ?? 0,
  };

  const TABS: { key: Bucket; label: string; icon: typeof Clock; count: number; danger?: boolean }[] = [
    { key: 'active', label: 'Active', icon: Clock, count: counts.active },
    { key: 'overdue', label: 'Overdue', icon: AlertTriangle, count: counts.overdue, danger: true },
    { key: 'done', label: 'Done', icon: CheckCircle2, count: counts.done },
    { key: 'all', label: 'All', icon: ListChecks, count: counts.all },
  ];

  // Board mode: group by status
  const boardColumns: { key: TaskStatus; label: string; color: string; tasks: TaskDoc[] }[] = [
    { key: 'todo', label: 'To Do', color: 'border-t-slate-400', tasks: filtered.filter(t => t.status === 'todo') },
    { key: 'in_progress', label: 'In Progress', color: 'border-t-teal-500', tasks: filtered.filter(t => t.status === 'in_progress') },
    { key: 'done', label: 'Done', color: 'border-t-green-500', tasks: filtered.filter(t => t.status === 'done') },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">Focus on what's important today.</p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 font-semibold" asChild>
          <Link to="/teams"><Plus className="h-4 w-4" /> New Task</Link>
        </Button>
      </div>

      {/* Tab Bar + View Toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-muted/30 p-1">
          {TABS.map(({ key, label, icon: Icon, count, danger }) => (
            <button
              key={key}
              onClick={() => setBucket(key)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                bucket === key
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <span className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
                bucket === key
                  ? danger && count > 0 ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-400'
                  : 'bg-muted text-muted-foreground'
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
          <button
            onClick={() => setViewMode('board')}
            className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all', viewMode === 'board' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all', viewMode === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={bucket === 'overdue' ? 'Nothing overdue' : bucket === 'done' ? 'No completed tasks yet' : 'No tasks assigned to you'}
          description={bucket === 'active' ? "You're all caught up. Tasks assigned to you will show up here." : 'Switch tabs to see other states.'}
        />
      ) : viewMode === 'board' ? (
        /* Board View */
        <div className="grid gap-4 md:grid-cols-3">
          {boardColumns.map((col) => (
            <div key={col.key} className={cn('rounded-2xl border-t-4 border border-border/60 bg-card overflow-hidden', col.color)}>
              <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                <span className="font-semibold text-sm">{col.label}</span>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{col.tasks.length}</span>
              </div>
              <div className="p-3 space-y-3">
                {col.tasks.map((t) => (
                  <BoardTaskCard key={t.id} task={t} project={projectsById.get(t.projectId)} team={t.teamIds?.[0] ? teamsById.get(t.teamIds[0]) : undefined} />
                ))}
                {col.tasks.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">No tasks</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View — grouped by project */
        <div className="space-y-4">
          {grouped.map(([projectId, items]) => (
            <ProjectGroup
              key={projectId}
              project={projectsById.get(projectId)}
              team={items[0]?.teamIds?.[0] ? teamsById.get(items[0].teamIds[0]) : undefined}
              tasks={items}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BoardTaskCard({ task, project, team }: { task: TaskDoc; project?: ProjectDoc; team?: TeamDoc }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const overdue = isOverdue(tsToDate(task.dueDate), task.status);

  const cycleStatus = (s: TaskStatus): TaskStatus => s === 'todo' ? 'in_progress' : s === 'in_progress' ? 'done' : 'todo';

  const onToggle = async () => {
    setPending(true);
    const next = cycleStatus(task.status);
    try {
      await api.patch(`/tasks/${task.id}`, { status: next });
      await Promise.all([qc.invalidateQueries({ queryKey: ['my-tasks'] }), qc.invalidateQueries({ queryKey: ['dashboard'] })]);
      toast.success(next === 'done' ? 'Task completed!' : `Status → ${next.replace('_', ' ')}`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to update');
    } finally { setPending(false); }
  };

  return (
    <div className={cn('rounded-xl border p-3 bg-background transition-all hover:shadow-sm', overdue ? 'border-red-200 dark:border-red-900' : 'border-border/60')}>
      {project && (
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {team?.name && <span>{team.name} · </span>}{project.name}
        </div>
      )}
      <Link to={`/projects/${task.projectId}`} className={cn('block text-sm font-medium hover:underline mb-2', task.status === 'done' && 'line-through text-muted-foreground')}>
        {task.title}
      </Link>
      <div className="flex items-center justify-between gap-2">
        <PriorityChip priority={task.priority} />
        {task.dueDate && (
          <span className={cn('text-[10px] font-medium flex items-center gap-1', overdue ? 'text-red-500' : 'text-muted-foreground')}>
            <Calendar className="h-3 w-3" />
            {formatDate(tsToDate(task.dueDate))}
          </span>
        )}
      </div>
      <button
        onClick={onToggle}
        disabled={pending}
        className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-border/60 py-1.5 text-xs font-medium text-muted-foreground hover:border-teal-400 hover:text-teal-600 transition-colors"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
        {pending ? 'Updating...' : 'Advance Status'}
      </button>
    </div>
  );
}

function ProjectGroup({ project, team, tasks }: { project: ProjectDoc | undefined; team: TeamDoc | undefined; tasks: TaskDoc[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5 bg-muted/20">
        <div className="flex items-center gap-2 text-sm">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          {team && <span className="text-muted-foreground">{team.name}</span>}
          {team && project && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
          {project ? (
            <Link to={`/projects/${project.id}`} className="font-semibold hover:text-teal-600 hover:underline">{project.name}</Link>
          ) : <span className="font-semibold text-muted-foreground">Unknown project</span>}
        </div>
        <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2.5 py-1">{tasks.length}</span>
      </div>
      <ul className="divide-y divide-border/40">
        {tasks.map((t) => <TaskRow key={t.id} task={t} />)}
      </ul>
    </div>
  );
}

function TaskRow({ task }: { task: TaskDoc }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const overdue = isOverdue(tsToDate(task.dueDate), task.status);

  const cycleStatus = (s: TaskStatus): TaskStatus => s === 'todo' ? 'in_progress' : s === 'in_progress' ? 'done' : 'todo';

  const onToggle = async () => {
    setPending(true);
    const next = cycleStatus(task.status);
    try {
      await api.patch(`/tasks/${task.id}`, { status: next });
      await Promise.all([qc.invalidateQueries({ queryKey: ['my-tasks'] }), qc.invalidateQueries({ queryKey: ['dashboard'] }), qc.invalidateQueries({ queryKey: ['tasks', 'project', task.projectId] })]);
      if (next === 'done') toast.success('Task completed!');
      else toast.success(`Status → ${next.replace('_', ' ')}`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to update task');
    } finally { setPending(false); }
  };

  return (
    <li className={cn('flex items-start gap-3 px-5 py-4 transition-colors hover:bg-accent/30', overdue && 'bg-red-50/30 dark:bg-red-950/10')}>
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          task.status === 'done' && 'border-teal-500 bg-teal-500 text-white',
          task.status === 'in_progress' && 'border-teal-500 text-teal-500',
          task.status === 'todo' && 'border-muted-foreground/40 text-muted-foreground',
        )}
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> :
         task.status === 'done' ? <CheckCircle2 className="h-3 w-3" /> :
         task.status === 'in_progress' ? <Circle className="h-2.5 w-2.5 fill-current" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <Link
          to={`/projects/${task.projectId}`}
          className={cn('block text-sm font-medium hover:underline', task.status === 'done' && 'line-through text-muted-foreground')}
        >
          {task.title}
        </Link>
        {task.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PriorityChip priority={task.priority} />
          {task.dueDate && (
            <span className={cn('flex items-center gap-1 text-xs', overdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
              <Calendar className="h-3 w-3" />
              {overdue ? 'Overdue · ' : ''}{formatDate(tsToDate(task.dueDate))}
            </span>
          )}
          <span className="text-xs text-muted-foreground">updated {formatRelative(tsToDate(task.updatedAt))}</span>
        </div>
      </div>
      <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-lg text-xs gap-1 opacity-60 hover:opacity-100">
        <Link to={`/projects/${task.projectId}`}>Open <ChevronRight className="h-3 w-3" /></Link>
      </Button>
    </li>
  );
}

function PriorityChip({ priority }: { priority: 'low' | 'medium' | 'high' }) {
  const styles = {
    high: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800',
    medium: 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
    low: 'bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
  }[priority];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold', styles)}>
      <Flag className="h-2.5 w-2.5" /> {priority}
    </span>
  );
}