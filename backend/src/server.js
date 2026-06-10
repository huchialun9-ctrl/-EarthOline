require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB, User, Country, Artifact, UserArtifact, FactionAura, recalculateAura } = require('./models/mongoose');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'earth-online-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user ? user.toObject() : null);
  } catch (e) {
    done(e, null);
  }
});

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  const DiscordStrategy = require('passport-discord').Strategy;
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
    scope: ['identify']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ discordId: profile.id });
      if (!user) {
        user = await User.create({
          discordId: profile.id,
          username: profile.username,
          avatar: profile.avatar || '',
          faction: 'none'
        });
      }
      done(null, user.toObject());
    } catch (e) {
      done(e, null);
    }
  }));
} else {
  console.log('Discord OAuth not configured. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in .env');
}

app.use(express.static(path.join(__dirname, '../../frontend')));

app.use('/api', require('./routes/mongoAuth')(passport));
app.use('/api', require('./routes/mongoGame'));
app.use('/api', require('./routes/mongoAdmin'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// SSE endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const statsInterval = setInterval(async () => {
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const totalUsers = await User.countDocuments();
      const onlineUsers = await User.countDocuments({ lastActive: { $gte: fiveMinAgo } });
      const factionAuras = await FactionAura.find();
      const onlineUsersList = await User.find({ lastActive: { $gte: fiveMinAgo } });
      const globalGoldPerSec = onlineUsersList.reduce((sum, u) => sum + (u.goldPerSec || 0), 0);
      res.write(`data: ${JSON.stringify({ type: 'stats', data: { totalUsers, onlineUsers, factionAuras, globalGoldPerSec } })}\n\n`);
    } catch (e) { }
  }, 5000);

  const onlineInterval = setInterval(async () => {
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const users = await User.find({ currentCountry: { $ne: null }, lastActive: { $gte: fiveMinAgo } });
      const map = {};
      users.forEach(u => { map[u.currentCountry] = (map[u.currentCountry] || 0) + 1; });
      res.write(`data: ${JSON.stringify({ type: 'online', data: map })}\n\n`);
    } catch (e) { }
  }, 10000);

  req.on('close', () => {
    clearInterval(statsInterval);
    clearInterval(onlineInterval);
  });
});

// Recalculate aura every 5 minutes
setInterval(recalculateAura, 300000);

const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Earth Online running on http://localhost:${PORT}`);
  });
}).catch(e => {
  console.error('Failed to connect to MongoDB:', e.message);
  process.exit(1);
});

module.exports = { app };
