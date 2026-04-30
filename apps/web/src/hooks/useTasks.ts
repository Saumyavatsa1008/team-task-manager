import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TaskDoc, TaskStatus, TaskPriority } from '@/lib/types';

export const tasksKeys = {
  all: ['tasks'] as const,
  byProject: (projectId: string) => [...tasksKeys.all, 'project', projectId] as const,
  detail: (id: string) => [...tasksKeys.all, 'detail', id] as const,
};

export interface TaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
}

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    enabled: !!projectId,
    queryKey: tasksKeys.byProject(projectId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ tasks: TaskDoc[] }>(`/projects/${projectId}/tasks`);
      return data.tasks;
    },
  });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInput) => {
      const { data } = await api.post<{ task: TaskDoc }>(
        `/projects/${projectId}/tasks`,
        input,
      );
      return data.task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksKeys.byProject(projectId) });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TaskInput> }) => {
      const { data } = await api.patch<{ task: TaskDoc }>(`/tasks/${id}`, patch);
      return data.task;
    },
    onMutate: async ({ id, patch }) => {
      // Optimistic update for the kanban view.
      await qc.cancelQueries({ queryKey: tasksKeys.byProject(projectId) });
      const previous = qc.getQueryData<TaskDoc[]>(tasksKeys.byProject(projectId));
      if (previous) {
        qc.setQueryData<TaskDoc[]>(
          tasksKeys.byProject(projectId),
          previous.map((t) => (t.id === id ? ({ ...t, ...patch } as TaskDoc) : t)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(tasksKeys.byProject(projectId), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: tasksKeys.byProject(projectId) });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksKeys.byProject(projectId) });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
