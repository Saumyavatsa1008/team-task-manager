import { useQueries } from '@tanstack/react-query';
import { useDashboard } from './useDashboard';
import { api } from '@/lib/api';
import type { TeamDoc, TeamMember, InviteDoc } from '@/lib/types';

export type SearchResult =
  | { type: 'team'; id: string; name: string; description: string; url: string }
  | { type: 'project'; id: string; name: string; description: string; teamName: string; url: string }
  | { type: 'member'; id: string; name: string; email: string; teamName: string; url: string };

export function useGlobalSearchData() {
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();

  const teamQueries = useQueries({
    queries: (dashboard?.teams || []).map((team) => ({
      queryKey: ['teams', team.id],
      queryFn: async () => {
        const { data } = await api.get<{ team: TeamDoc; members: TeamMember[]; invites: InviteDoc[] }>(`/teams/${team.id}`);
        return data;
      },
      staleTime: 1000 * 60 * 5,
    })),
  });

  const isLoading = dashboardLoading || teamQueries.some((q) => q.isLoading);

  if (!dashboard) {
    return { results: [], isLoading };
  }

  const results: SearchResult[] = [];

  // Add Teams
  dashboard.teams.forEach((t) => {
    results.push({
      type: 'team',
      id: `team-${t.id}`,
      name: t.name,
      description: t.description || '',
      url: `/teams/${t.id}`,
    });
  });

  // Add Projects
  dashboard.projects.forEach((p) => {
    const teamName = dashboard.teams.find((t) => t.id === p.teamIds?.[0])?.name || 'Unknown Team';
    results.push({
      type: 'project',
      id: `project-${p.id}`,
      name: p.name,
      description: p.description || '',
      teamName,
      url: `/projects/${p.id}`,
    });
  });

  // Add Members
  teamQueries.forEach((q, index) => {
    if (q.data) {
      const team = dashboard.teams[index];
      q.data.members.forEach((m) => {
        // Only add unique members per team to avoid massive duplicates if they are in many teams,
        // Actually, returning a result per team they are in is good because it routes to that team's page!
        results.push({
          type: 'member',
          id: `member-${m.uid}-${team.id}`,
          name: m.displayName || m.email,
          email: m.email,
          teamName: team.name,
          url: `/teams/${team.id}`,
        });
      });
    }
  });

  return { results, isLoading };
}
