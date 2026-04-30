import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectDoc, TeamDoc } from '@/lib/types';

export const projectsKeys = {
  all: ['projects'] as const,
  byTeam: (teamId: string) => [...projectsKeys.all, 'team', teamId] as const,
  detail: (id: string) => [...projectsKeys.all, 'detail', id] as const,
};

export function useTeamProjects(teamId: string | undefined) {
  return useQuery({
    enabled: !!teamId,
    queryKey: projectsKeys.byTeam(teamId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ projects: ProjectDoc[] }>(`/teams/${teamId}/projects`);
      return data.projects;
    },
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    enabled: !!projectId,
    queryKey: projectsKeys.detail(projectId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ project: ProjectDoc; team: TeamDoc }>(
        `/projects/${projectId}`,
      );
      return data;
    },
  });
}

export function useCreateProject(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data } = await api.post<{ project: ProjectDoc }>(
        `/teams/${teamId}/projects`,
        input,
      );
      return data.project;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: projectsKeys.byTeam(teamId) }),
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<{ name: string; description: string; status: 'active' | 'archived' }>) => {
      const { data } = await api.patch<{ project: ProjectDoc }>(`/projects/${projectId}`, input);
      return data.project;
    },
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      qc.invalidateQueries({ queryKey: projectsKeys.byTeam(project.teamId) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/projects/${projectId}`);
      return projectId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: projectsKeys.all }),
  });
}
