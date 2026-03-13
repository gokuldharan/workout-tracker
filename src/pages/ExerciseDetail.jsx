import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { getHistory, deleteSession } from '../lib/api'
import { e1rm, volume, formatDate, formatDateFull, categoryColors } from '../lib/utils'

export default function ExerciseDetail() {
  const { id } = useParams()
  const [exercise, setExercise] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: ex } = await supabase.from('exercises').select('*').eq('id', id).single()
    const hist = await getHistory(id)
    setExercise(ex)
    setHistory(hist)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleDelete = async (sessionId) => {
    await deleteSession(sessionId)
    setHistory((prev) => prev.filter((h) => h.id !== sessionId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!exercise) {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <p className="text-[#a0a0a0]">Exercise not found</p>
      </div>
    )
  }

  const colors = categoryColors[exercise.category] || categoryColors['Core']

  // Chart data (chronological)
  const chartData = [...history]
    .reverse()
    .map((h) => {
      const best = h.sets.reduce((b, s) => {
        const val = s.w === 0 ? s.r : e1rm(s.w, s.r)
        return val > b ? val : b
      }, 0)
      return { date: formatDate(h.date), e1rm: Math.round(best), vol: volume(h.sets) }
    })

  // PR
  const allTimeBest = history.reduce((best, h) => {
    const sessionBest = h.sets.reduce((b, s) => {
      const val = s.w === 0 ? s.r : e1rm(s.w, s.r)
      return val > b ? val : b
    }, 0)
    return sessionBest > best ? sessionBest : best
  }, 0)

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto w-full">
      {/* Header */}
      <Link to="/exercises" className="inline-flex items-center gap-1 text-sm text-[#a0a0a0] hover:text-white mb-4 transition-colors">
        <ArrowLeft size={16} /> Back
      </Link>

      <h1 className="text-xl font-bold mb-1">{exercise.name}</h1>
      <div className="flex items-center gap-2 mb-5">
        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
          {exercise.muscle_group}
        </span>
        <span className="text-xs text-[#a0a0a0]">{exercise.category}</span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] text-center">
          <p className="text-lg font-bold text-white">{history.length}</p>
          <p className="text-xs text-[#a0a0a0]">Sessions</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] text-center">
          <p className="text-lg font-bold text-white">{Math.round(allTimeBest)}</p>
          <p className="text-xs text-[#a0a0a0]">Best e1RM</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] text-center">
          <p className="text-lg font-bold text-white">
            {history[0] ? volume(history[0].sets).toLocaleString() : 0}
          </p>
          <p className="text-xs text-[#a0a0a0]">Last Vol</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] mb-5">
          <h2 className="text-sm font-semibold text-[#a0a0a0] mb-3">Estimated 1RM Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a0a0a0' }} />
              <YAxis tick={{ fontSize: 10, fill: '#a0a0a0' }} width={40} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="e1rm" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Log CTA */}
      <Link
        to={`/log?exercise=${id}`}
        className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white text-center py-3 rounded-xl font-medium mb-5 transition-colors"
      >
        + Log Sets for {exercise.name}
      </Link>

      {/* History */}
      <h2 className="text-sm font-semibold text-[#a0a0a0] uppercase tracking-wide mb-3">History</h2>
      <div className="space-y-3">
        {history.map((h) => (
          <div key={h.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-white">{formatDateFull(h.date)}</p>
              <button onClick={() => handleDelete(h.id)} className="text-[#a0a0a0] hover:text-red-400 transition-colors p-1">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex gap-3 flex-wrap">
              {h.sets.map((s, i) => (
                <span key={i} className="text-xs bg-[#222] px-2 py-1 rounded-lg text-[#a0a0a0]">
                  {s.r} x {s.w} lbs
                </span>
              ))}
            </div>
            <p className="text-xs text-[#555] mt-2">
              Vol: {volume(h.sets).toLocaleString()} lbs
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
