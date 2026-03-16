import { useState, useRef, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus, X, RotateCcw } from 'lucide-react'
import { REGION_LABELS, getRegionColor } from '../lib/bodyMapUtils'
import { formatDate } from '../lib/utils'

// ─────────────────────────────────────────────────────────────
// ViewBox: 300 × 660  |  8-head male proportion
// Center: x=150  |  Shoulders: ~60-240  |  Waist: ~100-200
// ─────────────────────────────────────────────────────────────

// ─── Front-view clickable regions ────────────────────────────
const FRONT_REGIONS = {
  shoulders: {
    paths: [
      // Left front deltoid — rounded cap from trap to arm
      'M122,98 C112,92 90,90 72,98 C62,104 56,118 58,132 C59,138 64,144 72,146 L82,140 C86,128 96,114 112,104Z',
      // Right front deltoid
      'M178,98 C188,92 210,90 228,98 C238,104 244,118 242,132 C241,138 236,144 228,146 L218,140 C214,128 204,114 188,104Z',
    ],
  },
  chest: {
    paths: [
      // Left pec — from sternum, over to delt boundary, curved fold at bottom
      'M150,106 C140,102 128,100 118,104 L82,140 C82,148 88,160 98,168 C108,174 130,176 146,172 L150,170Z',
      // Right pec
      'M150,106 C160,102 172,100 182,104 L218,140 C218,148 212,160 202,168 C192,174 170,176 154,172 L150,170Z',
    ],
  },
  arms: {
    paths: [
      // Left upper arm (bicep) — from delt insertion to elbow
      'M72,146 C64,146 52,152 46,162 L36,200 C32,216 34,234 40,244 L56,246 L62,236 L66,200 L70,168 L72,150Z',
      // Left forearm — elbow to wrist
      'M40,252 L58,252 C58,268 56,290 52,310 L48,336 L42,340 L30,324 L32,290 L36,264Z',
      // Right upper arm
      'M228,146 C236,146 248,152 254,162 L264,200 C268,216 266,234 260,244 L244,246 L238,236 L234,200 L230,168 L228,150Z',
      // Right forearm
      'M260,252 L242,252 C242,268 244,290 248,310 L252,336 L258,340 L270,324 L268,290 L264,264Z',
    ],
  },
  core: {
    paths: [
      // Abdominals — tapered shape following oblique line
      'M108,172 L192,172 L196,204 L194,248 C188,258 170,264 150,264 C130,264 112,258 106,248 L104,204Z',
    ],
  },
  glutes: {
    paths: [
      // Hip flexor / iliac region (front view)
      'M106,258 C112,268 130,274 150,274 C170,274 188,268 194,258 L200,280 C200,296 182,310 150,310 C118,310 100,296 100,280Z',
    ],
  },
  quads: {
    paths: [
      // Left quad — sweeping vastus lateralis, teardrop at knee
      'M100,312 L140,312 C142,340 142,370 140,400 C138,420 134,436 130,444 C124,454 112,454 106,444 C100,432 96,400 94,370 C92,346 94,324 100,312Z',
      // Right quad
      'M160,312 L200,312 C206,324 208,346 206,370 C204,400 200,432 194,444 C188,454 176,454 170,444 C166,436 162,420 160,400 C158,370 158,340 160,312Z',
    ],
  },
  hamstrings: {
    paths: [
      // Inner thigh visible from front
      'M140,318 L160,318 L158,430 C156,442 144,442 142,430Z',
    ],
  },
  calves: {
    paths: [
      // Left calf — diamond shape with gastrocnemius bulge
      'M104,462 L134,462 C136,478 134,500 130,524 C128,542 122,558 118,568 C114,576 108,576 104,568 C100,556 96,536 94,518 C92,498 94,478 98,466Z',
      // Right calf
      'M166,462 L196,462 C202,466 204,478 206,498 C208,518 204,536 200,556 C196,568 190,576 186,576 C182,576 176,568 172,558 C168,542 164,524 162,500 C160,478 162,470 166,462Z',
    ],
  },
}

