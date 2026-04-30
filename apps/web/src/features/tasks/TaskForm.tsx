import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiClientError } from '@/lib/api';
import type { TaskDoc, TeamMember, TaskStatus, TaskPriority } from '@/lib/types';
import { tsToDate } from '@/lib/utils';

const schema = z.object({
  title: z.string().trim().min(1, 'Required').max(140),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof schema>;

interface Props {
  members: TeamMember[];
  initial?: TaskDoc;
  submittingLabel?: string;
  onSubmit: (values: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
    assigneeId: string | null;
  }) => Promise<unknown>;
}

export function TaskForm({ members, initial, onSubmit, submittingLabel = 'Save' }: Props) {
  const dueDateInitial = initial?.dueDate ? toInputDate(tsToDate(initial.dueDate)) : '';
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      status: initial?.status ?? 'todo',
      priority: initial?.priority ?? 'medium',
      dueDate: dueDateInitial,
      assigneeId: initial?.assigneeId ?? '',
    },
  });

  const status = watch('status');
  const priority = watch('priority');
  const assigneeId = watch('assigneeId');

  const submit = async (values: TaskFormValues) => {
    try {
      await onSubmit({
        title: values.title,
        description: values.description?.trim() || '',
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        assigneeId: values.assigneeId || null,
      });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Save failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" placeholder="What needs doing?" {...register('title')} />
        {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={4} placeholder="Add details (optional)" {...register('description')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setValue('status', v as TaskStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To do</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setValue('priority', v as TaskPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" type="date" {...register('dueDate')} />
        </div>
        <div className="space-y-2">
          <Label>Assignee</Label>
          <Select
            value={assigneeId || 'unassigned'}
            onValueChange={(v) => setValue('assigneeId', v === 'unassigned' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.uid} value={m.uid}>
                  {m.displayName || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="gradient" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />}
          {submittingLabel}
        </Button>
      </div>
    </form>
  );
}

function toInputDate(d: Date | null): string {
  if (!d) return '';
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}
