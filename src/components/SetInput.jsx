import { Trash2, Circle, CheckCircle2 } from 'lucide-react'

export default function SetInput({ index, set, onChange, onRemove, done, onToggleDone }) {
  const hasDoneTracking = typeof done !== 'undefined'

  return (
    <div className={`flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors ${
      hasDoneTracking && done ? 'bg-green-500/5' : ''
    }`}>
      {hasDoneTracking && (
        <button onClick={onToggleDone} className="shrink-0 transition-colors">
          {done ? (
            <CheckCircle2 size={20} className="text-green-400" />
          ) : (
            <Circle size={20} className="text-[#333] hover:text-[#555]" />
          )}
        </button>
      )}
      <span className={`text-xs w-5 text-center ${hasDoneTracking && done ? 'text-green-400/50' : 'text-[#a0a0a0]'}`}>{index + 1}</span>
      <input
        type="number"
        placeholder="Reps"
        value={set.r || ''}
        onChange={(e) => onChange({ ...set, r: Number(e.target.value) })}
        className={`flex-1 bg-[#222] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm placeholder-[#555] focus:outline-none focus:border-indigo-500 ${
          hasDoneTracking && done ? 'text-green-400/60' : 'text-white'
        }`}
      />
      <input
        type="number"
        placeholder="Weight"
        value={set.w || ''}
        onChange={(e) => onChange({ ...set, w: Number(e.target.value) })}
        className={`flex-1 bg-[#222] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm placeholder-[#555] focus:outline-none focus:border-indigo-500 ${
          hasDoneTracking && done ? 'text-green-400/60' : 'text-white'
        }`}
      />
      <button onClick={onRemove} className="text-[#a0a0a0] hover:text-red-400 transition-colors p-1 shrink-0">
        <Trash2 size={16} />
      </button>
    </div>
  )
}
