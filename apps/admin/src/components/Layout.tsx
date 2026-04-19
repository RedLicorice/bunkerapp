import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Dumbbell, Users, Bell, LogOut, Menu, ArrowLeftRight, Dumbbell as Logo,
} from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPendingSwapRequests } from '@bunker/supabase'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

const links = [
  { to: '/dashboard',     icon: LayoutDashboard,  label: 'Dashboard',      badge: null },
  { to: '/courses',       icon: Dumbbell,          label: 'Courses',        badge: null },
  { to: '/members',       icon: Users,             label: 'Members',        badge: null },
  { to: '/swap-requests', icon: ArrowLeftRight,    label: 'Swap Requests',  badge: 'swaps' },
  { to: '/notifications', icon: Bell,              label: 'Notifications',  badge: null },
]

interface Props { children: React.ReactNode; title?: string; action?: React.ReactNode }

export function Layout({ children, title, action }: Props) {
  const { signOut, profile } = useAuthStore()
  const [open, setOpen]      = useState(false)

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Sidebar — desktop */}
      <aside className="hidden w-60 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
        <SidebarContent profile={profile} signOut={signOut} onNav={() => {}} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative z-10 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950">
            <SidebarContent profile={profile} signOut={signOut} onNav={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-zinc-800 px-4 py-4">
          <button onClick={() => setOpen(true)} className="text-zinc-400 lg:hidden">
            <Menu size={22} />
          </button>
          <h1 className="flex-1 text-lg font-bold">{title}</h1>
          {action}
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

function SidebarContent({
  profile, signOut, onNav,
}: { profile: any; signOut: () => void; onNav: () => void }) {
  const { data: pendingSwaps = [] } = useQuery({
    queryKey: ['swap-requests-pending'],
    queryFn:  getPendingSwapRequests,
    refetchInterval: 30_000,
  })

  return (
    <>
      <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
          <Logo size={20} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none">Bunker Admin</p>
          <p className="mt-0.5 text-xs text-zinc-500 truncate">{profile?.full_name}</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label, badge }) => {
          const count = badge === 'swaps' ? pendingSwaps.length : 0
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onNav}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-brand-500/15 text-brand-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50',
              )}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-zinc-800 p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-900 hover:text-red-400"
        >
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </>
  )
}
