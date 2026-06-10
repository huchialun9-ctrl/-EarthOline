// Earth Online - Main Game Engine
// Handles UI, game state, socket communication, and rendering

let gameState = {
  user: null,
  gold: 0,
  goldPerSec: 0,
  mineLevel: 1,
  currentCountry: null,
  faction: 'none',
  totalRebirths: 0,
  rebirthBonus: 1.0,
  inventory: [],
  countries: [],
  onlineCounts: {},
  stats: null,
};

let pixelMap = null;
let goldInterval = null;
let animationFrame = null;
let eventSource = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  initMineCanvas();
});

function checkAuthStatus() {
  fetch('/api/auth/me')
    .then(r => r.json())
    .then(data => {
      if (data.loggedIn) {
        gameState.user = data.user;
        gameState.gold = data.user.gold || 0;
        gameState.goldPerSec = data.user.goldPerSec || data.user.gold_per_sec || 0;
        gameState.mineLevel = data.user.mineLevel || data.user.mine_level || 1;
        gameState.currentCountry = data.user.currentCountry || data.user.current_country;
        gameState.faction = data.user.faction;
        gameState.totalRebirths = data.user.totalRebirths || data.user.total_rebirths || 0;
        gameState.rebirthBonus = data.user.rebirthBonus || data.user.rebirth_bonus || 1.0;

        if (data.user.faction !== 'none') {
          showScreen('game');
          initGame();
        } else {
          showScreen('onboarding');
          document.getElementById('nav-username').textContent = data.user.username;
          document.getElementById('game-username').textContent = data.user.username;
        }
      } else {
        showScreen('login');
      }
    })
    .catch(() => showScreen('login'));
}

function setupSSE() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource('/api/events');

  eventSource.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'stats') {
        gameState.stats = msg.data;
        updateStatsUI();
      } else if (msg.type === 'online') {
        gameState.onlineCounts = msg.data;
        if (pixelMap) pixelMap.updateData(msg.data, null);
      }
    } catch (e) { }
  };

  eventSource.onerror = () => {
    setTimeout(setupSSE, 5000);
  };
}

