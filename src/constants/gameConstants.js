const rawBalls = [
  { emoji: '🏓', name: 'Ping Pong', size: 14, score: 1, gradient: ['#fff5f5', '#d8dee9'], glowColor: 'rgba(255,255,255,0.85)' },
  { emoji: '🎱', name: '8-Ball', size: 16, score: 3, gradient: ['#2f3640', '#000000'], glowColor: 'rgba(255,255,255,0.18)' },
  { emoji: '🎾', name: 'Tennis', size: 18, score: 6, gradient: ['#d0ff5b', '#94c400'], glowColor: 'rgba(208,255,91,0.55)' },
  { emoji: '🏸', name: 'Badminton', size: 20, score: 10, gradient: ['#f8fbff', '#ccd7e6'], glowColor: 'rgba(255,255,255,0.55)' },
  { emoji: '🥎', name: 'Softball', size: 22, score: 15, gradient: ['#e8ff69', '#b7cf2f'], glowColor: 'rgba(218,255,80,0.58)' },
  { emoji: '⚾', name: 'Baseball', size: 24, score: 21, gradient: ['#ffffff', '#cbd5e1'], glowColor: 'rgba(255,255,255,0.62)' },
  { emoji: '🏐', name: 'Volleyball', size: 26, score: 28, gradient: ['#f2f6ff', '#b7c2d0'], glowColor: 'rgba(207,224,255,0.55)' },
  { emoji: '🏀', name: 'Basketball', size: 28, score: 36, gradient: ['#ffb347', '#d96f00'], glowColor: 'rgba(255,165,62,0.62)' },
  { emoji: '🏉', name: 'Rugby', size: 30, score: 45, gradient: ['#c78d62', '#6f4020'], glowColor: 'rgba(199,141,98,0.55)' },
  { emoji: '🏏', name: 'Cricket', size: 32, score: 55, gradient: ['#f0c995', '#b16b2d'], glowColor: 'rgba(240,201,149,0.55)' },
  { emoji: '🏑', name: 'Field Hockey', size: 34, score: 66, gradient: ['#daf4a2', '#77a837'], glowColor: 'rgba(189,255,104,0.55)' },
  { emoji: '🏒', name: 'Ice Hockey', size: 36, score: 78, gradient: ['#d7f1ff', '#6ca8c9'], glowColor: 'rgba(158,230,255,0.55)' },
  { emoji: '🥍', name: 'Lacrosse', size: 38, score: 91, gradient: ['#ffd9a3', '#d08d30'], glowColor: 'rgba(255,217,163,0.55)' },
  { emoji: '🎳', name: 'Bowling', size: 40, score: 105, gradient: ['#3d1f42', '#0f0512'], glowColor: 'rgba(204,140,255,0.38)' },
  { emoji: '🏈', name: 'American Football', size: 42, score: 120, gradient: ['#b36f44', '#5f2e10'], glowColor: 'rgba(211,137,89,0.52)' },
  { emoji: '⚽', name: 'Football', size: 46, score: 160, gradient: ['#ffffff', '#9ca3af'], glowColor: 'rgba(255,255,255,0.82)', isFinal: true },
];

export const BALLS = rawBalls.map((ball, index) => ({
  ...ball,
  level: index + 1,
  radius: ball.size / 2,
}));

export const SKINS = [
  {
    id: 'default',
    name: 'Classic Arena',
    emoji: '⚽',
    description: 'Balanced glass cabinet look.',
    unlockScore: 0,
    colors: null,
    glow: null,
    locked: false,
  },
  {
    id: 'neon',
    name: 'Neon Drift',
    emoji: '💜',
    description: 'Electric blue and magenta glows.',
    unlockScore: 1200,
    colors: ['#f8fafc','#0f172a','#d9ff72','#f8fafc','#f0ff84','#ffffff','#edf7ff','#ff9f4d','#d1a47e','#f5d0a9','#d0ff9a','#9ed8ff','#ffc48d','#3c1456','#c97d49','#ffffff'],
    glow: 'rgba(96, 216, 255, 0.85)',
    locked: true,
  },
  {
    id: 'galaxy',
    name: 'Galaxy Rush',
    emoji: '🌌',
    description: 'Space glow with violet trails.',
    unlockScore: 4000,
    colors: ['#f8fafc','#1e1b4b','#7dd3fc','#d8b4fe','#bef264','#f8fafc','#c7d2fe','#fb923c','#c084fc','#f59e0b','#84cc16','#38bdf8','#f9a8d4','#6d28d9','#fb7185','#ffffff'],
    glow: 'rgba(167, 139, 250, 0.9)',
    locked: true,
  },
];

export const POWERUPS = [
  {
    id: 'pick',
    name: 'Pick Next',
    emoji: '↪️',
    description: 'Re-roll the current drop ball.',
    freeUses: 1,
    piCost: 0.5,
    color: '#7dd3fc',
  },
  {
    id: 'pop',
    name: 'Pop Items',
    emoji: '💥',
    description: 'Remove the smallest troublemakers.',
    freeUses: 1,
    piCost: 0.5,
    color: '#fda4af',
  },
  {
    id: 'refill',
    name: 'Refill',
    emoji: '✨',
    description: 'Restore one use to every ability.',
    freeUses: 1,
    piCost: 0.5,
    color: '#fde68a',
  },
];

export const PHYSICS_CONFIG = {
  gravity: { x: 0, y: 1.08 },
  wallThickness: 42,
  ballRestitution: 0.16,
  ballFriction: 0.012,
  ballFrictionAir: 0.015,
  ballDensity: 0.0019,
  engineTimestep: 1000 / 60,
  maxBodies: 70,
  dangerLineRatio: 0.16,
  sleepThreshold: 45,
};

export const COMBO_CONFIG = {
  timeWindow: 1800,
  multipliers: [1, 1.2, 1.5, 2, 2.5, 3.2, 4.2, 5.5],
};

export const PI_CONFIG = {
  sandbox: true,
  rechargeCost: 0.5,
  continueCost: 0.5,
  paymentMemo: 'Bally Pi Power-up Recharge',
  continueMemo: 'Bally Pi Continue',
};

export const ARENA = {
  maxWidth: 380,
  sideRailWidth: 78,
  topPadding: 84,
  bottomPadding: 120,
};

export const DAILY_REWARD = {
  cooldown: 24 * 60 * 60 * 1000,
  amount: 100,
};
