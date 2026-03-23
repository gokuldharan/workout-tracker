export const e1rm = (w, r) => (r === 1 ? w : w * (1 + r / 30))

export const volume = (sets) => sets.reduce((sum, s) => sum + s.r * s.w, 0)

export const formatDate = (d) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

export const formatDateFull = (d) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export const today = () => new Date().toISOString().split('T')[0]

export const categoryColors = {
  'Lower Body': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'Upper Body': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'Core': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
}

export const toKebab = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// Template exercises can be strings (legacy) or objects with suggestions
// Normalizes to { id, targetSets, targetReps, targetWeight, note }
export const normalizeTemplateExercise = (item) => {
  if (typeof item === 'string') return { id: item }
  return item
}

// Extract just the exercise IDs from a (possibly mixed) template exercises array
export const templateExerciseIds = (exercises) =>
  (exercises || []).map((e) => normalizeTemplateExercise(e).id)
