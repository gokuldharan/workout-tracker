import { volume, e1rm } from './utils'

const API_KEY_STORAGE = 'ironlog_anthropic_key'

export function getStoredAPIKey() {
  return localStorage.getItem(API_KEY_STORAGE) || ''
}

export function setStoredAPIKey(key) {
  localStorage.setItem(API_KEY_STORAGE, key)
}

export function clearStoredAPIKey() {
  localStorage.removeItem(API_KEY_STORAGE)
}

/**
 * Summarize workout data into a compact format for Claude.
 */
function summarizeData(history) {
  // Group by exercise
  const byExercise = {}
  for (const h of history) {
    const name = h.exercises?.name || h.exercise_id
    if (!byExercise[name]) byExercise[name] = { category: h.exercises?.category, muscle: h.exercises?.muscle_group, sessions: [] }
    byExercise[name].sessions.push({
      date: h.date,
      sets: h.sets.length,
      vol: volume(h.sets),
      bestE1RM: Math.round(Math.max(...h.sets.map((s) => e1rm(s.w, s.r)))),
    })
  }

  // Sort sessions by date
  for (const ex of Object.values(byExercise)) {
    ex.sessions.sort((a, b) => a.date.localeCompare(b.date))
  }

  // Weekly volume
  const weeklyVol = {}
  for (const h of history) {
    const d = new Date(h.date + 'T12:00:00')
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split('T')[0]
    weeklyVol[key] = (weeklyVol[key] || 0) + volume(h.sets)
  }

  // Total unique dates
  const uniqueDates = [...new Set(history.map((h) => h.date))].sort()

  return {
    totalSessions: uniqueDates.length,
    dateRange: uniqueDates.length ? `${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}` : 'none',
    weeklyVolume: Object.entries(weeklyVol).sort(([a], [b]) => a.localeCompare(b)).map(([w, v]) => `${w}: ${v} lbs`),
    exercises: Object.entries(byExercise).map(([name, data]) => ({
      name,
      category: data.category,
      muscle: data.muscle,
      totalSessions: data.sessions.length,
      latestE1RM: data.sessions[data.sessions.length - 1]?.bestE1RM,
      bestE1RM: Math.max(...data.sessions.map((s) => s.bestE1RM)),
      trend: data.sessions.length >= 3
        ? data.sessions.slice(-3).map((s) => s.bestE1RM).join(' -> ')
        : undefined,
    })),
  }
}

/**
 * Call Claude API for workout analysis.
 */
export async function getAIInsights(apiKey, history) {
  const summary = summarizeData(history)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a knowledgeable personal trainer analyzing a client's workout data. Be specific, actionable, and encouraging. Format your response in these sections:

**Strengths** — What they're doing well (1-2 points)
**Areas to Improve** — Specific suggestions (2-3 points)
**Programming Tips** — Training adjustments to consider (1-2 points)
**Recovery** — Any rest/recovery observations (1 point)

Keep each point to 1-2 sentences. Be concise but insightful.`,
      messages: [
        {
          role: 'user',
          content: `Here's my workout data:\n\n${JSON.stringify(summary, null, 2)}\n\nAnalyze my training and give me specific, actionable insights.`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0]?.text || 'No response from AI.'
}
