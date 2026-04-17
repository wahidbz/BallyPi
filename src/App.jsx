import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import GameOverScreen from './screens/GameOverScreen';
import SkinsScreen from './screens/SkinsScreen';
import ShopPopup from './components/ShopPopup';
import { useSound } from './hooks/useSound';
import { usePiNetwork } from './hooks/usePiNetwork';
import {
  addToTotalScore,
  getActiveSkin,
  getHighScore,
  getSettings,
  saveHighScore,
} from './utils/storage';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(getHighScore());
  const [activeSkin, setActiveSkin] = useState(getActiveSkin());
  const [showShop, setShowShop] = useState(false);
  const [shopTarget, setShopTarget] = useState(null);
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [continueMode, setContinueMode] = useState(false);
  const [settings, setSettings] = useState(getSettings());

  const sound = useSound(settings);
  const piNetwork = usePiNetwork();

  useEffect(() => {
    const initAudio = () => {
      sound.unlockAudio();
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('mousedown', initAudio);
    };

    document.addEventListener('touchstart', initAudio, { once: true, passive: true });
    document.addEventListener('mousedown', initAudio, { once: true });

    return () => {
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('mousedown', initAudio);
    };
  }, [sound]);

  useEffect(() => {
    if (screen === 'game' && !piNetwork.user && piNetwork.status === 'idle') {
      piNetwork.authenticate().catch(() => null);
    }
  }, [screen, piNetwork.user, piNetwork.status, piNetwork.authenticate]);

  const handlePlay = () => {
    sound.playClick?.();
    setActiveSkin(getActiveSkin());
    setScore(0);
    setLastSnapshot(null);
    setContinueMode(false);
    setScreen('game');
  };

  const handleRetry = () => {
    sound.playClick?.();
    setScore(0);
    setLastSnapshot(null);
    setContinueMode(false);
    setScreen('game');
  };

  const handleGameOver = (snapshot) => {
    const finalScore = score;
    const previousBest = getHighScore();
    if (finalScore > previousBest) {
      saveHighScore(finalScore);
      setHighScore(finalScore);
    }
    addToTotalScore(finalScore);
    setLastSnapshot(snapshot || null);
    setContinueMode(false);
    setScreen('gameover');
  };

  const handleContinue = () => {
    setContinueMode(true);
    setScreen('game');
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#050d19]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_35%),linear-gradient(180deg,_#09101c_0%,_#081425_45%,_#04070f_100%)]" />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_center,_rgba(255,255,255,0.5)_1px,_transparent_1px)] [background-size:24px_24px]" />

      <div className="relative h-full w-full max-w-[430px] overflow-hidden">
        <AnimatePresence mode="wait">
          {screen === 'home' && (
            <motion.div key="home" className="absolute inset-0">
              <HomeScreen
                onPlay={handlePlay}
                onSkins={() => {
                  sound.playClick?.();
                  setScreen('skins');
                }}
                onSettings={(nextSettings) => setSettings(nextSettings)}
                sound={sound}
                piNetwork={piNetwork}
                highScore={highScore}
              />
            </motion.div>
          )}

          {screen === 'game' && (
            <motion.div key={`game-${continueMode ? 'continue' : 'fresh'}`} className="absolute inset-0">
              <GameScreen
                score={score}
                setScore={setScore}
                onGameOver={handleGameOver}
                sound={sound}
                onShop={(target) => {
                  setShopTarget(target || null);
                  setShowShop(true);
                }}
                activeSkinId={activeSkin}
                onMenu={() => {
                  sound.playClick?.();
                  setScreen('home');
                }}
                piNetwork={piNetwork}
                initialSnapshot={continueMode ? lastSnapshot : null}
                continueMode={continueMode}
              />
            </motion.div>
          )}

          {screen === 'gameover' && (
            <motion.div key="gameover" className="absolute inset-0">
              <GameOverScreen
                score={score}
                onRetry={handleRetry}
                onHome={() => {
                  sound.playClick?.();
                  setScreen('home');
                }}
                onContinue={handleContinue}
                sound={sound}
                piNetwork={piNetwork}
              />
            </motion.div>
          )}

          {screen === 'skins' && (
            <motion.div key="skins" className="absolute inset-0">
              <SkinsScreen
                onBack={() => {
                  sound.playClick?.();
                  setActiveSkin(getActiveSkin());
                  setScreen('home');
                }}
                sound={sound}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showShop && (
            <ShopPopup
              onClose={() => setShowShop(false)}
              piNetwork={piNetwork}
              sound={sound}
              shopTarget={shopTarget}
              onRechargeSuccess={() => setShowShop(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