// ===== SCREEN MANAGEMENT =====
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${screenId}`).classList.add('active');
}

// ===== LOGIN =====
function toggleAgree() {
  const checked = document.getElementById('agree-check').checked;
  const btn = document.getElementById('btn-enter');
  if (checked) {
    btn.classList.remove('disabled');
    btn.disabled = false;
  } else {
    btn.classList.add('disabled');
    btn.disabled = true;
  }
}

function loginWithDiscord() {
  window.location.href = '/api/auth/discord';
}

function enterGame() {
  if (!document.getElementById('agree-check').checked) return;
  if (!gameState.user) return;

  fetch('/api/auth/agreement', { method: 'POST' })
    .then(r => r.json())
    .then(() => {
      if (gameState.user && gameState.user.faction !== 'none') {
        showScreen('game');
        initGame();
      } else {
        showScreen('onboarding');
        document.getElementById('nav-username').textContent = gameState.user.username;
        document.getElementById('game-username').textContent = gameState.user.username;
      }
    });
}

// ===== ONBOARDING / FACTIONS =====
function selectFaction(faction) {
  fetch('/api/game/faction/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ faction })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        gameState.user.faction = faction;
        gameState.faction = faction;
        document.querySelectorAll('.faction-card').forEach(c => c.style.borderColor = '#444');
        document.querySelector(`.faction-${faction}`).style.borderColor = '#00cccc';
      }
    })
    .catch(e => console.error('Faction join error:', e));
}

function enterWorld() {
  if (gameState.faction === 'none') return;
  showScreen('game');
  initGame();
}

// ===== GAME INIT =====
function initGame() {
  document.getElementById('game-username').textContent = gameState.user ? gameState.user.username : 'Miner';
  setupSSE();

  const mapContainer = document.getElementById('map-container');
  const canvas = document.getElementById('world-map-canvas');
  pixelMap = new PixelMap(canvas, mapContainer);
  pixelMap.onSelectCountry = onCountrySelect;

  loadCountries();
  loadInventory();
  loadStats();
  startGoldSimulation();

  if (gameState.currentCountry) {
    pixelMap.selectedCountry = COUNTRY_DATA.find(c => c.code === gameState.currentCountry);
  }

  document.getElementById('btn-upgrade').textContent =
    `升級礦層 (${formatGold(Math.pow(10, gameState.mineLevel) * 100)})`;

  // Init mine canvas animation
  initMineCanvasAnimation();
}

// ===== COUNTRY MAP =====
function loadCountries() {
  fetch('/api/game/countries')
    .then(r => r.json())
    .then(countries => {
      gameState.countries = countries;
      const gpsMap = {};
      countries.forEach(c => gpsMap[c.code] = c.total_gold_per_sec);
      if (pixelMap) {
        pixelMap.updateData(gameState.onlineCounts, gpsMap);
      }
    })
    .catch(() => {});
}

function onCountrySelect(country) {
  const c = gameState.countries.find(cc => cc.code === country.code);
  document.getElementById('country-name').textContent = country.name_cn;
  document.getElementById('country-online').textContent = c ? (c.online_count || 0) : 0;
  document.getElementById('country-gps').textContent = c ? formatGold(c.total_gold_per_sec || 0) : '0';
  document.getElementById('country-continent').textContent = getContinentName(country.continent);

  gameState.currentCountry = country.code;
  document.getElementById('btn-deploy').style.display = 'block';
}

function getContinentName(cont) {
  const names = { americas: '美洲', europe: '歐洲', asia: '亞洲', africa: '非洲', oceania: '大洋洲' };
  return names[cont] || cont;
}

function deployMine() {
  if (!gameState.currentCountry) return;

  fetch('/api/game/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ countryCode: gameState.currentCountry })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        gameState.goldPerSec = data.user.goldPerSec || data.user.gold_per_sec || 0;
        gameState.user = data.user;
        updateMiningUI();
        document.getElementById('btn-deploy').style.display = 'none';
      }
    })
    .catch(e => console.error('Deploy error:', e));
}

// ===== MINING =====
function startGoldSimulation() {
  if (goldInterval) clearInterval(goldInterval);

  goldInterval = setInterval(() => {
    if (gameState.goldPerSec > 0) {
      const increment = gameState.goldPerSec / 10;
      gameState.gold += increment;

      const progressEl = document.getElementById('progress-fill');
      if (progressEl) {
        const nextLevel = gameState.mineLevel + 1;
        const cost = Math.pow(10, gameState.mineLevel) * 100;
        const pct = Math.min((gameState.gold / cost) * 100, 100);
        progressEl.style.width = pct + '%';
      }

      updateMiningUI();
    }
  }, 100);
}

function claimGold() {
  fetch('/api/game/mine/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        gameState.gold = data.user.gold;
        gameState.goldPerSec = data.user.gold_per_sec;
        updateMiningUI();
      }
    })
    .catch(e => console.error('Claim error:', e));
}

function upgradeMine() {
  fetch('/api/game/mine/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        gameState.user = data.user;
        gameState.gold = data.user.gold;
        gameState.mineLevel = data.user.mineLevel || data.user.mine_level;
        gameState.goldPerSec = data.user.goldPerSec || data.user.gold_per_sec;
        updateMiningUI();

        const nextCost = Math.pow(10, gameState.mineLevel) * 100;
        document.getElementById('btn-upgrade').textContent =
          gameState.mineLevel >= 5 ? '已達最高礦層' : `升級礦層 (${formatGold(nextCost)})`;
      }
    })
    .catch(e => console.error('Upgrade error:', e));
}

function doRebirth() {
  if (!confirm('確定進行礦場轉生？你將失去所有金幣和礦層等級，但保留幸運晶石加成。')) return;

  fetch('/api/game/rebirth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        gameState.user = data.user;
        gameState.gold = 0;
        gameState.mineLevel = 1;
        gameState.totalRebirths = data.user.total_rebirths;
        gameState.goldPerSec = data.user.gold_per_sec;
        updateMiningUI();
      }
    })
    .catch(e => console.error('Rebirth error:', e));
}

function updateMiningUI() {
  document.getElementById('display-gold').textContent = formatGold(Math.floor(gameState.gold));
  document.getElementById('display-gps').textContent = formatGold(gameState.goldPerSec);
  document.getElementById('mine-current-level').textContent = `Lv.${gameState.mineLevel}`;
  document.getElementById('mine-total-gold').textContent = formatGold(Math.floor(gameState.gold));
  document.getElementById('mine-rebirths').textContent = gameState.totalRebirths;

  document.querySelectorAll('.mine-level').forEach(el => {
    const level = parseInt(el.dataset.level);
    el.classList.toggle('active', level === gameState.mineLevel);
    el.classList.toggle('completed', level < gameState.mineLevel);
  });
}

// ===== GACHA =====
function drawGacha() {
  const btn = document.getElementById('btn-gacha');
  btn.disabled = true;
  btn.textContent = '抽取中...';

  const canvas = document.getElementById('gacha-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 300;
  canvas.height = 180;

  // Animate gacha
  let frame = 0;
  const animateGacha = () => {
    ctx.clearRect(0, 0, 300, 180);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 300, 180);

    // Scanline effect
    for (let i = 0; i < 180; i += 8) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
      ctx.fillRect(0, i, 300, 4);
    }

    // Random blocks
    for (let i = 0; i < 20; i++) {
      const bx = Math.random() * 280;
      const by = Math.random() * 160;
      const size = 8 + Math.random() * 24;
      ctx.fillStyle = `hsl(${Math.random() * 360}, 80%, 50%)`;
      ctx.fillRect(bx, by, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.strokeRect(bx, by, size, size);
    }

    // Glow overlay
    const gradient = ctx.createRadialGradient(150, 90, 10, 150, 90, 100);
    gradient.addColorStop(0, `rgba(255, 204, 0, ${0.2 + Math.sin(frame * 0.2) * 0.1})`);
    gradient.addColorStop(1, 'rgba(255, 204, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 180);

    // Lights animation
    document.querySelectorAll('.light').forEach((l, i) => {
      l.classList.toggle('active', Math.sin(frame * 0.1 + i) > 0.3);
    });

    frame++;

    if (frame < 60) {
      animationFrame = requestAnimationFrame(animateGacha);
    } else {
      performGachaDraw();
    }
  };

  animationFrame = requestAnimationFrame(animateGacha);
}

function performGachaDraw() {
  fetch('/api/game/gacha/draw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(r => r.json())
    .then(data => {
      const btn = document.getElementById('btn-gacha');
      btn.disabled = false;
      btn.textContent = '探尋秘寶';

      if (data.success) {
        gameState.gold = data.user.gold;
        gameState.goldPerSec = data.user.gold_per_sec;
        gameState.user = data.user;
        gameState.inventory = data.inventory || [];

        const resultDiv = document.getElementById('gacha-result');
        const rarityClass = `rarity-${data.artifact.rarity}`;
        resultDiv.className = `gacha-result ${rarityClass}`;
        resultDiv.innerHTML = `
          <div class="pixel-text">獲得：${data.artifact.name_cn || data.artifact.name}</div>
          <div class="pixel-text-sm">${data.artifact.description || ''}</div>
        `;

        if (data.isUnique) {
          showUniqueNotification({ username: gameState.user.username, artifactName: data.artifact.name_cn || data.artifact.name });
        }

        updateMiningUI();
        loadInventory();
      } else {
        const resultDiv = document.getElementById('gacha-result');
        resultDiv.className = 'gacha-result';
        resultDiv.innerHTML = `<div class="pixel-text-sm" style="color:#ff4444;">${data.error || '抽取失敗'}</div>`;
      }
    })
    .catch(e => {
      document.getElementById('btn-gacha').disabled = false;
      document.getElementById('btn-gacha').textContent = '探尋秘寶';
    });
}

// ===== INVENTORY =====
function loadInventory() {
  fetch('/api/game/inventory')
    .then(r => r.json())
    .then(items => {
      gameState.inventory = items;
      renderInventory();
    })
    .catch(() => {});
}

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;

  if (gameState.inventory.length === 0) {
    grid.innerHTML = '<div class="pixel-text-sm">倉庫空空如也...</div>';
    return;
  }

  grid.innerHTML = gameState.inventory.map(item => {
    const rarityColors = {
      common: '#aaaaaa', epic: '#aa44ff', mythic: '#ffaa00', unique: '#ff4444'
    };
    return `
      <div class="inventory-item" style="border-color: ${rarityColors[item.rarity] || '#444'}">
        <div class="item-rarity" style="color: ${rarityColors[item.rarity] || '#888'}">
          ${item.rarity.toUpperCase()}
        </div>
        <div class="item-icon" style="background:#222;">
          <svg width="48" height="48" viewBox="0 0 16 16">
            ${getIconSVG(item.image) || ''}
          </svg>
        </div>
        <div class="item-name">${item.name_cn || item.name}</div>
        <div class="item-desc">${item.description || ''}</div>
        ${item.rarity === 'common' ? `<button class="pixel-btn-sm" onclick="salvageItem(${item.id})" style="margin-top:4px;">熔煉</button>` : ''}
      </div>
    `;
  }).join('');
}

function salvageItem(itemId) {
  fetch('/api/game/salvage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        gameState.user = data.user;
        gameState.rebirthBonus = data.user.rebirth_bonus;
        loadInventory();
      }
    })
    .catch(e => console.error('Salvage error:', e));
}

// ===== STATS =====
function loadStats() {
  fetch('/api/game/stats')
    .then(r => r.json())
    .then(stats => {
      gameState.stats = stats;
      updateStatsUI();
    })
    .catch(() => {});
}

function updateStatsUI() {
  if (!gameState.stats) return;

  document.getElementById('stat-total-users').textContent = gameState.stats.totalUsers || 0;
  document.getElementById('stat-online-users').textContent = gameState.stats.onlineUsers || 0;
  document.getElementById('stat-global-gps').textContent = formatGold(gameState.stats.globalGoldPerSec || 0);

  // Faction aura
  const auraList = document.getElementById('faction-aura-list');
  if (auraList && gameState.stats.factionAuras) {
    const sorted = [...gameState.stats.factionAuras].sort((a, b) => b.aura_value - a.aura_value);
    auraList.innerHTML = sorted.map(f => `
      <div class="aura-row">
        <div class="aura-faction">
          <span class="pixel-icon icon-${f.faction === 'asia' ? 'temple' : f.faction === 'americas' ? 'building' : 'castle'}"></span>
          <span>${getFactionName(f.faction)}</span>
        </div>
        <span style="color: var(--gold)">${Math.floor(f.aura_value)}</span>
      </div>
    `).join('');
  }

  // Leaderboard
  const lbList = document.getElementById('leaderboard-list');
  if (lbList && gameState.stats.topPlayers) {
    lbList.innerHTML = gameState.stats.topPlayers.map((p, i) => `
      <div class="leaderboard-row">
        <span>#${i + 1} ${p.username}</span>
        <span style="color: var(--gold)">${formatGold(p.gold)}</span>
      </div>
    `).join('');
  }
}

function getFactionName(f) {
  const names = { asia: '亞洲陣營', americas: '美洲陣營', europe: '歐洲陣營' };
  return names[f] || f;
}

// ===== TAB SWITCHING =====
function switchTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.nav-tab[data-tab="${tab}"]`).classList.add('active');

  document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');

  if (tab === 'map' && pixelMap) {
    setTimeout(() => pixelMap._resize(), 100);
  }
  if (tab === 'stats') loadStats();
  if (tab === 'inventory') loadInventory();
  if (tab === 'mine') initMineCanvasAnimation();
}

