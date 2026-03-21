import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Settings, Play, Plus, Clock, Dumbbell, CheckCircle2, Circle, AlertTriangle } from 'lucide-react'
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
    <div className="px-4 pt-safe pb-nav-safe max-w-lg mx-auto w-full">
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
                {savedWorkout.exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0)} / {savedWorkout.exercises.reduce((s, e) => s + e.sets.length, 0)} sets done
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

        {/* New Template card */}
        <Link
          to="/templates/new"
          className="flex items-center gap-4 p-4 bg-[#1a1a1a] rounded-xl border border-dashed border-[#333] hover:border-indigo-500/40 hover:bg-[#222] transition-colors"
        >
          <div className="w-12 h-12 bg-[#222] rounded-xl flex items-center justify-center shrink-0">
            <Plus size={22} className="text-[#555]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#a0a0a0]">New Template</p>
            <p className="text-xs text-[#555]">Create a custom workout day</p>
          </div>
        </Link>
      </div>

      {/* Quick single-exercise link */}
      <Link
        to="/log"
        className="block text-center text-sm text-[#a0a0a0] hover:text-white mt-6 transition-colors"
      >
        Or log a single exercise &rarr;
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
    setsDone,
    setsTotal,
    updateSets,
    toggleSetDone,
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
  const [showFinishModal, setShowFinishModal] = useState(false)

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

  const handleFinishClick = () => {
    if (!state) return
    // Check if there are unchecked sets with reps
    const uncheckedSets = state.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => !s.done && s.r > 0).length, 0
    )
    if (uncheckedSets > 0) {
      setShowFinishModal(true)
    } else {
      handleFinish('all')
    }
  }

  const handleFinish = async (mode) => {
    setShowFinishModal(false)
    try {
      await finishWorkout(mode)
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
            onToggleSetDone={toggleSetDone}
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
              &#10005;
            </button>
          </div>
        )}
      </div>

      {/* Sticky bottom bar — set-based progress */}
      <div className="fixed bottom-16 left-0 right-0 bg-[#141414] border-t border-[#2a2a2a] z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
          {/* Progress bar */}
          <div className="w-full bg-[#222] rounded-full h-1.5 mb-2">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${setsTotal > 0 ? (setsDone / setsTotal) * 100 : 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-white font-medium">{setsDone}</span>
              <span className="text-[#a0a0a0]"> / {setsTotal} sets</span>
            </div>
            <button
              onClick={handleFinishClick}
              disabled={saving || setsDone === 0}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-[#222] disabled:text-[#555] text-white rounded-xl text-sm font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Finish Workout'}
            </button>
          </div>
        </div>
      </div>

      {/* Finish Confirmation Modal */}
      {showFinishModal && state && (
        <FinishConfirmModal
          exercises={state.exercises}
          onSaveAll={() => handleFinish('all')}
          onSaveCompleted={() => handleFinish('completed')}
          onCancel={() => setShowFinishModal(false)}
        />
      )}
    </div>
  )
}

function FinishConfirmModal({ exercises, onSaveAll, onSaveCompleted, onCancel }) {
  const uncheckedExercises = exercises
    .filter((ex) => ex.sets.some((s) => !s.done && s.r > 0))
    .map((ex) => ({
      name: ex.name,
      checked: ex.sets.filter((s) => s.done && s.r > 0).length,
      unchecked: ex.sets.filter((s) => !s.done && s.r > 0).length,
      total: ex.sets.filter((s) => s.r > 0).length,
    }))

  const totalUnchecked = uncheckedExercises.reduce((s, e) => s + e.unchecked, 0)
  const totalChecked = exercises.reduce((s, ex) => s + ex.sets.filter((x) => x.done && x.r > 0).length, 0)

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div
        className="bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl w-full max-w-lg border border-[#2a2a2a] p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-amber-400" />
          <h3 className="text-lg font-semibold text-white">Unchecked Sets</h3>
        </div>

        <p className="text-sm text-[#a0a0a0] mb-4">
          You have <span className="text-white font-medium">{totalUnchecked} unchecked {totalUnchecked === 1 ? 'set' : 'sets'}</span> with
          pre-filled weights and reps. Would you like to save them?
        </p>

        {/* Exercise breakdown */}
        <div className="space-y-2 mb-5">
          {uncheckedExercises.map((ex) => (
            <div key={ex.name} className="flex items-center justify-between text-sm bg-[#222] rounded-lg px-3 py-2">
              <span className="text-[#ccc] truncate mr-2">{ex.name}</span>
              <div className="flex items-center gap-2 shrink-0 text-xs">
                {ex.checked > 0 && (
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle2 size={12} /> {ex.checked}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[#a0a0a0]">
                  <Circle size={12} /> {ex.unchecked}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onSaveAll}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Save All Sets ({totalChecked + totalUnchecked})
          </button>
          <button
            onClick={onSaveCompleted}
            className="w-full py-3 bg-[#222] hover:bg-[#2a2a2a] text-white rounded-xl text-sm font-medium transition-colors border border-[#333]"
          >
            Save Completed Only ({totalChecked})
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2.5 text-[#a0a0a0] hover:text-white text-sm transition-colors"
          >
            Go Back
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
