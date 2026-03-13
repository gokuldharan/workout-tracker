/**
 * Seed script - loads workout-data.json into Supabase
 *
 * Usage:
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node supabase/seed.mjs
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

// Load data from the workout-data.json in the parent Fitness directory
const dataPath = resolve(__dirname, '../../files/workout-data.json')
const data = JSON.parse(readFileSync(dataPath, 'utf-8'))

async function seed() {
  console.log(`Seeding ${data.exercises.length} exercises...`)

  // Insert exercises
  const { error: exError } = await supabase
    .from('exercises')
    .upsert(
      data.exercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        category: ex.category,
        muscle_group: ex.muscleGroup,
      })),
      { onConflict: 'id' }
    )

  if (exError) {
    console.error('Exercise insert error:', exError)
    return
  }
  console.log('Exercises inserted.')

  // Insert history
  console.log(`Seeding ${data.history.length} workout sessions...`)
  const historyRows = data.history.map((h) => ({
    exercise_id: h.exerciseId,
    date: h.date,
    day: h.day || null,
    sets: h.sets,
  }))

  // Batch in chunks of 50
  for (let i = 0; i < historyRows.length; i += 50) {
    const batch = historyRows.slice(i, i + 50)
    const { error } = await supabase.from('history').insert(batch)
    if (error) {
      console.error(`History batch ${i} error:`, error)
      return
    }
  }

  console.log('History seeded.')
  console.log('Done!')
}

seed()