// ─── Back-view clickable regions ─────────────────────────────
const BACK_REGIONS = {
  shoulders: {
    paths: [
      // Left rear deltoid
      'M122,98 C112,92 90,90 72,98 C62,104 56,118 58,132 C59,138 64,144 72,146 L82,140 C86,128 96,114 112,104Z',
      // Right rear deltoid
      'M178,98 C188,92 210,90 228,98 C238,104 244,118 242,132 C241,138 236,144 228,146 L218,140 C214,128 204,114 188,104Z',
    ],
  },
  back: {
    paths: [
      // Left upper back / rhomboids + inner lat
      'M150,100 L118,104 C108,110 96,124 88,140 L84,156 L96,172 L150,172 L150,106Z',
      // Right upper back
      'M150,100 L182,104 C192,110 204,124 212,140 L216,156 L204,172 L150,172 L150,106Z',
      // Left outer lat — V-taper wing
      'M82,140 C74,142 66,150 62,162 L58,192 C56,212 58,232 62,244 L72,246 L80,236 L84,200 L86,168 L84,156Z',
      // Right outer lat
      'M218,140 C226,142 234,150 238,162 L242,192 C244,212 242,232 238,244 L228,246 L220,236 L216,200 L214,168 L216,156Z',
    ],
  },
  arms: {
    paths: [
      // Left tricep
      'M72,146 C64,146 52,152 46,162 L36,200 C32,216 34,234 40,244 L56,246 L62,236 L66,200 L70,168 L72,150Z',
      // Left forearm
      'M40,252 L58,252 C58,268 56,290 52,310 L48,336 L42,340 L30,324 L32,290 L36,264Z',
      // Right tricep
      'M228,146 C236,146 248,152 254,162 L264,200 C268,216 266,234 260,244 L244,246 L238,236 L234,200 L230,168 L228,150Z',
      // Right forearm
      'M260,252 L242,252 C242,268 244,290 248,310 L252,336 L258,340 L270,324 L268,290 L264,264Z',
    ],
  },
  core: {
    paths: [
      // Lower back / erectors
      'M108,174 L192,174 L196,208 L194,248 C188,258 170,264 150,264 C130,264 112,258 106,248 L104,208Z',
    ],
  },
  glutes: {
    paths: [
      // Left glute — full round shape from back
      'M106,258 C112,268 130,274 150,274 L150,312 C132,316 112,310 104,296 C98,284 100,268 106,258Z',
      // Right glute
      'M194,258 C188,268 170,274 150,274 L150,312 C168,316 188,310 196,296 C202,284 200,268 194,258Z',
    ],
  },
  hamstrings: {
    paths: [
      // Left hamstring — full posterior thigh
      'M100,314 L148,314 L146,430 C144,448 122,454 112,448 C102,440 96,410 94,380 C92,352 94,328 100,314Z',
      // Right hamstring
      'M152,314 L200,314 C206,328 208,352 206,380 C204,410 198,440 188,448 C178,454 156,448 154,430Z',
    ],
  },
  calves: {
    paths: [
      // Left calf
      'M104,462 L134,462 C136,478 134,500 130,524 C128,542 122,558 118,568 C114,576 108,576 104,568 C100,556 96,536 94,518 C92,498 94,478 98,466Z',
      // Right calf
      'M166,462 L196,462 C202,466 204,478 206,498 C208,518 204,536 200,556 C196,568 190,576 186,576 C182,576 176,568 172,558 C168,542 164,524 162,500 C160,478 162,470 166,462Z',
    ],
  },
}

