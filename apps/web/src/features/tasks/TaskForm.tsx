import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, User, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ApiClientError } from '@/lib/api';
import type { TaskDoc, TeamMember, TaskStatus, TaskPriority } from '@/lib/types';
import { tsToDate, initials } from '@/lib/utils';

const schema = z.object({
  title: z.string().trim().min(1, 'Required').max(140),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional(),
  assigneeIds: z.array(z.string()).default([]),
});

export type TaskFormValues = z.infer<typeof schema>;

interface Props {
  membersByTeam: { teamId: string; teamName: string; members: TeamMember[] }[];
  initial?: TaskDoc;
  submittingLabel?: string;
  onSubmit: (values: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
    assigneeIds: string[];
  }) => Promise<unknown>;
}

export function TaskForm({ membersByTeam, initial, onSubmit, submittingLabel = 'Save' }: Props) {
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
      assigneeIds: initial?.assigneeIds ?? [],
    },
  });

  const status = watch('status');
  const priority = watch('priority');
  const assigneeIds = watch('assigneeIds');

  const submit = async (values: TaskFormValues) => {
    try {
      await onSubmit({
        title: values.title,
        description: values.description?.trim() || '',
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        assigneeIds: values.assigneeIds || [],
      });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Save failed');
    }
  };

  const toggleAssignee = (uid: string) => {
    if (assigneeIds.includes(uid)) {
      setValue('assigneeIds', assigneeIds.filter(id => id !== uid), { shouldValidate: true });
    } else {
      setValue('assigneeIds', [...assigneeIds, uid], { shouldValidate: true });
    }
  };

  const allMembers = membersByTeam.flatMap(t => t.members);
  const selectedMembers = assigneeIds
    .map(id => allMembers.find(m => m.uid === id))
    .filter((m): m is TeamMember => m !== undefined);
  // Deduplicate in case a member is in multiple teams
  const uniqueSelectedMembers = Array.from(new Map(selectedMembers.map(m => [m.uid, m])).values());

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

      <div className="space-y-2">
        <Label htmlFor="dueDate">Due date</Label>
        <Input id="dueDate" type="date" {...register('dueDate')} />
      </div>

      <div className="space-y-3">
        <Label>Assignees</Label>
        {membersByTeam.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members available to assign.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {uniqueSelectedMembers.map((m) => (
              <Badge key={m.uid} variant="secondary" className="flex items-center gap-1.5 py-1 px-2 border border-border/50">
                <Avatar className="h-4 w-4">
                  {m.photoURL ? <AvatarImage src={m.photoURL} alt={m.displayName} /> : null}
                  <AvatarFallback className="text-[8px] bg-teal-100 text-teal-700">{initials(m.displayName || m.email)}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-normal">{m.displayName || m.email.split('@')[0]}</span>
                <button 
                  type="button" 
                  onClick={() => toggleAssignee(m.uid)} 
                  className="ml-0.5 rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                   <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </button>
              </Badge>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-7 border-dashed text-xs rounded-full">
                  <Plus className="mr-1 h-3 w-3" /> Add Assignee
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-[300px] overflow-y-auto" align="start">
                {membersByTeam.map((teamGroup, idx) => (
                  <div key={teamGroup.teamId}>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{teamGroup.teamName}</DropdownMenuLabel>
                      {teamGroup.members.map((m) => (
                        <DropdownMenuCheckboxItem
                          key={`${teamGroup.teamId}-${m.uid}`}
                          checked={assigneeIds.includes(m.uid)}
                          onCheckedChange={() => toggleAssignee(m.uid)}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              {m.photoURL ? <AvatarImage src={m.photoURL} alt={m.displayName} /> : null}
                              <AvatarFallback className="text-[8px] bg-teal-100 text-teal-700">{initials(m.displayName || m.email)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate flex-1 max-w-[120px] font-medium">{m.displayName || m.email.split('@')[0]}</span>
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                    {idx < membersByTeam.length - 1 && <DropdownMenuSeparator />}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
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
