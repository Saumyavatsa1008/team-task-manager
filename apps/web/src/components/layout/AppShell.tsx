import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  Users,
  CheckCircle2,
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn, initials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AppShell() {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useTheme();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/60 bg-card/40 px-3 py-5 md:flex">
        <Link to="/" className="mb-7 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-glow">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Team Task</div>
            <div className="text-xs text-muted-foreground">Manager</div>
          </div>
        </Link>

        <nav className="flex flex-col gap-1">
          <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" end />
          <SidebarLink to="/my-tasks" icon={ListChecks} label="My tasks" />
          <SidebarLink to="/teams" icon={Users} label="Teams" />
        </nav>

      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/70 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 md:hidden">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-violet-600 to-blue-600 text-white">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold">Team Task</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    {user?.photoURL ? (
                      <AvatarImage src={user.photoURL} alt={user.displayName ?? ''} />
                    ) : null}
                    <AvatarFallback>{initials(user?.displayName ?? user?.email)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {user?.displayName || 'Anonymous'}
                  </span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <UserIcon className="h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()} className="text-destructive">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="container mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

function useTheme(): ['dark' | 'light', (t: 'dark' | 'light') => void] {
  const [theme, set] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  return [theme, set];
}
