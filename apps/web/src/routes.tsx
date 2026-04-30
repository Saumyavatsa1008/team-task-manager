import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { ProfilePage } from '@/features/auth/ProfilePage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TeamsPage } from '@/features/teams/TeamsPage';
import { TeamDetailPage } from '@/features/teams/TeamDetailPage';
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage';
import { MyTasksPage } from '@/features/tasks/MyTasksPage';
import { NotFoundPage } from '@/components/layout/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/my-tasks', element: <MyTasksPage /> },
          { path: '/teams', element: <TeamsPage /> },
          { path: '/teams/:teamId', element: <TeamDetailPage /> },
          { path: '/projects/:projectId', element: <ProjectDetailPage /> },
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
