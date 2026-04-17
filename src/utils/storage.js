const KEYS = {
  HIGH_SCORE: 'ballypi_highscore',
  TOTAL_SCORE: 'ballypi_totalscore',
  SKIN: 'ballypi_skin',
  UNLOCKED_SKINS: 'ballypi_unlocked_skins',
  POWERUPS: 'ballypi_powerups',
  TX_IDS: 'ballypi_txids',
  DAILY_REWARD: 'ballypi_daily',
  SETTINGS: 'ballypi_settings',
  PI_USER: 'ballypi_pi_user',
};

const DEFAULT_POWERUPS = { pick: 1, pop: 1, refill: 1 };
const DEFAULT_SETTINGS = { music: true, sfx: true, haptics: true };

export function getHighScore() {
  return parseInt(localStorage.getItem(KEYS.HIGH_SCORE) || '0', 10);
}

export function saveHighScore(score) {
  const current = getHighScore();
  if (score > current) localStorage.setItem(KEYS.HIGH_SCORE, String(score));
}

export function getTotalScore() {
  return parseInt(localStorage.getItem(KEYS.TOTAL_SCORE) || '0', 10);
}

export function addToTotalScore(score) {
  const total = getTotalScore() + score;
  localStorage.setItem(KEYS.TOTAL_SCORE, String(total));
  return total;
}

export function getActiveSkin() {
  return localStorage.getItem(KEYS.SKIN) || 'default';
}

export function setActiveSkin(skinId) {
  localStorage.setItem(KEYS.SKIN, skinId);
}

export function getUnlockedSkins() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.UNLOCKED_SKINS) || '["default"]');
  } catch {
    return ['default'];
  }
}

export function unlockSkin(skinId) {
  const unlocked = getUnlockedSkins();
  if (!unlocked.includes(skinId)) {
    unlocked.push(skinId);
    localStorage.setItem(KEYS.UNLOCKED_SKINS, JSON.stringify(unlocked));
  }
}

export function getPowerupUses() {
  try {
    return { ...DEFAULT_POWERUPS, ...JSON.parse(localStorage.getItem(KEYS.POWERUPS) || '{}') };
  } catch {
    return { ...DEFAULT_POWERUPS };
  }
}

export function savePowerupUses(uses) {
  localStorage.setItem(KEYS.POWERUPS, JSON.stringify({ ...DEFAULT_POWERUPS, ...uses }));
}

export function rechargePowerup(id, amount = 1) {
  const uses = getPowerupUses();
  uses[id] = (uses[id] || 0) + amount;
  savePowerupUses(uses);
  return uses;
}

export function rechargeAllPowerups(amount = 1) {
  const uses = getPowerupUses();
  Object.keys(DEFAULT_POWERUPS).forEach((key) => {
    uses[key] = (uses[key] || 0) + amount;
  });
  savePowerupUses(uses);
  return uses;
}

export function consumePowerup(id) {
  const uses = getPowerupUses();
  if ((uses[id] || 0) <= 0) return false;
  uses[id] -= 1;
  savePowerupUses(uses);
  return true;
}

export function hasTransaction(txid) {
  try {
    const ids = JSON.parse(localStorage.getItem(KEYS.TX_IDS) || '[]');
    return ids.includes(txid);
  } catch {
    return false;
  }
}

export function saveTransaction(txid) {
  try {
    const ids = JSON.parse(localStorage.getItem(KEYS.TX_IDS) || '[]');
    if (!ids.includes(txid)) {
      localStorage.setItem(KEYS.TX_IDS, JSON.stringify([...ids, txid].slice(-200)));
    }
  } catch {
    localStorage.setItem(KEYS.TX_IDS, JSON.stringify([txid]));
  }
}

export function canClaimDailyReward(cooldown) {
  const last = parseInt(localStorage.getItem(KEYS.DAILY_REWARD) || '0', 10);
  return Date.now() - last >= cooldown;
}

export function claimDailyReward() {
  localStorage.setItem(KEYS.DAILY_REWARD, String(Date.now()));
}

export function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }));
}

export function savePiUser(user) {
  localStorage.setItem(KEYS.PI_USER, JSON.stringify(user || null));
}

export function getPiUser() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.PI_USER) || 'null');
  } catch {
    return null;
  }
}
