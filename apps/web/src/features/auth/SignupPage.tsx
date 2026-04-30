import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { CheckCircle2, Loader2, Mail, Lock, User as UserIcon } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const schema = z.object({
  displayName: z.string().trim().min(2, 'Min 2 characters').max(80),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Min 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export function SignupPage() {
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth,
        values.email,
        values.password,
      );
      await updateProfile(cred.user, { displayName: values.displayName });
      toast.success('Account created');
      nav('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-up failed';
      toast.error(message.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      nav('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      toast.error(message.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-bg min-h-screen w-full">
      <div className="container flex min-h-screen items-center justify-center py-10">
        <div className="glass mx-auto w-full max-w-md rounded-xl border border-border/60 p-8 shadow-2xl shadow-violet-500/10">
          <div className="mb-6 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-glow">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold tracking-tight">Team Task Manager</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Free for your team — get started in seconds</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Full name</Label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="displayName"
                  placeholder="Ada Lovelace"
                  className="pl-9"
                  {...register('displayName')}
                />
              </div>
              {errors.displayName ? (
                <p className="text-xs text-destructive">{errors.displayName.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="pl-9"
                  {...register('email')}
                />
              </div>
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  className="pl-9"
                  {...register('password')}
                />
              </div>
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? <Loader2 className="animate-spin" /> : null}
              Create account
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or continue with
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full"
          >
            Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
