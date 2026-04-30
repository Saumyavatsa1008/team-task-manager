import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthProvider';
import { firebaseAuth } from '@/lib/firebase';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials } from '@/lib/utils';

const schema = z.object({
  displayName: z.string().trim().min(2, 'Min 2 characters').max(80),
});

type FormValues = z.infer<typeof schema>;

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: user?.displayName ?? '' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (firebaseAuth.currentUser) {
        await updateProfile(firebaseAuth.currentUser, { displayName: values.displayName });
      }
      await api.patch('/users/me', { displayName: values.displayName });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-14 w-14">
            {user?.photoURL ? <AvatarImage src={user.photoURL} alt={user.displayName ?? ''} /> : null}
            <AvatarFallback>{initials(user?.displayName ?? user?.email)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user?.displayName || 'Anonymous'}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" {...register('displayName')} />
              {errors.displayName ? (
                <p className="text-xs text-destructive">{errors.displayName.message}</p>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => void signOut()}>
                Sign out
              </Button>
              <Button type="submit" variant="gradient" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
