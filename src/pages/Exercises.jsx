import { useState, useEffect } from 'react'
import { getExercisesByCategory, getRecentHistory } from '../lib/api'
import ExerciseCard from '../components/ExerciseCard'

const CATEGORIES = ['Upper Body', 'Lower Body', 'Core']

export default function Exercises() {
  const [byCategory, setByCategory] = useState({})
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getExercisesByCategory(), getRecentHistory(200)])
      .then(([cat, hist]) => { setByCategory(cat); setHistory(hist) })
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

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-4">Exercises</h1>

      {/* Tabs */}
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

      {/* Exercise list */}
      {categories.map((cat) => (
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
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