// ===== MAP CONTROLS =====
function zoomMap(dir) {
  if (pixelMap) {
    if (dir > 0) pixelMap.zoomIn();
    else pixelMap.zoomOut();
  }
}

function resetMap() {
  if (pixelMap) pixelMap.resetView();
}

// ===== MINE CANVAS =====
function initMineCanvas() {
  const canvas = document.getElementById('mine-canvas');
  if (!canvas) return;
  canvas.width = 300;
  canvas.height = 180;
}

function initMineCanvasAnimation() {
  const canvas = document.getElementById('mine-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = 300;
  canvas.height = 180;

  let frame = 0;
  const animate = () => {
    ctx.clearRect(0, 0, 300, 180);

    // Background layers based on mine level
    const level = gameState.mineLevel;
    const colors = ['#444433', '#554433', '#446688', '#443366', '#662211'];
    const lc = colors[Math.min(level - 1, colors.length - 1)];

    // Cave wall
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 300, 180);

    // Rock layers
    for (let y = 0; y < 180; y += 16) {
      ctx.fillStyle = y < 40 ? '#222222' : (y < 80 ? lc : '#1a1a1a');
      ctx.fillRect(0, y, 300, 16);
    }

    // Ore veins
    for (let i = 0; i < 5 + level * 2; i++) {
      const ox = Math.sin(i * 1.5 + frame * 0.02) * 100 + 150;
      const oy = Math.cos(i * 2.3 + frame * 0.03) * 60 + 100;
      ctx.fillStyle = level >= 3 ? '#66ccff' : (level >= 2 ? '#ffaa00' : '#888866');
      ctx.fillRect(ox, oy, 8, 8);
    }

    // Pickaxe animation
    const px = 150 + Math.sin(frame * 0.05) * 20;
    const py = 80 + Math.sin(frame * 0.08) * 10;
    ctx.fillStyle = '#886644';
    ctx.fillRect(px - 2, py - 20, 4, 24);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(px - 6, py - 24, 8, 6);

    // Sparks
    if (Math.random() > 0.7) {
      ctx.fillStyle = '#ffcc00';
      const sx = px + (Math.random() - 0.5) * 30;
      const sy = py + (Math.random() - 0.5) * 20;
      ctx.fillRect(sx, sy, 4, 4);
    }

    frame++;
    animationFrame = requestAnimationFrame(animate);
  };

  if (animationFrame) cancelAnimationFrame(animationFrame);
  animate();
}

// ===== UNIQUE NOTIFICATION =====
function showUniqueNotification(data) {
  const notif = document.getElementById('unique-notification');
  const msg = document.getElementById('unique-msg');
  if (notif && msg) {
    notif.classList.remove('hidden');
    msg.textContent = `${data.username} 獲得了全服唯一神物【${data.artifactName}】！`;
    setTimeout(() => notif.classList.add('hidden'), 8000);
  }
}

// ===== UTILITY =====
function formatGold(amount) {
  if (amount >= 1000000000000) return (amount / 1000000000000).toFixed(1) + 'T';
  if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + 'B';
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
  return Math.floor(amount).toLocaleString();
}

// ===== GAME LOOP =====
setInterval(() => {
  if (gameState.stats) {
    loadCountries();
  }
}, 15000);
