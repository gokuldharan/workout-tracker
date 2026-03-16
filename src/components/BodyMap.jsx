import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, X } from 'lucide-react'
import { REGION_LABELS, FRONT_REGION_IDS, BACK_REGION_IDS, getRegionColor } from '../lib/bodyMapUtils'
import { formatDate } from '../lib/utils'

// ─────────────────────────────────────────────────────────────
// ViewBox: 300 × 620  |  8-head male proportion
// Center: x=150  |  Stacked front + back with labels
// ─────────────────────────────────────────────────────────────

// Gray body silhouette backdrop path
const BODY_SILHOUETTE =
  'M150,10 C168,10 174,22 174,38 C174,54 168,64 158,68' +
  ' L162,72 C164,80 166,86 168,90' +
  ' C178,88 202,88 226,98' +
  ' C242,106 248,120 246,136' +
  ' C244,148 252,156 260,172 C268,190 270,214 266,238' +
  ' C264,248 262,254 260,256' +
  ' C266,274 270,298 270,322 C270,334 266,340 258,342' +
  ' C254,344 250,340 248,336 C246,328 244,316 242,306' +
  ' C240,288 238,268 236,256' +
  ' L234,248 C232,236 236,214 238,198 L242,178' +
  ' C236,164 226,150 218,146' +
  ' C212,166 206,186 202,208 C198,230 196,248 194,262' +
  ' C198,278 200,294 198,310' +
  ' L196,316' +
  ' C202,332 206,358 206,388 C206,418 202,438 196,450' +
  ' L196,460' +
  ' C202,470 208,494 208,518 C208,542 204,562 198,576' +
  ' C194,588 188,594 184,596' +
  ' C178,598 168,602 166,606 L134,606 C132,602 122,598 116,596' +
  ' C112,594 106,588 102,576' +
  ' C96,562 92,542 92,518 C92,494 98,470 104,460' +
  ' L104,450' +
  ' C98,438 94,418 94,388 C94,358 98,332 104,316' +
  ' L102,310' +
  ' C100,294 102,278 106,262' +
  ' C104,248 102,230 98,208 C94,186 88,166 82,146' +
  ' C74,150 64,164 58,178' +
  ' L62,198 C64,214 68,236 66,248 L64,256' +
  ' C62,268 60,288 58,306' +
  ' C56,316 54,328 52,336 C50,340 46,344 42,342' +
  ' C34,340 30,334 30,322 C30,298 34,274 40,256' +
  ' C38,254 36,248 34,238' +
  ' C30,214 32,190 40,172 C48,156 56,148 54,136' +
  ' C52,120 58,106 74,98' +
  ' C98,88 122,88 132,90' +
  ' C134,86 136,80 138,72 L142,68' +
  ' C132,64 126,54 126,38 C126,22 132,10 150,10Z'

