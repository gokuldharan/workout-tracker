const STORAGE_KEY = 'ironlog_active_workout'

export function saveWorkoutState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Failed to save workout state:', e)
  }
}

export function loadWorkoutState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearWorkoutState() {
  localStorage.removeItem(STORAGE_KEY)
}
