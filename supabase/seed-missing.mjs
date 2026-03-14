/**
 * Seed missing data from ironlog.json + create day templates.
 *
 * Usage:
 *   source .env && VITE_SUPABASE_URL=$VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY node supabase/seed-missing.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars')
  process.exit(1)
}

const supabase = createClient(url, key)

// ironlog.json name → Supabase exercise id mapping
const NAME_TO_ID = {
  'Hack Squat': 'hack-squat',
  'Barbell RDL': 'barbell-rdl',
  'Machine Standing Calf Raise': 'machine-standing-calf-raise',
  'Laying Hamstring Curl': 'laying-hamstring-curl',
  'Machine Seated Leg Curl': 'machine-seated-leg-curl',
  'Machine Seated Leg Extension': 'machine-seated-leg-extension',
  'DB Bulgarian Split Squat': 'db-bulgarian-split-squat',
  'Dumbbell Forward Lunge': 'db-forward-lunge',
  'Dumbbell Step Up': 'db-step-up',
  'Hyperextension Roman Chair': 'hyperextension',
  'Barbell Floor Glute Bridge': 'barbell-floor-glute-bridge',
  'Seated Leg Press': 'seated-leg-press',
  'Barbell Bench Press': 'barbell-bench-press',
  'Wide Grip Lat Pulldown': 'wide-grip-lat-pulldown',
  'Lat Pulldown Machine Wide Grip': 'lat-pulldown-machine',
  'Machine Assisted Wide Grip Pull Up': 'machine-assisted-pull-up',
  'Cable Rope Seated High Row': 'cable-rope-seated-high-row',
  'Cable Seated Close Grip Row': 'cable-seated-close-grip-row',
  'Cable Seated Row': 'cable-seated-row',
  'Dumbbell Single Arm Row': 'db-single-arm-row',
  'Dumbbell Seated Shoulder Press': 'db-shoulder-press',
  'Dumbbell Lateral Raise': 'db-lateral-raise',
  'Pallof Press': 'pallof-press',
  'Cable Straight Bar Tricep Pushdown': 'cable-tricep-pushdown',
  'Dumbbell Bicep Curl': 'db-bicep-curl',
  'Pull Up': 'pull-up',
  'Dumbbell Palm Up Wrist Curl': 'db-wrist-curl',
  'Seated Machine Ab Crunch': 'seated-machine-ab-crunch',
  'Decline Bench Sit Up': 'decline-bench-sit-up',
  'Dumbbell Side Bend': 'db-side-bend',
  'DB Suitcase Carry': 'db-suitcase-carry',
}

// Muscle group overrides for exercises not in workout-data.json
const MUSCLE_GROUPS = {
  'db-side-bend': 'Obliques',
  'cable-seated-row': 'Back',
  'cable-seated-close-grip-row': 'Back',
  'pull-up': 'Back',
  'seated-leg-press': 'Quads',
}

// Category corrections (ironlog has Pallof Press as Upper Body, but it's Core)
const CATEGORY_OVERRIDES = {
  'pallof-press': 'Core',
}

async function seed() {
  const ironlog = JSON.parse(
    readFileSync(resolve(__dirname, '../../ironlog.json'), 'utf-8')
  )

  // 1. Fetch existing exercises from Supabase
  const { data: existingExercises } = await supabase.from('exercises').select('id')
  const existingIds = new Set(existingExercises.map((e) => e.id))

  // 2. Fetch existing history from Supabase
  const { data: existingHistory } = await supabase
    .from('history')
    .select('exercise_id, date')
  const existingKeys = new Set(existingHistory.map((h) => `${h.exercise_id}|${h.date}`))

  const newExercises = []
  const newSessions = []

  for (const [name, data] of Object.entries(ironlog.exercises)) {
    const id = NAME_TO_ID[name]
    if (!id) {
      console.warn(`No ID mapping for: ${name}`)
      continue
    }

    const category = CATEGORY_OVERRIDES[id] || data.category

    // Insert exercise if missing
    if (!existingIds.has(id)) {
      const muscleGroup = MUSCLE_GROUPS[id] || category
      newExercises.push({
        id,
        name,
        category,
        muscle_group: muscleGroup,
      })
      console.log(`  + Exercise: ${name} (${id})`)
    }

    // Insert sessions if missing
    for (const session of data.sessions) {
      const key = `${id}|${session.date}`
      if (!existingKeys.has(key)) {
        newSessions.push({
          exercise_id: id,
          date: session.date,
          day: null,
          sets: session.sets.map((s) => ({ r: s.reps, w: s.weight })),
        })
      }
    }
  }

  // Insert missing exercises
  if (newExercises.length) {
    console.log(`\nInserting ${newExercises.length} missing exercises...`)
    const { error } = await supabase.from('exercises').upsert(newExercises, { onConflict: 'id' })
    if (error) { console.error('Exercise insert error:', error); return }
    console.log('Done.')
  } else {
    console.log('No missing exercises.')
  }

  // Insert missing sessions
  if (newSessions.length) {
    console.log(`\nInserting ${newSessions.length} missing sessions...`)
    for (let i = 0; i < newSessions.length; i += 50) {
      const batch = newSessions.slice(i, i + 50)
      const { error } = await supabase.from('history').insert(batch)
      if (error) { console.error(`Batch ${i} error:`, error); return }
    }
    console.log('Done.')
  } else {
    console.log('No missing sessions.')
  }

  // 3. Seed day templates
  console.log('\nSeeding day templates...')
  const templates = [
    {
      id: 1,
      name: 'Day 1',
      exercises: [
        'hack-squat',
        'wide-grip-lat-pulldown',
        'barbell-floor-glute-bridge',
        'db-shoulder-press',
        'db-bulgarian-split-squat',
        'seated-machine-ab-crunch',
        'cable-rope-seated-high-row',
        'cable-tricep-pushdown',
        'machine-assisted-pull-up',
        'db-bicep-curl',
      ],
    },
    {
      id: 2,
      name: 'Day 2',
      exercises: [
        'machine-standing-calf-raise',
        'hyperextension',
        'db-lateral-raise',
        'pallof-press',
        'barbell-bench-press',
        'cable-seated-close-grip-row',
        'barbell-rdl',
      ],
    },
    {
      id: 3,
      name: 'Day 3',
      exercises: [
        'machine-standing-calf-raise',
        'hyperextension',
        'machine-seated-leg-curl',
        'seated-machine-ab-crunch',
        'seated-leg-press',
      ],
    },
  ]

  const { error: tplError } = await supabase
    .from('day_templates')
    .upsert(templates, { onConflict: 'id' })

  if (tplError) {
    console.error('Template insert error:', tplError)
    return
  }
  console.log('Templates seeded.')
  console.log('\nAll done!')
}

seed()
