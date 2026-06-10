const https = require('https');

const DISCORD_API = 'https://discord.com/api/v10';

let botToken = process.env.DISCORD_BOT_TOKEN || null;

function setToken(token) {
  botToken = token;
}

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    if (!botToken) return reject(new Error('No bot token configured'));

    const url = new URL(path, DISCORD_API);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'EarthOnline/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function sendChannelMessage(channelId, content, embed = null) {
  try {
    const payload = { content };
    if (embed) payload.embeds = [embed];
    return await apiRequest('POST', `/channels/${channelId}/messages`, payload);
  } catch (e) {
    console.error('Discord send message error:', e.message);
    return null;
  }
}

async function createAnnouncementEmbed(title, description, color = 0x44cc44, fields = []) {
  return {
    title,
    description,
    color,
    timestamp: new Date().toISOString(),
    footer: { text: 'Earth Online 地球在線' },
    fields
  };
}

async function announceUniqueDrop(username, artifactName, artifactId) {
  const channelId = process.env.DISCORD_ANNOUNCE_CHANNEL;
  if (!channelId) return;

  const embed = await createAnnouncementEmbed(
    '全服唯一神物現世！',
    `<@${username}> 獲得了 **${artifactName}**！`,
    0xff4444,
    [
      { name: '探險者', value: username, inline: true },
      { name: '神物', value: artifactName, inline: true },
      { name: '狀態', value: '已絕版', inline: true }
    ]
  );

  return await sendChannelMessage(channelId, '@everyone 全服唯一神物被發現了！', embed);
}

async function getUser(userId) {
  try {
    return await apiRequest('GET', `/users/${userId}`);
  } catch (e) {
    return null;
  }
}

async function getGuildMember(guildId, userId) {
  try {
    return await apiRequest('GET', `/guilds/${guildId}/members/${userId}`);
  } catch (e) {
    return null;
  }
}

module.exports = {
  setToken,
  sendChannelMessage,
  announceUniqueDrop,
  getUser,
  getGuildMember,
  createAnnouncementEmbed
};
