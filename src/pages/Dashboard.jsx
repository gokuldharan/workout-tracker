import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Activity, TrendingUp, Calendar, Dumbbell, Play } from 'lucide-react'
import { getRecentHistory, getExercises } from '../lib/api'
import { formatDate, volume, categoryColors, today } from '../lib/utils'
import { loadWorkoutState } from '../lib/workoutStorage'

export default function Dashboard() {
  const [recent, setRecent] = useState([])
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getRecentHistory(30), getExercises()])
      .then(([h, e]) => { setRecent(h); setExercises(e) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  // Group recent by date
  const byDate = recent.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {})

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  // Stats
  const uniqueDates = new Set(recent.map((r) => r.date))
  const totalVolume = recent.reduce((sum, r) => sum + volume(r.sets), 0)

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">IronLog</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={Calendar} label="Sessions" value={uniqueDates.size} />
        <StatCard icon={Dumbbell} label="Exercises" value={exercises.length} />
        <StatCard icon={TrendingUp} label="Volume" value={`${(totalVolume / 1000).toFixed(0)}k`} />
      </div>

      {/* Resume active workout banner */}
      {(() => {
        const saved = loadWorkoutState()
        if (saved && saved.date === today()) {
          return (
            <Link
              to={`/workout/${saved.dayId}`}
              className="flex items-center gap-3 bg-indigo-600/10 border border-indigo-500/30 rounded-xl p-4 mb-4 hover:bg-indigo-600/20 transition-colors"
            >
              <Play size={20} className="text-indigo-400" />
              <div>
                <p className="text-sm font-medium text-indigo-300">Resume {saved.dayName}</p>
                <p className="text-xs text-[#a0a0a0]">
                  {saved.exercises.filter((e) => e.done).length} / {saved.exercises.length} exercises done
                </p>
              </div>
            </Link>
          )
        }
        return null
      })()}

      {/* Quick Log */}
      <Link
        to="/workout"
        className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white text-center py-3 rounded-xl font-medium mb-6 transition-colors"
      >
        + Start Workout
      </Link>

      {/* Recent Activity */}
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Activity size={18} /> Recent Activity
      </h2>
      <div className="space-y-4">
        {dates.map((date) => (
          <div key={date}>
            <p className="text-xs text-[#a0a0a0] mb-2 uppercase tracking-wide">{formatDate(date)}</p>
            <div className="space-y-2">
              {byDate[date].map((r) => {
                const colors = categoryColors[r.exercises?.category] || categoryColors['Core']
                return (
                  <Link
                    key={r.id}
                    to={`/exercises/${r.exercise_id}`}
                    className="block bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] hover:bg-[#222] transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-white">{r.exercises?.name}</p>
                        <p className="text-xs text-[#a0a0a0] mt-0.5">
                          {r.sets.length} sets &middot; {volume(r.sets).toLocaleString()} lbs
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {r.exercises?.muscle_group}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {!dates.length && (
        <div className="text-center text-[#a0a0a0] py-12">
          <Dumbbell size={48} className="mx-auto mb-3 opacity-30" />
          <p>No workouts logged yet</p>
          <p className="text-sm mt-1">Tap "Log Workout" to get started</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] text-center">
      <Icon size={18} className="mx-auto text-indigo-400 mb-1" />
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-[#a0a0a0]">{label}</p>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
