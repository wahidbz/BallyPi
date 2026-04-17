import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { POWERUPS, PI_CONFIG } from '../constants/gameConstants';
import { rechargePowerup, getPowerupUses } from '../utils/storage';

export default function ShopPopup({ onClose, piNetwork, sound, onRechargeSuccess, shopTarget }) {
  const [loading, setLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [powerupUses, setPowerupUses] = useState(getPowerupUses());

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  };

  const handleRecharge = (powerupId) => {
    if (loading) return;
    sound?.playClick?.();

    if (!piNetwork?.piAvailable) {
      const updated = rechargePowerup(powerupId);
      setPowerupUses({ ...updated });
      showToast('Demo recharge applied');
      onRechargeSuccess?.();
      return;
    }

    setLoading(powerupId);
    piNetwork.createRechargePayment(
      powerupId,
      () => {
        setLoading(null);
        const updated = rechargePowerup(powerupId);
        setPowerupUses({ ...updated });
        sound?.playPowerup?.();
        showToast('Recharge complete');
        onRechargeSuccess?.();
      },
      (error) => {
        setLoading(null);
        showToast(error?.message || 'Payment failed');
      }
    );
  };

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-end bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full rounded-t-[30px] border-t border-white/10 bg-slate-950/94 px-5 pb-safe pt-5 backdrop-blur-xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-white/20" />
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.32em] text-cyan-100">power-up shop</div>
            <div className="mt-1 text-sm text-white/60">{shopTarget ? `Recharge ${shopTarget}` : 'Recharge premium abilities'}</div>
          </div>
          <button type="button" className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-white/75" onClick={onClose}>✕</button>
        </div>

        <div className="mb-4 rounded-[24px] border border-white/10 bg-white/8 px-4 py-3 text-sm text-white/80">
          {piNetwork?.piAvailable ? 'Pi Browser detected — payments ready' : 'Guest mode — recharges are simulated so gameplay never blocks'}
        </div>

        <div className="space-y-3 pb-6">
          {POWERUPS.map((powerup) => {
            const active = shopTarget === powerup.id;
            return (
              <div
                key={powerup.id}
                className={`flex items-center gap-4 rounded-[26px] border p-4 ${active ? 'border-cyan-200/40 bg-cyan-200/10' : 'border-white/10 bg-white/8'}`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/55 text-2xl">{powerup.emoji}</div>
                <div className="flex-1">
                  <div className="text-base font-semibold text-white">{powerup.name}</div>
                  <div className="text-sm text-white/60">{powerup.description}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/45">stock {powerupUses[powerup.id] || 0}</div>
                </div>
                <button
                  type="button"
                  className="rounded-[18px] border border-amber-300/35 bg-amber-300/18 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-amber-50"
                  onClick={() => handleRecharge(powerup.id)}
                >
                  {loading === powerup.id ? '...' : `${PI_CONFIG.rechargeCost}π`}
                </button>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div
              className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/88 px-5 py-2 text-sm text-white backdrop-blur-md"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
