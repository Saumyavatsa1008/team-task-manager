import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { firebaseAuth } from '@/lib/firebase';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(firebaseAuth.currentUser);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    const unsub = onIdTokenChanged(firebaseAuth, async (fbUser) => {
      setUser(fbUser);
      setLoading(false);
      if (fbUser) {
        try {
          const { data } = await api.post<{ joinedTeams?: number }>('/auth/sync');
          if (data?.joinedTeams && data.joinedTeams > 0) {
            toast.success(
              `You've been added to ${data.joinedTeams} team${data.joinedTeams === 1 ? '' : 's'} from pending invitations.`,
            );
            await Promise.all([
              qc.invalidateQueries({ queryKey: ['teams'] }),
              qc.invalidateQueries({ queryKey: ['dashboard'] }),
              qc.invalidateQueries({ queryKey: ['my-tasks'] }),
            ]);
          }
        } catch {
          // Silent — surfaces later via the dashboard query.
        }
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signOut: async () => {
        await signOut(firebaseAuth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
