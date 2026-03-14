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
export function summarizeData(history) {
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

const SYSTEM_PROMPT = `You are an expert personal trainer and sports scientist embedded in a workout tracking app called IronLog. You have access to the user's complete training history.

Your role:
- Analyze their workout data and provide specific, actionable coaching
- Answer questions about their training, form, programming, nutrition, and recovery
- Be encouraging but honest — point out issues when you see them
- Use data from their history to back up your advice
- Keep responses concise and scannable (use bold, bullets, short paragraphs)
- When discussing exercises, reference their actual numbers and trends

You're having an ongoing conversation. Previous messages and context are preserved across sessions.`

/**
 * Call Claude API for single-shot analysis (used by Stats page).
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

/**
 * Send a chat message with full conversation history and workout context.
 * Returns the assistant's response text.
 */
export async function sendChatMessage(apiKey, userMessage, conversationHistory, workoutSummary) {
  // Build messages array from conversation history
  const messages = []

  // If there's workout context and this is the start or the context is stale, inject it
  if (workoutSummary) {
    messages.push({
      role: 'user',
      content: `[WORKOUT DATA - AUTO-INJECTED]\nHere's my current training data for reference:\n${JSON.stringify(workoutSummary, null, 2)}\n\nPlease use this data to inform your responses. You don't need to analyze it all now — just reference it when relevant.`,
    })
    messages.push({
      role: 'assistant',
      content: `Got it! I have your training data loaded. I can see ${workoutSummary.totalSessions} workout sessions spanning ${workoutSummary.dateRange}, tracking ${workoutSummary.exercises?.length || 0} exercises. Ask me anything about your training!`,
    })
  }

  // Add conversation history (skip system messages, keep user/assistant pairs)
  for (const msg of conversationHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  // Add the new user message
  messages.push({ role: 'user', content: userMessage })

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
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0]?.text || 'No response from AI.'
}
