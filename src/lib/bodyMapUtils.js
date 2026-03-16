import { e1rm } from './utils'

// ─── Finer-grained region mapping ────────────────────────────
// Maps exercise muscle_group values to primary body map regions
export const REGION_MAP = {
  'Shoulders': 'shoulders',
  'Chest': 'chest',
  'Back': 'lats',
  'Lower Back': 'lower_back',
  'Biceps': 'biceps',
  'Triceps': 'triceps',
  'Forearms': 'forearms',
  'Abs': 'abs',
  'Core': 'obliques',
  'Quads': 'quads',
  'Hamstrings': 'hamstrings',
  'Glutes': 'glutes',
  'Calves': 'calves',
}

// Secondary muscle contributions for compound exercises
// { region, weight } — weight is multiplied against the exercise's isolation weight
const SECONDARY_REGIONS = {
  // Back exercises also hit traps
  'wide-grip-lat-pulldown':          [{ region: 'traps', weight: 0.4 }],
  'cable-rope-seated-high-row':      [{ region: 'traps', weight: 0.5 }],
  'machine-assisted-wide-grip-pull-up': [{ region: 'traps', weight: 0.4 }],
  'lat-pulldown-machine-wide-grip':  [{ region: 'traps', weight: 0.4 }],
  'dumbbell-single-arm-row':         [{ region: 'traps', weight: 0.4 }],
  // Shoulder press hits traps
  'db-seated-shoulder-press':        [{ region: 'traps', weight: 0.5 }],
  // Bench press hits front delts
  'barbell-bench-press':             [{ region: 'shoulders', weight: 0.3 }],
  // Compound leg exercises hit glutes/hamstrings
  'hack-squat':                      [{ region: 'glutes', weight: 0.3 }],
  'db-bulgarian-split-squat':        [{ region: 'glutes', weight: 0.4 }, { region: 'hamstrings', weight: 0.2 }],
  'dumbbell-forward-lunge':          [{ region: 'glutes', weight: 0.3 }, { region: 'hamstrings', weight: 0.2 }],
  'dumbbell-step-up':                [{ region: 'glutes', weight: 0.3 }],
  // RDL hits lower back and glutes
  'barbell-rdl':                     [{ region: 'glutes', weight: 0.4 }, { region: 'lower_back', weight: 0.3 }],
  // Glute bridge hits hamstrings
  'barbell-floor-glute-bridge':      [{ region: 'hamstrings', weight: 0.2 }],
  // Hyperextension hits glutes
  'hyperextension-roman-chair':      [{ region: 'glutes', weight: 0.3 }],
}

export const REGION_LABELS = {
  shoulders: 'Shoulders (Deltoids)',
  chest: 'Chest (Pectorals)',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  traps: 'Upper Back (Traps)',
  lats: 'Mid Back (Lats)',
  lower_back: 'Lower Back (Erectors)',
  abs: 'Abs',
  obliques: 'Obliques',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
}

// Which regions appear in each view
export const FRONT_REGION_IDS = ['shoulders', 'chest', 'biceps', 'forearms', 'abs', 'obliques', 'quads', 'calves']
export const BACK_REGION_IDS = ['traps', 'lats', 'lower_back', 'triceps', 'glutes', 'hamstrings', 'calves']

// How isolated each exercise is for its target muscle (1.0 = pure isolation)
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

  const exerciseMap = {}
  for (const ex of exercises) {
    exerciseMap[ex.id] = ex
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
          // Also mark secondary regions
          const secondaries = SECONDARY_REGIONS[we.exerciseId]
          if (secondaries) {
            for (const s of secondaries) activeRegions.add(s.region)
          }
        }
      }
    }
  }

  // Accumulator per region: { weightedSum, totalWeight, weightedSumPrev, totalWeightPrev, lastTrained, exercises }
  const regionAcc = {}
  const ensureRegion = (r) => {
    if (!regionAcc[r]) {
      regionAcc[r] = { weightedSum: 0, totalWeight: 0, weightedSumPrev: 0, totalWeightPrev: 0, lastTrained: null, exercises: [] }
    }
  }

  // Process each exercise
  for (const ex of exercises) {
    const primaryRegion = REGION_MAP[ex.muscle_group]
    if (!primaryRegion) continue

    const exHist = historyByExercise[ex.id] || []
    const isoW = ISOLATION_WEIGHT[ex.id] || 0.7

    // Find last trained, recent best, prev best, all-time best
    let lastTrained = null
    let recentBest = 0
    let prevBest = 0
    let allTimeBest = 0

    for (const h of exHist) {
      if (!lastTrained || h.date > lastTrained) lastTrained = h.date
      const best = bestE1RM(h.sets)
      allTimeBest = Math.max(allTimeBest, best)
      const d = new Date(h.date + 'T12:00:00')
      if (d >= fourWeeksAgo) recentBest = Math.max(recentBest, best)
      if (d >= eightWeeksAgo && d < fourWeeksAgo) prevBest = Math.max(prevBest, best)
    }

    // Add to primary region
    ensureRegion(primaryRegion)
    const pr = regionAcc[primaryRegion]
    if (!pr.lastTrained || (lastTrained && lastTrained > pr.lastTrained)) pr.lastTrained = lastTrained
    if (recentBest > 0) { pr.weightedSum += recentBest * isoW; pr.totalWeight += isoW }
    if (prevBest > 0) { pr.weightedSumPrev += prevBest * isoW; pr.totalWeightPrev += isoW }
    if (allTimeBest > 0) {
      pr.exercises.push({ name: ex.name, e1rm: Math.round(allTimeBest), recentE1rm: Math.round(recentBest), isolationWeight: isoW })
    }

    // Add to secondary regions
    const secondaries = SECONDARY_REGIONS[ex.id]
    if (secondaries) {
      for (const sec of secondaries) {
        ensureRegion(sec.region)
        const sr = regionAcc[sec.region]
        const secIsoW = isoW * sec.weight
        if (!sr.lastTrained || (lastTrained && lastTrained > sr.lastTrained)) sr.lastTrained = lastTrained
        if (recentBest > 0) { sr.weightedSum += recentBest * secIsoW; sr.totalWeight += secIsoW }
        if (prevBest > 0) { sr.weightedSumPrev += prevBest * secIsoW; sr.totalWeightPrev += secIsoW }
        if (allTimeBest > 0) {
          sr.exercises.push({ name: ex.name + ' ²', e1rm: Math.round(allTimeBest), recentE1rm: Math.round(recentBest), isolationWeight: parseFloat(secIsoW.toFixed(2)) })
        }
      }
    }
  }

  // Compute final scores
  const scores = {}
  for (const [region, acc] of Object.entries(regionAcc)) {
    const score = acc.totalWeight > 0 ? acc.weightedSum / acc.totalWeight : 0
    const prevScore = acc.totalWeightPrev > 0 ? acc.weightedSumPrev / acc.totalWeightPrev : 0

    let trend = 'flat'
    if (score > 0 && prevScore > 0) {
      const change = (score - prevScore) / prevScore
      if (change > 0.03) trend = 'up'
      else if (change < -0.03) trend = 'down'
    }

    let daysSince = null
    if (acc.lastTrained) {
      daysSince = Math.floor((today - new Date(acc.lastTrained + 'T12:00:00')) / 86400000)
    }
    if (activeRegions.has(region)) daysSince = 0

    scores[region] = {
      score: Math.round(score),
      trend,
      lastTrained: acc.lastTrained,
      daysSince,
      exercises: acc.exercises.sort((a, b) => b.e1rm - a.e1rm),
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
