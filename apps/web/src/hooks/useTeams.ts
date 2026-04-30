import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TeamDoc, TeamDetail, InviteDoc } from '@/lib/types';

export const teamsKeys = {
  all: ['teams'] as const,
  list: () => [...teamsKeys.all, 'list'] as const,
  detail: (id: string) => [...teamsKeys.all, 'detail', id] as const,
};

export function useTeams() {
  return useQuery({
    queryKey: teamsKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<{ teams: TeamDoc[] }>('/teams');
      return data.teams;
    },
  });
}

export function useTeam(teamId: string | undefined) {
  return useQuery({
    enabled: !!teamId,
    queryKey: teamsKeys.detail(teamId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<TeamDetail>(`/teams/${teamId}`);
      return data;
    },
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data } = await api.post<{ team: TeamDoc }>('/teams', input);
      return data.team;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamsKeys.list() }),
  });
}

export function useUpdateTeam(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<{ name: string; description: string }>) => {
      const { data } = await api.patch<{ team: TeamDoc }>(`/teams/${teamId}`, input);
      return data.team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamsKeys.detail(teamId) });
      qc.invalidateQueries({ queryKey: teamsKeys.list() });
    },
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      await api.delete(`/teams/${teamId}`);
      return teamId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamsKeys.list() }),
  });
}

export interface AddMemberResult {
  team: TeamDoc;
  status: 'added' | 'invited';
  invite?: InviteDoc;
}

export function useAddMember(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: 'admin' | 'member' }) => {
      const { data } = await api.post<AddMemberResult>(`/teams/${teamId}/members`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamsKeys.detail(teamId) }),
  });
}

export function useCancelInvite(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      await api.delete(`/teams/${teamId}/invites/${inviteId}`);
      return inviteId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamsKeys.detail(teamId) }),
  });
}

export function useChangeMemberRole(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { uid: string; role: 'admin' | 'member' }) => {
      const { data } = await api.patch<{ team: TeamDoc }>(
        `/teams/${teamId}/members/${input.uid}`,
        { role: input.role },
      );
      return data.team;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamsKeys.detail(teamId) }),
  });
}

export function useRemoveMember(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => {
      const { data } = await api.delete<{ team: TeamDoc }>(`/teams/${teamId}/members/${uid}`);
      return data.team;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamsKeys.detail(teamId) }),
  });
}
