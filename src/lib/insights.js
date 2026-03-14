import { e1rm, volume } from './utils'

/**
 * Generate algorithmic insights from workout history.
 * @param {Array} history — all history rows with joined exercise data
 * @returns {Array<{ type, icon, title, body, priority }>}
 */
export function generateInsights(history) {
  if (!history.length) return []

  const insights = []

  // Group by exercise
  const byExercise = {}
  for (const h of history) {
    const name = h.exercises?.name || h.exercise_id
    if (!byExercise[name]) byExercise[name] = []
    byExercise[name].push(h)
  }

  // Sort each exercise's sessions by date
  for (const sessions of Object.values(byExercise)) {
    sessions.sort((a, b) => a.date.localeCompare(b.date))
  }

  // 1. PR Detection — latest session matches all-time best e1RM
  for (const [name, sessions] of Object.entries(byExercise)) {
    if (sessions.length < 2) continue
    const bestE1RM = (session) => {
      return Math.max(...session.sets.map((s) => (s.w === 0 ? s.r : s.w * (1 + s.r / 30))))
    }
    const latest = sessions[sessions.length - 1]
    const latestBest = bestE1RM(latest)
    const allTimeBest = Math.max(...sessions.map(bestE1RM))

    if (latestBest >= allTimeBest && latestBest > 0) {
      insights.push({
        type: 'pr',
        icon: '\u{1F3C6}',
        title: `PR: ${name}`,
        body: `New personal record! e1RM of ${Math.round(latestBest)} lbs on ${formatShort(latest.date)}`,
        priority: 10,
      })
    }
  }

  // 2. Plateau Detection — last 4+ sessions with <2% e1RM variation
  for (const [name, sessions] of Object.entries(byExercise)) {
    if (sessions.length < 4) continue
    const recent = sessions.slice(-4)
    const e1rms = recent.map((s) =>
      Math.max(...s.sets.map((set) => (set.w === 0 ? set.r : set.w * (1 + set.r / 30))))
    )
    const avg = e1rms.reduce((a, b) => a + b, 0) / e1rms.length
    if (avg === 0) continue
    const maxDev = Math.max(...e1rms.map((v) => Math.abs(v - avg) / avg))
    if (maxDev < 0.02) {
      insights.push({
        type: 'plateau',
        icon: '\u26A0\uFE0F',
        title: `Plateau: ${name}`,
        body: `Last 4 sessions within 2% of each other. Consider progressive overload.`,
        priority: 6,
      })
    }
  }

  // 3. Volume Trend — last 2 weeks vs prior 2 weeks
  const now = new Date()
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14)
  const fourWeeksAgo = new Date(now); fourWeeksAgo.setDate(now.getDate() - 28)

  let recentVol = 0, priorVol = 0
  for (const h of history) {
    const d = new Date(h.date + 'T12:00:00')
    const v = volume(h.sets)
    if (d >= twoWeeksAgo) recentVol += v
    else if (d >= fourWeeksAgo) priorVol += v
  }

  if (priorVol > 0) {
    const change = ((recentVol - priorVol) / priorVol) * 100
    if (change > 10) {
      insights.push({
        type: 'volume_up',
        icon: '\u{1F4C8}',
        title: 'Volume Up',
        body: `Training volume increased ${Math.round(change)}% vs prior 2 weeks. Great progress!`,
        priority: 7,
      })
    } else if (change < -10) {
      insights.push({
        type: 'volume_down',
        icon: '\u{1F4C9}',
        title: 'Volume Dropped',
        body: `Training volume decreased ${Math.round(Math.abs(change))}% vs prior 2 weeks.`,
        priority: 5,
      })
    }
  }

  // 4. Consistency Streak
  const streak = getConsistencyStreak(history)
  if (streak >= 2) {
    insights.push({
      type: 'streak',
      icon: '\u{1F525}',
      title: `${streak} Week Streak`,
      body: `You've trained consistently for ${streak} weeks in a row. Keep it up!`,
      priority: 8,
    })
  }

  // 5. Muscle Imbalance
  const muscleVol = {}
  for (const h of history) {
    const mg = h.exercises?.muscle_group
    if (!mg) continue
    muscleVol[mg] = (muscleVol[mg] || 0) + volume(h.sets)
  }
  const muscleEntries = Object.entries(muscleVol).sort(([, a], [, b]) => b - a)
  if (muscleEntries.length >= 3) {
    const maxVol = muscleEntries[0][1]
    const weak = muscleEntries.filter(([, v]) => v < maxVol * 0.3)
    if (weak.length > 0) {
      insights.push({
        type: 'imbalance',
        icon: '\u2696\uFE0F',
        title: 'Muscle Imbalance',
        body: `${weak.map(([n]) => n).join(', ')} ${weak.length === 1 ? 'has' : 'have'} significantly less volume than ${muscleEntries[0][0]}.`,
        priority: 4,
      })
    }
  }

  return insights.sort((a, b) => b.priority - a.priority)
}

