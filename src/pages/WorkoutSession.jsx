import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Settings, Play, Plus, Clock, Dumbbell } from 'lucide-react'
import { useWorkoutSession } from '../hooks/useWorkoutSession'
import { getTemplates, getExercises } from '../lib/api'
import { loadWorkoutState } from '../lib/workoutStorage'
import WorkoutExerciseCard from '../components/WorkoutExerciseCard'
import { today } from '../lib/utils'

export default function WorkoutSession() {
  const { dayId } = useParams()

  if (!dayId) return <DayPicker />
  return <LiveWorkout dayId={dayId} />
}

// ─── Day Picker ─────────────────────────────────────────────
function DayPicker() {
  const [templates, setTemplates] = useState([])
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const savedWorkout = loadWorkoutState()

  useEffect(() => {
    Promise.all([getTemplates(), getExercises()])
      .then(([t, e]) => { setTemplates(t); setExercises(e) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]))

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-5">Start Workout</h1>

      {/* Resume banner */}
      {savedWorkout && savedWorkout.date === today() && (
        <Link
          to={`/workout/${savedWorkout.dayId}`}
          className="block bg-indigo-600/10 border border-indigo-500/30 rounded-xl p-4 mb-5 hover:bg-indigo-600/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Play size={20} className="text-indigo-400" />
            <div>
              <p className="text-sm font-medium text-indigo-300">Resume {savedWorkout.dayName}</p>
              <p className="text-xs text-[#a0a0a0]">
                {savedWorkout.exercises.filter((e) => e.done).length} / {savedWorkout.exercises.length} exercises done
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Day cards */}
      <div className="space-y-3">
        {templates.map((tpl) => {
          const exIds = tpl.exercises || []
          const muscleGroups = [...new Set(exIds.map((id) => exMap[id]?.muscle_group).filter(Boolean))]

          return (
            <div key={tpl.id} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
              <Link
                to={`/workout/${tpl.id}`}
                className="flex items-center gap-4 p-4 hover:bg-[#222] transition-colors"
              >
                <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center shrink-0">
                  <Dumbbell size={22} className="text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white">{tpl.name}</p>
                  <p className="text-xs text-[#a0a0a0] mt-0.5">
                    {exIds.length} exercises &middot; {muscleGroups.slice(0, 4).join(', ')}
                    {muscleGroups.length > 4 && ` +${muscleGroups.length - 4}`}
                  </p>
                </div>
              </Link>
              <div className="border-t border-[#2a2a2a] px-4 py-2 flex justify-end">
                <Link
                  to={`/templates/${tpl.id}`}
                  className="flex items-center gap-1 text-xs text-[#a0a0a0] hover:text-white transition-colors"
                >
                  <Settings size={12} /> Edit Template
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick single-exercise link */}
      <Link
        to="/log"
        className="block text-center text-sm text-[#a0a0a0] hover:text-white mt-6 transition-colors"
      >
        Or log a single exercise →
      </Link>
    </div>
  )
}

// ─── Live Workout ───────────────────────────────────────────
function LiveWorkout({ dayId }) {
  const navigate = useNavigate()
  const {
    state,
    loading,
    saving,
    allExercises,
    doneCount,
    totalCount,
    updateSets,
    toggleDone,
    addExercise,
    removeExercise,
    swapExercise,
    updateDate,
    finishWorkout,
    discardWorkout,
  } = useWorkoutSession(dayId)

  const [expandedIndex, setExpandedIndex] = useState(0)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [addExId, setAddExId] = useState('')
  const [elapsed, setElapsed] = useState('0:00')

  // Elapsed timer
  useEffect(() => {
    if (!state?.startedAt) return
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000)
      const m = Math.floor(diff / 60)
      const s = diff % 60
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [state?.startedAt])

  const handleToggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? -1 : index)
  }

  const handleFinish = async () => {
    try {
      await finishWorkout()
      navigate('/')
    } catch (err) {
      alert('Error saving: ' + err.message)
    }
  }

  const handleDiscard = () => {
    if (confirm('Discard this workout? All logged sets will be lost.')) {
      discardWorkout()
      navigate('/workout')
    }
  }

  const handleAddExercise = () => {
    if (!addExId) return
    const ex = allExercises.find((e) => e.id === addExId)
    if (ex) {
      addExercise(ex)
      setAddExId('')
      setShowAddExercise(false)
      // Expand the newly added exercise
      setExpandedIndex(state.exercises.length)
    }
  }

  if (loading) return <Spinner />
  if (!state) return <p className="text-[#a0a0a0] p-4">Could not load workout.</p>

  const usedIds = new Set(state.exercises.map((e) => e.exerciseId))

  return (
    <div className="px-4 pt-4 pb-32 max-w-lg mx-auto w-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">{state.dayName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="date"
              value={state.date}
              onChange={(e) => updateDate(e.target.value)}
              className="bg-transparent text-xs text-[#a0a0a0] focus:outline-none"
            />
            <span className="flex items-center gap-1 text-xs text-[#a0a0a0]">
              <Clock size={12} /> {elapsed}
            </span>
          </div>
        </div>
        <button
          onClick={handleDiscard}
          className="text-xs text-[#a0a0a0] hover:text-red-400 transition-colors px-2 py-1"
        >
          Discard
        </button>
      </div>

      {/* Exercise list */}
      <div className="space-y-2">
        {state.exercises.map((exercise, i) => (
          <WorkoutExerciseCard
            key={`${exercise.exerciseId}-${i}`}
            exercise={exercise}
            index={i}
            isExpanded={expandedIndex === i}
            onToggleExpand={handleToggleExpand}
            onUpdateSets={updateSets}
            onToggleDone={toggleDone}
            onRemove={removeExercise}
            onSwap={swapExercise}
            allExercises={allExercises}
          />
        ))}
      </div>

      {/* Add Exercise */}
      <div className="mt-3">
        {!showAddExercise ? (
          <button
            onClick={() => setShowAddExercise(true)}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors py-2"
          >
            <Plus size={16} /> Add Exercise
          </button>
        ) : (
          <div className="flex gap-2">
            <select
              value={addExId}
              onChange={(e) => setAddExId(e.target.value)}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select exercise...</option>
              {allExercises
                .filter((e) => !usedIds.has(e.id))
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.muscle_group})
                  </option>
                ))}
            </select>
            <button
              onClick={handleAddExercise}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddExercise(false); setAddExId('') }}
              className="px-3 py-2 text-[#a0a0a0] hover:text-white text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-[#141414] border-t border-[#2a2a2a] z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-white font-medium">{doneCount}</span>
            <span className="text-[#a0a0a0]"> / {totalCount} exercises</span>
          </div>
          <button
            onClick={handleFinish}
            disabled={saving || doneCount === 0}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-[#222] disabled:text-[#555] text-white rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Finish Workout'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
