import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getAllHistory } from '../lib/api'
import { volume, formatDate } from '../lib/utils'

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#4f46e5']

export default function Stats() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllHistory().then(setHistory).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Volume by week
  const weeklyVol = {}
  for (const h of history) {
    const d = new Date(h.date + 'T12:00:00')
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split('T')[0]
    weeklyVol[key] = (weeklyVol[key] || 0) + volume(h.sets)
  }
  const weeklyData = Object.entries(weeklyVol)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vol]) => ({ week: formatDate(date), volume: vol }))

  // Volume by muscle group
  const muscleVol = {}
  for (const h of history) {
    const mg = h.exercises?.muscle_group || 'Unknown'
    muscleVol[mg] = (muscleVol[mg] || 0) + volume(h.sets)
  }
  const muscleData = Object.entries(muscleVol)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }))

  // Sessions by category
  const catCount = {}
  for (const h of history) {
    const cat = h.exercises?.category || 'Unknown'
    catCount[cat] = (catCount[cat] || 0) + 1
  }
  const catData = Object.entries(catCount).map(([name, value]) => ({ name, value }))

  // Most trained exercises
  const exCount = {}
  for (const h of history) {
    const name = h.exercises?.name || h.exercise_id
    exCount[name] = (exCount[name] || 0) + 1
  }
  const topExercises = Object.entries(exCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-5">Stats</h1>

      {/* Weekly Volume */}
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] mb-4">
        <h2 className="text-sm font-semibold text-[#a0a0a0] mb-3">Weekly Volume (lbs)</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#a0a0a0' }} />
            <YAxis tick={{ fontSize: 10, fill: '#a0a0a0' }} width={45} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [`${v.toLocaleString()} lbs`, 'Volume']}
            />
            <Bar dataKey="volume" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Volume by Muscle Group */}
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] mb-4">
        <h2 className="text-sm font-semibold text-[#a0a0a0] mb-3">Volume by Muscle Group</h2>
        <div className="flex items-center">
          <ResponsiveContainer width="50%" height={160}>
            <PieChart>
              <Pie data={muscleData} dataKey="value" cx="50%" cy="50%" outerRadius={60} strokeWidth={0}>
                {muscleData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${v.toLocaleString()} lbs`]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1.5">
            {muscleData.slice(0, 6).map((mg, i) => (
              <div key={mg.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-[#a0a0a0] truncate">{mg.name}</span>
                <span className="text-xs text-white ml-auto">{(mg.value / 1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sessions by Category */}
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] mb-4">
        <h2 className="text-sm font-semibold text-[#a0a0a0] mb-3">Sessions by Category</h2>
        <div className="flex gap-3">
          {catData.map((c) => (
            <div key={c.name} className="flex-1 bg-[#222] rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-white">{c.value}</p>
              <p className="text-xs text-[#a0a0a0]">{c.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Most Trained */}
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
        <h2 className="text-sm font-semibold text-[#a0a0a0] mb-3">Most Trained Exercises</h2>
        <div className="space-y-2">
          {topExercises.map(([name, count], i) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-xs text-[#555] w-4 text-right">{i + 1}</span>
              <div className="flex-1 bg-[#222] rounded-full h-6 overflow-hidden">
                <div
                  className="h-full bg-indigo-600/40 rounded-full flex items-center px-2"
                  style={{ width: `${(count / topExercises[0][1]) * 100}%` }}
                >
                  <span className="text-xs text-white truncate">{name}</span>
                </div>
              </div>
              <span className="text-xs text-[#a0a0a0] w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
