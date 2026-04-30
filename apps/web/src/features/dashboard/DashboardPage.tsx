import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FolderKanban,
  ListChecks,
  Sparkles,
  Users,
} from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, formatDate, formatRelative, isOverdue, tsToDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { DashboardData } from '@/lib/types';

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            A snapshot of your work — what's open, what's overdue, and what's next.
          </p>
        </div>
        <Button asChild variant="gradient">
          <Link to="/teams">
            <Sparkles className="h-4 w-4" />
            Go to teams
          </Link>
        </Button>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Users}
          title="Welcome to Team Task Manager"
          description="Create your first team to start organizing projects and tasks. You'll be the team admin by default."
          action={
            <Button asChild variant="gradient">
              <Link to="/teams">Create a team</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={Users} label="Teams" value={counts.teams} accent="violet" />
            <StatCard icon={FolderKanban} label="Projects" value={counts.projects} accent="blue" />
            <StatCard icon={ListChecks} label="My tasks" value={counts.myTasks} accent="emerald" />
            <StatCard
              icon={AlertTriangle}
              label="Overdue"
              value={counts.overdue}
              accent={counts.overdue > 0 ? 'rose' : 'slate'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <StatusChart data={data} />
            <OverdueList data={data} />
            <DueSoonList data={data} />
          </div>

          <RecentActivity data={data} />
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  accent: 'violet' | 'blue' | 'emerald' | 'rose' | 'slate';
}) {
  const tone = {
    violet: 'from-violet-500/20 to-violet-500/0 text-violet-400',
    blue: 'from-blue-500/20 to-blue-500/0 text-blue-400',
    emerald: 'from-emerald-500/20 to-emerald-500/0 text-emerald-400',
    rose: 'from-rose-500/20 to-rose-500/0 text-rose-400',
    slate: 'from-slate-500/15 to-slate-500/0 text-slate-300',
  }[accent];
  return (
    <Card className="overflow-hidden">
      <div className={cn('bg-gradient-to-br p-5', tone)}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 opacity-80" />
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      </div>
    </Card>
  );
}

function StatusChart({ data }: { data: DashboardData }) {
  const chart = [
    { name: 'To do', value: data.counts.byStatus.todo, fill: '#94a3b8' },
    { name: 'In progress', value: data.counts.byStatus.in_progress, fill: '#8b5cf6' },
    { name: 'Done', value: data.counts.byStatus.done, fill: '#10b981' },
  ];
  const total = chart.reduce((s, x) => s + x.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks by status</CardTitle>
        <CardDescription>Across all teams you belong to</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="grid h-48 place-items-center text-sm text-muted-foreground">
            No tasks yet
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chart}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  stroke="transparent"
                >
                  {chart.map((c) => (
                    <Cell key={c.name} fill={c.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OverdueList({ data }: { data: DashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-400" /> Overdue
        </CardTitle>
        <CardDescription>Tasks past their due date assigned to you</CardDescription>
      </CardHeader>
      <CardContent>
        {data.overdue.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-emerald-400" />
            Nothing overdue. Nice work.
          </div>
        ) : (
          <ul className="space-y-2">
            {data.overdue.slice(0, 6).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/40 p-3 text-sm"
              >
                <Link to={`/projects/${t.projectId}`} className="min-w-0 flex-1 truncate hover:underline">
                  {t.title}
                </Link>
                <Badge variant="destructive">
                  due {formatRelative(tsToDate(t.dueDate))}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DueSoonList({ data }: { data: DashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" /> Due soon
        </CardTitle>
        <CardDescription>Your next 5 upcoming items</CardDescription>
      </CardHeader>
      <CardContent>
        {data.dueSoon.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            No upcoming tasks
          </div>
        ) : (
          <ul className="space-y-2">
            {data.dueSoon.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/40 p-3 text-sm"
              >
                <Link to={`/projects/${t.projectId}`} className="min-w-0 flex-1 truncate hover:underline">
                  {t.title}
                </Link>
                <span className="text-xs text-muted-foreground">{formatDate(tsToDate(t.dueDate))}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivity({ data }: { data: DashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>The latest task updates across your teams</CardDescription>
      </CardHeader>
      <CardContent>
        {data.recent.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Activity will appear here as your team makes progress.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.recent.map((t) => {
              const overdue = isOverdue(tsToDate(t.dueDate), t.status);
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link to={`/projects/${t.projectId}`} className="block truncate font-medium hover:underline">
                      {t.title}
                    </Link>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Updated {formatRelative(tsToDate(t.updatedAt))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdue ? <Badge variant="destructive">overdue</Badge> : null}
                    <StatusBadge status={t.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: 'todo' | 'in_progress' | 'done' }) {
  if (status === 'done') return <Badge variant="success">done</Badge>;
  if (status === 'in_progress') return <Badge>in progress</Badge>;
  return <Badge variant="outline">to do</Badge>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}
