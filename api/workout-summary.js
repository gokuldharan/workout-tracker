import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://fgqomutnnhvrghxvlica.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY
)

function e1rm(w, r) {
  if (w === 0) return r
  return Math.round(w * (1 + r / 30))
}

function volume(sets) {
  return sets.reduce((sum, s) => sum + s.w * s.r, 0)
}

export default async function handler(req, res) {
  try {
    const [{ data: history }, { data: exercises }, { data: templates }] = await Promise.all([
      supabase.from('history').select('*, exercises(name, category, muscle_group)').order('date', { ascending: false }),
      supabase.from('exercises').select('*').order('name'),
      supabase.from('day_templates').select('*').order('id'),
    ])

    const exMap = Object.fromEntries(exercises.map((e) => [e.id, e.name]))

    // Unique workout dates
    const uniqueDates = [...new Set(history.map((h) => h.date))].sort()
    const totalSessions = uniqueDates.length

    // Per-exercise stats
    const byExercise = {}
    for (const h of history) {
      const name = h.exercises?.name || h.exercise_id
      if (!byExercise[name]) {
        byExercise[name] = {
          category: h.exercises?.category,
          muscle: h.exercises?.muscle_group,
          sessions: [],
        }
      }
      byExercise[name].sessions.push({
        date: h.date,
        sets: h.sets,
        volume: volume(h.sets),
        bestE1RM: Math.max(...h.sets.map((s) => e1rm(s.w, s.r))),
      })
    }

    // Weekly volume
    const weeklyVol = {}
    for (const h of history) {
      const d = new Date(h.date + 'T12:00:00')
      const ws = new Date(d)
      ws.setDate(d.getDate() - d.getDay())
      const key = ws.toISOString().split('T')[0]
      weeklyVol[key] = (weeklyVol[key] || 0) + volume(h.sets)
    }

    // PRs
    const prs = {}
    for (const [name, data] of Object.entries(byExercise)) {
      let best = { e1rm: 0, date: '', set: null }
      for (const s of data.sessions) {
        if (s.bestE1RM > best.e1rm) {
          best = { e1rm: s.bestE1RM, date: s.date, set: s.sets.reduce((b, x) => e1rm(x.w, x.r) > e1rm(b.w, b.r) ? x : b) }
        }
      }
      prs[name] = best
    }

    // Recent sessions (last 10 workout days)
    const recentDates = uniqueDates.slice(-10).reverse()
    const recentSessions = recentDates.map((date) => {
      const dayHistory = history.filter((h) => h.date === date)
      return {
        date,
        day: dayHistory[0]?.day,
        exercises: dayHistory.map((h) => ({
          name: h.exercises?.name || h.exercise_id,
          sets: h.sets.map((s) => `${s.w}x${s.r}`).join(', '),
          volume: volume(h.sets),
          bestE1RM: Math.max(...h.sets.map((s) => e1rm(s.w, s.r))),
        })),
      }
    })

    // Build markdown summary
    let md = `# IronLog Workout Data\n`
    md += `*Generated: ${new Date().toISOString().split('T')[0]}*\n\n`

    md += `## Overview\n`
    md += `- **Total sessions:** ${totalSessions}\n`
    md += `- **Date range:** ${uniqueDates[0] || 'none'} to ${uniqueDates[uniqueDates.length - 1] || 'none'}\n`
    md += `- **Exercises tracked:** ${Object.keys(byExercise).length}\n\n`

    md += `## Training Program\n`
    for (const t of templates) {
      md += `### ${t.name}\n`
      md += (t.exercises || []).map((id, i) => `${i + 1}. ${exMap[id] || id}`).join('\n') + '\n\n'
    }

    md += `## Personal Records (estimated 1RM)\n`
    const sortedPRs = Object.entries(prs).sort(([, a], [, b]) => b.e1rm - a.e1rm)
    for (const [name, pr] of sortedPRs) {
      if (pr.set) {
        md += `- **${name}:** ${pr.e1rm} lbs (${pr.set.w}x${pr.set.r} on ${pr.date})\n`
      }
    }
    md += '\n'

    md += `## Weekly Volume (last 8 weeks)\n`
    const sortedWeeks = Object.entries(weeklyVol).sort(([a], [b]) => b.localeCompare(a)).slice(0, 8)
    for (const [week, vol] of sortedWeeks) {
      md += `- ${week}: ${vol.toLocaleString()} lbs\n`
    }
    md += '\n'

    md += `## Exercise Trends\n`
    for (const [name, data] of Object.entries(byExercise).sort(([, a], [, b]) => b.sessions.length - a.sessions.length)) {
      const recent = data.sessions.slice(0, 3)
      const trend = recent.map((s) => s.bestE1RM).join(' → ')
      md += `- **${name}** (${data.category}/${data.muscle}): ${data.sessions.length} sessions, recent e1RM: ${trend}\n`
    }
    md += '\n'

    md += `## Recent Sessions\n`
    for (const session of recentSessions) {
      md += `### ${session.date}${session.day ? ` — ${session.day}` : ''}\n`
      for (const ex of session.exercises) {
        md += `- ${ex.name}: ${ex.sets} (vol: ${ex.volume}, e1RM: ${ex.bestE1RM})\n`
      }
      md += '\n'
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).send(md)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
