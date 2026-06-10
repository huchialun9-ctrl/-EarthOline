const express = require('express');
const router = express.Router();
const { User } = require('../models/mongoose');

module.exports = (passport) => {
  router.get('/auth/discord', passport.authenticate('discord'));

  router.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => { res.redirect('/game'); }
  );

  router.post('/auth/dev-login', async (req, res) => {
    try {
      let user = await User.findOne({ discordId: 'dev_user' });
      if (!user) {
        user = await User.create({
          discordId: 'dev_user',
          username: '開發者Miner',
          discriminator: '0000',
          avatar: '',
          faction: 'none'
        });
      }
      req.login(user.toObject(), (err) => {
        if (err) return res.status(500).json({ error: 'Login error' });
        res.json({ success: true, user: user.toObject() });
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/auth/me', (req, res) => {
    if (req.user) {
      const user = req.user;
      user.discordAvatarUrl = user.discordId && user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}`
        : null;
      user.discordTag = user.discordId
        ? `${user.username}${user.discriminator && user.discriminator !== '0' ? '#' + user.discriminator : ''}`
        : user.username;
      res.json({ loggedIn: true, user });
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
