import { useState, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus, X, RotateCcw } from 'lucide-react'
import { REGION_LABELS, getRegionColor } from '../lib/bodyMapUtils'
import { formatDate } from '../lib/utils'

// ─── Front-view SVG paths (viewBox 0 0 200 420) ──────────────
const FRONT_REGIONS = {
  shoulders: {
    paths: [
      // Left front delt — rounded cap
      'M82,68 C74,63 60,66 55,76 C53,82 56,88 62,88 L70,86 L82,78Z',
      // Right front delt
      'M118,68 C126,63 140,66 145,76 C147,82 144,88 138,88 L130,86 L118,78Z',
    ],
  },
  chest: {
    paths: [
      // Left pec — full shape with rounded underline
      'M82,72 L100,72 L100,112 C96,118 84,116 76,108 L70,94 C70,84 74,74 82,72Z',
      // Right pec
      'M118,72 L100,72 L100,112 C104,118 116,116 124,108 L130,94 C130,84 126,74 118,72Z',
    ],
  },
  arms: {
    paths: [
      // Left bicep
      'M62,88 C56,88 46,92 43,98 L38,124 C36,132 38,140 43,142 L52,142 L56,136 L60,112 L62,92Z',
      // Left forearm
      'M43,148 L54,148 L52,186 L50,202 L43,204 L35,188 L38,164Z',
      // Right bicep
      'M138,88 C144,88 154,92 157,98 L162,124 C164,132 162,140 157,142 L148,142 L144,136 L140,112 L138,92Z',
      // Right forearm
      'M157,148 L146,148 L148,186 L150,202 L157,204 L165,188 L162,164Z',
    ],
  },
  core: {
    paths: [
      // Abs — segmented look via single shape
      'M78,114 L122,114 L120,172 L80,172Z',
    ],
  },
  quads: {
    paths: [
      // Left quad
      'M72,210 L96,210 L94,306 C92,314 74,314 72,306Z',
      // Right quad
      'M104,210 L128,210 L128,306 C126,314 108,314 106,306Z',
    ],
  },
  hamstrings: {
    paths: [
      // Inner thigh strip
      'M96,216 L104,216 L103,300 C102,306 98,306 97,300Z',
    ],
  },
  calves: {
    paths: [
      // Left calf
      'M74,320 L94,320 L92,400 C90,408 76,408 74,400Z',
      // Right calf
      'M106,320 L126,320 L126,400 C124,408 110,408 108,400Z',
    ],
  },
  glutes: {
    paths: [
      // Hip flexor area visible from front
      'M74,174 L126,174 L130,194 C130,202 120,210 100,210 C80,210 70,202 70,194Z',
    ],
  },
}

// ─── Back-view SVG paths (viewBox 0 0 200 420) ───────────────
const BACK_REGIONS = {
  shoulders: {
    paths: [
      // Left rear delt
      'M82,68 C74,63 60,66 55,76 C53,82 56,88 62,88 L70,86 L82,78Z',
      // Right rear delt
      'M118,68 C126,63 140,66 145,76 C147,82 144,88 138,88 L130,86 L118,78Z',
    ],
  },
  back: {
    paths: [
      // Left lat — wide V-taper
      'M82,72 L100,72 L100,116 L84,116 L72,108 C68,96 70,82 82,72Z',
      // Right lat
      'M118,72 L100,72 L100,116 L116,116 L128,108 C132,96 130,82 118,72Z',
      // Left outer lat
      'M70,88 L72,86 L72,112 L70,138 L62,142 C60,136 60,100 66,90Z',
      // Right outer lat
      'M130,88 L128,86 L128,112 L130,138 L138,142 C140,136 140,100 134,90Z',
    ],
  },
  arms: {
    paths: [
      // Left tricep
      'M62,88 C56,88 46,92 43,98 L38,124 C36,132 38,140 43,142 L52,142 L56,136 L60,112 L62,92Z',
      // Left forearm
      'M43,148 L54,148 L52,186 L50,202 L43,204 L35,188 L38,164Z',
      // Right tricep
      'M138,88 C144,88 154,92 157,98 L162,124 C164,132 162,140 157,142 L148,142 L144,136 L140,112 L138,92Z',
      // Right forearm
      'M157,148 L146,148 L148,186 L150,202 L157,204 L165,188 L162,164Z',
    ],
  },
  core: {
    paths: [
      // Lower back / erectors
      'M84,118 L116,118 L118,170 L82,170Z',
    ],
  },
  glutes: {
    paths: [
      // Left glute — full round shape
      'M74,174 L100,174 L100,210 C92,218 74,216 70,206 L70,194Z',
      // Right glute
      'M100,174 L126,174 L130,194 L130,206 C126,216 108,218 100,210Z',
    ],
  },
  hamstrings: {
    paths: [
      // Left hamstring — full posterior thigh
      'M72,212 L98,212 L96,306 C94,314 74,314 72,306Z',
      // Right hamstring
      'M102,212 L128,212 L128,306 C126,314 108,314 106,306Z',
    ],
  },
  calves: {
    paths: [
      // Left calf
      'M74,320 L94,320 L92,400 C90,408 76,408 74,400Z',
      // Right calf
      'M106,320 L126,320 L126,400 C124,408 110,408 108,400Z',
    ],
  },
}

const TREND_CONFIG = {
  up: { icon: TrendingUp, color: 'text-green-400', label: 'Trending up' },
  down: { icon: TrendingDown, color: 'text-red-400', label: 'Trending down' },
  flat: { icon: Minus, color: 'text-[#a0a0a0]', label: 'Stable' },
}

