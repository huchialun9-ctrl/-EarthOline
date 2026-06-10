const DailyQuest = require('../models/DailyQuest');
const { UserAchievement, ACHIEVEMENT_DEFS } = require('../models/Achievement');

const DAILY_QUEST_TEMPLATES = [
  { type: 'login', target: 1, rewardGold: 10000 },
  { type: 'mine_gold', target: 10000, rewardGold: 50000 },
  { type: 'open_gacha', target: 3, rewardGold: 200000 },
  { type: 'salvage_item', target: 1, rewardGold: 10000 },
];

async function getOrCreateDailyQuest(userId) {
  const date = new Date().toISOString().slice(0, 10);
  let dq = await DailyQuest.findOne({ userId, date });
  if (!dq) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const prev = await DailyQuest.findOne({ userId, date: yesterday });
    const streak = (prev && prev.allCompleted) ? (prev.streak || 0) + 1 : 0;
    dq = await DailyQuest.create({
      userId,
      date,
      quests: DAILY_QUEST_TEMPLATES.map(t => ({
        type: t.type,
        target: t.target,
        rewardGold: Math.floor(t.rewardGold * (1 + streak * 0.1)),
        progress: 0,
        completed: false,
        claimed: false,
      })),
      streak,
    });
  }
  return dq;
}

async function trackDailyProgress(userId, type, amount) {
  const date = new Date().toISOString().slice(0, 10);
  let dq = await DailyQuest.findOne({ userId, date });
  if (!dq) return;
  let changed = false;
  dq.quests.forEach(q => {
    if (q.type === type && !q.completed) {
      q.progress = Math.min(q.progress + amount, q.target);
      if (q.progress >= q.target) q.completed = true;
      changed = true;
    }
  });
  if (changed) {
    dq.allCompleted = dq.quests.every(q => q.completed);
    await dq.save();
  }
}

async function checkAchievements(userId, statField, value) {
  const mappings = {
    totalGoldMined: d => d.key.startsWith('gold_'),
    totalGachaOpens: d => d.key.startsWith('gacha_'),
    totalSalvages: d => d.key.startsWith('salvage_'),
    maxMineLevel: d => d.key.startsWith('mine_'),
    totalRebirths: d => d.key.startsWith('rebirth_'),
  };
  const filter = mappings[statField];
  if (!filter) return;
  const defs = ACHIEVEMENT_DEFS.filter(filter);
  for (const def of defs) {
    if (value < def.target) continue;
    let ua = await UserAchievement.findOne({ userId, key: def.key });
    if (!ua) {
      await UserAchievement.create({ userId, key: def.key, progress: def.target, completed: true, completedAt: new Date() });
    } else if (!ua.completed) {
      ua.progress = def.target;
      ua.completed = true;
      ua.completedAt = new Date();
      await ua.save();
    }
  }
}

module.exports = { getOrCreateDailyQuest, trackDailyProgress, checkAchievements, DAILY_QUEST_TEMPLATES };
