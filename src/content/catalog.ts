import type { CategoryId, TestId } from '@/types'

export interface TestCopy {
  id: TestId
  title: string
  category: CategoryId
  duration: string
  summary: string
  goal: string
  howTo: string[]
  tips: { solid: string; slow: string; shaky: string }
  /** Median reaction time at or below this is rejected. Null skips the check. */
  minReactionMs: number | null
  warmupOrder?: number
}

export interface CategoryCopy {
  id: CategoryId
  title: string
  blurb: string
  tone: 'pulse' | 'iris' | 'gold' | 'lilac' | 'coral'
}

export const categories: CategoryCopy[] = [
  {
    id: 'reflex',
    title: 'Reflex & Aim',
    blurb: 'Snap reactions, flicks, and a steady track.',
    tone: 'pulse',
  },
  {
    id: 'awareness',
    title: 'Visual Search',
    blurb: 'Read a crowded frame before it disappears.',
    tone: 'iris',
  },
  {
    id: 'decision',
    title: 'Decision & Focus',
    blurb: 'Two signals at once. Keep both honest.',
    tone: 'gold',
  },
  {
    id: 'memory',
    title: 'Memory & Focus',
    blurb: 'Hold timers, shapes, and short sequences.',
    tone: 'lilac',
  },
  {
    id: 'moba',
    title: 'MOBA Mechanics',
    blurb: 'Timing windows and ability tempo.',
    tone: 'coral',
  },
]

/**
 * All player-facing drill copy lives here so a future locale file can
 * replace this module without touching game loops.
 * Names and icons are original. This app is not affiliated with any game.
 */