// Structural elements (head, neck, knees, feet)
function BodyStructure({ flipped }) {
  return (
    <>
      {/* Head */}
      <ellipse cx="100" cy="32" rx="16" ry="18"
        fill="none" stroke="#444" strokeWidth="1.2" />
      {/* Neck */}
      <rect x="93" y="50" width="14" height="10" rx="4"
        fill="none" stroke="#444" strokeWidth="1" />
      {/* Spine line on back view */}
      {flipped && (
        <line x1="100" y1="72" x2="100" y2="170"
          stroke="#333" strokeWidth="0.6" strokeDasharray="3,3" />
      )}
      {/* Knee gaps */}
      <line x1="74" y1="310" x2="94" y2="310" stroke="#333" strokeWidth="2" />
      <line x1="106" y1="310" x2="126" y2="310" stroke="#333" strokeWidth="2" />
      {/* Feet */}
      <ellipse cx="84" cy="414" rx="12" ry="5" fill="none" stroke="#444" strokeWidth="0.8" />
      <ellipse cx="116" cy="414" rx="12" ry="5" fill="none" stroke="#444" strokeWidth="0.8" />
    </>
  )
}

export default function BodyMap({ scores }) {
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('front') // 'front' | 'back'
  const [isAnimating, setIsAnimating] = useState(false)
  const touchStartX = useRef(null)

  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS
  const detail = selected ? scores[selected] : null

  const toggleView = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setView((v) => (v === 'front' ? 'back' : 'front'))
      setIsAnimating(false)
    }, 150)
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) {
      toggleView()
    }
    touchStartX.current = null
  }

  return (
    <div className="relative">
      {/* View toggle + label */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-[#666] uppercase tracking-wider">
          {view === 'front' ? 'Front' : 'Back'}
        </p>
        <button
          onClick={toggleView}
          className="flex items-center gap-1.5 text-xs text-[#a0a0a0] hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-[#222]"
        >
          <RotateCcw size={12} />
          Rotate
        </button>
      </div>

      {/* SVG body */}
      <div
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isAnimating ? 'scaleX(0)' : 'scaleX(1)',
          transition: 'transform 150ms ease-in-out',
        }}
      >
        <svg
          viewBox="0 0 200 420"
          className="w-full max-w-[240px] mx-auto"
          style={{ height: 'auto' }}
        >
          <BodyStructure flipped={view === 'back'} />

          {/* Muscle regions */}
          {Object.entries(regions).map(([regionId, { paths }]) => {
            const data = scores[regionId]
            const { fill, opacity } = getRegionColor(data?.daysSince ?? null)
            const isSelected = selected === regionId

            return paths.map((d, i) => (
              <path
                key={`${regionId}-${i}`}
                d={d}
                fill={fill}
                fillOpacity={opacity}
                stroke={isSelected ? '#fff' : '#555'}
                strokeWidth={isSelected ? '1.5' : '0.8'}
                strokeLinejoin="round"
                className="cursor-pointer transition-all duration-200"
                onClick={() => setSelected(selected === regionId ? null : regionId)}
              />
            ))
          })}
        </svg>

        {/* Swipe hint dots */}
        <div className="flex justify-center gap-1.5 mt-1">
          <span className={`w-1.5 h-1.5 rounded-full transition-colors ${view === 'front' ? 'bg-white' : 'bg-[#444]'}`} />
          <span className={`w-1.5 h-1.5 rounded-full transition-colors ${view === 'back' ? 'bg-white' : 'bg-[#444]'}`} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 mt-2 text-[10px] text-[#a0a0a0]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#22c55e', opacity: 0.6 }} />
          Recent
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#22c55e', opacity: 0.25 }} />
          3-5 days
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#555', opacity: 0.2 }} />
          7+ days
        </span>
      </div>

      {/* Detail panel */}
      {detail && selected && (
        <div className="mt-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-base">
              {REGION_LABELS[selected]}
            </h3>
            <button onClick={() => setSelected(null)} className="text-[#a0a0a0] p-1">
              <X size={16} />
            </button>
          </div>

          {/* Score + Trend */}
          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-2xl font-bold text-white">{detail.score}<span className="text-sm font-normal text-[#a0a0a0] ml-1">lbs</span></p>
              <p className="text-xs text-[#a0a0a0]">Weighted e1RM</p>
            </div>
            <div className="flex items-center gap-1.5">
              {(() => {
                const { icon: Icon, color, label } = TREND_CONFIG[detail.trend]
                return (
                  <>
                    <Icon size={18} className={color} />
                    <span className={`text-sm font-medium ${color}`}>{label}</span>
                  </>
                )
              })()}
            </div>
          </div>

          {/* Last trained */}
          {detail.lastTrained && (
            <p className="text-xs text-[#a0a0a0] mb-3">
              Last trained: {detail.daysSince === 0 ? 'Today' :
                detail.daysSince === 1 ? 'Yesterday' :
                `${formatDate(detail.lastTrained)} (${detail.daysSince}d ago)`}
            </p>
          )}

          {/* Exercise breakdown */}
          {detail.exercises.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[#a0a0a0] uppercase tracking-wide">Exercises</p>
              {detail.exercises.map((ex) => (
                <div key={ex.name} className="flex items-center justify-between text-sm">
                  <span className="text-[#ccc] truncate mr-2">{ex.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white font-medium">{ex.e1rm}</span>
                    <span className="text-[10px] text-[#666] w-8 text-right">
                      ×{ex.isolationWeight.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!detail.exercises.length && (
            <p className="text-sm text-[#666]">No data yet</p>
          )}
        </div>
      )}
    </div>
  )
}
