const db = require('../models/database');

async function updateAllOnlineCounts() {
  try {
    db.prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id IN (SELECT id FROM users WHERE last_active < datetime("now", "-30 minutes"))').run();
  } catch (e) { }
}

async function recalculateAura() {
  const factions = ['asia', 'americas', 'europe'];
  for (const faction of factions) {
    const totalAura = db.prepare(`
      SELECT COALESCE(SUM(
        CASE WHEN a.rarity = 'common' THEN 1
             WHEN a.rarity = 'epic' THEN 10
             WHEN a.rarity = 'mythic' THEN 50
             WHEN a.rarity = 'unique' THEN 200
        ELSE 0 END
      ), 0) + COALESCE(SUM(u.total_rebirths * 5), 0) as aura
      FROM users u
      LEFT JOIN user_artifacts ua ON u.id = ua.user_id
      LEFT JOIN artifacts a ON ua.artifact_id = a.id
      WHERE u.faction = ?
    `).get(faction);

    db.prepare('UPDATE faction_aura SET aura_value = ?, last_updated = CURRENT_TIMESTAMP WHERE faction = ?').run(totalAura.aura, faction);
  }
}

async function getGlobalStats() {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const onlineUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE last_active > datetime("now", "-5 minutes")').get().count;
  const factionAuras = db.prepare('SELECT * FROM faction_aura').all();
  const globalGoldPerSec = db.prepare('SELECT COALESCE(SUM(gold_per_sec), 0) as total FROM users WHERE last_active > datetime("now", "-5 minutes")').get().total;

  await recalculateAura();

  return { totalUsers, onlineUsers, factionAuras, globalGoldPerSec };
}

module.exports = { updateAllOnlineCounts, recalculateAura, getGlobalStats };
