import { Trash2 } from 'lucide-react'

export default function SetInput({ index, set, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#a0a0a0] w-6 text-center">{index + 1}</span>
      <input
        type="number"
        placeholder="Reps"
        value={set.r || ''}
        onChange={(e) => onChange({ ...set, r: Number(e.target.value) })}
        className="flex-1 bg-[#222] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500"
      />
      <input
        type="number"
        placeholder="Weight (lbs)"
        value={set.w || ''}
        onChange={(e) => onChange({ ...set, w: Number(e.target.value) })}
        className="flex-1 bg-[#222] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500"
      />
      <button onClick={onRemove} className="text-[#a0a0a0] hover:text-red-400 transition-colors p-1">
        <Trash2 size={16} />
      </button>
    </div>
  )
}
