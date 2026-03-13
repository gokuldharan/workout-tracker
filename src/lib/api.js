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

export async function addSession(exerciseId, date, day, sets) {
  const { data, error } = await supabase
    .from('history')
    .insert({ exercise_id: exerciseId, date, day, sets })
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
