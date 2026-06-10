const express = require('express');
const router = express.Router();
const { User, Country, Artifact, UserArtifact } = require('../models/mongoose');

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.get('/game/countries', async (req, res) => {
  try {
    const countries = await Country.find().lean();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineUsers = await User.find({ currentCountry: { $ne: null }, lastActive: { $gte: fiveMinAgo } }).lean();
    const onlineMap = {};
    onlineUsers.forEach(u => { onlineMap[u.currentCountry] = (onlineMap[u.currentCountry] || 0) + 1; });

    const result = countries.map(c => {
      const countryUsers = onlineUsers.filter(u => u.currentCountry === c.code);
      const totalGps = countryUsers.reduce((sum, u) => sum + (u.goldPerSec || 0), 0);
      return { ...c, online_count: onlineMap[c.code] || 0, total_gold_per_sec: totalGps };
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/deploy', requireAuth, async (req, res) => {
  try {
    const { countryCode } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.currentCountry = countryCode;
    user.lastActive = new Date();
    const country = await Country.findOne({ code: countryCode });
    if (country) {
      user.goldPerSec = country.baseGoldPerSec * (1 + (user.mineLevel - 1) * 0.5) * (user.rebirthBonus || 1.0);
    }
    await user.save();
    res.json({ success: true, user: user.toObject(), country });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/mine/upgrade', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const cost = Math.pow(10, user.mineLevel) * 100;
    if (user.gold < cost) return res.status(400).json({ error: 'Insufficient gold', cost, gold: user.gold });

    user.mineLevel += 1;
    user.gold -= cost;
    if (user.currentCountry) {
      const country = await Country.findOne({ code: user.currentCountry });
      if (country) {
        user.goldPerSec = country.baseGoldPerSec * (1 + (user.mineLevel - 1) * 0.5) * (user.rebirthBonus || 1.0);
      }
    }
    await user.save();
    res.json({ success: true, user: user.toObject() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/mine/claim', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const now = Date.now();
    const lastActive = user.lastActive ? new Date(user.lastActive).getTime() : now;
    const elapsed = Math.min((now - lastActive) / 1000, 3600);
    const earned = elapsed * (user.goldPerSec || 0);
    if (earned > 0) user.gold += earned;
    user.lastActive = new Date();
    await user.save();
    res.json({ success: true, earned, user: user.toObject() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/gacha/draw', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const cost = 10000000000;
    if (user.gold < cost) return res.status(400).json({ error: 'Insufficient gold', cost, gold: user.gold });

    const roll = Math.random();
    let rarity;
    if (roll < 0.8999) rarity = 'common';
    else if (roll < 0.9989) rarity = 'epic';
    else if (roll < 0.99999) rarity = 'mythic';
    else rarity = 'unique';

    let available = await Artifact.find({ rarity, remainingQuantity: { $gt: 0 } });
    if (available.length === 0) {
      rarity = 'common';
      available = await Artifact.find({ rarity, remainingQuantity: { $gt: 0 } });
    }
    if (available.length === 0) return res.status(500).json({ error: 'No artifacts available' });

    const idx = Math.floor(Math.random() * available.length);
    const artifact = available[idx];

    const updated = await Artifact.findOne({ _id: artifact._id, remainingQuantity: { $gt: 0 } });
    if (!updated) return res.status(400).json({ error: 'Sold out' });

    user.gold -= cost;
    updated.remainingQuantity -= 1;
    await updated.save();

    const ua = await UserArtifact.create({ userId: user._id, artifactId: artifact._id });

    if (artifact.effectType === 'speed' && artifact.rarity !== 'common') {
      user.goldPerSec = (user.goldPerSec || 0) * (1 + artifact.effectValue / 100.0);
    }
    await user.save();

    const userArtifacts = await UserArtifact.find({ userId: user._id })
      .populate('artifactId')
      .sort({ createdAt: -1 })
      .lean();

    const inventory = userArtifacts.map(ua => ({
      id: ua._id,
      userId: ua.userId,
      artifactId: ua.artifactId?._id,
      acquiredAt: ua.createdAt,
      ...(ua.artifactId || {}),
      _id: undefined,
      __v: undefined,
    }));

    res.json({
      success: true,
      artifact: artifact.toObject(),
      user: user.toObject(),
      inventory,
      isUnique: artifact.rarity === 'unique',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/game/inventory', requireAuth, async (req, res) => {
  try {
    const items = await UserArtifact.find({ userId: req.user._id })
      .populate('artifactId')
      .sort({ createdAt: -1 })
      .lean();
    const inventory = items.map(ua => ({
      id: ua._id, userId: ua.userId, artifactId: ua.artifactId?._id,
      acquiredAt: ua.createdAt, ...(ua.artifactId || {}),
      _id: undefined, __v: undefined,
    }));
    res.json(inventory);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/salvage', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.body;
    const ua = await UserArtifact.findById(itemId).populate('artifactId');
    if (!ua || ua.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Item not found' });
    }
    if (ua.artifactId.rarity !== 'common') return res.status(400).json({ error: 'Only common items can be salvaged' });

    await UserArtifact.findByIdAndDelete(itemId);
    const user = await User.findById(req.user._id);
    user.rebirthBonus = (user.rebirthBonus || 1.0) + 0.01;
    await user.save();
    res.json({ success: true, user: user.toObject(), crystals: 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/rebirth', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.mineLevel = 1;
    user.gold = 0;
    user.totalRebirths = (user.totalRebirths || 0) + 1;
    user.goldPerSec = 0;
    await user.save();
    res.json({ success: true, user: user.toObject() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/faction/join', requireAuth, async (req, res) => {
  try {
    const { faction } = req.body;
    if (!['asia', 'americas', 'europe'].includes(faction)) return res.status(400).json({ error: 'Invalid faction' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.faction !== 'none') return res.status(400).json({ error: 'Already in a faction' });
    user.faction = faction;
    await user.save();
    res.json({ success: true, user: user.toObject() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/game/stats', requireAuth, async (req, res) => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const totalUsers = await User.countDocuments();
    const onlineUsers = await User.countDocuments({ lastActive: { $gte: fiveMinAgo } });
    const factionAuras = await require('../models/mongoose').FactionAura.find().lean();
    const onlineUsersList = await User.find({ lastActive: { $gte: fiveMinAgo } }).lean();
    const globalGoldPerSec = onlineUsersList.reduce((sum, u) => sum + (u.goldPerSec || 0), 0);
    const topPlayers = await User.find().sort({ gold: -1 }).limit(10).select('username gold mineLevel faction').lean();
    res.json({ totalUsers, onlineUsers, factionAuras, globalGoldPerSec, topPlayers });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
