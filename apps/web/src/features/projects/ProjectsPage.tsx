import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Plus, Users, Loader2, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTeams } from '@/hooks/useTeams';
import { useDashboard } from '@/hooks/useDashboard';
import { useCreateProject } from '@/hooks/useProjects';
import type { ProjectDoc } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ApiClientError } from '@/lib/api';

const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(80),
  description: z.string().trim().max(1000).optional(),
  teamIds: z.array(z.string()).min(1, 'Please select at least one team'),
});
type CreateProjectValues = z.infer<typeof createProjectSchema>;

export function ProjectsPage() {
  const { data: dashboard, isLoading: dashboardLoading, refetch } = useDashboard();
  const [createOpen, setCreateOpen] = useState(false);

  const projects = dashboard?.projects;

  if (dashboardLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your cross-team projects.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 font-semibold">
                <Plus className="h-4 w-4" /> Create Project
              </Button>
            </DialogTrigger>
            <CreateProjectDialog onCreated={() => {
              setCreateOpen(false);
              refetch(); // Refresh dashboard data to show new project
            }} />
          </Dialog>
        </div>
      </div>

      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start organizing tasks. You'll need to assign it to a team."
          action={
            <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectDoc }) {
  const { data: dashboard } = useDashboard();
  const teamNames = project.teamIds.map(tid => dashboard?.teams.find(t => t.id === tid)?.name).filter(Boolean).join(', ') || 'Unknown Team';

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group block rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shrink-0">
          <FolderKanban className="h-5 w-5" />
        </div>
      </div>
      <h3 className="font-bold text-base tracking-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{project.name}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{project.description || 'No description'}</p>

      <div className="mt-4 flex items-center justify-between pt-4 border-t border-border/40">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span className="truncate max-w-[150px]">{teamNames}</span>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
          Open <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

function CreateProjectDialog({ onCreated }: { onCreated: () => void }) {
  const { data: teams } = useTeams();
  const createProject = useCreateProject();

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<CreateProjectValues>({ 
    resolver: zodResolver(createProjectSchema),
    defaultValues: { teamIds: [] }
  });

  const selectedTeamIds = watch('teamIds');

  const onSubmit = async (values: CreateProjectValues) => {
    try {
      await createProject.mutateAsync({
        name: values.name,
        description: values.description,
        teamIds: values.teamIds,
      });
      toast.success('Project created successfully!');
      onCreated();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to create project');
    }
  };

  const toggleTeam = (id: string) => {
    if (selectedTeamIds.includes(id)) {
      setValue('teamIds', selectedTeamIds.filter(t => t !== id), { shouldValidate: true });
    } else {
      setValue('teamIds', [...selectedTeamIds, id], { shouldValidate: true });
    }
  };

  return (
    <DialogContent className="rounded-2xl max-w-md">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">Create a project</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-semibold">Project Name</Label>
          <Input id="name" placeholder="e.g. Website Redesign" className="rounded-xl" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-semibold">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea id="description" rows={3} placeholder="What is this project about?" className="rounded-xl resize-none" {...register('description')} />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Assign to Teams</Label>
          {teams?.length === 0 ? (
             <div className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-xl">
               You must create a Team before you can create a Project.
             </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {teams?.filter(t => selectedTeamIds.includes(t.id)).map((t) => (
                <Badge key={t.id} variant="secondary" className="flex items-center gap-1.5 py-1 px-2 border border-border/50">
                  <span className="text-xs font-normal">{t.name}</span>
                  <button 
                    type="button" 
                    onClick={() => toggleTeam(t.id)} 
                    className="ml-0.5 rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                     <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                  </button>
                </Badge>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-7 border-dashed text-xs rounded-full">
                    <Plus className="mr-1 h-3 w-3" /> Add Team
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-[300px] overflow-y-auto" align="start">
                  {teams?.map((t) => (
                    <DropdownMenuCheckboxItem
                      key={t.id}
                      checked={selectedTeamIds.includes(t.id)}
                      onCheckedChange={() => toggleTeam(t.id)}
                    >
                      <span className="truncate flex-1 font-medium">{t.name}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {errors.teamIds && <p className="text-xs text-destructive">{errors.teamIds.message}</p>}
        </div>

        <div className="space-y-4 mt-6 border-t border-border/40 pt-4">
          <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 font-semibold w-full" disabled={isSubmitting || teams?.length === 0}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
