import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FolderKanban,
  ListChecks,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowRight,
  Flag,
  Activity,
} from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { cn, formatDate, formatRelative, isOverdue, tsToDate } from '@/lib/utils';
import type { DashboardData, TaskDoc } from '@/lib/types';

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not load dashboard"
        description="Check that the API is reachable and that you are signed in."
      />
    );
  }

  const { counts } = data;
  const isEmpty = counts.teams === 0 && counts.projects === 0;
  const productivity = counts.tasks > 0 ? Math.round((counts.byStatus.done / counts.tasks) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's what's happening across your projects today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl">
            <Calendar className="h-4 w-4" /> This Week
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Users}
          title="Welcome to TaskFlow Pro"
          description="Create your first team to start organizing projects and tasks. You'll be the team admin by default."
          action={
            <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2">
              <Link to="/teams"><Users className="h-4 w-4" /> Create a team</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Stats Grid — 4 cards like the mockup */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={FolderKanban}
              label="Active Projects"
              value={counts.projects}
              trend={12}
              trendUp
              color="teal"
            />
            <StatCard
              icon={ListChecks}
              label="Tasks Due Today"
              value={counts.overdue + counts.myByStatus.todo}
              trend={4}
              trendUp={false}
              color="orange"
            />
            <StatCard
              icon={Activity}
              label="Team Productivity"
              value={`${productivity}%`}
              trend={8}
              trendUp
              color="blue"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed Tasks"
              value={counts.byStatus.done}
              trend={0}
              trendUp
              color="green"
            />
          </div>

          {/* Main content — 2-col layout */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Upcoming Deadlines — left, wider */}
            <div className="lg:col-span-3">
              <UpcomingDeadlines data={data} />
            </div>
            {/* Recent Activity — right */}
            <div className="lg:col-span-2">
              <RecentActivity data={data} />
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TeamWorkload data={data} />
            <QuickActions />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  trend: number;
  trendUp: boolean;
  color: 'teal' | 'orange' | 'blue' | 'green';
}) {
  const colors = {
    teal: { bg: 'bg-teal-50 dark:bg-teal-950/30', icon: 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400', trend: 'text-teal-600' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', icon: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400', trend: 'text-red-500' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400', trend: 'text-teal-600' },
    green: { bg: 'bg-green-50 dark:bg-green-950/30', icon: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400', trend: 'text-teal-600' },
  }[color];

  return (
    <div className={cn('rounded-2xl border border-border/60 p-5 transition-shadow hover:shadow-md', colors.bg)}>
      <div className="flex items-start justify-between gap-2">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colors.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend > 0 && (
          <div className={cn('flex items-center gap-1 text-xs font-semibold', trendUp ? 'text-teal-600' : 'text-red-500')}>
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function UpcomingDeadlines({ data }: { data: DashboardData }) {
  const tasks = [...data.overdue.slice(0, 2), ...data.dueSoon.slice(0, 3)];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-base">Upcoming Deadlines</h2>
        <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 gap-1 text-xs" asChild>
          <Link to="/my-tasks">View All <ArrowRight className="h-3 w-3" /></Link>
        </Button>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-teal-500" />
          <p className="text-sm text-muted-foreground">No upcoming deadlines. You're all set!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => {
            const overdue = isOverdue(tsToDate(t.dueDate), t.status);
            const priority = t.priority;
            return (
              <DeadlineRow key={t.id} task={t} overdue={overdue} priority={priority} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeadlineRow({ task, overdue, priority }: { task: TaskDoc; overdue: boolean; priority: string }) {
  const priorityConfig = {
    high: { label: 'High Priority', color: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800', bar: 'bg-red-500' },
    medium: { label: 'Medium Priority', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800', bar: 'bg-blue-500' },
    low: { label: 'Low Priority', color: 'bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700', bar: 'bg-gray-400' },
  }[priority as 'high' | 'medium' | 'low'] ?? { label: priority, color: 'bg-muted text-muted-foreground border-border', bar: 'bg-muted-foreground' };

  return (
    <Link
      to={`/projects/${task.projectId}`}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-4 transition-all hover:shadow-sm hover:scale-[1.01]',
        overdue ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10' : 'border-border/60 bg-background hover:border-teal-200 dark:hover:border-teal-800'
      )}
    >
      <div className={cn('w-1 self-stretch rounded-full min-h-8', priorityConfig.bar)} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{task.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {overdue ? 'Overdue' : task.dueDate ? formatDate(tsToDate(task.dueDate)) : 'No due date'}
        </div>
      </div>
      <div className={cn('shrink-0 rounded-lg border px-2 py-1 text-xs font-medium', priorityConfig.color)}>
        {priorityConfig.label}
      </div>
    </Link>
  );
}

function RecentActivity({ data }: { data: DashboardData }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <h2 className="font-semibold text-base mb-5">Recent Activity</h2>
      {data.recent.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-6">No activity yet</div>
      ) : (
        <div className="space-y-4">
          {data.recent.slice(0, 6).map((t) => {
            const overdue = isOverdue(tsToDate(t.dueDate), t.status);
            return (
              <div key={t.id} className="flex gap-3">
                <div className="relative mt-1 shrink-0">
                  <div className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center',
                    t.status === 'done' ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600' :
                    overdue ? 'bg-red-100 dark:bg-red-900/50 text-red-500' :
                    'bg-blue-100 dark:bg-blue-900/50 text-blue-500'
                  )}>
                    {t.status === 'done' ? <CheckCircle2 className="h-4 w-4" /> :
                     overdue ? <AlertTriangle className="h-3.5 w-3.5" /> :
                     <Clock className="h-3.5 w-3.5" />}
                  </div>
                  <div className="absolute left-3.5 top-7 bottom-0 w-px bg-border/60 -mb-4 last:hidden" />
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <Link to={`/projects/${t.projectId}`} className="block text-sm font-medium hover:underline truncate">{t.title}</Link>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    <span className="text-xs text-muted-foreground">{formatRelative(tsToDate(t.updatedAt))}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamWorkload({ data }: { data: DashboardData }) {
  const statusData = [
    { label: 'To Do', value: data.counts.byStatus.todo, color: 'bg-slate-400', pct: data.counts.tasks > 0 ? (data.counts.byStatus.todo / data.counts.tasks) * 100 : 0 },
    { label: 'In Progress', value: data.counts.byStatus.in_progress, color: 'bg-teal-500', pct: data.counts.tasks > 0 ? (data.counts.byStatus.in_progress / data.counts.tasks) * 100 : 0 },
    { label: 'Done', value: data.counts.byStatus.done, color: 'bg-green-500', pct: data.counts.tasks > 0 ? (data.counts.byStatus.done / data.counts.tasks) * 100 : 0 },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-base">Team Workload</h2>
        <span className="text-xs text-muted-foreground">{data.counts.tasks} total tasks</span>
      </div>
      <div className="space-y-4">
        {statusData.map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1.5 text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="text-muted-foreground">{s.value}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', s.color)} style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-border/40 flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        {data.teams.length} team{data.teams.length !== 1 ? 's' : ''} · {data.counts.projects} project{data.counts.projects !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <h2 className="font-semibold text-base mb-5">Quick Actions</h2>
      <div className="space-y-3">
        <Link
          to="/teams"
          className="flex items-center gap-3 rounded-xl border border-dashed border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/10 p-4 text-sm font-medium text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/50 group-hover:bg-teal-200 dark:group-hover:bg-teal-800/50 transition-colors">
            <FolderKanban className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold">Create New Project</div>
            <div className="text-xs text-teal-600/70 dark:text-teal-500 font-normal">Start organizing a new initiative</div>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 opacity-60" />
        </Link>
        <Link
          to="/teams"
          className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-sm font-medium hover:bg-muted/60 transition-colors group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted group-hover:bg-accent transition-colors">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="font-semibold">Add Team Member</div>
            <div className="text-xs text-muted-foreground font-normal">Invite someone to collaborate</div>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 opacity-40" />
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'todo' | 'in_progress' | 'done' }) {
  if (status === 'done') return <Badge variant="success" className="text-[10px] px-1.5 py-0">done</Badge>;
  if (status === 'in_progress') return <Badge className="text-[10px] px-1.5 py-0 bg-teal-600 hover:bg-teal-700">in progress</Badge>;
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0">to do</Badge>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="lg:col-span-3 h-72 rounded-2xl" />
        <Skeleton className="lg:col-span-2 h-72 rounded-2xl" />
      </div>
    </div>
  );
}
