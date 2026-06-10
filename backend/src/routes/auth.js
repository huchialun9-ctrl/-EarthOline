const express = require('express');
const router = express.Router();
const db = require('../models/database');

module.exports = (passport) => {
  router.get('/discord', passport.authenticate('discord'));

  router.get('/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => { res.redirect('/game'); }
  );

  router.get('/me', (req, res) => {
    if (req.user) {
      res.json({ loggedIn: true, user: req.user });
    } else {
      res.json({ loggedIn: false });
    }
  });

  router.post('/logout', (req, res) => {
    req.logout(() => res.json({ success: true }));
  });

  router.post('/agreement', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not logged in' });
    const d = db.getData();
    const user = d.users.find(u => u.id === req.user.id);
    if (user) {
      user.agreed_at = new Date().toISOString();
      db.saveData();
    }
    res.json({ success: true });
  });

  return router;
};