/**
 * Get consistency streak (consecutive weeks with >=2 sessions).
 */
export function getConsistencyStreak(history) {
  if (!history.length) return 0

  const dates = [...new Set(history.map((h) => h.date))].sort((a, b) => b.localeCompare(a))
  const weekMap = {}

  for (const d of dates) {
    const dt = new Date(d + 'T12:00:00')
    const weekStart = new Date(dt)
    weekStart.setDate(dt.getDate() - dt.getDay())
    const key = weekStart.toISOString().split('T')[0]
    weekMap[key] = (weekMap[key] || 0) + 1
  }

  // Sort weeks descending
  const weeks = Object.entries(weekMap).sort(([a], [b]) => b.localeCompare(a))

  let streak = 0
  const now = new Date()
  const currentWeekStart = new Date(now)
  currentWeekStart.setDate(now.getDate() - now.getDay())
  let expectedWeek = new Date(currentWeekStart)

  for (const [weekKey, count] of weeks) {
    const weekDate = new Date(weekKey + 'T12:00:00')
    const diffDays = Math.round((expectedWeek - weekDate) / (1000 * 60 * 60 * 24))

    if (diffDays > 8) break // Gap > 1 week
    if (count >= 2) streak++
    else if (streak > 0) break // Broke the streak

    expectedWeek.setDate(expectedWeek.getDate() - 7)
  }

  return streak
}

/**
 * Find recent PRs — exercises where latest session = all-time best e1RM.
 */
export function getRecentPRs(history) {
  const byExercise = {}
  for (const h of history) {
    const name = h.exercises?.name || h.exercise_id
    const id = h.exercise_id
    if (!byExercise[id]) byExercise[id] = { name, sessions: [] }
    byExercise[id].sessions.push(h)
  }

  const prs = []
  for (const [id, { name, sessions }] of Object.entries(byExercise)) {
    if (sessions.length < 2) continue
    sessions.sort((a, b) => a.date.localeCompare(b.date))
    const bestE1RM = (session) =>
      Math.max(...session.sets.map((s) => e1rm(s.w, s.r)))
    const latest = sessions[sessions.length - 1]
    const latestBest = bestE1RM(latest)
    const allTimeBest = Math.max(...sessions.map(bestE1RM))
    if (latestBest >= allTimeBest && latestBest > 0) {
      prs.push({ id, name, e1rm: Math.round(latestBest), date: latest.date })
    }
  }

  return prs.sort((a, b) => b.e1rm - a.e1rm)
}

/**
 * Get e1RM leaderboard with trend vs N weeks ago.
 */
export function getE1RMLeaderboard(history, weeksAgo = 4) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeksAgo * 7)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const byExercise = {}
  for (const h of history) {
    const name = h.exercises?.name || h.exercise_id
    const id = h.exercise_id
    if (!byExercise[id]) byExercise[id] = { name, current: 0, old: 0 }
    const best = Math.max(...h.sets.map((s) => e1rm(s.w, s.r)))
    if (h.date >= cutoffStr) {
      byExercise[id].current = Math.max(byExercise[id].current, best)
    } else {
      byExercise[id].old = Math.max(byExercise[id].old, best)
    }
  }

  return Object.entries(byExercise)
    .filter(([, v]) => v.current > 0)
    .map(([id, { name, current, old }]) => {
      let trend = 'flat'
      if (old > 0) {
        const pct = ((current - old) / old) * 100
        if (pct > 3) trend = 'up'
        else if (pct < -3) trend = 'down'
      }
      return { id, name, e1rm: Math.round(current), trend }
    })
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, 10)
}

function formatShort(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
