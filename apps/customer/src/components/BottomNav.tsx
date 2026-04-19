import { NavLink } from 'react-router-dom'
import { Calendar, Dumbbell, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/schedule',      icon: Calendar,  label: 'Schedule' },
  { to: '/courses',       icon: Dumbbell,  label: 'Courses' },
  { to: '/notifications', icon: Bell,      label: 'Alerts' },
  { to: '/profile',       icon: User,      label: 'Profile' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur safe-bottom">
      <div className="flex">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
              isActive ? 'text-brand-500' : 'text-zinc-500',
            )}
          >
            <Icon size={22} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
