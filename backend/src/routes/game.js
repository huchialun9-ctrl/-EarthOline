const express = require('express');
const router = express.Router();
const db = require('../models/database');

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

module.exports = (io) => {

  router.get('/countries', (req, res) => {
    const d = db.getData();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const onlineUsers = d.users.filter(u => u.current_country && u.last_active && new Date(u.last_active) > new Date(fiveMinAgo));
    const onlineMap = {};
    onlineUsers.forEach(u => { onlineMap[u.current_country] = (onlineMap[u.current_country] || 0) + 1; });

    const result = d.countries.map(c => {
      const countryUsers = onlineUsers.filter(u => u.current_country === c.code);
      const totalGps = countryUsers.reduce((sum, u) => sum + (u.gold_per_sec || 0), 0);
      return { ...c, online_count: onlineMap[c.code] || 0, total_gold_per_sec: totalGps };
    });
    res.json(result);
  });

  router.post('/deploy', requireAuth, (req, res) => {
    const { countryCode } = req.body;
    const d = db.getData();
    const user = d.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.current_country = countryCode;
    user.last_active = new Date().toISOString();

    const country = d.countries.find(c => c.code === countryCode);
    if (country) {
      user.gold_per_sec = country.base_gold_per_sec * (1 + (user.mine_level - 1) * 0.5) * (user.rebirth_bonus || 1.0);
    }
    db.saveData();
    res.json({ success: true, user, country });
  });

  router.post('/mine/upgrade', requireAuth, (req, res) => {
    const d = db.getData();
    const user = d.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const cost = Math.pow(10, user.mine_level) * 100;
    if (user.gold < cost) return res.status(400).json({ error: 'Insufficient gold', cost, gold: user.gold });

    user.mine_level += 1;
    user.gold -= cost;

    if (user.current_country) {
      const country = d.countries.find(c => c.code === user.current_country);
      if (country) {
        user.gold_per_sec = country.base_gold_per_sec * (1 + (user.mine_level - 1) * 0.5) * (user.rebirth_bonus || 1.0);
      }
    }
    db.saveData();
    res.json({ success: true, user });
  });

  router.post('/mine/claim', requireAuth, (req, res) => {
    const d = db.getData();
    const user = d.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = Date.now();
    const lastActive = user.last_active ? new Date(user.last_active).getTime() : now;
    const elapsed = Math.min((now - lastActive) / 1000, 3600);
    const earned = elapsed * (user.gold_per_sec || 0);

    if (earned > 0) user.gold += earned;
    user.last_active = new Date().toISOString();
    db.saveData();
    res.json({ success: true, earned, user });
  });

  router.post('/gacha/draw', requireAuth, (req, res) => {
    const d = db.getData();
    const user = d.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const cost = 10000000000;
    if (user.gold < cost) return res.status(400).json({ error: 'Insufficient gold', cost, gold: user.gold });

    const roll = Math.random();
    let rarity;
    if (roll < 0.8999) rarity = 'common';
    else if (roll < 0.9989) rarity = 'epic';
    else if (roll < 0.99999) rarity = 'mythic';
    else rarity = 'unique';

    let available = d.artifacts.filter(a => a.rarity === rarity && a.remaining_quantity > 0);
    if (available.length === 0) {
      rarity = 'common';
      available = d.artifacts.filter(a => a.rarity === rarity && a.remaining_quantity > 0);
    }
    if (available.length === 0) return res.status(500).json({ error: 'No artifacts available' });

    const artifact = available[Math.floor(Math.random() * available.length)];
    const updated = d.artifacts.find(a => a.id === artifact.id);
    if (!updated || updated.remaining_quantity <= 0) return res.status(400).json({ error: 'Sold out' });

    user.gold -= cost;
    updated.remaining_quantity -= 1;

    const ua = {
      id: d.nextUserArtifactId++,
      user_id: user.id,
      artifact_id: artifact.id,
      acquired_at: new Date().toISOString(),
      is_equipped: 0
    };
    d.userArtifacts.push(ua);

    if (artifact.effect_type === 'speed' && artifact.rarity !== 'common') {
      user.gold_per_sec = (user.gold_per_sec || 0) * (1 + artifact.effect_value / 100.0);
    }
    db.saveData();

    const userArtifacts = d.userArtifacts
      .filter(ua => ua.user_id === user.id)
      .map(ua => {
        const a = d.artifacts.find(art => art.id === ua.artifact_id);
        return { ...ua, ...a };
      })
      .sort((a, b) => new Date(b.acquired_at) - new Date(a.acquired_at));

    if (artifact.rarity === 'unique') {
      io.emit('game:unique-drop', { username: user.username, artifactName: artifact.name_cn || artifact.name, artifactId: artifact.id });
    }

    res.json({ success: true, artifact, user, inventory: userArtifacts });
  });

  router.get('/inventory', requireAuth, (req, res) => {
    const d = db.getData();
    const items = d.userArtifacts
      .filter(ua => ua.user_id === req.user.id)
      .map(ua => {
        const a = d.artifacts.find(art => art.id === ua.artifact_id);
        return { ...ua, ...a };
      })
      .sort((a, b) => new Date(b.acquired_at) - new Date(a.acquired_at));
    res.json(items);
  });

  router.post('/salvage', requireAuth, (req, res) => {
    const { itemId } = req.body;
    const d = db.getData();
    const ua = d.userArtifacts.find(u => u.id === itemId && u.user_id === req.user.id);
    if (!ua) return res.status(404).json({ error: 'Item not found' });
    const artifact = d.artifacts.find(a => a.id === ua.artifact_id);
    if (artifact.rarity !== 'common') return res.status(400).json({ error: 'Only common items can be salvaged' });

    const idx = d.userArtifacts.indexOf(ua);
    if (idx > -1) d.userArtifacts.splice(idx, 1);
    const user = d.users.find(u => u.id === req.user.id);
    if (user) user.rebirth_bonus = (user.rebirth_bonus || 1.0) + 0.01;
    db.saveData();

    res.json({ success: true, user, crystals: 1 });
  });

  router.post('/rebirth', requireAuth, (req, res) => {
    const d = db.getData();
    const user = d.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.mine_level = 1;
    user.gold = 0;
    user.total_rebirths = (user.total_rebirths || 0) + 1;
    user.gold_per_sec = 0;
    db.saveData();
    res.json({ success: true, user });
  });

  router.post('/faction/join', requireAuth, (req, res) => {
    const { faction } = req.body;
    if (!['asia', 'americas', 'europe'].includes(faction)) return res.status(400).json({ error: 'Invalid faction' });
    const d = db.getData();
    const user = d.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.faction !== 'none') return res.status(400).json({ error: 'Already in a faction' });

    user.faction = faction;
    db.saveData();
    res.json({ success: true, user });
  });

  router.get('/stats', requireAuth, (req, res) => {
    const d = db.getData();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const totalUsers = d.users.length;
    const onlineUsers = d.users.filter(u => u.last_active && new Date(u.last_active) > new Date(fiveMinAgo)).length;
    const factionAuras = Object.entries(d.factionAura).map(([faction, aura_value]) => ({ faction, aura_value }));
    const globalGoldPerSec = d.users.filter(u => u.last_active && new Date(u.last_active) > new Date(fiveMinAgo)).reduce((sum, u) => sum + (u.gold_per_sec || 0), 0);
    const topPlayers = d.users.sort((a, b) => (b.gold || 0) - (a.gold || 0)).slice(0, 10).map(u => ({ username: u.username, gold: u.gold, mine_level: u.mine_level, faction: u.faction }));

    res.json({ totalUsers, onlineUsers, factionAuras, globalGoldPerSec, topPlayers });
  });

  return router;
};
