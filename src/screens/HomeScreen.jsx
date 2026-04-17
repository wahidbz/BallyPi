import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BALLS, DAILY_REWARD as DR } from '../constants/gameConstants';
import {
  canClaimDailyReward,
  claimDailyReward,
  getSettings,
  saveSettings,
} from '../utils/storage';

export default function HomeScreen({ onPlay, onSkins, onSettings, sound, piNetwork, highScore }) {
  const [canClaim, setCanClaim] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(getSettings());

  useEffect(() => {
    setCanClaim(canClaimDailyReward(DR.cooldown));
  }, []);

  const previewBalls = BALLS.slice(0, 6);

  const handleSettingToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveSettings(updated);
    onSettings?.(updated);
    if (key === 'music') sound?.toggleMusic?.(updated.music);
    sound?.playClick?.();
  };

  return (
    <motion.div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden px-5 py-safe text-white"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_32%),linear-gradient(180deg,_rgba(6,20,40,0.95)_0%,_rgba(6,14,28,0.98)_100%)]" />
      <div className="relative z-10 flex items-center justify-between pt-3">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10"
          onClick={() => setShowSettings((value) => !value)}
        >
          ⚙️
        </button>

        <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-center backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-[0.32em] text-cyan-100/55">best</div>
          <div className="text-xl font-black tracking-[0.12em]">{highScore.toLocaleString()}</div>
        </div>

        <button
          type="button"
          className={`flex h-11 w-11 items-center justify-center rounded-full border ${canClaim ? 'border-amber-300/40 bg-amber-300/18' : 'border-white/10 bg-white/10 opacity-60'}`}
          onClick={() => {
            if (!canClaim) return;
            claimDailyReward();
            setCanClaim(false);
            setClaimed(true);
            sound?.playClick?.();
            setTimeout(() => setClaimed(false), 1600);
          }}
        >
          🎁
        </button>
      </div>

      <div className="relative z-10 mt-8 text-center">
        <div className="text-sm uppercase tracking-[0.5em] text-cyan-100/70">premium mobile arcade</div>
        <div className="mt-3 text-5xl font-black tracking-[0.12em] text-white">Bally Pi</div>
        <div className="mt-2 text-base text-white/65">Merge balls, chase combos, and keep the stack alive.</div>
        <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs text-white/80 backdrop-blur-md">
          {piNetwork?.user?.username ? `Connected as @${piNetwork.user.username}` : piNetwork?.piAvailable ? 'Pi Browser detected' : 'Play instantly in guest mode'}
        </div>
      </div>

      <div className="relative z-10 my-6 grid grid-cols-3 gap-3">
        {previewBalls.map((ball, index) => (
          <motion.div
            key={ball.level}
            className="rounded-[28px] border border-white/10 bg-white/8 p-3 text-center backdrop-blur-md"
            animate={{ y: [0, -(6 + index), 0] }}
            transition={{ duration: 2 + index * 0.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              className="mx-auto flex items-center justify-center rounded-full"
              style={{
                width: Math.max(34, ball.size * 1.15),
                height: Math.max(34, ball.size * 1.15),
                background: `radial-gradient(circle at 35% 35%, ${ball.gradient[0]}, ${ball.gradient[1]})`,
                boxShadow: `0 0 18px ${ball.glowColor}`,
              }}
            >
              <span style={{ fontSize: Math.max(14, ball.radius * 1.5) }}>{ball.emoji}</span>
            </div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/65">{ball.name}</div>
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 mb-5 flex flex-col gap-3">
        <button
          type="button"
          className="rounded-[26px] bg-gradient-to-r from-cyan-300 to-blue-500 px-6 py-5 text-lg font-black uppercase tracking-[0.25em] text-slate-950 shadow-[0_20px_40px_rgba(14,165,233,0.28)]"
          onClick={onPlay}
        >
          Play Now
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 text-base font-semibold text-white backdrop-blur-md"
            onClick={onSkins}
          >
            🎨 Skins
          </button>
          <button
            type="button"
            className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 text-base font-semibold text-white backdrop-blur-md"
            onClick={() => setShowSettings((value) => !value)}
          >
            🔊 Settings
          </button>
        </div>
      </div>

      <AnimatePresence>
        {claimed && (
          <motion.div
            className="absolute bottom-28 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-200/30 bg-amber-300/16 px-5 py-2 text-sm text-amber-50 backdrop-blur-md"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Daily reward claimed +100
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="absolute inset-0 z-40 flex items-end bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              className="w-full rounded-t-[30px] border-t border-white/10 bg-slate-950/92 p-6 pb-10 backdrop-blur-xl"
              initial={{ y: 280 }}
              animate={{ y: 0 }}
              exit={{ y: 280 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-6 h-1.5 w-14 rounded-full bg-white/20" />
              <div className="mb-5 text-center text-sm font-black uppercase tracking-[0.35em] text-cyan-100">settings</div>
              {[
                ['music', 'Ambient music'],
                ['sfx', 'Soft effects'],
                ['haptics', 'Haptics'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between border-b border-white/8 py-4">
                  <span className="text-base text-white/85">{label}</span>
                  <button
                    type="button"
                    className={`relative h-8 w-14 rounded-full ${settings[key] ? 'bg-cyan-300' : 'bg-white/20'}`}
                    onClick={() => handleSettingToggle(key)}
                  >
                    <motion.span
                      className="absolute top-1 h-6 w-6 rounded-full bg-slate-950"
                      animate={{ left: settings[key] ? 32 : 4 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                    />
                  </button>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
