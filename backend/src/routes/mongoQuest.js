const express = require('express');
const router = express.Router();
const DailyQuest = require('../models/DailyQuest');
const { UserAchievement, ACHIEVEMENT_DEFS } = require('../models/Achievement');
const { User } = require('../models/mongoose');
const { getOrCreateDailyQuest } = require('../services/progressTracker');

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.get('/game/quests/daily', requireAuth, async (req, res) => {
  try {
    const dq = await getOrCreateDailyQuest(req.user._id);
    res.json({ success: true, quests: dq });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/quests/daily/claim', requireAuth, async (req, res) => {
  try {
    const { questIndex } = req.body;
    const date = new Date().toISOString().slice(0, 10);
    const dq = await DailyQuest.findOne({ userId: req.user._id, date });
    if (!dq) return res.status(404).json({ error: 'No quests found' });
    const quest = dq.quests[questIndex];
    if (!quest) return res.status(400).json({ error: 'Invalid quest' });
    if (!quest.completed) return res.status(400).json({ error: 'Quest not completed' });
    if (quest.claimed) return res.status(400).json({ error: 'Already claimed' });

    quest.claimed = true;
    dq.allClaimed = dq.quests.every(q => q.claimed);
    await dq.save();

    const user = await User.findById(req.user._id);
    user.gold += quest.rewardGold;
    await user.save();

    res.json({ success: true, rewardGold: quest.rewardGold, user: user.toObject(), quests: dq });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/quests/daily/claim-all', requireAuth, async (req, res) => {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const dq = await DailyQuest.findOne({ userId: req.user._id, date });
    if (!dq) return res.status(404).json({ error: 'No quests found' });
    let totalReward = 0;
    dq.quests.forEach(q => {
      if (q.completed && !q.claimed) {
        q.claimed = true;
        totalReward += q.rewardGold;
      }
    });
    dq.allClaimed = dq.quests.every(q => q.claimed);
    await dq.save();

    const user = await User.findById(req.user._id);
    user.gold += totalReward;
    await user.save();

    res.json({ success: true, totalReward, user: user.toObject(), quests: dq });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/game/achievements', requireAuth, async (req, res) => {
  try {
    const userAchievements = await UserAchievement.find({ userId: req.user._id }).lean();
    const progressMap = {};
    userAchievements.forEach(ua => { progressMap[ua.key] = ua; });

    const result = ACHIEVEMENT_DEFS.map(def => ({
      ...def,
      progress: progressMap[def.key]?.progress || 0,
      completed: progressMap[def.key]?.completed || false,
      claimed: progressMap[def.key]?.claimed || false,
    }));

    const User = require('../models/mongoose').User;
    const user = await User.findById(req.user._id).lean();
    res.json({ success: true, achievements: result, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/achievements/claim', requireAuth, async (req, res) => {
  try {
    const { key } = req.body;
    const def = ACHIEVEMENT_DEFS.find(d => d.key === key);
    if (!def) return res.status(400).json({ error: 'Invalid achievement' });

    const ua = await UserAchievement.findOne({ userId: req.user._id, key });
    if (!ua || !ua.completed) return res.status(400).json({ error: 'Achievement not completed' });
    if (ua.claimed) return res.status(400).json({ error: 'Already claimed' });

    ua.claimed = true;
    await ua.save();

    const user = await User.findById(req.user._id);
    user.gold += def.rewardGold;
    await user.save();

    res.json({ success: true, rewardGold: def.rewardGold, user: user.toObject() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