export const tests: TestCopy[] = [
  {
    id: 'color-reaction',
    title: 'Color Reaction',
    category: 'reflex',
    duration: '45s',
    summary: 'Tap the circle. Hold on the diamond.',
    goal: 'Sharpen go / no-go reactions.',
    howTo: [
      'A teal circle means tap anywhere, immediately.',
      'A gold diamond means do nothing.',
      'Taps before the shape appears count as early.',
    ],
    tips: {
      solid: 'Stay loose. The wait is part of the rep.',
      slow: 'Watch the center, not your finger. Commit as the shape lands.',
      shaky: 'Diamonds are brakes. Missing them costs as much as a slow tap.',
    },
    minReactionMs: 100,
    warmupOrder: 1,
  },
  {
    id: 'flick-aim',
    title: 'Flick Aim',
    category: 'reflex',
    duration: '50s',
    summary: 'Catch drifting targets before the ring closes.',
    goal: 'Train target switches and first-contact accuracy.',
    howTo: [
      'A ring appears and drifts. Tap inside it.',
      'Hits closer to the core score higher.',
      'If the arc closes, that target is a miss.',
    ],
    tips: {
      solid: 'Move the hand, then the tap. Don’t hunt with a frozen finger.',
      slow: 'Start the flick as the ring appears, not after you have stared.',
      shaky: 'A late center hit beats a panicked edge tap.',
    },
    minReactionMs: 90,
    warmupOrder: 2,
  },
  {
    id: 'smooth-track',
    title: 'Smooth Track',
    category: 'reflex',
    duration: '30s',
    summary: 'Keep a finger locked on the moving orb.',
    goal: 'Build continuous tracking instead of flick-and-pray.',
    howTo: [
      'Press on the orb and stay with it.',
      'Lift or drift outside the lock ring and uptime drops.',
      'The path curves. Anticipate the turn.',
    ],
    tips: {
      solid: 'Lead the turn by a hair. Don’t chase the previous position.',
      slow: 'Relax the grip. A stiff finger overshoots every curve.',
      shaky: 'Re-acquire quickly after a slip instead of swiping wildly.',
    },
    minReactionMs: null,
  },
  {
    id: 'zone-recall',
    title: 'Zone Recall',
    category: 'awareness',
    duration: '40s',
    summary: 'Glance at markers, then name the busiest zone.',
    goal: 'Train a one-look read of where pressure clustered.',
    howTo: [
      'Markers flash on a 3×3 board.',
      'Memorize which cell held the most.',
      'Tap that cell after the board clears.',
    ],
    tips: {
      solid: 'Count clusters, not every dot. Find the pile.',
      slow: 'Sweep in rows: top, middle, bottom. Same path every time.',
      shaky: 'The busiest cell is the only question. Ignore the empty corners.',
    },
    minReactionMs: 180,
    warmupOrder: 3,
  },
  {
    id: 'sound-ping',
    title: 'Sound Ping',
    category: 'awareness',
    duration: '40s',
    summary: 'Hear a burst and tap the side it came from.',
    goal: 'Practice left / center / right audio localization.',
    howTo: [
      'Use headphones if you can.',
      'A short noise plays to the left, right, or center.',
      'Tap the matching zone.',
    ],
    tips: {
      solid: 'Trust the first ear. Second-guessing is slower and usually wrong.',
      slow: 'Center is “both ears,” not silence.',
      shaky: 'Keep volume moderate. Clipping makes every ping feel centered.',
    },
    minReactionMs: 140,
  },
  {
    id: 'split-signal',
    title: 'Split Signal',
    category: 'decision',
    duration: '50s',
    summary: 'Two pads. Tap circles, ignore diamonds.',
    goal: 'Hold two decisions in the same beat.',
    howTo: [
      'Each round lights a left pad and a right pad.',
      'Tap a pad only when it shows a circle.',
      'A diamond means leave that pad alone.',
    ],
    tips: {
      solid: 'Read both pads before either thumb moves.',
      slow: 'Decide left, then right, in that order so you don’t stall.',
      shaky: 'A diamond tap is a false commit. Empty rounds are still rounds.',
    },
    minReactionMs: 100,
  },
  {
    id: 'shape-nback',
    title: 'Shape N-Back',
    category: 'memory',
    duration: '45s',
    summary: 'Tap when the shape matches two steps ago.',
    goal: 'Stretch working memory under a moving sequence.',
    howTo: [
      'Shapes appear one at a time.',
      'Tap Match when the current shape equals the one from two back.',
      'The first two shapes are never a match.',
    ],
    tips: {
      solid: 'Say the shape quietly. Update a two-slot list: previous, current.',
      slow: 'Don’t compare to the last shape. That is 1-back, and it is wrong here.',
      shaky: 'When unsure, withhold. False matches hurt as much as misses.',
    },
    minReactionMs: 120,
  },
  {
    id: 'cooldown-memory',
    title: 'Cooldown Memory',
    category: 'memory',
    duration: '40s',
    summary: 'Watch four timers, then pick the one ready first.',
    goal: 'Track several cooldowns without staring at numbers.',
    howTo: [
      'Four original abilities show draining rings.',
      'Study them, then they hide.',
      'Tap the ability that reaches ready first.',
    ],
    tips: {
      solid: 'Rank them while they are visible: shortest arc wins.',
      slow: 'Ignore ability names. Only the remaining arc matters.',
      shaky: 'Compare neighbors in pairs instead of memorizing four numbers.',
    },
    minReactionMs: 180,
    warmupOrder: 4,
  },
  {
    id: 'last-hit',
    title: 'Last Hit',
    category: 'moba',
    duration: '40s',
    summary: 'Tap while the bar sits inside the bracket.',
    goal: 'Practice a precision timing window on a draining bar.',
    howTo: [
      'A bar drains from full to empty.',
      'The gold bracket is the last-hit window.',
      'Tap once as the fill sits inside that bracket.',
    ],
    tips: {
      solid: 'Watch the leading edge meet the bracket, then tap.',
      slow: 'The window is short. Commit slightly before it feels perfect.',
      shaky: 'One tap per bar. Extra taps after a miss don’t save the creep.',
    },
    minReactionMs: null,
  },
]

export function getTestCopy(id: string): TestCopy | undefined {
  return tests.find((test) => test.id === id)
}

export function getCategory(id: CategoryId): CategoryCopy {
  const category = categories.find((item) => item.id === id)
  if (!category) throw new Error(`Unknown category ${id}`)
  return category
}