// ─── Front-view anatomical detail lines ──────────────────────
const FRONT_DETAILS = [
  // Clavicle lines
  'M150,98 C140,94 125,96 112,102',
  'M150,98 C160,94 175,96 188,102',
  // Sternal line (center chest)
  'M150,106 L150,170',
  // Left pec fold
  'M98,168 C108,174 130,176 146,172',
  // Right pec fold
  'M202,168 C192,174 170,176 154,172',
  // Ab segments — horizontal lines
  'M118,190 L182,190',
  'M116,210 L184,210',
  'M114,230 L186,230',
  // Linea alba (center ab line)
  'M150,172 L150,264',
  // Left oblique line
  'M108,174 C104,200 102,230 106,250',
  // Right oblique line
  'M192,174 C196,200 198,230 194,250',
  // Left serratus hints
  'M104,164 L112,158',
  'M102,174 L110,168',
  // Right serratus hints
  'M196,164 L188,158',
  'M198,174 L190,168',
  // Left quad separation — rectus femoris / vastus lateralis
  'M120,316 C120,350 120,400 118,440',
  // Right quad separation
  'M180,316 C180,350 180,400 182,440',
  // Left vastus medialis teardrop
  'M130,420 C128,436 124,448 118,450',
  // Right vastus medialis teardrop
  'M170,420 C172,436 176,448 182,450',
  // Kneecap outlines
  'M110,450 C110,458 118,462 124,462 C130,462 134,458 134,452',
  'M166,452 C166,458 170,462 176,462 C182,462 190,458 190,450',
  // Left shin line (tibialis anterior)
  'M112,470 C110,500 108,530 110,560',
  // Right shin line
  'M188,470 C190,500 192,530 190,560',
  // Bicep-arm separation hints
  'M58,162 C60,180 60,200 58,230',
  'M242,162 C240,180 240,200 242,230',
]

// ─── Back-view anatomical detail lines ───────────────────────
const BACK_DETAILS = [
  // Spine — dashed (handled separately with strokeDasharray)
  // Left scapula outline
  'M126,110 L108,128 L112,160 L138,164 L142,134Z',
  // Right scapula outline
  'M174,110 L192,128 L188,160 L162,164 L158,134Z',
  // Trapezius diamond upper
  'M130,92 L150,100 L170,92',
  // Lat insertion / christmas tree
  'M140,210 C144,230 148,245 150,258',
  'M160,210 C156,230 152,245 150,258',
  // Erector spinae lines
  'M142,174 C140,200 140,230 142,258',
  'M158,174 C160,200 160,230 158,258',
  // Glute medius line
  'M106,260 C108,272 116,282 130,286',
  'M194,260 C192,272 184,282 170,286',
  // Gluteal fold
  'M108,310 C120,316 140,318 150,316',
  'M192,310 C180,316 160,318 150,316',
  // Hamstring separation — biceps femoris / semitendinosus
  'M126,320 C126,360 124,400 122,440',
  'M174,320 C174,360 176,400 178,440',
  // Calf diamond — medial/lateral heads
  'M118,470 C116,490 116,510 118,540',
  'M182,470 C184,490 184,510 182,540',
  // Tricep horseshoe hints
  'M50,170 C52,190 54,210 54,230',
  'M250,170 C248,190 246,210 246,230',
  // Inner elbow fold
  'M40,246 L58,248',
  'M260,246 L242,248',
]

