import { useMemo, useState, type HTMLAttributes, type Ref } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Calendar, Flag, GripVertical, Pencil, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, formatDate, initials, isOverdue, tsToDate } from '@/lib/utils';
import type { TaskDoc, TaskStatus, TeamMember } from '@/lib/types';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { ApiClientError } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TaskForm } from './TaskForm';

const COLUMNS: { id: TaskStatus; label: string; tone: string }[] = [
  { id: 'todo', label: 'To do', tone: 'border-slate-400/30' },
  { id: 'in_progress', label: 'In progress', tone: 'border-violet-400/40' },
  { id: 'done', label: 'Done', tone: 'border-emerald-400/40' },
];

interface Props {
  projectId: string;
  tasks: TaskDoc[];
  members: TeamMember[];
  canManage: boolean;
  currentUid: string | undefined;
}

export function KanbanBoard({ projectId, tasks, members, canManage, currentUid }: Props) {
  const update = useUpdateTask(projectId);
  const grouped = useMemo(() => {
    const map: Record<TaskStatus, TaskDoc[]> = { todo: [], in_progress: [], done: [] };
    for (const t of tasks) map[t.status].push(t);
    for (const k of Object.keys(map) as TaskStatus[]) {
      map[k].sort((a, b) => b.updatedAt._seconds - a.updatedAt._seconds);
    }
    return map;
  }, [tasks]);

  const [editing, setEditing] = useState<TaskDoc | null>(null);

  const onDragEnd = async (r: DropResult) => {
    if (!r.destination) return;
    const next = r.destination.droppableId as TaskStatus;
    const taskId = r.draggableId;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === next) return;

    // Members can only change status on tasks assigned to them or created by them.
    if (!canManage) {
      const allowed = task.assigneeId === currentUid || task.createdBy === currentUid;
      if (!allowed) {
        toast.error('Only the assignee or creator can change the status');
        return;
      }
    }

    try {
      await update.mutateAsync({ id: taskId, patch: { status: next } });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to update');
    }
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <Droppable droppableId={col.id} key={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'flex min-h-[60vh] flex-col rounded-lg border-t-2 bg-card/40 p-3 transition-colors',
                    col.tone,
                    snapshot.isDraggingOver && 'bg-card/70',
                  )}
                >
                  <div className="mb-3 flex items-center justify-between px-1 text-sm">
                    <span className="font-medium">{col.label}</span>
                    <Badge variant="secondary">{grouped[col.id].length}</Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {grouped[col.id].map((task, idx) => (
                      <Draggable draggableId={task.id} index={idx} key={task.id}>
                        {(p, s) => (
                          <TaskCard
                            innerRef={p.innerRef}
                            draggableProps={p.draggableProps}
                            dragHandleProps={p.dragHandleProps}
                            isDragging={s.isDragging}
                            task={task}
                            members={members}
                            canManage={canManage}
                            currentUid={currentUid}
                            onEdit={() => setEditing(task)}
                            projectId={projectId}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          {editing ? (
            <TaskForm
              members={members}
              initial={editing}
              submittingLabel="Save changes"
              onSubmit={async (values) => {
                await update.mutateAsync({ id: editing.id, patch: values });
                toast.success('Task updated');
                setEditing(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface TaskCardProps {
  innerRef: (el: HTMLElement | null) => void;
  draggableProps: HTMLAttributes<HTMLElement>;
  dragHandleProps: HTMLAttributes<HTMLElement> | null | undefined;
  isDragging: boolean;
  task: TaskDoc;
  members: TeamMember[];
  canManage: boolean;
  currentUid: string | undefined;
  onEdit: () => void;
  projectId: string;
}

function TaskCard({
  innerRef,
  draggableProps,
  dragHandleProps,
  isDragging,
  task,
  members,
  canManage,
  currentUid,
  onEdit,
  projectId,
}: TaskCardProps) {
  const del = useDeleteTask(projectId);
  const assignee = members.find((m) => m.uid === task.assigneeId);
  const overdue = isOverdue(tsToDate(task.dueDate), task.status);
  const canEdit = canManage || task.createdBy === currentUid;
  const canDelete = canManage || task.createdBy === currentUid;

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await del.mutateAsync(task.id);
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to delete');
    }
  };

  return (
    <Card
      ref={innerRef as Ref<HTMLDivElement>}
      {...draggableProps}
      className={cn(
        'group relative space-y-2 border-border/60 p-3 transition-all',
        isDragging && 'ring-2 ring-primary/50 shadow-glow',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="line-clamp-2 text-sm font-medium leading-snug">{task.title}</h4>
          {task.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5">
          {canEdit ? (
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={onEdit} aria-label="Edit task">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              aria-label="Delete task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <span
            {...dragHandleProps}
            className="grid h-7 w-7 shrink-0 cursor-grab place-items-center rounded text-muted-foreground hover:bg-accent active:cursor-grabbing"
            aria-label="Drag handle"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
        <PriorityBadge priority={task.priority} />
        {task.dueDate ? (
          <Badge variant={overdue ? 'destructive' : 'outline'} className="gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(tsToDate(task.dueDate))}
          </Badge>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-1.5">
          {assignee ? (
            <Avatar className="h-6 w-6">
              {assignee.photoURL ? (
                <AvatarImage src={assignee.photoURL} alt={assignee.displayName} />
              ) : null}
              <AvatarFallback>{initials(assignee.displayName || assignee.email)}</AvatarFallback>
            </Avatar>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Unassigned
            </span>
          )}
        </span>
      </div>
    </Card>
  );
}

function PriorityBadge({ priority }: { priority: 'low' | 'medium' | 'high' }) {
  if (priority === 'high') {
    return (
      <Badge variant="destructive" className="gap-1">
        <Flag className="h-3 w-3" /> high
      </Badge>
    );
  }
  if (priority === 'medium') {
    return (
      <Badge variant="warning" className="gap-1">
        <Flag className="h-3 w-3" /> medium
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Flag className="h-3 w-3" /> low
    </Badge>
  );
}
