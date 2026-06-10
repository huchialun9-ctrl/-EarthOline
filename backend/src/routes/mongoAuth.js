const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models/mongoose');

module.exports = (passport) => {
  router.post('/auth/register', async (req, res) => {
    try {
      const { email, password, username } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        email: email.toLowerCase().trim(),
        passwordHash,
        username: username || email.split('@')[0],
        faction: 'none',
      });

      req.login(user.toObject(), (err) => {
        if (err) return res.status(500).json({ error: 'Login error after register' });
        res.json({ success: true, user: user.toObject() });
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) return res.status(401).json({ error: 'Invalid email or password' });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

      req.login(user.toObject(), (err) => {
        if (err) return res.status(500).json({ error: 'Login error' });
        res.json({ success: true, user: user.toObject() });
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/auth/discord', passport.authenticate('discord'));

  router.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => { res.redirect('/game'); }
  );

  router.get('/auth/me', (req, res) => {
    if (req.user) {
      const user = { ...req.user };
      delete user.passwordHash;
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
