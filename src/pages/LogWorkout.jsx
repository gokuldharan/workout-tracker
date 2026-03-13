import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Check } from 'lucide-react'
import { getExercises, addSession, addExercise } from '../lib/api'
import { today, toKebab } from '../lib/utils'
import SetInput from '../components/SetInput'

export default function LogWorkout() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(searchParams.get('exercise') || '')
  const [date, setDate] = useState(today())
  const [day, setDay] = useState('')
  const [sets, setSets] = useState([{ r: 10, w: 0 }, { r: 10, w: 0 }, { r: 10, w: 0 }])
  const [saving, setSaving] = useState(false)
  const [showNewExercise, setShowNewExercise] = useState(false)
  const [newEx, setNewEx] = useState({ name: '', category: 'Upper Body', muscleGroup: '' })

  useEffect(() => {
    getExercises().then(setExercises)
  }, [])

  const updateSet = (index, updated) => {
    setSets((prev) => prev.map((s, i) => (i === index ? updated : s)))
  }

  const removeSet = (index) => {
    setSets((prev) => prev.filter((_, i) => i !== index))
  }

  const addSet = () => {
    const last = sets[sets.length - 1] || { r: 10, w: 0 }
    setSets((prev) => [...prev, { ...last }])
  }

  const handleSave = async () => {
    if (!selectedExercise || sets.length === 0) return
    setSaving(true)
    try {
      await addSession(selectedExercise, date, day || null, sets)
      navigate(`/exercises/${selectedExercise}`)
    } catch (err) {
      alert('Error saving: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddExercise = async () => {
    if (!newEx.name || !newEx.muscleGroup) return
    const id = toKebab(newEx.name)
    try {
      await addExercise(id, newEx.name, newEx.category, newEx.muscleGroup)
      const updated = await getExercises()
      setExercises(updated)
      setSelectedExercise(id)
      setShowNewExercise(false)
      setNewEx({ name: '', category: 'Upper Body', muscleGroup: '' })
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-5">Log Workout</h1>

      {/* Exercise Picker */}
      <label className="block text-sm text-[#a0a0a0] mb-1">Exercise</label>
      <select
        value={selectedExercise}
        onChange={(e) => setSelectedExercise(e.target.value)}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white mb-1 focus:outline-none focus:border-indigo-500"
      >
        <option value="">Select exercise...</option>
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscle_group})</option>
        ))}
      </select>
      <button
        onClick={() => setShowNewExercise(!showNewExercise)}
        className="text-xs text-indigo-400 hover:text-indigo-300 mb-4"
      >
        + Add new exercise
      </button>

      {/* New Exercise Form */}
      {showNewExercise && (
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] mb-4 space-y-3">
          <input
            type="text"
            placeholder="Exercise name"
            value={newEx.name}
            onChange={(e) => setNewEx({ ...newEx, name: e.target.value })}
            className="w-full bg-[#222] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500"
          />
          <select
            value={newEx.category}
            onChange={(e) => setNewEx({ ...newEx, category: e.target.value })}
            className="w-full bg-[#222] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option>Upper Body</option>
            <option>Lower Body</option>
            <option>Core</option>
          </select>
          <input
            type="text"
            placeholder="Muscle group (e.g., Chest, Back)"
            value={newEx.muscleGroup}
            onChange={(e) => setNewEx({ ...newEx, muscleGroup: e.target.value })}
            className="w-full bg-[#222] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleAddExercise}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Add Exercise
          </button>
        </div>
      )}

      {/* Date & Day */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-sm text-[#a0a0a0] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-[#a0a0a0] mb-1">Day label (optional)</label>
          <input
            type="text"
            placeholder="e.g., Day 1"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Sets */}
      <label className="block text-sm text-[#a0a0a0] mb-2">Sets</label>
      <div className="space-y-2 mb-3">
        {sets.map((set, i) => (
          <SetInput key={i} index={i} set={set} onChange={(s) => updateSet(i, s)} onRemove={() => removeSet(i)} />
        ))}
      </div>

      <button
        onClick={addSet}
        className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 mb-6 transition-colors"
      >
        <Plus size={16} /> Add Set
      </button>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || !selectedExercise || sets.length === 0}
        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-[#222] disabled:text-[#555] text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
      >
        <Check size={18} />
        {saving ? 'Saving...' : 'Save Workout'}
      </button>
    </div>
  )
}
