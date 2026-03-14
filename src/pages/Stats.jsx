import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Minus, Flame, Trophy, Sparkles, Key, RefreshCw } from 'lucide-react'
import { getAllHistory } from '../lib/api'
import { volume, formatDate, e1rm } from '../lib/utils'
import { getConsistencyStreak, getRecentPRs, getE1RMLeaderboard } from '../lib/insights'
import { getAIInsights, getStoredAPIKey, setStoredAPIKey, clearStoredAPIKey } from '../lib/ai'

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

  // Training frequency (sessions per week)
  const weeklyFreq = {}
  for (const h of history) {
    const d = new Date(h.date + 'T12:00:00')
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split('T')[0]
    if (!weeklyFreq[key]) weeklyFreq[key] = new Set()
    weeklyFreq[key].add(h.date)
  }
  const freqData = Object.entries(weeklyFreq)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dates]) => ({ week: formatDate(date), sessions: dates.size }))

  // Computed insights
  const streak = getConsistencyStreak(history)
  const recentPRs = getRecentPRs(history)
  const leaderboard = getE1RMLeaderboard(history)

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-5">Stats</h1>

      {/* Streak + PRs summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] text-center">
          <Flame size={22} className="mx-auto text-orange-400 mb-1" />
          <p className="text-2xl font-bold text-white">{streak}</p>
          <p className="text-xs text-[#a0a0a0]">Week Streak</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] text-center">
          <Trophy size={22} className="mx-auto text-yellow-400 mb-1" />
          <p className="text-2xl font-bold text-white">{recentPRs.length}</p>
          <p className="text-xs text-[#a0a0a0]">Active PRs</p>
        </div>
      </div>

      {/* e1RM Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] mb-4">
          <h2 className="text-sm font-semibold text-[#a0a0a0] mb-3">e1RM Leaderboard</h2>
          <div className="space-y-2">
            {leaderboard.slice(0, 8).map((ex, i) => (
              <Link
                key={ex.id}
                to={`/exercises/${ex.id}`}
                className="flex items-center gap-3 hover:bg-[#222] rounded-lg px-1 py-1 -mx-1 transition-colors"
              >
                <span className="text-xs text-[#555] w-4 text-right">{i + 1}</span>
                <span className="text-sm text-white flex-1 truncate">{ex.name}</span>
                <span className="text-sm font-medium text-white">{ex.e1rm}</span>
                <span className="text-xs text-[#a0a0a0]">lbs</span>
                {ex.trend === 'up' && <TrendingUp size={14} className="text-green-400" />}
                {ex.trend === 'down' && <TrendingDown size={14} className="text-red-400" />}
                {ex.trend === 'flat' && <Minus size={14} className="text-[#555]" />}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent PRs */}
      {recentPRs.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] mb-4">
          <h2 className="text-sm font-semibold text-[#a0a0a0] mb-3">Recent PRs</h2>
          <div className="space-y-2">
            {recentPRs.slice(0, 5).map((pr) => (
              <div key={pr.id} className="flex items-center gap-2">
                <span className="text-sm">&#127942;</span>
                <span className="text-sm text-white flex-1 truncate">{pr.name}</span>
                <span className="text-xs text-indigo-400 font-medium">{pr.e1rm} lbs</span>
                <span className="text-xs text-[#555]">{formatDate(pr.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Training Frequency */}
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] mb-4">
        <h2 className="text-sm font-semibold text-[#a0a0a0] mb-3">Sessions per Week</h2>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={freqData}>
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#a0a0a0' }} />
            <YAxis tick={{ fontSize: 10, fill: '#a0a0a0' }} width={20} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [`${v}`, 'Sessions']}
            />
            <Line type="monotone" dataKey="sessions" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} />
          </LineChart>
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
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] mb-4">
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

      {/* AI Insights */}
      <AIInsightsSection history={history} />
    </div>
  )
}

// ─── AI Insights Section ────────────────────────────────────
function AIInsightsSection({ history }) {
  const [apiKey, setApiKey] = useState(getStoredAPIKey())
  const [keyInput, setKeyInput] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(!apiKey)
  const [analysis, setAnalysis] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  const saveKey = () => {
    if (!keyInput.trim()) return
    setStoredAPIKey(keyInput.trim())
    setApiKey(keyInput.trim())
    setShowKeyInput(false)
    setKeyInput('')
  }

  const analyze = async () => {
    setAiLoading(true)
    setError('')
    try {
      const result = await getAIInsights(apiKey, history)
      setAnalysis(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const changeKey = () => {
    clearStoredAPIKey()
    setApiKey('')
    setShowKeyInput(true)
    setAnalysis('')
  }

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
      <h2 className="text-sm font-semibold text-[#a0a0a0] mb-3 flex items-center gap-2">
        <Sparkles size={14} className="text-purple-400" /> AI Training Analysis
      </h2>

      {showKeyInput ? (
        <div className="space-y-3">
          <p className="text-xs text-[#a0a0a0]">
            Enter your Anthropic API key to get AI-powered training insights.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="sk-ant-..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="flex-1 bg-[#222] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={saveKey}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {!analysis && !aiLoading && (
            <button
              onClick={analyze}
              className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> Analyze My Training
            </button>
          )}

          {aiLoading && (
            <div className="flex items-center justify-center py-6 gap-2 text-sm text-[#a0a0a0]">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              Analyzing your workout data...
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {analysis && (
            <div className="space-y-3">
              <div className="prose prose-sm prose-invert max-w-none text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">
                {analysis.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                  i % 2 === 1 ? (
                    <strong key={i} className="text-white block mt-3 mb-1">{part}</strong>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={analyze}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <RefreshCw size={12} /> Re-analyze
                </button>
                <button
                  onClick={changeKey}
                  className="flex items-center gap-1 text-xs text-[#555] hover:text-[#a0a0a0] transition-colors"
                >
                  <Key size={12} /> Change API Key
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
