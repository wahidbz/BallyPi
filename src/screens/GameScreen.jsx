import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BALLS, COMBO_CONFIG, POWERUPS, SKINS } from '../constants/gameConstants';
import { usePhysicsEngine } from '../hooks/usePhysicsEngine';
import { useParticles } from '../hooks/useParticles';
import {
  consumePowerup,
  getPowerupUses,
  getSettings,
  rechargePowerup,
  saveSettings,
} from '../utils/storage';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getSpawnCap(score) {
  if (score < 150) return 2;
  if (score < 450) return 3;
  if (score < 900) return 4;
  if (score < 1500) return 5;
  if (score < 2300) return 6;
  return 7;
}

function pickSpawnLevel(score) {
  return 1 + Math.floor(Math.random() * getSpawnCap(score));
}

function getSpawnInterval(score) {
  return Math.max(450, Math.round(1200 - (Math.min(score, 3000) / 3000) * 750));
}

export default function GameScreen({
  score,
  setScore,
  onGameOver,
  sound,
  onShop,
  activeSkinId,
  onMenu,
  piNetwork,
  initialSnapshot,
  continueMode,
}) {
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const aimXRef = useRef(null);
  const scoreRef = useRef(score);
  const comboTimerRef = useRef(null);
  const currentLevelRef = useRef(1);
  const nextLevelRef = useRef(1);
  const soundSettingsRef = useRef(getSettings());

  const [currentLevel, setCurrentLevel] = useState(() => pickSpawnLevel(0));
  const [nextLevel, setNextLevel] = useState(() => pickSpawnLevel(0));
  const [aimX, setAimX] = useState(null);
  const [combo, setCombo] = useState(0);
  const [scorePopups, setScorePopups] = useState([]);
  const [powerupUses, setPowerupUses] = useState(getPowerupUses());
  const [shakeTick, setShakeTick] = useState(0);
  const [mergePulseTick, setMergePulseTick] = useState(0);
  const [soundOn, setSoundOn] = useState(soundSettingsRef.current.music);
  const [timerResetKey, setTimerResetKey] = useState(0);
  const [toast, setToast] = useState(null);
  const [hudFrame, setHudFrame] = useState({ previewLift: 0, pulse: 1 });

  const skinObj = useMemo(() => SKINS.find((skin) => skin.id === activeSkinId) || null, [activeSkinId]);
  const particles = useParticles(overlayCanvasRef);
  const spawnInterval = useMemo(() => getSpawnInterval(score), [score]);
  const currentBall = BALLS[currentLevel - 1] || BALLS[0];
  const nextBall = BALLS[nextLevel - 1] || BALLS[0];
  const currentMultiplier = COMBO_CONFIG.multipliers[Math.min(combo, COMBO_CONFIG.multipliers.length - 1)] || 1;

  const stars = useMemo(
    () => Array.from({ length: 24 }).map((_, index) => ({
      id: index,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 1 + Math.random() * 2.5,
      duration: 4 + Math.random() * 6,
      delay: Math.random() * 3,
      opacity: 0.2 + Math.random() * 0.6,
    })),
    []
  );

  scoreRef.current = score;
  currentLevelRef.current = currentLevel;
  nextLevelRef.current = nextLevel;

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() + Math.random() });
  }, []);

  const handleMerge = useCallback(({ level, score: gainedScore, x, y }) => {
    const mergedBall = BALLS[level - 1] || BALLS[0];
    const comboIndex = Math.min(combo + 1, COMBO_CONFIG.multipliers.length - 1);
    const multiplier = COMBO_CONFIG.multipliers[comboIndex] || 1;
    const earned = Math.round(gainedScore * multiplier);

    setScore((prev) => prev + earned);
    setCombo(comboIndex);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => setCombo(0), COMBO_CONFIG.timeWindow);

    const popupId = Date.now() + Math.random();
    setScorePopups((current) => [...current, { id: popupId, x, y, text: `+${earned}` }]);
    setTimeout(() => {
      setScorePopups((current) => current.filter((entry) => entry.id !== popupId));
    }, 950);

    particles.spawnMerge(x, y, level, mergedBall.glowColor);
    sound?.playMerge?.(level);
    sound?.haptic?.(level >= 8 ? [18, 12, 26] : [12]);
    setShakeTick((value) => value + 1);
    setMergePulseTick((value) => value + 1);
    setPowerupUses(getPowerupUses());
  }, [combo, particles, setScore, sound]);

  const physics = usePhysicsEngine({
    canvasRef,
    onMerge: handleMerge,
    onGameOver: () => {
      sound?.playGameOver?.();
      onGameOver?.(physics.serializeState());
    },
    onBallAdded: () => {},
    activeSkin: skinObj,
  });

  const performSpawn = useCallback((forcedX = null) => {
    if (!physics.isRunningRef.current || !canvasRef.current) return false;

    const canvas = canvasRef.current;
    const level = currentLevelRef.current;
    const ball = BALLS[level - 1] || BALLS[0];
    const baseX = forcedX ?? aimXRef.current ?? canvas.width / 2;
    const jitter = forcedX === null ? (Math.random() * 36 - 18) : (Math.random() * 12 - 6);
    const x = clamp(baseX + jitter, ball.radius + 10, canvas.width - ball.radius - 10);
    const didDrop = physics.dropBall(x, level, {
      vx: (Math.random() - 0.5) * 0.34,
      vy: 1.25 + Math.random() * 1.1,
    });

    if (!didDrop) return false;

    sound?.playDrop?.();
    sound?.haptic?.([10]);
    setMergePulseTick((value) => value + 1);

    const capScore = scoreRef.current;
    const upcomingLevel = nextLevelRef.current;
    const refreshedLevel = pickSpawnLevel(capScore);

    setCurrentLevel(upcomingLevel);
    setNextLevel(refreshedLevel);
    setTimerResetKey((value) => value + 1);
    return true;
  }, [physics, sound]);

  const spawnBall = useCallback(() => {
    performSpawn(null);
  }, [performSpawn]);

  const handleTapDrop = useCallback((event) => {
    if (!canvasRef.current) return;
    sound?.unlockAudio?.();
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const x = clamp(clientX - rect.left, 0, canvasRef.current.width);
    aimXRef.current = x;
    setAimX(x);
    performSpawn(x);
  }, [performSpawn, sound]);

  const handleAimMove = useCallback((event) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const x = clamp(clientX - rect.left, 0, canvasRef.current.width);
    aimXRef.current = x;
    setAimX(x);
  }, []);

  const handlePowerup = useCallback((id) => {
    const uses = getPowerupUses();
    if ((uses[id] || 0) <= 0) {
      onShop?.(id);
      return;
    }

    const spent = consumePowerup(id);
    if (!spent) return;

    let refreshed = getPowerupUses();

    if (id === 'pick') {
      setCurrentLevel(pickSpawnLevel(scoreRef.current));
      sound?.playPowerup?.();
      showToast('Next drop refreshed');
    }

    if (id === 'pop') {
      const removed = physics.removeLowestBalls(3);
      particles.spawnExplosion((canvasRef.current?.width || 240) / 2, (canvasRef.current?.height || 420) * 0.45);
      sound?.playPowerup?.();
      showToast(removed > 0 ? `Popped ${removed} items` : 'No items to pop');
    }

    if (id === 'refill') {
      refreshed = rechargePowerup('pick');
      refreshed = rechargePowerup('pop');
      sound?.playPowerup?.();
      showToast('Abilities refilled');
    }

    setPowerupUses(refreshed);
  }, [onShop, particles, physics, showToast, sound]);

  const toggleSound = useCallback(() => {
    const updated = { ...getSettings(), music: !soundOn };
    saveSettings(updated);
    setSoundOn(updated.music);
    sound?.toggleMusic?.(updated.music);
    sound?.playClick?.();
  }, [sound, soundOn]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayCanvasRef.current;
    if (!container || !canvas || !overlay) return undefined;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      overlay.width = width;
      overlay.height = height;
      if (aimXRef.current === null) {
        aimXRef.current = width / 2;
        setAimX(width / 2);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const initTimer = setTimeout(() => {
      physics.initEngine(canvas, skinObj);
      particles.startDust();
      sound?.startMusic?.();
      if (initialSnapshot?.balls?.length) {
        physics.restoreState(initialSnapshot, { revive: continueMode });
      }
    }, 30);

    return () => {
      clearTimeout(initTimer);
      ro.disconnect();
      physics.destroyEngine();
      sound?.stopMusic?.();
    };
  }, [continueMode, initialSnapshot, particles, physics, skinObj, sound]);

  useEffect(() => {
    let frameId;
    function gameLoop(now) {
      const baseX = aimXRef.current ?? canvasRef.current?.width / 2 ?? 0;
      if (canvasRef.current && aimXRef.current === null) {
        aimXRef.current = canvasRef.current.width / 2;
        setAimX(canvasRef.current.width / 2);
      }
      setHudFrame({
        previewLift: Math.sin(now * 0.004) * 5,
        pulse: 1 + Math.sin(now * 0.007) * 0.04,
      });
      if (baseX && aimX === null) setAimX(baseX);
      frameId = requestAnimationFrame(gameLoop);
    }
    frameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(frameId);
  }, [aimX]);

  useEffect(() => {
    let animId;
    const drawParticles = () => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.drawFrame(ctx, canvas);
      animId = requestAnimationFrame(drawParticles);
    };
    drawParticles();
    return () => cancelAnimationFrame(animId);
  }, [particles]);

  useEffect(() => {
    const intervalId = setInterval(spawnBall, spawnInterval);
    return () => clearInterval(intervalId);
  }, [spawnBall, spawnInterval, timerResetKey]);

  useEffect(() => {
    setPowerupUses(getPowerupUses());
  }, []);

  useEffect(() => () => {
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
  }, []);

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden px-3 py-safe text-white"
      animate={shakeTick ? { x: [0, -4, 4, -3, 0], scale: [1, 1.004, 1] } : {}}
      transition={{ duration: 0.22 }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(49,94,177,0.25),_transparent_38%),linear-gradient(180deg,_#061428_0%,_#0b1d3b_38%,_#070d18_100%)]" />
        {stars.map((star) => (
          <motion.span
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{ left: star.left, top: star.top, width: star.size, height: star.size, opacity: star.opacity }}
            animate={{ opacity: [star.opacity * 0.4, star.opacity, star.opacity * 0.5], scale: [1, 1.5, 1] }}
            transition={{ duration: star.duration, repeat: Infinity, ease: 'easeInOut', delay: star.delay }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[430px] flex-col">
        <div className="mb-3 flex items-center justify-between px-2 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg shadow-[0_8px_30px_rgba(0,0,0,0.25)]">⚽</div>
            <div>
              <div className="text-lg font-bold tracking-wide">Bally Pi</div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/70">merge drop arcade</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-white/80">
              {piNetwork?.user?.username ? `@${piNetwork.user.username}` : piNetwork?.piAvailable ? 'Pi ready' : 'Guest'}
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-base"
              onClick={toggleSound}
            >
              {soundOn ? '🔊' : '🔈'}
            </button>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-center gap-3 px-2">
          <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/35 px-5 py-2 text-center shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-md">
            <div className="text-[10px] uppercase tracking-[0.35em] text-cyan-100/60">Score</div>
            <motion.div
              key={score}
              className="text-3xl font-black tracking-[0.15em] text-white"
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            >
              {score.toString().padStart(6, '0')}
            </motion.div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[72px_minmax(0,1fr)] gap-3">
          <div className="rounded-[28px] border border-white/10 bg-white/6 p-2 backdrop-blur-md">
            <div className="mb-2 px-1 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-white/55">levels</div>
            <div className="flex h-full flex-col gap-2 overflow-hidden pr-1">
              {BALLS.map((ball, index) => {
                const active = index + 1 <= getSpawnCap(score) + 1;
                return (
                  <div
                    key={ball.level}
                    className={`flex items-center gap-2 rounded-2xl px-2 py-1.5 text-[10px] ${active ? 'bg-white/8 text-white' : 'text-white/35'}`}
                  >
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: Math.max(18, ball.size * 0.65),
                        height: Math.max(18, ball.size * 0.65),
                        background: `radial-gradient(circle at 35% 35%, ${ball.gradient[0]}, ${ball.gradient[1]})`,
                        boxShadow: `0 0 10px ${ball.glowColor}`,
                      }}
                    >
                      <span style={{ fontSize: Math.max(10, ball.radius * 0.9) }}>{ball.emoji}</span>
                    </div>
                    <span className="leading-tight">{ball.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <motion.div
              key={mergePulseTick}
              className="relative flex-1"
              initial={{ scale: 0.995 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <div
                ref={containerRef}
                className="relative h-full min-h-[460px] overflow-hidden rounded-[34px] border border-cyan-100/20 bg-[linear-gradient(180deg,rgba(18,31,63,0.62),rgba(8,14,29,0.74))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_30px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl"
                onMouseDown={handleTapDrop}
                onMouseMove={handleAimMove}
                onTouchStart={handleTapDrop}
                onTouchMove={handleAimMove}
              >
                <div className="pointer-events-none absolute inset-y-4 left-1.5 w-[3px] rounded-full bg-gradient-to-b from-cyan-200/20 via-cyan-200/60 to-cyan-200/10" />
                <div className="pointer-events-none absolute inset-y-4 right-1.5 w-[3px] rounded-full bg-gradient-to-b from-cyan-200/20 via-cyan-200/60 to-cyan-200/10" />
                <div className="pointer-events-none absolute bottom-0 left-4 right-4 h-8 rounded-t-full bg-cyan-300/30 blur-2xl" />
                <div className="pointer-events-none absolute inset-x-8 bottom-2 h-1 rounded-full bg-cyan-200/70 shadow-[0_0_25px_rgba(103,232,249,0.8)]" />

                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
                <canvas ref={overlayCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

                <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
                  <div className="rounded-full border border-white/10 bg-slate-900/35 px-4 py-1 text-xs text-white/75 backdrop-blur-md">
                    Tap anywhere to drop
                  </div>
                </div>

                <div
                  className="pointer-events-none absolute top-12 z-20"
                  style={{ left: clamp((aimX ?? containerRef.current?.clientWidth / 2 ?? 0) - currentBall.size / 2, 10, (containerRef.current?.clientWidth || 280) - currentBall.size - 10) }}
                >
                  <motion.div
                    className="flex items-center justify-center rounded-full border border-white/25 text-center shadow-[0_0_22px_rgba(125,211,252,0.45)]"
                    style={{
                      width: currentBall.size,
                      height: currentBall.size,
                      background: `radial-gradient(circle at 35% 35%, ${currentBall.gradient[0]}, ${currentBall.gradient[1]})`,
                      transform: `translateY(${hudFrame.previewLift}px) scale(${hudFrame.pulse})`,
                    }}
                  >
                    <span style={{ fontSize: Math.max(10, currentBall.radius * 1.1) }}>{currentBall.emoji}</span>
                  </motion.div>
                </div>

                <div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-2">
                  <div className="rounded-2xl border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-center text-[10px] uppercase tracking-[0.22em] text-amber-100/90">
                    speed {spawnInterval}ms
                  </div>
                  <div className="rounded-2xl border border-cyan-200/20 bg-white/8 px-3 py-2 text-center text-[10px] uppercase tracking-[0.22em] text-cyan-100/80">
                    next {nextBall.emoji}
                  </div>
                </div>

                <AnimatePresence>
                  {combo > 1 && (
                    <motion.div
                      className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 rounded-full border border-fuchsia-300/40 bg-fuchsia-400/12 px-4 py-2 text-xs font-semibold tracking-[0.22em] text-fuchsia-100"
                      initial={{ opacity: 0, y: -10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 0.9 }}
                    >
                      {currentMultiplier}x COMBO
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {scorePopups.map((popup) => (
                    <motion.div
                      key={popup.id}
                      className="pointer-events-none absolute z-30 text-sm font-bold tracking-[0.18em] text-cyan-100"
                      style={{ left: popup.x - 16, top: popup.y - 18 }}
                      initial={{ opacity: 0.95, y: 0, scale: 0.9 }}
                      animate={{ opacity: 0, y: -38, scale: 1.12 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    >
                      {popup.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>

            <div className="mt-3 flex items-end gap-2">
              <button
                type="button"
                className="min-w-[108px] rounded-[22px] border border-orange-200/25 bg-gradient-to-b from-orange-400 to-amber-500 px-4 py-4 text-left text-sm font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_18px_30px_rgba(245,158,11,0.22)]"
                onClick={onMenu}
              >
                ← Menu
              </button>

              <div className="grid flex-1 grid-cols-3 gap-2">
                {POWERUPS.map((powerup) => (
                  <button
                    key={powerup.id}
                    type="button"
                    className="rounded-[22px] border border-white/10 bg-white/8 px-2 py-3 text-center shadow-[0_14px_24px_rgba(0,0,0,0.18)] backdrop-blur-md"
                    onClick={() => handlePowerup(powerup.id)}
                  >
                    <div className="text-lg">{powerup.emoji}</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">{powerup.name}</div>
                    <div className="mt-1 text-[11px] text-white/70">{powerupUses[powerup.id] || 0}</div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="rounded-[22px] border border-cyan-200/20 bg-cyan-200/10 px-3 py-4 text-center text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100"
                onClick={() => onShop?.()}
              >
                power-up
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="pointer-events-none absolute bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-white shadow-[0_20px_40px_rgba(0,0,0,0.28)] backdrop-blur-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onAnimationComplete={() => {
              setTimeout(() => setToast(null), 900);
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
