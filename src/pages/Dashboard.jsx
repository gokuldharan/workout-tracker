import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Dumbbell, Play, Flame, Trophy, TrendingUp } from 'lucide-react'
import { getRecentHistory, getExercises, getAllHistory } from '../lib/api'
import { formatDate, volume, categoryColors, today } from '../lib/utils'
import { loadWorkoutState } from '../lib/workoutStorage'
import { generateInsights, getConsistencyStreak, getRecentPRs } from '../lib/insights'
import { computeBodyMapData } from '../lib/bodyMapUtils'
import BodyMap from '../components/BodyMap'

export default function Dashboard() {
  const [recent, setRecent] = useState([])
  const [allHistory, setAllHistory] = useState([])
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getRecentHistory(30), getExercises(), getAllHistory()])
      .then(([h, e, all]) => { setRecent(h); setExercises(e); setAllHistory(all) })
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

  // Enhanced stats
  const streak = getConsistencyStreak(allHistory)
  const recentPRs = getRecentPRs(allHistory)

  // This week stats
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const thisWeek = allHistory.filter((h) => h.date >= weekStartStr)
  const thisWeekDates = new Set(thisWeek.map((h) => h.date))
  const thisWeekVol = thisWeek.reduce((sum, h) => sum + volume(h.sets), 0)

  // Rolling 4-week training frequency
  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(now.getDate() - 28)
  const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0]
  const last4WeekDates = new Set(allHistory.filter((h) => h.date >= fourWeeksAgoStr).map((h) => h.date))
  const avgPerWeek = (last4WeekDates.size / 4).toFixed(1)

  // Insights
  const insights = generateInsights(allHistory).slice(0, 3)

  return (
    <div className="px-4 pt-safe pb-nav-safe max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">IronLog</h1>

      {/* Enhanced Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] text-center">
          <Flame size={18} className="mx-auto text-orange-400 mb-1" />
          <p className="text-lg font-bold text-white">{streak}</p>
          <p className="text-xs text-[#a0a0a0]">Wk Streak</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] text-center">
          <Dumbbell size={18} className="mx-auto text-indigo-400 mb-1" />
          <p className="text-lg font-bold text-white">{thisWeekDates.size}</p>
          <p className="text-xs text-[#a0a0a0]">This Week</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] text-center">
          <Activity size={18} className="mx-auto text-purple-400 mb-1" />
          <p className="text-lg font-bold text-white">{avgPerWeek}</p>
          <p className="text-xs text-[#a0a0a0]">Sessions/wk (4wk)</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] text-center">
          <TrendingUp size={18} className="mx-auto text-green-400 mb-1" />
          <p className="text-lg font-bold text-white">{thisWeekVol > 0 ? `${(thisWeekVol / 1000).toFixed(0)}k` : '0'}</p>
          <p className="text-xs text-[#a0a0a0]">Wk Volume</p>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2 mb-5">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 border text-sm ${
                insight.type === 'pr'
                  ? 'bg-yellow-500/5 border-yellow-500/20'
                  : insight.type === 'streak'
                  ? 'bg-orange-500/5 border-orange-500/20'
                  : insight.type === 'volume_up'
                  ? 'bg-green-500/5 border-green-500/20'
                  : insight.type === 'plateau'
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : insight.type === 'regressing'
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-[#1a1a1a] border-[#2a2a2a]'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-base">{insight.icon}</span>
                <div>
                  <p className="text-white font-medium text-sm">{insight.title}</p>
                  <p className="text-xs text-[#a0a0a0] mt-0.5">{insight.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Body Map */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 mb-5">
        <h2 className="text-sm font-semibold mb-3 text-[#a0a0a0] uppercase tracking-wide">Muscle Map</h2>
        <BodyMap scores={computeBodyMapData(allHistory, exercises, loadWorkoutState())} />
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
                  {saved.exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0)} / {saved.exercises.reduce((s, e) => s + e.sets.length, 0)} sets done
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
          <p className="text-sm mt-1">Tap &quot;Start Workout&quot; to get started</p>
        </div>
      )}
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
