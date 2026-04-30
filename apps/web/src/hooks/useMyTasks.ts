import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TaskDoc, ProjectDoc, TeamDoc } from '@/lib/types';

export interface MyTasksData {
  tasks: TaskDoc[];
  projects: ProjectDoc[];
  teams: TeamDoc[];
}

export function useMyTasks() {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const { data } = await api.get<MyTasksData>('/me/tasks');
      return data;
    },
  });
}
