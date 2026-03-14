import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, X } from 'lucide-react'
import { REGION_LABELS, getRegionColor } from '../lib/bodyMapUtils'
import { formatDate } from '../lib/utils'

// SVG muscle region paths (front-view body, viewBox 0 0 160 340)
const REGIONS = {
  shoulders: {
    paths: [
      // Left deltoid — rounded cap from neck to arm
      'M66,50 C58,46 46,50 42,58 C40,64 44,68 48,68 L56,68 L66,62Z',
      // Right deltoid
      'M94,50 C102,46 114,50 118,58 C120,64 116,68 112,68 L104,68 L94,62Z',
    ],
  },
  chest: {
    paths: [
      // Left pec — meets center line cleanly
      'M66,54 L80,54 L80,90 C76,94 66,92 60,86 L56,74 C56,66 60,58 66,54Z',
      // Right pec
      'M94,54 L80,54 L80,90 C84,94 94,92 100,86 L104,74 C104,66 100,58 94,54Z',
    ],
  },
  back: {
    paths: [
      // Left lat — torso side (V-taper)
      'M56,68 L58,66 L58,88 L56,108 L50,112 C48,108 48,80 52,70Z',
      // Right lat
      'M104,68 L102,66 L102,88 L104,108 L110,112 C112,108 112,80 108,70Z',
    ],
  },
  arms: {
    paths: [
      // Left upper arm — from shoulder to elbow
      'M48,68 C44,68 36,70 34,74 L30,96 C28,104 30,110 34,112 L42,112 L46,108 L48,88 L50,72Z',
      // Left forearm
      'M34,116 L44,116 L42,148 L40,162 L34,164 L28,150 L30,130Z',
      // Right upper arm
      'M112,68 C116,68 124,70 126,74 L130,96 C132,104 130,110 126,112 L118,112 L114,108 L112,88 L110,72Z',
      // Right forearm
      'M126,116 L116,116 L118,148 L120,162 L126,164 L132,150 L130,130Z',
    ],
  },
  core: {
    paths: [
      // Abs — slightly tapered at waist
      'M62,92 L98,92 L96,136 L64,136Z',
    ],
  },
  glutes: {
    paths: [
      // Hip / glute region — curved bottom
      'M58,138 L102,138 L106,152 C106,158 96,164 80,164 C64,164 54,158 54,152Z',
    ],
  },
  quads: {
    paths: [
      // Left quad — natural thigh taper
      'M56,166 L76,166 L74,244 C72,250 58,250 56,244Z',
      // Right quad
      'M84,166 L104,166 L104,244 C102,250 88,250 86,244Z',
    ],
  },
  hamstrings: {
    paths: [
      // Inner thigh strip between quads
      'M76,170 L84,170 L83,240 C82,244 78,244 77,240Z',
    ],
  },
  calves: {
    paths: [
      // Left calf — tapered shape
      'M58,256 L74,256 L72,322 C70,328 60,328 58,322Z',
      // Right calf
      'M86,256 L102,256 L102,322 C100,328 90,328 88,322Z',
    ],
  },
}

const TREND_CONFIG = {
  up: { icon: TrendingUp, color: 'text-green-400', label: 'Trending up' },
  down: { icon: TrendingDown, color: 'text-red-400', label: 'Trending down' },
  flat: { icon: Minus, color: 'text-[#a0a0a0]', label: 'Stable' },
}

export default function BodyMap({ scores }) {
  const [selected, setSelected] = useState(null)

  const detail = selected ? scores[selected] : null

  return (
    <div className="relative">
      <svg
        viewBox="0 0 160 340"
        className="w-full max-w-[220px] mx-auto"
        style={{ height: 'auto' }}
      >
        {/* Head */}
        <ellipse cx="80" cy="26" rx="12" ry="14"
          fill="none" stroke="#444" strokeWidth="1.2" />
        {/* Neck */}
        <rect x="75" y="40" width="10" height="8" rx="3"
          fill="none" stroke="#444" strokeWidth="1" />

        {/* Muscle regions */}
        {Object.entries(REGIONS).map(([regionId, { paths }]) => {
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

        {/* Knee gaps (structural lines) */}
        <line x1="58" y1="248" x2="74" y2="248" stroke="#333" strokeWidth="2" />
        <line x1="86" y1="248" x2="102" y2="248" stroke="#333" strokeWidth="2" />

        {/* Feet (structural) */}
        <ellipse cx="67" cy="334" rx="10" ry="4" fill="none" stroke="#444" strokeWidth="0.8" />
        <ellipse cx="93" cy="334" rx="10" ry="4" fill="none" stroke="#444" strokeWidth="0.8" />
      </svg>

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
