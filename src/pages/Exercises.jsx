import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { getExercisesByCategory, getRecentHistory, getTemplates } from '../lib/api'
import ExerciseCard from '../components/ExerciseCard'

const CATEGORIES = ['Upper Body', 'Lower Body', 'Core']

export default function Exercises() {
  const [byCategory, setByCategory] = useState({})
  const [history, setHistory] = useState([])
  const [templateExerciseIds, setTemplateExerciseIds] = useState(new Set())
  const [activeTab, setActiveTab] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getExercisesByCategory(), getRecentHistory(200), getTemplates()])
      .then(([cat, hist, templates]) => {
        setByCategory(cat)
        setHistory(hist)
        const ids = new Set(templates.flatMap((t) => t.exercises || []))
        setTemplateExerciseIds(ids)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Build latest session map
  const latestMap = {}
  for (const h of history) {
    if (!latestMap[h.exercise_id]) latestMap[h.exercise_id] = h
  }

  const tabs = ['All', ...CATEGORIES]
  const categories = activeTab === 'All' ? CATEGORIES : [activeTab]

  const q = searchQuery.toLowerCase().trim()

  return (
    <div className="px-4 pt-safe pb-nav-safe max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-4">Exercises</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
        <input
          type="text"
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Tabs */}
      {!q && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#1a1a1a] text-[#a0a0a0] hover:text-white border border-[#2a2a2a]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Exercise list */}
      {q ? (
        // Search results across all categories
        <div className="space-y-2">
          {CATEGORIES.flatMap((cat) =>
            (byCategory[cat] || []).filter((ex) => ex.name.toLowerCase().includes(q))
          ).map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              latestSession={latestMap[exercise.id]}
              inTemplate={templateExerciseIds.has(exercise.id)}
            />
          ))}
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="mb-6">
            {activeTab === 'All' && (
              <h2 className="text-sm font-semibold text-[#a0a0a0] uppercase tracking-wide mb-2">{cat}</h2>
            )}
            <div className="space-y-2">
              {(byCategory[cat] || []).map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  latestSession={latestMap[exercise.id]}
                  inTemplate={templateExerciseIds.has(exercise.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
