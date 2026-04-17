import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getHighScore, getTotalScore, saveHighScore } from '../utils/storage';
import { PI_CONFIG } from '../constants/gameConstants';

export default function GameOverScreen({ score, onRetry, onHome, onContinue, sound, piNetwork }) {
  const [highScore, setHighScore] = useState(0);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const previousBest = getHighScore();
    if (score > previousBest) {
      saveHighScore(score);
      setHighScore(score);
      setIsNewHigh(true);
    } else {
      setHighScore(previousBest);
    }
  }, [score]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const handleContinue = () => {
    if (loading) return;
    sound?.playClick?.();

    if (!piNetwork?.piAvailable) {
      showToast('Pi unavailable — continuing in guest mode');
      onContinue?.();
      return;
    }

    setLoading(true);
    piNetwork.createContinuePayment(
      () => {
        setLoading(false);
        showToast('Continue unlocked');
        onContinue?.();
      },
      (error) => {
        setLoading(false);
        showToast(error?.message || 'Continue payment failed');
      }
    );
  };

  return (
    <motion.div
      className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.18),_transparent_30%),linear-gradient(180deg,_#09101c_0%,_#050811_100%)]" />
      <div className="relative z-10 w-full max-w-sm rounded-[34px] border border-white/10 bg-white/8 p-6 text-center shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="text-sm uppercase tracking-[0.45em] text-rose-200/70">game over</div>
        <div className="mt-3 text-5xl font-black tracking-[0.12em]">{score.toLocaleString()}</div>
        <div className="mt-2 text-sm text-white/70">One more drop could change everything.</div>

        <div className="mt-6 space-y-3 rounded-[28px] border border-white/10 bg-slate-950/45 p-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-white/60">Best score</span>
            <span className="font-bold text-white">{highScore.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Lifetime score</span>
            <span className="font-bold text-white">{getTotalScore().toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Pi continue</span>
            <span className="font-bold text-amber-200">{PI_CONFIG.continueCost} π</span>
          </div>
        </div>

        {isNewHigh && (
          <div className="mt-4 inline-flex rounded-full border border-amber-300/30 bg-amber-300/18 px-4 py-2 text-sm text-amber-50">
            New high score unlocked
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            className="rounded-[24px] bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-4 text-sm font-black uppercase tracking-[0.25em] text-slate-950 shadow-[0_18px_34px_rgba(251,191,36,0.25)]"
            onClick={handleContinue}
          >
            {loading ? 'Processing...' : `Continue for ${PI_CONFIG.continueCost}π`}
          </button>
          <button
            type="button"
            className="rounded-[24px] bg-gradient-to-r from-cyan-300 to-blue-500 px-5 py-4 text-sm font-black uppercase tracking-[0.25em] text-slate-950"
            onClick={onRetry}
          >
            New Run
          </button>
          <button
            type="button"
            className="rounded-[24px] border border-white/10 bg-white/8 px-5 py-4 text-sm font-semibold text-white"
            onClick={onHome}
          >
            Back Home
          </button>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="absolute bottom-12 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/85 px-5 py-2 text-sm text-white backdrop-blur-md"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
