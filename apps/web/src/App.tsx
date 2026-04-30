import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/queryClient';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="bottom-right"
          theme="dark"
          richColors
          toastOptions={{
            classNames: {
              toast: 'border border-border/60 bg-card text-card-foreground shadow-md',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
