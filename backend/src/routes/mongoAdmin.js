const express = require('express');
const router = express.Router();
const { Artifact, User } = require('../models/mongoose');

router.get('/admin/artifacts', async (req, res) => {
  try {
    const artifacts = await Artifact.find().sort({ rarity: 1, name: 1 }).lean();
    res.json(artifacts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admin/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    const total = await User.countDocuments();
    const users = await User.find()
      .sort({ gold: -1 })
      .skip(skip)
      .limit(limit)
      .select('username faction gold mineLevel totalRebirths currentCountry lastActive')
      .lean();
    res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