// ─── Front-view clickable muscle regions ─────────────────────
const FRONT_REGIONS = {
  shoulders: {
    paths: [
      // Left deltoid — rounded cap from trap to arm
      'M120,96 C110,90 88,90 74,98 C64,106 58,120 60,134 C62,140 66,146 74,148 L84,142 C86,128 96,112 112,102Z',
      // Right deltoid
      'M180,96 C190,90 212,90 226,98 C236,106 242,120 240,134 C238,140 234,146 226,148 L216,142 C214,128 204,112 188,102Z',
    ],
  },
  chest: {
    paths: [
      // Left pec
      'M148,104 C138,100 126,100 116,104 L84,142 C86,152 92,162 102,170 C112,176 132,178 148,174Z',
      // Right pec
      'M152,104 C162,100 174,100 184,104 L216,142 C214,152 208,162 198,170 C188,176 168,178 152,174Z',
    ],
  },
  biceps: {
    paths: [
      // Left bicep
      'M74,148 C66,148 54,156 48,166 L40,202 C38,216 40,232 44,240 L60,242 L64,232 L68,200 L72,168Z',
      // Right bicep
      'M226,148 C234,148 246,156 252,166 L260,202 C262,216 260,232 256,240 L240,242 L236,232 L232,200 L228,168Z',
    ],
  },
  forearms: {
    paths: [
      // Left forearm
      'M44,248 L62,248 C60,268 58,290 54,310 L50,334 L44,338 L32,322 L34,290 L38,264Z',
      // Right forearm
      'M256,248 L238,248 C240,268 242,290 246,310 L250,334 L256,338 L268,322 L266,290 L262,264Z',
    ],
  },
  abs: {
    paths: [
      // Central abs — tapered rectangle
      'M122,176 L178,176 L178,260 C172,264 160,266 150,266 C140,266 128,264 122,260Z',
    ],
  },
  obliques: {
    paths: [
      // Left oblique — side strip
      'M106,176 L122,176 L122,260 C118,262 112,264 108,264 L104,210 C102,196 104,184 106,176Z',
      // Right oblique
      'M194,176 L178,176 L178,260 C182,262 188,264 192,264 L196,210 C198,196 196,184 194,176Z',
    ],
  },
  quads: {
    paths: [
      // Left quad — sweeping shape with teardrop
      'M102,312 L144,312 C146,342 146,374 142,404 C140,422 136,438 130,448 C124,456 112,456 106,448 C100,434 96,404 94,374 C92,348 96,326 102,312Z',
      // Right quad
      'M156,312 L198,312 C204,326 208,348 206,374 C204,404 200,434 194,448 C188,456 176,456 170,448 C164,438 160,422 158,404 C154,374 154,342 156,312Z',
    ],
  },
  calves: {
    paths: [
      // Left calf
      'M104,464 L134,464 C136,480 134,502 130,526 C128,542 122,558 118,568 C114,574 108,574 104,568 C100,556 96,536 94,520 C92,500 94,480 100,468Z',
      // Right calf
      'M166,464 L196,464 C202,468 206,480 208,500 C210,520 206,542 200,556 C196,568 190,574 186,574 C182,574 176,568 172,558 C168,542 164,502 164,480Z',
    ],
  },
}

// ─── Back-view clickable muscle regions ──────────────────────
const BACK_REGIONS = {
  traps: {
    paths: [
      // Trapezius — diamond from neck to mid-scapula
      'M150,82 L120,96 C114,108 110,122 108,138 L112,160 L150,168 L188,160 L192,138 C190,122 186,108 180,96Z',
    ],
  },
  lats: {
    paths: [
      // Left lat — wing shape
      'M112,142 L108,138 C100,140 88,150 80,164 L72,192 C70,214 72,236 78,252 L92,256 L100,240 L106,200 L110,168Z',
      // Left inner lat
      'M112,160 L148,168 L148,244 L112,244 C108,228 106,208 108,188Z',
      // Right lat
      'M188,142 L192,138 C200,140 212,150 220,164 L228,192 C230,214 228,236 222,252 L208,256 L200,240 L194,200 L190,168Z',
      // Right inner lat
      'M188,160 L152,168 L152,244 L188,244 C192,228 194,208 192,188Z',
    ],
  },
  lower_back: {
    paths: [
      // Erector spinae / lumbar
      'M118,246 L182,246 L186,262 C180,272 166,278 150,278 C134,278 120,272 114,262Z',
    ],
  },
  triceps: {
    paths: [
      // Left tricep
      'M74,148 C66,148 54,156 48,166 L40,202 C38,216 40,232 44,240 L60,242 L64,232 L68,200 L72,168Z',
      // Left forearm
      'M44,248 L62,248 C60,268 58,290 54,310 L50,334 L44,338 L32,322 L34,290 L38,264Z',
      // Right tricep
      'M226,148 C234,148 246,156 252,166 L260,202 C262,216 260,232 256,240 L240,242 L236,232 L232,200 L228,168Z',
      // Right forearm
      'M256,248 L238,248 C240,268 242,290 246,310 L250,334 L256,338 L268,322 L266,290 L262,264Z',
    ],
  },
  glutes: {
    paths: [
      // Left glute
      'M114,272 C120,280 134,286 150,286 L150,318 C130,322 110,314 104,298 C100,286 104,274 114,272Z',
      // Right glute
      'M186,272 C180,280 166,286 150,286 L150,318 C170,322 190,314 196,298 C200,286 196,274 186,272Z',
    ],
  },
  hamstrings: {
    paths: [
      // Left hamstring
      'M100,320 L148,320 L146,434 C144,452 120,458 110,450 C100,440 94,410 92,380 C90,354 94,332 100,320Z',
      // Right hamstring
      'M152,320 L200,320 C206,332 210,354 208,380 C206,410 200,440 190,450 C180,458 156,452 154,434Z',
    ],
  },
  calves: {
    paths: [
      // Left calf
      'M104,464 L134,464 C136,480 134,502 130,526 C128,542 122,558 118,568 C114,574 108,574 104,568 C100,556 96,536 94,520 C92,500 94,480 100,468Z',
      // Right calf
      'M166,464 L196,464 C202,468 206,480 208,500 C210,520 206,542 200,556 C196,568 190,574 186,574 C182,574 176,568 172,558 C168,542 164,502 164,480Z',
    ],
  },
}