// ─── Body outline paths ──────────────────────────────────────
const FRONT_OUTLINE =
  // Start at top of head, go clockwise
  // Head right side
  'M150,8 C170,8 176,20 176,38 C176,56 170,66 158,70' +
  // Neck right
  ' L162,72 L164,88' +
  // Right trap slope to shoulder
  ' C172,90 196,88 228,98' +
  // Right deltoid outer curve
  ' C244,106 250,122 248,138' +
  // Right arm outer
  ' C246,148 254,156 262,172 C270,190 272,216 268,240' +
  // Right elbow
  ' C266,250 264,256 262,258' +
  // Right forearm outer
  ' C268,276 272,300 272,324 C272,336 268,342 260,344' +
  // Right hand
  ' C256,346 252,342 250,338 C248,332 246,318 244,308' +
  // Right forearm inner
  ' C242,290 240,270 238,258' +
  // Right upper arm inner, back to torso
  ' L236,248 C234,236 238,216 240,200 L244,180' +
  // Right armpit into torso
  ' C238,166 228,152 220,148' +
  // Right torso — chest to waist
  ' C214,168 208,188 204,210 C200,232 198,250 196,264' +
  // Right hip flare
  ' C200,280 202,296 200,312' +
  // Right outer thigh
  ' C204,330 208,360 208,390 C208,420 204,440 198,452' +
  // Right knee
  ' L198,462' +
  // Right calf outer
  ' C204,472 210,496 210,520 C210,544 206,564 200,578' +
  // Right ankle
  ' C196,590 190,596 186,598' +
  // Right foot
  ' C180,600 170,604 168,608 L132,608 C130,604 120,600 114,598' +
  // Left ankle
  ' C110,596 104,590 100,578' +
  // Left calf outer
  ' C94,564 90,544 90,520 C90,496 96,472 102,462' +
  // Left knee
  ' L102,452' +
  // Left outer thigh
  ' C96,440 92,420 92,390 C92,360 96,330 100,312' +
  // Left hip
  ' C98,296 100,280 104,264' +
  // Left torso
  ' C102,250 100,232 96,210 C92,188 86,168 80,148' +
  // Left armpit
  ' C72,152 62,166 56,180' +
  // Left upper arm inner
  ' L60,200 C62,216 66,236 64,248 L62,258' +
  // Left forearm inner
  ' C60,270 58,290 56,308' +
  // Left hand
  ' C54,318 52,332 50,338 C48,342 44,346 40,344' +
  // Left forearm outer
  ' C32,342 28,336 28,324 C28,300 32,276 38,258' +
  // Left elbow
  ' C36,256 34,250 32,240' +
  // Left arm outer
  ' C28,216 30,190 38,172 C46,156 54,148 52,138' +
  // Left deltoid
  ' C50,122 56,106 72,98' +
  // Left trap to neck
  ' C104,88 128,90 136,88 L138,72 L142,70' +
  // Head left side, close
  ' C130,66 124,56 124,38 C124,20 130,8 150,8Z'

const BACK_OUTLINE = FRONT_OUTLINE // Same silhouette (symmetric)

const TREND_CONFIG = {
  up: { icon: TrendingUp, color: 'text-green-400', label: 'Trending up' },
  down: { icon: TrendingDown, color: 'text-red-400', label: 'Trending down' },
  flat: { icon: Minus, color: 'text-[#a0a0a0]', label: 'Stable' },
}

