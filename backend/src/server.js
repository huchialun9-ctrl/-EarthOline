require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const { connectDB, User, FactionAura, recalculateAura } = require('./models/mongoose');
const discordBot = require('./services/discordBot');

const app = express();

if (process.env.DISCORD_BOT_TOKEN) {
  discordBot.setToken(process.env.DISCORD_BOT_TOKEN);
  console.log('Discord bot token configured');
}

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

passport.serializeUser((user, done) => done(null, user._id));
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
    scope: ['identify', 'guilds']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const userData = {
        discordId: profile.id,
        username: profile.global_name || profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar || '',
        banner: profile.banner || null,
        accentColor: profile.accent_color || null,
        locale: profile.locale || null
      };

      let user = await User.findOne({ discordId: profile.id });
      if (user) {
        Object.assign(user, userData);
        await user.save();
      } else {
        user = await User.create({ ...userData, faction: 'none' });
      }
      done(null, user.toObject());
    } catch (e) {
      done(e, null);
    }
  }));
  console.log('Discord OAuth configured');
} else {
  console.log('Discord OAuth not configured. Set DISCORD_CLIENT_SECRET in .env for Discord login.');
}

app.use(express.static(path.join(__dirname, '../../frontend')));

app.use('/api', require('./routes/mongoAuth')(passport));
app.use('/api', require('./routes/mongoGame'));
app.use('/api', require('./routes/mongoAdmin'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

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
