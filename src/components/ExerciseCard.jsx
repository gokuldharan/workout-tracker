import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { categoryColors, formatDate, volume } from '../lib/utils'

export default function ExerciseCard({ exercise, latestSession, inTemplate }) {
  const colors = categoryColors[exercise.category] || categoryColors['Core']

  return (
    <Link
      to={`/exercises/${exercise.id}`}
      className="block bg-[#1a1a1a] rounded-xl p-4 hover:bg-[#222] transition-colors border border-[#2a2a2a]"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white truncate">{exercise.name}</h3>
            {inTemplate === false && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-[#2a2a2a] text-[#666] shrink-0">Unassigned</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {exercise.muscle_group}
            </span>
            {latestSession && (
              <span className="text-xs text-[#a0a0a0]">
                {formatDate(latestSession.date)} &middot; {volume(latestSession.sets).toLocaleString()} lbs vol
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="text-[#a0a0a0] shrink-0 ml-2" />
      </div>
    </Link>
  )
}