export default function BodyMap({ scores }) {
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('front') // 'front' | 'back'
  const [animPhase, setAnimPhase] = useState('idle') // 'idle' | 'out' | 'in'
  const touchStartX = useRef(null)
  const touchStartTime = useRef(null)

  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS
  const details = view === 'front' ? FRONT_DETAILS : BACK_DETAILS
  const detail = selected ? scores[selected] : null

  const toggleView = useCallback(() => {
    if (animPhase !== 'idle') return
    setAnimPhase('out')
  }, [animPhase])

  const handleTransitionEnd = useCallback(() => {
    if (animPhase === 'out') {
      setView((v) => (v === 'front' ? 'back' : 'front'))
      setAnimPhase('in')
    } else if (animPhase === 'in') {
      setAnimPhase('idle')
    }
  }, [animPhase])

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartTime.current = Date.now()
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dt = Date.now() - (touchStartTime.current || 0)
    // Trigger on 50px swipe or fast flick (30px in <200ms)
    if (Math.abs(dx) > 50 || (Math.abs(dx) > 30 && dt < 200)) {
      toggleView()
    }
    touchStartX.current = null
    touchStartTime.current = null
  }

  // 3D rotation transform based on animation phase
  const getTransform = () => {
    switch (animPhase) {
      case 'out': return 'rotateY(90deg)'
      case 'in': return 'rotateY(0deg)'
      default: return 'rotateY(0deg)'
    }
  }

  const getTransition = () => {
    switch (animPhase) {
      case 'out': return 'transform 200ms ease-in'
      case 'in': return 'transform 200ms ease-out'
      default: return 'none'
    }
  }

  return (
    <div className="relative">
      {/* View toggle + label */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-[#666] uppercase tracking-wider font-medium">
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

      {/* SVG body with 3D perspective rotation */}
      <div
        className="relative"
        style={{ perspective: '800px' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: getTransform(),
            transition: getTransition(),
            transformOrigin: 'center center',
            backfaceVisibility: 'hidden',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          <svg
            viewBox="0 0 300 660"
            className="w-full max-w-[280px] mx-auto"
            style={{ height: 'auto' }}
          >
            {/* Layer 1: Clickable muscle fill regions */}
            <g id="fill-regions">
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
                    className="cursor-pointer transition-all duration-200"
                    onClick={() => setSelected(selected === regionId ? null : regionId)}
                  />
                ))
              })}
            </g>

            {/* Layer 2: Body outline */}
            <g id="body-outline" pointerEvents="none">
              <path
                d={view === 'front' ? FRONT_OUTLINE : BACK_OUTLINE}
                fill="none"
                stroke="#555"
                strokeWidth="1.2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>

            {/* Layer 3: Anatomical detail lines */}
            <g id="detail-lines" pointerEvents="none">
              {/* Spine dashed line on back view */}
              {view === 'back' && (
                <line
                  x1="150" y1="88" x2="150" y2="264"
                  stroke="#3a3a3a" strokeWidth="0.8"
                  strokeDasharray="4,3"
                />
              )}
              {details.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="#3a3a3a"
                  strokeWidth="0.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </g>

            {/* Layer 4: Structural elements */}
            <g id="structure" pointerEvents="none">
              {/* Head — with subtle jaw */}
              <ellipse cx="150" cy="36" rx="22" ry="28"
                fill="none" stroke="#555" strokeWidth="1.2" />
              {/* Ears */}
              <ellipse cx="126" cy="38" rx="3" ry="6"
                fill="none" stroke="#444" strokeWidth="0.6" />
              <ellipse cx="174" cy="38" rx="3" ry="6"
                fill="none" stroke="#444" strokeWidth="0.6" />
              {/* Neck tendons hint */}
              <path d="M142,64 C144,72 146,80 148,88" fill="none" stroke="#3a3a3a" strokeWidth="0.5" />
              <path d="M158,64 C156,72 154,80 152,88" fill="none" stroke="#3a3a3a" strokeWidth="0.5" />
              {/* Knee structure lines */}
              <line x1="102" y1="455" x2="136" y2="455" stroke="#3a3a3a" strokeWidth="1.5" />
              <line x1="164" y1="455" x2="198" y2="455" stroke="#3a3a3a" strokeWidth="1.5" />
              {/* Feet */}
              <ellipse cx="120" cy="612" rx="16" ry="6"
                fill="none" stroke="#444" strokeWidth="0.8" />
              <ellipse cx="180" cy="612" rx="16" ry="6"
                fill="none" stroke="#444" strokeWidth="0.8" />
              {/* Hands */}
              <ellipse cx="46" cy="342" rx="8" ry="10"
                fill="none" stroke="#444" strokeWidth="0.6"
                transform="rotate(-10 46 342)" />
              <ellipse cx="254" cy="342" rx="8" ry="10"
                fill="none" stroke="#444" strokeWidth="0.6"
                transform="rotate(10 254 342)" />
            </g>
          </svg>
        </div>

        {/* Swipe hint dots */}
        <div className="flex justify-center gap-1.5 mt-2">
          <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${view === 'front' ? 'bg-white' : 'bg-[#444]'}`} />
          <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${view === 'back' ? 'bg-white' : 'bg-[#444]'}`} />
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
        <div className="mt-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-base">
              {REGION_LABELS[selected]}
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
