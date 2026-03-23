import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, Trash2, ArrowLeftRight, Plus, MessageSquare, Target } from 'lucide-react'
import SetInput from './SetInput'
import { categoryColors, volume } from '../lib/utils'

export default function WorkoutExerciseCard({
  exercise,
  index,
  isExpanded,
  onToggleExpand,
  onUpdateSets,
  onToggleSetDone,
  onRemove,
  onSwap,
  onUpdateNote,
  allExercises,
}) {
  const [showSwap, setShowSwap] = useState(false)
  const [swapId, setSwapId] = useState('')
  const colors = categoryColors[exercise.category] || categoryColors['Core']

  const sets = exercise.sets
  const lastSets = exercise.lastSets || []
  const setsDone = sets.filter((s) => s.done).length
  const allDone = sets.length > 0 && setsDone === sets.length

  const updateSet = (setIndex, updated) => {
    const newSets = sets.map((s, i) => (i === setIndex ? { ...updated, done: s.done } : s))
    onUpdateSets(index, newSets)
  }

  const removeSet = (setIndex) => {
    onUpdateSets(index, sets.filter((_, i) => i !== setIndex))
  }

  const addSet = () => {
    const last = sets[sets.length - 1] || { r: 10, w: 0 }
    onUpdateSets(index, [...sets, { r: last.r, w: last.w, done: false }])
  }

  const handleSwap = () => {
    if (!swapId) return
    const ex = allExercises.find((e) => e.id === swapId)
    if (ex) {
      onSwap(index, ex)
      setShowSwap(false)
      setSwapId('')
    }
  }

  const currentVol = volume(sets.filter((s) => s.r > 0))

  return (
    <div
      className={`bg-[#1a1a1a] rounded-xl border transition-colors ${
        allDone
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-[#2a2a2a]'
      }`}
    >
      {/* Header - always visible */}
      <button
        onClick={() => onToggleExpand(index)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className="text-xs text-[#555] w-5 text-center font-mono">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${allDone ? 'text-green-400' : 'text-white'}`}>
            {exercise.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {exercise.muscleGroup}
            </span>
            {sets.length > 0 && (
              <span className={`text-xs ${setsDone > 0 ? 'text-green-400/70' : 'text-[#555]'}`}>
                {setsDone}/{sets.length} sets
              </span>
            )}
            {currentVol > 0 && (
              <span className="text-xs text-[#a0a0a0]">{currentVol.toLocaleString()} lbs</span>
            )}
          </div>
        </div>
        {allDone && <Check size={16} className="text-green-400 shrink-0" />}
        {isExpanded ? (
          <ChevronUp size={16} className="text-[#a0a0a0] shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-[#a0a0a0] shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Coach suggestion from template */}
          {exercise.suggestion && (
            <div className="flex items-start gap-2 bg-indigo-500/8 border border-indigo-500/15 rounded-lg px-3 py-2">
              <Target size={14} className="text-indigo-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                {(exercise.suggestion.targetReps || exercise.suggestion.targetWeight) && (
                  <p className="text-xs text-indigo-300 font-medium">
                    {exercise.suggestion.targetSets && `${exercise.suggestion.targetSets}×`}
                    {exercise.suggestion.targetReps || '?'} @ {exercise.suggestion.targetWeight || '?'} lbs
                  </p>
                )}
                {exercise.suggestion.note && (
                  <p className="text-xs text-indigo-300/70 mt-0.5">{exercise.suggestion.note}</p>
                )}
              </div>
            </div>
          )}

          {/* Last time reference */}
          {lastSets.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-[#555]">Last:</span>
              {lastSets.map((s, i) => (
                <span key={i} className="text-xs bg-[#222] px-2 py-0.5 rounded text-[#666]">
                  {s.r}x{s.w}
                </span>
              ))}
            </div>
          )}

          {/* Set inputs with per-set done tracking */}
          <div className="space-y-2">
            {sets.map((set, i) => (
              <SetInput
                key={i}
                index={i}
                set={set}
                onChange={(s) => updateSet(i, s)}
                onRemove={() => removeSet(i)}
                done={set.done}
                onToggleDone={() => onToggleSetDone(index, i)}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={addSet}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus size={14} /> Add Set
            </button>
            <button
              onClick={() => setShowSwap(!showSwap)}
              className="flex items-center gap-1 text-xs text-[#a0a0a0] hover:text-white transition-colors"
            >
              <ArrowLeftRight size={14} /> Swap
            </button>
            <button
              onClick={() => onRemove(index)}
              className="flex items-center gap-1 text-xs text-[#a0a0a0] hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} /> Remove
            </button>
          </div>

          {/* Session note */}
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-[#555] shrink-0" />
            <input
              type="text"
              placeholder="Add a note..."
              value={exercise.note || ''}
              onChange={(e) => onUpdateNote(index, e.target.value)}
              className="flex-1 bg-transparent border-b border-[#2a2a2a] text-xs text-[#a0a0a0] placeholder-[#444] py-1 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {/* Swap picker */}
          {showSwap && (
            <div className="flex gap-2">
              <select
                value={swapId}
                onChange={(e) => setSwapId(e.target.value)}
                className="flex-1 bg-[#222] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select exercise...</option>
                {allExercises
                  .filter((e) => e.id !== exercise.exerciseId)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.muscle_group})
                    </option>
                  ))}
              </select>
              <button
                onClick={handleSwap}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500 transition-colors"
              >
                Swap
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
