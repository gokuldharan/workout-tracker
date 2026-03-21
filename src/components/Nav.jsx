import { NavLink } from 'react-router-dom'
import { Home, Dumbbell, Plus, BarChart3 } from 'lucide-react'

const links = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/exercises', icon: Dumbbell, label: 'Exercises' },
  { to: '/workout', icon: Plus, label: 'Log' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
]

export default function Nav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#141414] border-t border-[#2a2a2a] z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto flex justify-around py-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
                isActive ? 'text-indigo-400' : 'text-[#a0a0a0] hover:text-white'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
