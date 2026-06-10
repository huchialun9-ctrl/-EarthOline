const express = require('express');
const router = express.Router();
const Clan = require('../models/Clan');
const { User } = require('../models/mongoose');

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.post('/game/clan/create', requireAuth, async (req, res) => {
  try {
    const { name, tag, description } = req.body;
    if (!name || !tag) return res.status(400).json({ error: 'Name and tag required' });
    if (tag.length > 4) return res.status(400).json({ error: 'Tag max 4 chars' });
    const existing = await Clan.findOne({ $or: [{ name }, { leader: req.user._id }] });
    if (existing) return res.status(400).json({ error: 'Name taken or already in a clan' });
    const clan = await Clan.create({ name, tag, description: description || '', leader: req.user._id, members: [{ userId: req.user._id, role: 'leader' }] });
    res.json({ success: true, clan: clan.toObject() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/game/clan/my', requireAuth, async (req, res) => {
  try {
    const clan = await Clan.findOne({ 'members.userId': req.user._id }).populate('members.userId', 'username gold mineLevel faction').populate('leader', 'username').populate('joinRequests.userId', 'username').lean();
    if (!clan) return res.json({ success: true, clan: null });
    const memberInfo = await User.find({ _id: { $in: clan.members.map(m => m.userId) } }).select('username gold mineLevel faction lastActive').lean();
    const memberMap = {};
    memberInfo.forEach(m => { memberMap[m._id.toString()] = m; });
    const enriched = clan.members.map(m => ({ ...m, user: memberMap[m.userId?.toString()] || null }));
    res.json({ success: true, clan: { ...clan, members: enriched } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/clan/update', requireAuth, async (req, res) => {
  try {
    const { description } = req.body;
    const clan = await Clan.findOne({ leader: req.user._id });
    if (!clan) return res.status(404).json({ error: 'Clan not found or not leader' });
    if (description !== undefined) clan.description = description;
    await clan.save();
    res.json({ success: true, clan: clan.toObject() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/game/clan/list', requireAuth, async (req, res) => {
  try {
    const clans = await Clan.find().select('name tag level members goldPool').lean();
    const result = clans.map(c => ({ ...c, memberCount: c.members.length }));
    res.json({ success: true, clans: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/clan/join', requireAuth, async (req, res) => {
  try {
    const { clanId } = req.body;
    const clan = await Clan.findById(clanId);
    if (!clan) return res.status(404).json({ error: 'Clan not found' });
    if (clan.members.some(m => m.userId.toString() === req.user._id.toString())) return res.status(400).json({ error: 'Already in this clan' });
    if (clan.joinRequests.some(r => r.userId.toString() === req.user._id.toString())) return res.status(400).json({ error: 'Already requested' });
    const existingClan = await Clan.findOne({ 'members.userId': req.user._id });
    if (existingClan) return res.status(400).json({ error: 'Already in a clan' });
    clan.joinRequests.push({ userId: req.user._id });
    await clan.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/clan/handle-request', requireAuth, async (req, res) => {
  try {
    const { clanId, userId, accept } = req.body;
    const clan = await Clan.findById(clanId);
    if (!clan) return res.status(404).json({ error: 'Clan not found' });
    if (clan.leader.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Not leader' });
    const reqIdx = clan.joinRequests.findIndex(r => r.userId.toString() === userId);
    if (reqIdx === -1) return res.status(404).json({ error: 'Request not found' });
    clan.joinRequests.splice(reqIdx, 1);
    if (accept) {
      clan.members.push({ userId, role: 'member' });
    }
    await clan.save();
    res.json({ success: true, clan: clan.toObject() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/clan/leave', requireAuth, async (req, res) => {
  try {
    const clan = await Clan.findOne({ 'members.userId': req.user._id });
    if (!clan) return res.status(404).json({ error: 'Not in a clan' });
    const member = clan.members.find(m => m.userId.toString() === req.user._id.toString());
    if (member.role === 'leader') return res.status(400).json({ error: 'Transfer leadership first' });
    clan.members = clan.members.filter(m => m.userId.toString() !== req.user._id.toString());
    await clan.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/clan/kick', requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const clan = await Clan.findOne({ 'members.userId': req.user._id });
    if (!clan) return res.status(404).json({ error: 'Not in a clan' });
    const me = clan.members.find(m => m.userId.toString() === req.user._id.toString());
    if (me.role !== 'leader' && me.role !== 'officer') return res.status(403).json({ error: 'No permission' });
    const target = clan.members.find(m => m.userId.toString() === userId);
    if (!target) return res.status(404).json({ error: 'Member not found' });
    if (target.role === 'leader') return res.status(400).json({ error: 'Cannot kick leader' });
    if (me.role === 'officer' && target.role === 'officer') return res.status(403).json({ error: 'Cannot kick another officer' });
    clan.members = clan.members.filter(m => m.userId.toString() !== userId);
    await clan.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/game/clan/transfer', requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const clan = await Clan.findOne({ 'members.userId': req.user._id });
    if (!clan) return res.status(404).json({ error: 'Not in a clan' });
    if (clan.leader.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Not leader' });
    if (!clan.members.some(m => m.userId.toString() === userId)) return res.status(404).json({ error: 'Member not found' });
    clan.leader = userId;
    clan.members = clan.members.map(m => {
      if (m.userId.toString() === req.user._id.toString()) return { ...m, role: 'member' };
      if (m.userId.toString() === userId) return { ...m, role: 'leader' };
      return m;
    });
    await clan.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/game/clan/leaderboard', requireAuth, async (req, res) => {
  try {
    const clans = await Clan.find().select('name tag level goldPool members').lean();
    const result = clans.map(c => ({ name: c.name, tag: c.tag, level: c.level, memberCount: c.members.length, goldPool: c.goldPool }));
    result.sort((a, b) => b.level - a.level || b.goldPool - a.goldPool);
    res.json({ success: true, clans: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
