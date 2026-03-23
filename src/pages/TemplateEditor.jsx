import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ArrowUp, ArrowDown, X, Plus, Save, Trash2, ChevronDown, ChevronUp, Target } from 'lucide-react'
import { getTemplate, getTemplates, getExercises, updateTemplate, createTemplate, deleteTemplate } from '../lib/api'
import { categoryColors, normalizeTemplateExercise } from '../lib/utils'

export default function TemplateEditor() {
  const { dayId } = useParams()
  const navigate = useNavigate()
  const isNew = dayId === 'new'

  const [templateName, setTemplateName] = useState('')
  // Each entry: { id, targetSets, targetReps, targetWeight, note }
  const [entries, setEntries] = useState([])
  const [allExercises, setAllExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addId, setAddId] = useState('')
  const [nextId, setNextId] = useState(4)
  const [expandedIndex, setExpandedIndex] = useState(-1)

  useEffect(() => {
    async function init() {
      const ex = await getExercises()
      setAllExercises(ex)

      if (isNew) {
        const templates = await getTemplates()
        const maxId = templates.reduce((max, t) => Math.max(max, t.id), 0)
        setNextId(maxId + 1)
        setTemplateName(`Day ${maxId + 1}`)
        setEntries([])
      } else {
        const tpl = await getTemplate(Number(dayId))
        setTemplateName(tpl.name)
        setEntries((tpl.exercises || []).map(normalizeTemplateExercise))
      }
      setLoading(false)
    }
    init()
  }, [dayId, isNew])

  const exMap = Object.fromEntries(allExercises.map((e) => [e.id, e]))

  const moveUp = (i) => {
    if (i === 0) return
    const arr = [...entries]
    ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
    setEntries(arr)
  }

  const moveDown = (i) => {
    if (i === entries.length - 1) return
    const arr = [...entries]
    ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
    setEntries(arr)
  }

  const remove = (i) => {
    setEntries(entries.filter((_, idx) => idx !== i))
    if (expandedIndex === i) setExpandedIndex(-1)
    else if (expandedIndex > i) setExpandedIndex(expandedIndex - 1)
  }

  const handleAdd = () => {
    if (!addId || entries.some((e) => e.id === addId)) return
    setEntries([...entries, { id: addId }])
    setAddId('')
    setShowAdd(false)
  }

  const updateEntry = (i, field, value) => {
    const arr = [...entries]
    arr[i] = { ...arr[i], [field]: value || undefined }
    setEntries(arr)
  }

  const handleSave = async () => {
    if (!templateName.trim()) { alert('Template name is required'); return }
    setSaving(true)
    try {
      // Clean entries: strip empty suggestion fields, collapse to string if no suggestions
      const exercisesData = entries.map((entry) => {
        const hasSuggestion = entry.targetSets || entry.targetReps || entry.targetWeight || entry.note
        if (!hasSuggestion) return entry.id
        const obj = { id: entry.id }
        if (entry.targetSets) obj.targetSets = entry.targetSets
        if (entry.targetReps) obj.targetReps = entry.targetReps
        if (entry.targetWeight) obj.targetWeight = entry.targetWeight
        if (entry.note) obj.note = entry.note
        return obj
      })

      if (isNew) {
        await createTemplate(nextId, templateName.trim(), exercisesData)
      } else {
        await updateTemplate(Number(dayId), exercisesData, templateName.trim())
      }
      navigate('/workout')
    } catch (err) {
      alert('Error saving: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${templateName}"? This cannot be undone.`)) return
    try {
      await deleteTemplate(Number(dayId))
      navigate('/workout')
    } catch (err) {
      alert('Error deleting: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const usedIds = new Set(entries.map((e) => e.id))

  return (
    <div className="px-4 pt-safe pb-nav-safe max-w-lg mx-auto w-full">
      <Link
        to="/workout"
        className="inline-flex items-center gap-1 text-sm text-[#a0a0a0] hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </Link>

      <h1 className="text-xl font-bold mb-1">{isNew ? 'New Template' : 'Edit Template'}</h1>
      <p className="text-sm text-[#a0a0a0] mb-4">
        {isNew ? 'Create a new workout template.' : 'Changes apply to future workouts only.'}
      </p>

      {/* Template name */}
      <div className="mb-5">
        <label className="text-xs text-[#a0a0a0] mb-1 block">Template Name</label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="e.g. Day 4"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Exercise list */}
      <div className="space-y-2 mb-4">
        {entries.map((entry, i) => {
          const ex = exMap[entry.id]
          if (!ex) return null
          const colors = categoryColors[ex.category] || categoryColors['Core']
          const isOpen = expandedIndex === i
          const hasSuggestion = entry.targetSets || entry.targetReps || entry.targetWeight || entry.note

          return (
            <div
              key={entry.id}
              className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden"
            >
              <div className="flex items-center gap-2 p-3">
                <span className="text-xs text-[#555] w-5 text-center font-mono">{i + 1}</span>
                <button
                  onClick={() => setExpandedIndex(isOpen ? -1 : i)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm text-white truncate">{ex.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                      {ex.muscle_group}
                    </span>
                    {hasSuggestion && (
                      <span className="text-xs text-indigo-400/60 flex items-center gap-0.5">
                        <Target size={10} /> programmed
                      </span>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="p-1.5 text-[#a0a0a0] hover:text-white disabled:text-[#333] transition-colors"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => moveDown(i)}
                    disabled={i === entries.length - 1}
                    className="p-1.5 text-[#a0a0a0] hover:text-white disabled:text-[#333] transition-colors"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => remove(i)}
                    className="p-1.5 text-[#a0a0a0] hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Suggestion editor (expanded) */}
              {isOpen && (
                <div className="px-3 pb-3 pt-1 border-t border-[#222] space-y-2">
                  <p className="text-xs text-[#666] flex items-center gap-1">
                    <Target size={12} /> Coaching targets
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-[#555] block mb-1">Sets</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="—"
                        value={entry.targetSets || ''}
                        onChange={(e) => updateEntry(i, 'targetSets', Number(e.target.value) || undefined)}
                        className="w-full bg-[#222] border border-[#2a2a2a] rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#555] block mb-1">Reps</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="—"
                        value={entry.targetReps || ''}
                        onChange={(e) => updateEntry(i, 'targetReps', Number(e.target.value) || undefined)}
                        className="w-full bg-[#222] border border-[#2a2a2a] rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#555] block mb-1">Weight</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="lbs"
                        value={entry.targetWeight || ''}
                        onChange={(e) => updateEntry(i, 'targetWeight', Number(e.target.value) || undefined)}
                        className="w-full bg-[#222] border border-[#2a2a2a] rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#555] block mb-1">Note</label>
                    <input
                      type="text"
                      placeholder="e.g. RIR 2, slow eccentric, pause at bottom..."
                      value={entry.note || ''}
                      onChange={(e) => updateEntry(i, 'note', e.target.value || undefined)}
                      className="w-full bg-[#222] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {entries.length === 0 && (
          <p className="text-sm text-[#555] text-center py-6">No exercises yet. Add some below.</p>
        )}
      </div>

      {/* Add exercise */}
      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors mb-6"
        >
          <Plus size={16} /> Add Exercise
        </button>
      ) : (
        <div className="flex gap-2 mb-6">
          <select
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
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
            onClick={handleAdd}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setShowAdd(false); setAddId('') }}
            className="px-3 py-2 text-[#a0a0a0] hover:text-white text-sm transition-colors"
          >
            &#10005;
          </button>
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-[#222] disabled:text-[#555] text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 mb-3"
      >
        <Save size={18} />
        {saving ? 'Saving...' : isNew ? 'Create Template' : 'Save Template'}
      </button>

      {/* Delete (only for editing existing, not for Day 1-3 originals) */}
      {!isNew && Number(dayId) > 3 && (
        <button
          onClick={handleDelete}
          className="w-full border border-red-500/20 hover:bg-red-500/10 text-red-400 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 size={18} /> Delete Template
        </button>
      )}
    </div>
  )
}
