const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/artifacts', (req, res) => {
  const d = db.getData();
  res.json(d.artifacts.sort((a, b) => a.rarity.localeCompare(b.rarity) || a.name.localeCompare(b.name)));
});

router.get('/users', (req, res) => {
  const d = db.getData();
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  const users = d.users.slice(offset, offset + limit).map(u => ({
    id: u.id, username: u.username, faction: u.faction,
    gold: u.gold, mine_level: u.mine_level, total_rebirths: u.total_rebirths,
    current_country: u.current_country, last_active: u.last_active
  }));
  const total = d.users.length;
  res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
});

module.exports = router;
