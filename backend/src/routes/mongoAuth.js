const express = require('express');
const router = express.Router();
const { User } = require('../models/mongoose');

module.exports = (passport) => {
  router.get('/auth/discord', passport.authenticate('discord'));

  router.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => { res.redirect('/game'); }
  );

  router.get('/auth/me', (req, res) => {
    if (req.user) {
      res.json({ loggedIn: true, user: req.user });
    } else {
      res.json({ loggedIn: false });
    }
  });

  router.post('/auth/logout', (req, res) => {
    req.logout(() => res.json({ success: true }));
  });

  router.post('/auth/agreement', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not logged in' });
    await User.findByIdAndUpdate(req.user._id, { agreedAt: new Date() });
    res.json({ success: true });
  });

  return router;
};
