import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import mark from "@/assets/proofrail-mark.svg";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CreditCard,
  GitPullRequestArrow,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/workflows", label: "Workflows", icon: Workflow, end: false },
  { to: "/dashboard/scenarios", label: "Scenarios", icon: ScrollText, end: false },
  { to: "/dashboard/policies", label: "Policies", icon: ShieldCheck, end: false },
  { to: "/dashboard/catalog", label: "Control library", icon: BookOpen, end: false },
  { to: "/dashboard/releases", label: "Release gates", icon: GitPullRequestArrow, end: false },
  { to: "/dashboard/admin", label: "Admin", icon: Settings, end: false },
];

function SidebarContent() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const workflows = useQuery(api.optimized.listWorkflows);
  const plan = useQuery(api.optimized.getPlan);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = (user?.name || user?.email || "U")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <img src={mark} alt="Proofrail" width={30} height={30} className="rounded-lg" />
        <div>
          <p className="text-[15px] font-bold leading-none tracking-tight">Proofrail</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Release assurance
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                isActive
                  ? "bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-400/20"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3">
        {plan && (
          <div className="glass-chip mb-2 flex items-center gap-2 rounded-2xl px-3 py-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">
              <CreditCard className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold capitalize tracking-tight">
                {plan.name === "free"
                  ? "Free engineering tier"
                  : plan.name === "pilot"
                    ? "Implementation pilot"
                    : "Annual contract"}
              </p>
              <p className="font-mono text-[10.5px] text-muted-foreground">
                {plan.name === "free"
                  ? "$0 · up to 3 engineers"
                  : `$${plan.amount.toLocaleString()} · ${plan.seats} seats`}
              </p>
            </div>
          </div>
        )}
        <div className="glass-chip flex items-center gap-3 rounded-2xl p-3">
          <Avatar className="size-9 border border-white/10">
            <AvatarFallback className="bg-cyan-500/10 text-[11px] font-semibold text-cyan-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold tracking-tight">
              {user?.name || user?.email || "Guest reviewer"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {workflows?.length ?? 0} workflows under governance
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="mt-2 w-full cursor-pointer justify-start gap-2 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const workflows = useQuery(api.optimized.listWorkflows);
  const seedDemo = useMutation(api.proofrail.seedDemo);
  const backfillWorkspace = useMutation(api.backfill.backfillWorkspace);
  const seeded = useRef(false);
  const backfilled = useRef(false);

  // Workspaces start completely clean at 0 by default.

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="relative flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="glass-panel-soft fixed inset-y-4 left-4 z-30 hidden w-60 rounded-2xl lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sheet */}
      <div className="fixed left-4 top-4 z-40 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="glass-chip cursor-pointer rounded-xl">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 rounded-r-2xl bg-background/95 p-0 backdrop-blur-xl">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      <div className="min-w-0 flex-1 pl-0 lg:pl-[17.5rem]">
        {/* Topbar */}
        <header className="sticky top-0 z-20 px-4 pt-4 lg:px-6">
          <div className="glass-chip flex h-14 items-center justify-between rounded-2xl px-4 lg:px-5">
            <div className="flex items-center gap-2.5 pl-9 lg:pl-0">
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 sm:flex">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Release gates active
              </span>
              <span className="hidden text-[12px] text-muted-foreground md:block">
                Evidence vault · every decision retained
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer items-center gap-2 rounded-full outline-none">
                  <Avatar className="size-8 border border-white/10">
                    <AvatarFallback className="bg-cyan-500/10 text-[11px] font-semibold text-cyan-300">
                      {(user?.name || user?.email || "U")
                        .split(/[\s@]/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-36 truncate text-[13px] font-medium sm:block">
                    {user?.name || user?.email || "Reviewer"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate text-[12px]">
                  {user?.email || "Signed in"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/">Landing page</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/dashboard/admin">Plan &amp; billing</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
