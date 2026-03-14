import { useState, useEffect, useCallback, useRef } from 'react'
import { getTemplate, getExercises, getLastSessionsForExercises, addSessionBatch } from '../lib/api'
import { saveWorkoutState, loadWorkoutState, clearWorkoutState } from '../lib/workoutStorage'
import { today } from '../lib/utils'

export function useWorkoutSession(dayId) {
  const [state, setState] = useState(null)
  const [allExercises, setAllExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef(null)

  // Load exercises list for add/swap
  useEffect(() => {
    getExercises().then(setAllExercises)
  }, [])

  // Initialize workout
  useEffect(() => {
    if (!dayId) { setLoading(false); return }

    async function init() {
      // Check localStorage for in-progress workout
      const saved = loadWorkoutState()
      if (saved && saved.dayId === Number(dayId) && saved.date === today()) {
        setState(saved)
        setLoading(false)
        return
      }

      // Load template and build fresh state
      const template = await getTemplate(Number(dayId))
      const exerciseIds = template.exercises || []

      const [lastSessions] = await Promise.all([
        getLastSessionsForExercises(exerciseIds),
      ])

      const allEx = await getExercises()
      setAllExercises(allEx)
      const exMap = Object.fromEntries(allEx.map((e) => [e.id, e]))

      const exercises = exerciseIds.map((id) => {
        const ex = exMap[id]
        const last = lastSessions[id]
        const lastSets = last ? last.sets : []
        // Pre-fill with last session's values or 3 empty sets — each set has done:false
        const sets = lastSets.length
          ? lastSets.map((s) => ({ r: s.r, w: s.w, done: false }))
          : [{ r: 10, w: 0, done: false }, { r: 10, w: 0, done: false }, { r: 10, w: 0, done: false }]

        return {
          exerciseId: id,
          name: ex?.name || id,
          category: ex?.category || '',
          muscleGroup: ex?.muscle_group || '',
          sets,
          lastSets,
          done: false,
          isFromTemplate: true,
        }
      })

      const newState = {
        dayId: Number(dayId),
        dayName: template.name,
        date: today(),
        startedAt: new Date().toISOString(),
        exercises,
      }

      setState(newState)
      saveWorkoutState(newState)
      setLoading(false)
    }

    init()
  }, [dayId])

  // Auto-save to localStorage (debounced)
  useEffect(() => {
    if (!state) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveWorkoutState(state)
    }, 500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [state])

  const updateSets = useCallback((exerciseIndex, sets) => {
    setState((prev) => {
      if (!prev) return prev
      const exercises = [...prev.exercises]
      const allDone = sets.length > 0 && sets.every((s) => s.done)
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets, done: allDone }
      return { ...prev, exercises }
    })
  }, [])

  const toggleSetDone = useCallback((exerciseIndex, setIndex) => {
    setState((prev) => {
      if (!prev) return prev
      const exercises = [...prev.exercises]
      const ex = { ...exercises[exerciseIndex] }
      const sets = ex.sets.map((s, i) => i === setIndex ? { ...s, done: !s.done } : s)
      ex.sets = sets
      ex.done = sets.length > 0 && sets.every((s) => s.done)
      exercises[exerciseIndex] = ex
      return { ...prev, exercises }
    })
  }, [])

  const toggleDone = useCallback((exerciseIndex) => {
    setState((prev) => {
      if (!prev) return prev
      const exercises = [...prev.exercises]
      const ex = { ...exercises[exerciseIndex] }
      const newDone = !ex.done
      // Toggle all sets to match
      ex.sets = ex.sets.map((s) => ({ ...s, done: newDone }))
      ex.done = newDone
      exercises[exerciseIndex] = ex
      return { ...prev, exercises }
    })
  }, [])

  const addExercise = useCallback((exercise) => {
    setState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: [
          ...prev.exercises,
          {
            exerciseId: exercise.id,
            name: exercise.name,
            category: exercise.category,
            muscleGroup: exercise.muscle_group,
            sets: [{ r: 10, w: 0, done: false }, { r: 10, w: 0, done: false }, { r: 10, w: 0, done: false }],
            lastSets: [],
            done: false,
            isFromTemplate: false,
          },
        ],
      }
    })
  }, [])

  const removeExercise = useCallback((exerciseIndex) => {
    setState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.filter((_, i) => i !== exerciseIndex),
      }
    })
  }, [])

  const swapExercise = useCallback((exerciseIndex, newExercise) => {
    setState((prev) => {
      if (!prev) return prev
      const exercises = [...prev.exercises]
      exercises[exerciseIndex] = {
        exerciseId: newExercise.id,
        name: newExercise.name,
        category: newExercise.category,
        muscleGroup: newExercise.muscle_group,
        sets: [{ r: 10, w: 0, done: false }, { r: 10, w: 0, done: false }, { r: 10, w: 0, done: false }],
        lastSets: [],
        done: false,
        isFromTemplate: false,
      }
      return { ...prev, exercises }
    })
  }, [])

  const updateDate = useCallback((date) => {
    setState((prev) => (prev ? { ...prev, date } : prev))
  }, [])

  const finishWorkout = useCallback(async () => {
    if (!state) return

    setSaving(true)
    try {
      // Only save exercises that have at least one set with reps > 0
      // Strip the `done` flag before saving to DB
      const sessions = state.exercises
        .filter((ex) => ex.sets.some((s) => s.r > 0))
        .map((ex) => ({
          exercise_id: ex.exerciseId,
          date: state.date,
          day: state.dayName,
          sets: ex.sets.filter((s) => s.r > 0).map(({ r, w }) => ({ r, w })),
        }))

      if (sessions.length) {
        await addSessionBatch(sessions)
      }

      clearWorkoutState()
      return true
    } catch (err) {
      console.error('Failed to save workout:', err)
      throw err
    } finally {
      setSaving(false)
    }
  }, [state])

  const discardWorkout = useCallback(() => {
    clearWorkoutState()
    setState(null)
  }, [])

  // Count sets done / total
  const setsDone = state?.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.done).length, 0) || 0
  const setsTotal = state?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) || 0
  const doneCount = state?.exercises.filter((e) => e.done).length || 0
  const totalCount = state?.exercises.length || 0

  return {
    state,
    loading,
    saving,
    allExercises,
    doneCount,
    totalCount,
    setsDone,
    setsTotal,
    updateSets,
    toggleSetDone,
    toggleDone,
    addExercise,
    removeExercise,
    swapExercise,
    updateDate,
    finishWorkout,
    discardWorkout,
  }
}
