import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  Users,
  CheckSquare2,
  LogOut,
  User as UserIcon,
  FolderKanban,
  ChevronRight,
  Settings,
  Search,
  Loader2,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn, initials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGlobalSearchData } from '@/hooks/useGlobalSearch';

export function AppShell() {
  const { user, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  const userInitials = initials(user?.displayName ?? user?.email);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-card/50 backdrop-blur-sm md:flex">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border/40">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 shadow-md">
              <CheckSquare2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">TaskFlow</span>
          </Link>
        </div>

        {/* User Profile */}
        <div className="px-4 py-4 border-b border-border/40">
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
            <Avatar className="h-9 w-9 ring-2 ring-teal-500/30">
              {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName ?? ''} />}
              <AvatarFallback className="bg-teal-600 text-white text-xs font-semibold">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{user?.displayName || 'User'}</div>
              <div className="truncate text-xs text-muted-foreground">Project Manager</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto mt-2">
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Main Menu</div>
          <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" end />
          <SidebarLink to="/projects" icon={FolderKanban} label="Projects" />
          <SidebarLink to="/my-tasks" icon={ListChecks} label="My Tasks" />
          <SidebarLink to="/teams" icon={Users} label="Team" />
          <SidebarLink to="/assign-task" icon={CheckSquare2} label="Assign Tasks" />
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-border/40 px-3 py-4 space-y-0.5">
          <SidebarLink to="/profile" icon={Settings} label="Settings" />
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg"><LogOut className="h-4 w-4" /></span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md md:px-6">
          {/* Mobile hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground"
            >
              <div className="space-y-1.5">
                <span className="block h-0.5 w-4 bg-current rounded" />
                <span className="block h-0.5 w-4 bg-current rounded" />
                <span className="block h-0.5 w-3 bg-current rounded" />
              </div>
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600">
                <CheckSquare2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold">TaskFlow</span>
            </Link>
          </div>

          {/* Desktop search bar */}
          <div className="hidden md:flex flex-1 items-center px-4 max-w-xl relative">
            <GlobalSearch />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full p-0.5 transition-colors hover:bg-accent focus:outline-none ring-2 ring-transparent focus-visible:ring-teal-500">
                  <Avatar className="h-8 w-8 ring-2 ring-teal-500/30">
                    {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName ?? ''} />}
                    <AvatarFallback className="bg-teal-600 text-white text-xs font-semibold">{userInitials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>
                  <div className="font-semibold">{user?.displayName || 'Anonymous'}</div>
                  <div className="text-xs text-muted-foreground font-normal">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="gap-2"><UserIcon className="h-4 w-4" /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()} className="text-destructive gap-2">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Nav Drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-card shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <Link to="/" className="flex items-center gap-2" onClick={() => setMobileNavOpen(false)}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
                    <CheckSquare2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold">TaskFlow</span>
                </Link>
                <button onClick={() => setMobileNavOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
              </div>
              
              <div className="px-4 py-3 border-b border-border/40">
                <GlobalSearch />
              </div>

              <div className="px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
                  <Avatar className="h-8 w-8 ring-2 ring-teal-500/30">
                    {user?.photoURL && <AvatarImage src={user.photoURL} />}
                    <AvatarFallback className="bg-teal-600 text-white text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{user?.displayName || 'User'}</div>
                    <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
                  </div>
                </div>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                <MobileSidebarLink to="/" icon={LayoutDashboard} label="Dashboard" end />
                <MobileSidebarLink to="/projects" icon={FolderKanban} label="Projects" />
                <MobileSidebarLink to="/my-tasks" icon={ListChecks} label="My Tasks" />
                <MobileSidebarLink to="/teams" icon={Users} label="Team" />
                <MobileSidebarLink to="/profile" icon={Settings} label="Settings" />
              </nav>
              <div className="border-t border-border/40 px-3 py-4">
                <button onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 px-4 py-6 md:px-6 lg:px-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { results, isLoading } = useGlobalSearchData();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filtered = query.trim() === '' ? [] : results.filter(r => 
    r.name.toLowerCase().includes(query.toLowerCase()) || 
    (r.type === 'member' && r.email.toLowerCase().includes(query.toLowerCase())) ||
    (r.type === 'project' && r.teamName.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 8);

  const handleSelect = (url: string) => {
    setOpen(false);
    setQuery('');
    navigate(url);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search teams, projects, or members..."
          className="w-full h-9 rounded-xl border border-border/60 bg-muted/40 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/50"
        />
        {isLoading && query && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && query.trim() !== '' && (
        <div className="absolute top-full left-0 right-0 mt-1.5 overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg z-50">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto py-2">
              {filtered.map(result => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result.url)}
                  className="w-full text-left px-4 py-2 hover:bg-muted/50 focus:bg-muted/50 focus:outline-none transition-colors flex items-center gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    {result.type === 'team' && <Users className="h-4 w-4" />}
                    {result.type === 'project' && <FolderKanban className="h-4 w-4" />}
                    {result.type === 'member' && <UserIcon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate text-foreground">{result.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.type === 'member' ? result.email : result.type === 'team' ? 'Team' : `Project in ${result.teamName}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SidebarLink({ to, icon: Icon, label, end }: { to: string; icon: typeof LayoutDashboard; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group',
          isActive
            ? 'bg-teal-600/15 text-teal-700'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg transition-colors', isActive ? 'bg-teal-600/20 text-teal-600' : '')}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="flex-1">{label}</span>
          {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-40" />}
        </>
      )}
    </NavLink>
  );
}

function MobileSidebarLink({ to, icon: Icon, label, end }: { to: string; icon: typeof LayoutDashboard; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all',
          isActive ? 'bg-teal-600/15 text-teal-700' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}