// ─── Front anatomical detail lines ───────────────────────────
const FRONT_DETAILS = [
  // Clavicle
  'M150,98 C140,94 126,96 116,102',
  'M150,98 C160,94 174,96 184,102',
  // Sternal line
  'M150,106 L150,174',
  // Pec folds
  'M102,170 C112,176 132,178 148,174',
  'M198,170 C188,176 168,178 152,174',
  // Pec-delt separation
  'M84,142 C90,136 100,128 116,104',
  'M216,142 C210,136 200,128 184,104',
  // Ab segments (6-pack)
  'M128,192 L172,192',
  'M126,212 L174,212',
  'M124,232 L176,232',
  'M124,250 L176,250',
  // Linea alba
  'M150,176 L150,266',
  // Oblique diagonal lines
  'M106,180 C104,200 102,230 108,264',
  'M194,180 C196,200 198,230 192,264',
  // Serratus hints (front)
  'M108,166 L116,160',
  'M106,176 L114,170',
  'M192,166 L184,160',
  'M194,176 L186,170',
  // Quad separation lines
  'M122,316 C122,350 122,400 120,444',
  'M178,316 C178,350 178,400 180,444',
  // Vastus medialis teardrop
  'M132,424 C130,438 126,450 120,454',
  'M168,424 C170,438 174,450 180,454',
  // Kneecap
  'M110,454 C110,460 118,464 126,464 C132,464 136,460 136,454',
  'M164,454 C164,460 168,464 174,464 C180,464 190,460 190,454',
  // Shin lines
  'M114,472 C112,500 110,530 112,560',
  'M186,472 C188,500 190,530 188,560',
  // Bicep separation
  'M60,162 C62,182 62,202 60,230',
  'M240,162 C238,182 238,202 240,230',
]

// ─── Back anatomical detail lines ────────────────────────────
const BACK_DETAILS = [
  // Scapula outlines
  'M130,112 L112,130 L116,162 L142,166 L146,136Z',
  'M170,112 L188,130 L184,162 L158,166 L154,136Z',
  // Trap upper border
  'M132,92 L150,82 L168,92',
  // Spine (drawn separately with dash)
  // Lat inner edges
  'M148,168 L148,244',
  'M152,168 L152,244',
  // Lat outer insertions
  'M110,168 C106,190 104,218 108,246',
  'M190,168 C194,190 196,218 192,246',
  // Erector spinae lines
  'M140,248 C138,258 138,268 140,278',
  'M160,248 C162,258 162,268 160,278',
  // Glute medius
  'M108,274 C112,286 120,296 134,300',
  'M192,274 C188,286 180,296 166,300',
  // Gluteal fold
  'M108,316 C120,322 140,324 150,322',
  'M192,316 C180,322 160,324 150,322',
  // Hamstring separation
  'M128,326 C128,366 126,406 124,444',
  'M172,326 C172,366 174,406 176,444',
  // Calf heads
  'M118,472 C116,492 116,514 118,542',
  'M182,472 C184,492 184,514 182,542',
  // Tricep horseshoe
  'M52,170 C54,190 56,212 56,234',
  'M248,170 C246,190 244,212 244,234',
  // Arm inner
  'M42,248 L60,248',
  'M258,248 L240,248',
]

