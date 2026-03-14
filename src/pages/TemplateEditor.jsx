import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ArrowUp, ArrowDown, X, Plus, Save, Trash2 } from 'lucide-react'
import { getTemplate, getTemplates, getExercises, updateTemplate, createTemplate, deleteTemplate } from '../lib/api'
import { categoryColors } from '../lib/utils'

export default function TemplateEditor() {
  const { dayId } = useParams()
  const navigate = useNavigate()
  const isNew = dayId === 'new'

  const [templateName, setTemplateName] = useState('')
  const [exerciseIds, setExerciseIds] = useState([])
  const [allExercises, setAllExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addId, setAddId] = useState('')
  const [nextId, setNextId] = useState(4)

  useEffect(() => {
    async function init() {
      const ex = await getExercises()
      setAllExercises(ex)

      if (isNew) {
        const templates = await getTemplates()
        const maxId = templates.reduce((max, t) => Math.max(max, t.id), 0)
        setNextId(maxId + 1)
        setTemplateName(`Day ${maxId + 1}`)
        setExerciseIds([])
      } else {
        const tpl = await getTemplate(Number(dayId))
        setTemplateName(tpl.name)
        setExerciseIds(tpl.exercises || [])
      }
      setLoading(false)
    }
    init()
  }, [dayId, isNew])

  const exMap = Object.fromEntries(allExercises.map((e) => [e.id, e]))

  const moveUp = (i) => {
    if (i === 0) return
    const arr = [...exerciseIds]
    ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
    setExerciseIds(arr)
  }

  const moveDown = (i) => {
    if (i === exerciseIds.length - 1) return
    const arr = [...exerciseIds]
    ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
    setExerciseIds(arr)
  }

  const remove = (i) => {
    setExerciseIds(exerciseIds.filter((_, idx) => idx !== i))
  }

  const handleAdd = () => {
    if (!addId || exerciseIds.includes(addId)) return
    setExerciseIds([...exerciseIds, addId])
    setAddId('')
    setShowAdd(false)
  }

  const handleSave = async () => {
    if (!templateName.trim()) { alert('Template name is required'); return }
    setSaving(true)
    try {
      if (isNew) {
        await createTemplate(nextId, templateName.trim(), exerciseIds)
      } else {
        await updateTemplate(Number(dayId), exerciseIds, templateName.trim())
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

  const usedIds = new Set(exerciseIds)

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto w-full">
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
        {exerciseIds.map((id, i) => {
          const ex = exMap[id]
          if (!ex) return null
          const colors = categoryColors[ex.category] || categoryColors['Core']

          return (
            <div
              key={id}
              className="flex items-center gap-2 bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]"
            >
              <span className="text-xs text-[#555] w-5 text-center font-mono">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{ex.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                  {ex.muscle_group}
                </span>
              </div>
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
                  disabled={i === exerciseIds.length - 1}
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
          )
        })}

        {exerciseIds.length === 0 && (
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
