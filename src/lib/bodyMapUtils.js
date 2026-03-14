import { e1rm } from './utils'

// Maps exercise muscle_group values to body map regions
export const REGION_MAP = {
  'Shoulders': 'shoulders',
  'Chest': 'chest',
  'Back': 'back',
  'Lower Back': 'back',
  'Biceps': 'arms',
  'Triceps': 'arms',
  'Forearms': 'arms',
  'Abs': 'core',
  'Core': 'core',
  'Quads': 'quads',
  'Hamstrings': 'hamstrings',
  'Glutes': 'glutes',
  'Calves': 'calves',
}

export const REGION_LABELS = {
  shoulders: 'Shoulders',
  chest: 'Chest',
  back: 'Back',
  arms: 'Arms',
  core: 'Core',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
}

// How isolated each exercise is for its target muscle (1.0 = pure isolation, lower = more compound)
const ISOLATION_WEIGHT = {
  'barbell-bench-press': 0.65,
  'db-seated-shoulder-press': 0.7,
  'dumbbell-lateral-raise': 0.9,
  'cable-straight-bar-tricep-pushdown': 1.0,
  'dumbbell-bicep-curl': 1.0,
  'dumbbell-palm-up-wrist-curl': 1.0,
  'wide-grip-lat-pulldown': 0.7,
  'cable-rope-seated-high-row': 0.7,
  'machine-assisted-wide-grip-pull-up': 0.7,
  'lat-pulldown-machine-wide-grip': 0.7,
  'dumbbell-single-arm-row': 0.75,
  'hyperextension-roman-chair': 0.85,
  'hack-squat': 0.65,
  'db-bulgarian-split-squat': 0.55,
  'dumbbell-forward-lunge': 0.5,
  'machine-seated-leg-extension': 1.0,
  'dumbbell-step-up': 0.5,
  'barbell-rdl': 0.6,
  'machine-seated-leg-curl': 1.0,
  'laying-hamstring-curl': 1.0,
  'barbell-floor-glute-bridge': 0.85,
  'machine-standing-calf-raise': 1.0,
  'seated-machine-ab-crunch': 1.0,
  'decline-bench-sit-up': 0.9,
  'pallof-press': 0.85,
  'db-suitcase-carry': 0.7,
}

function bestE1RM(sets) {
  let best = 0
  for (const s of sets) {
    if (s.w > 0 && s.r > 0) best = Math.max(best, e1rm(s.w, s.r))
  }
  return best
}

export function computeBodyMapData(history, exercises, activeWorkout) {
  const today = new Date()
  const fourWeeksAgo = new Date(today - 28 * 86400000)
  const eightWeeksAgo = new Date(today - 56 * 86400000)

  // Group exercises by body region
  const regionExercises = {}
  const exerciseMap = {}
  for (const ex of exercises) {
    exerciseMap[ex.id] = ex
    const region = REGION_MAP[ex.muscle_group]
    if (!region) continue
    if (!regionExercises[region]) regionExercises[region] = []
    regionExercises[region].push(ex)
  }

  // Index history by exercise_id
  const historyByExercise = {}
  for (const h of history) {
    const id = h.exercise_id
    if (!historyByExercise[id]) historyByExercise[id] = []
    historyByExercise[id].push(h)
  }

  // Check active workout for "trained today" status
  const activeRegions = new Set()
  if (activeWorkout?.exercises) {
    for (const we of activeWorkout.exercises) {
      const hasDoneSets = we.sets?.some(s => s.done)
      if (hasDoneSets) {
        const ex = exerciseMap[we.exerciseId]
        if (ex) {
          const region = REGION_MAP[ex.muscle_group]
          if (region) activeRegions.add(region)
        }
      }
    }
  }

  const scores = {}

  for (const [region, exList] of Object.entries(regionExercises)) {
    let weightedSum = 0, totalWeight = 0
    let weightedSumPrev = 0, totalWeightPrev = 0
    let lastTrained = null

    const exerciseDetails = []

    for (const ex of exList) {
      const exHist = historyByExercise[ex.id] || []
      const isoW = ISOLATION_WEIGHT[ex.id] || 0.7

      // Find last trained date for this exercise
      for (const h of exHist) {
        if (!lastTrained || h.date > lastTrained) lastTrained = h.date
      }

      // Best e1RM in recent 4 weeks (current strength)
      let recentBest = 0
      for (const h of exHist) {
        if (new Date(h.date + 'T12:00:00') >= fourWeeksAgo) {
          recentBest = Math.max(recentBest, bestE1RM(h.sets))
        }
      }

      // Best e1RM in previous 4 weeks (4-8 weeks ago) for trend
      let prevBest = 0
      for (const h of exHist) {
        const d = new Date(h.date + 'T12:00:00')
        if (d >= eightWeeksAgo && d < fourWeeksAgo) {
          prevBest = Math.max(prevBest, bestE1RM(h.sets))
        }
      }

      // All-time best for display
      let allTimeBest = 0
      for (const h of exHist) {
        allTimeBest = Math.max(allTimeBest, bestE1RM(h.sets))
      }

      if (recentBest > 0) {
        weightedSum += recentBest * isoW
        totalWeight += isoW
      }
      if (prevBest > 0) {
        weightedSumPrev += prevBest * isoW
        totalWeightPrev += isoW
      }

      if (allTimeBest > 0) {
        exerciseDetails.push({
          name: ex.name,
          e1rm: Math.round(allTimeBest),
          recentE1rm: Math.round(recentBest),
          isolationWeight: isoW,
        })
      }
    }

    const score = totalWeight > 0 ? weightedSum / totalWeight : 0
    const prevScore = totalWeightPrev > 0 ? weightedSumPrev / totalWeightPrev : 0

    // Trend: compare recent vs previous period
    let trend = 'flat'
    if (score > 0 && prevScore > 0) {
      const change = (score - prevScore) / prevScore
      if (change > 0.03) trend = 'up'
      else if (change < -0.03) trend = 'down'
    }

    // Days since last trained
    let daysSince = null
    if (lastTrained) {
      daysSince = Math.floor((today - new Date(lastTrained + 'T12:00:00')) / 86400000)
    }

    // Override if actively training this region right now
    if (activeRegions.has(region)) {
      daysSince = 0
    }

    scores[region] = {
      score: Math.round(score),
      trend,
      lastTrained,
      daysSince,
      exercises: exerciseDetails.sort((a, b) => b.e1rm - a.e1rm),
    }
  }

  return scores
}

// Returns fill color + opacity based on recency
export function getRegionColor(daysSince) {
  if (daysSince === null) return { fill: '#555', opacity: 0.15 }
  if (daysSince <= 1) return { fill: '#22c55e', opacity: 0.6 }
  if (daysSince <= 3) return { fill: '#22c55e', opacity: 0.4 }
  if (daysSince <= 5) return { fill: '#22c55e', opacity: 0.25 }
  if (daysSince <= 7) return { fill: '#4ade80', opacity: 0.15 }
  return { fill: '#555', opacity: 0.15 }
}