const TREND_CONFIG = {
  up: { icon: TrendingUp, color: 'text-green-400', label: 'Up' },
  down: { icon: TrendingDown, color: 'text-red-400', label: 'Down' },
  flat: { icon: Minus, color: 'text-[#a0a0a0]', label: 'Stable' },
}

// ─── Single body figure component ────────────────────────────
function BodyFigure({ regions, details, scores, selected, onSelect, view }) {
  return (
    <svg viewBox="0 0 300 620" className="w-full" style={{ height: 'auto' }}>
      {/* Layer 0: Body silhouette backdrop */}
      <path d={BODY_SILHOUETTE} fill="#1f1f1f" stroke="none" />

      {/* Layer 1: Clickable muscle fill regions */}
      <g>
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
              stroke={isSelected ? '#fff' : 'transparent'}
              strokeWidth={isSelected ? '2' : '0'}
              strokeLinejoin="round"
              className="cursor-pointer"
              style={{ transition: 'fill-opacity 0.3s, stroke 0.2s' }}
              onClick={() => onSelect(selected === regionId ? null : regionId)}
            />
          ))
        })}
      </g>

      {/* Layer 2: Body outline */}
      <path
        d={BODY_SILHOUETTE}
        fill="none"
        stroke="#444"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        pointerEvents="none"
      />

      {/* Layer 3: Anatomical detail lines */}
      <g pointerEvents="none">
        {view === 'back' && (
          <line x1="150" y1="86" x2="150" y2="278"
            stroke="#333" strokeWidth="0.8" strokeDasharray="4,3" />
        )}
        {details.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#333" strokeWidth="0.5"
            strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>

      {/* Layer 4: Structure (head, ears, hands, feet) */}
      <g pointerEvents="none">
        <ellipse cx="150" cy="36" rx="22" ry="28" fill="#1f1f1f" stroke="#444" strokeWidth="1.2" />
        <ellipse cx="126" cy="38" rx="3" ry="6" fill="none" stroke="#3a3a3a" strokeWidth="0.5" />
        <ellipse cx="174" cy="38" rx="3" ry="6" fill="none" stroke="#3a3a3a" strokeWidth="0.5" />
        {/* Neck tendons */}
        <path d="M142,62 C144,72 146,80 148,88" fill="none" stroke="#333" strokeWidth="0.4" />
        <path d="M158,62 C156,72 154,80 152,88" fill="none" stroke="#333" strokeWidth="0.4" />
        {/* Knee lines */}
        <line x1="102" y1="458" x2="138" y2="458" stroke="#333" strokeWidth="1.2" />
        <line x1="162" y1="458" x2="198" y2="458" stroke="#333" strokeWidth="1.2" />
        {/* Feet */}
        <ellipse cx="120" cy="610" rx="16" ry="5" fill="none" stroke="#3a3a3a" strokeWidth="0.6" />
        <ellipse cx="180" cy="610" rx="16" ry="5" fill="none" stroke="#3a3a3a" strokeWidth="0.6" />
        {/* Hands */}
        <ellipse cx="47" cy="340" rx="7" ry="10" fill="none" stroke="#3a3a3a" strokeWidth="0.5"
          transform="rotate(-8 47 340)" />
        <ellipse cx="253" cy="340" rx="7" ry="10" fill="none" stroke="#3a3a3a" strokeWidth="0.5"
          transform="rotate(8 253 340)" />
      </g>

      {/* Inline muscle group labels */}
      <g pointerEvents="none" fontSize="8" fontWeight="500" fill="#666" textAnchor="middle">
        {view === 'front' ? (
          <>
            <text x="150" y="148" fontSize="7">CHEST</text>
            <text x="62" y="118" fontSize="6" textAnchor="end">DELTS</text>
            <text x="238" y="118" fontSize="6" textAnchor="start">DELTS</text>
            <text x="52" y="198" fontSize="6" textAnchor="end">BICEP</text>
            <text x="248" y="198" fontSize="6" textAnchor="start">BICEP</text>
            <text x="150" y="224" fontSize="7">ABS</text>
            <text x="102" y="224" fontSize="6">OBL</text>
            <text x="198" y="224" fontSize="6">OBL</text>
            <text x="120" y="382" fontSize="7">QUADS</text>
            <text x="180" y="382" fontSize="7">QUADS</text>
            <text x="118" y="520" fontSize="6">CALF</text>
            <text x="182" y="520" fontSize="6">CALF</text>
          </>
        ) : (
          <>
            <text x="150" y="128" fontSize="7">TRAPS</text>
            <text x="74" y="200" fontSize="6" textAnchor="end">LAT</text>
            <text x="226" y="200" fontSize="6" textAnchor="start">LAT</text>
            <text x="150" y="206" fontSize="7">LATS</text>
            <text x="150" y="268" fontSize="6">LOW BACK</text>
            <text x="52" y="198" fontSize="6" textAnchor="end">TRI</text>
            <text x="248" y="198" fontSize="6" textAnchor="start">TRI</text>
            <text x="150" y="302" fontSize="7">GLUTES</text>
            <text x="124" y="386" fontSize="7">HAMS</text>
            <text x="176" y="386" fontSize="7">HAMS</text>
            <text x="118" y="520" fontSize="6">CALF</text>
            <text x="182" y="520" fontSize="6">CALF</text>
          </>
        )}
      </g>
    </svg>
  )
}

