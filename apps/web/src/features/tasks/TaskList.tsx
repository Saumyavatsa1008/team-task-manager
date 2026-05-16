import { useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TaskForm } from './TaskForm';
import { useDeleteTask, useUpdateTask } from '@/hooks/useTasks';
import { ApiClientError } from '@/lib/api';
import { tsToDate, initials } from '@/lib/utils';
import type { TaskDoc, TeamMember } from '@/lib/types';
import { useAuth } from '@/features/auth/AuthProvider';

interface Props {
  tasks: TaskDoc[];
  canManage: boolean;
  teamIds: string[];
}

export function TaskList({ tasks, canManage, teamIds }: Props) {
  // Flat grid of tasks
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in mt-4">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} canManage={canManage} teamIds={teamIds} />
      ))}
    </div>
  );
}

function TaskCard({ task, canManage, teamIds }: { task: TaskDoc; canManage: boolean; teamIds: string[] }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [membersByTeam, setMembersByTeam] = useState<{ teamId: string; teamName: string; members: TeamMember[] }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const update = useUpdateTask(task.projectId);
  const remove = useDeleteTask(task.projectId);

  const isCreator = user?.uid === task.createdBy;
  const canEdit = canManage || isCreator || task.assigneeIds.includes(user?.uid ?? '');
  const canDelete = canManage || isCreator;

  // We only fetch members when opening the edit dialog to avoid n+1 requests.
  const handleOpenEdit = async () => {
    if (!canEdit) return;
    setOpen(true);
    if (membersByTeam.length > 0) return;
    
    setLoadingMembers(true);
    try {
      const { api } = await import('@/lib/api');
      const groups: { teamId: string; teamName: string; members: TeamMember[] }[] = [];
      for (const tid of teamIds) {
        const { data } = await api.get<any>(`/teams/${tid}`);
        if (data && data.members) {
          groups.push({ teamId: tid, teamName: data.team.name, members: data.members });
        }
      }
      setMembersByTeam(groups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMembers(false);
    }
  };

  const statusColors = {
    todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    done: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  };

  const statusLabels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
  };

  return (
    <>
      <div
        onClick={handleOpenEdit}
        className={`group relative flex flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:shadow-md ${canEdit ? 'cursor-pointer hover:border-teal-300' : ''}`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
           <Badge variant="outline" className={`border-none ${statusColors[task.status]}`}>
             {statusLabels[task.status]}
           </Badge>

           {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Delete this task?')) {
                  remove.mutate(task.id);
                }
              }}
              className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              title="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <h4 className="font-semibold text-base mb-1 line-clamp-2">{task.title}</h4>
        
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {task.description}
          </p>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/40">
          <div className="flex -space-x-2 overflow-hidden">
            {task.assigneeIds.length > 0 ? (
              // Note: since we don't have member details on the task object, we just show generic avatars, 
              // or ideally we'd look them up. For now, since we want to show avatars, we could fetch them,
              // but doing it for every card might be heavy. Let's show generic icons for the count.
              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                 <span className="text-[10px] text-muted-foreground uppercase font-semibold">Assigned</span>
                 <Badge variant="secondary" className="h-5 px-1.5 text-xs rounded-full bg-teal-100 text-teal-700">{task.assigneeIds.length}</Badge>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">Unassigned</span>
            )}
          </div>

          {task.dueDate && (
             <div className="flex items-center gap-1 text-xs text-muted-foreground">
               <Calendar className="h-3 w-3" />
               {format(tsToDate(task.dueDate)!, 'MMM d')}
             </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          {loadingMembers ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <TaskForm
              membersByTeam={membersByTeam}
              initial={task}
              onSubmit={async (values) => {
                try {
                  await update.mutateAsync({ id: task.id, patch: values });
                  toast.success('Task updated');
                  setOpen(false);
                } catch (err) {
                  toast.error(err instanceof ApiClientError ? err.message : 'Update failed');
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
