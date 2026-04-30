import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { CheckCircle2, Loader2, Mail, Lock } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Min 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTo = (loc.state as { from?: string } | null)?.from ?? '/';
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isSignInWithEmailLink(firebaseAuth, window.location.href)) {
      setSubmitting(true);
      let email = new URLSearchParams(window.location.search).get('email') || window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      if (email) {
        signInWithEmailLink(firebaseAuth, email, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            toast.success('Successfully signed in with email link!');
            nav(redirectTo, { replace: true });
          })
          .catch((err) => {
            const message = err instanceof Error ? err.message : 'Sign-in link failed';
            toast.error(message.replace('Firebase: ', ''));
            setSubmitting(false);
          });
      } else {
        setSubmitting(false);
      }
    }
  }, [nav, redirectTo]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, values.email, values.password);
      toast.success('Welcome back');
      nav(redirectTo, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      toast.error(message.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      nav(redirectTo, { replace: true });
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
        <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-2">
          <BrandingPanel />
          <div className="glass mx-auto w-full max-w-md rounded-xl border border-border/60 p-8 shadow-2xl shadow-violet-500/10">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your team workspace
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
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
                    autoComplete="current-password"
                    placeholder="••••••••"
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
                Sign in
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
              <GoogleIcon />
              Google
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandingPanel() {
  return (
    <div className="hidden flex-col justify-between rounded-xl border border-border/60 bg-card/40 p-10 lg:flex">
      <div>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-glow">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold tracking-tight">Team Task Manager</span>
        </div>
        <h2 className="mt-10 text-3xl font-semibold leading-tight tracking-tight">
          Plan less. <span className="gradient-text">Ship more.</span>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Everything your team needs to organize work — projects, tasks, roles, and a clear view
          of what's overdue today.
        </p>
      </div>
      <ul className="grid gap-3 text-sm text-muted-foreground">
        {[
          'Role-based access for admins and members',
          'Drag-and-drop status updates on every task',
          'Dashboard for overdue and upcoming work',
        ].map((line) => (
          <li key={line} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="!h-4 !w-4" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.692 32.91 29.213 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