// ─── Main BodyMap component ──────────────────────────────────
export default function BodyMap({ scores }) {
  const [selected, setSelected] = useState(null)
  const detail = selected ? scores[selected] : null

  return (
    <div className="relative">
      {/* Front view */}
      <div className="mb-1">
        <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold text-center mb-1">
          Front
        </p>
        <BodyFigure
          regions={FRONT_REGIONS}
          details={FRONT_DETAILS}
          scores={scores}
          selected={selected}
          onSelect={setSelected}
          view="front"
        />
      </div>

      {/* Back view */}
      <div className="mt-2">
        <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold text-center mb-1">
          Back
        </p>
        <BodyFigure
          regions={BACK_REGIONS}
          details={BACK_DETAILS}
          scores={scores}
          selected={selected}
          onSelect={setSelected}
          view="back"
        />
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 mt-3 text-[10px] text-[#a0a0a0]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#22c55e', opacity: 0.6 }} />
          Today
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#22c55e', opacity: 0.35 }} />
          2-3 days
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#22c55e', opacity: 0.2 }} />
          4-5 days
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#555', opacity: 0.2 }} />
          7+ days
        </span>
      </div>

      {/* Detail panel */}
      {detail && selected && (
        <div className="mt-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-base">
              {REGION_LABELS[selected] || selected}
            </h3>
            <button onClick={() => setSelected(null)} className="text-[#a0a0a0] hover:text-white p-1 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Score + Trend */}
          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-2xl font-bold text-white">
                {detail.score}
                <span className="text-sm font-normal text-[#a0a0a0] ml-1">lbs</span>
              </p>
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
              {detail.exercises.map((ex, i) => (
                <div key={`${ex.name}-${i}`} className="flex items-center justify-between text-sm">
                  <span className="text-[#ccc] truncate mr-2">{ex.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white font-medium">{ex.e1rm}</span>
                    <span className="text-[10px] text-[#666] w-8 text-right">
                      ×{ex.isolationWeight.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
              {detail.exercises.some(ex => ex.name.endsWith('²')) && (
                <p className="text-[10px] text-[#555] mt-1">² = secondary muscle contribution</p>
              )}
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
