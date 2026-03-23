import { supabase } from './supabase'

// Exercises
export async function getExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function getExercisesByCategory() {
  const exercises = await getExercises()
  return exercises.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = []
    acc[ex.category].push(ex)
    return acc
  }, {})
}

// History
export async function getHistory(exerciseId) {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .eq('exercise_id', exerciseId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllHistory() {
  const { data, error } = await supabase
    .from('history')
    .select('*, exercises(name, category, muscle_group)')
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function getRecentHistory(limit = 50) {
  const { data, error } = await supabase
    .from('history')
    .select('*, exercises(name, category, muscle_group)')
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function addSession(exerciseId, date, day, sets, note) {
  const row = { exercise_id: exerciseId, date, day, sets }
  if (note) row.note = note
  const { data, error } = await supabase
    .from('history')
    .insert(row)
    .select()
  if (error) throw error
  return data[0]
}

export async function deleteSession(id) {
  const { error } = await supabase
    .from('history')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function addExercise(id, name, category, muscleGroup) {
  const { data, error } = await supabase
    .from('exercises')
    .insert({ id, name, category, muscle_group: muscleGroup })
    .select()
  if (error) throw error
  return data[0]
}

// Day Templates
export async function getTemplates() {
  const { data, error } = await supabase
    .from('day_templates')
    .select('*')
    .order('id')
  if (error) throw error
  return data
}

export async function getTemplate(id) {
  const { data, error } = await supabase
    .from('day_templates')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function updateTemplate(id, exercises, name) {
  const updates = { exercises, updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  const { error } = await supabase
    .from('day_templates')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function createTemplate(id, name, exercises) {
  const { data, error } = await supabase
    .from('day_templates')
    .insert({ id, name, exercises })
    .select()
  if (error) throw error
  return data[0]
}

export async function deleteTemplate(id) {
  const { error } = await supabase
    .from('day_templates')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// Batch insert (for day-based workout finish)
export async function addSessionBatch(sessions) {
  const { data, error } = await supabase
    .from('history')
    .insert(sessions)
    .select()
  if (error) throw error
  return data
}

// Get most recent session for an exercise (for "last time" reference)
export async function getLastSession(exerciseId) {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .eq('exercise_id', exerciseId)
    .order('date', { ascending: false })
    .limit(1)
  if (error) throw error
  return data[0] || null
}

// Batch fetch last sessions for multiple exercises
export async function getLastSessionsForExercises(exerciseIds) {
  if (!exerciseIds.length) return {}
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .in('exercise_id', exerciseIds)
    .order('date', { ascending: false })
  if (error) throw error
  // Keep only the most recent per exercise
  const map = {}
  for (const row of data) {
    if (!map[row.exercise_id]) map[row.exercise_id] = row
  }
  return map
}

// Stats
export async function getExerciseStats(exerciseId) {
  const history = await getHistory(exerciseId)
  if (!history.length) return null

  const latest = history[0]
  const bestSet = history.reduce((best, session) => {
    const sessionBest = session.sets.reduce((b, s) => {
      const e1rm = s.w === 0 ? s.r : s.w * (1 + s.r / 30)
      return e1rm > b.e1rm ? { ...s, e1rm, date: session.date } : b
    }, { e1rm: 0 })
    return sessionBest.e1rm > best.e1rm ? sessionBest : best
  }, { e1rm: 0 })

  return { latest, bestSet, totalSessions: history.length, history }
}
