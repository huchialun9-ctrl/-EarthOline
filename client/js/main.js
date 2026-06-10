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

let goldInterval = null;
let animationFrame = null;
let eventSource = null;

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

        updateUserProfileDisplay();

        if (data.user.faction !== 'none') {
          showPage('game');
          initGame();
        } else {
          showPage('onboarding');
          document.getElementById('nav-username').textContent = data.user.discordTag || data.user.username;
          document.getElementById('game-username').textContent = data.user.discordTag || data.user.username;
        }
      } else {
        showPage('login');
      }
    })
    .catch(() => showPage('login'));
}

function updateUserProfileDisplay() {
  if (!gameState.user) return;
  const u = gameState.user;
  const displayName = u.discordTag || u.username;
  const avatarUrl = u.discordAvatarUrl;

  document.getElementById('nav-username').textContent = displayName;
  document.getElementById('game-username').textContent = displayName;
  document.getElementById('menu-username').textContent = displayName;
  document.getElementById('menu-discord-tag').textContent = u.discordId ? (u.discriminator && u.discriminator !== '0' ? `@${u.username}#${u.discriminator}` : `@${u.username}`) : 'localhost';

  if (avatarUrl) {
    document.querySelectorAll('.user-avatar').forEach(el => {
      el.src = avatarUrl;
      el.style.display = 'inline-block';
    });
    document.getElementById('menu-avatar').src = avatarUrl;
  } else {
    document.getElementById('menu-avatar').style.display = 'none';
  }
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
        const factionMap = {};
        gameState.countries.forEach(c => {
          if (c.dominant_faction) factionMap[c.code] = c.dominant_faction;
        });
        if (typeof updateMapData === 'function') {
          updateMapData(msg.data, null, factionMap);
        }
      }
    } catch (e) { }
  };

  eventSource.onerror = () => {
    setTimeout(setupSSE, 5000);
  };
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${pageId}`).classList.add('active');
}

function switchGamePage(page) {
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.sidebar-btn[data-page="${page}"]`).classList.add('active');
  document.querySelectorAll('.game-page').forEach(g => g.classList.remove('active'));
  document.getElementById(`gpage-${page}`).classList.add('active');
  if (page === 'map' && worldMap) setTimeout(() => worldMap.invalidateSize(), 100);
  if (page === 'stats') loadStats();
  if (page === 'inventory') loadInventory();
  if (page === 'mine') initMineCanvasAnimation();
  if (page === 'goals') { loadQuests(); loadAchievements(); }
  if (page === 'clan') loadClanView();
}

function switchLoginTab(tab) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.login-tab[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.login-tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`login-tab-${tab}`).classList.add('active');
  document.getElementById('login-error').textContent = '';
  document.getElementById('reg-error').textContent = '';
}

function clearLoginErrors() {
  document.getElementById('login-error').textContent = '';
  document.getElementById('reg-error').textContent = '';
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');

  if (!email || !password) {
    errEl.textContent = '請填寫信箱和密碼';
    return;
  }

  errEl.textContent = '登入中...';
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        gameState.user = data.user;
        gameState.faction = data.user.faction;
        updateUserProfileDisplay();
        document.getElementById('nav-username').textContent = data.user.username;
        document.getElementById('game-username').textContent = data.user.username;
        if (data.user.faction !== 'none') {
          showPage('game');
          initGame();
        } else {
          showPage('onboarding');
        }
      } else {
        errEl.textContent = data.error || '登入失敗';
      }
    })
    .catch(() => { errEl.textContent = '伺服器連線錯誤'; });
}

function doRegister() {
  const email = document.getElementById('reg-email').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const errEl = document.getElementById('reg-error');

  if (!email || !password || !confirm) {
    errEl.textContent = '請填寫所有必填欄位';
    return;
  }
  if (password.length < 6) {
    errEl.textContent = '密碼至少需要6個字元';
    return;
  }
  if (password !== confirm) {
    errEl.textContent = '兩次密碼輸入不一致';
    return;
  }

  errEl.textContent = '註冊中...';
  fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username: username || undefined })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        gameState.user = data.user;
        gameState.faction = data.user.faction;
        updateUserProfileDisplay();
        document.getElementById('nav-username').textContent = data.user.username;
        document.getElementById('game-username').textContent = data.user.username;
        showPage('onboarding');
      } else {
        errEl.textContent = data.error || '註冊失敗';
      }
    })
    .catch(() => { errEl.textContent = '伺服器連線錯誤'; });
}

function loginWithDiscord() {
  window.location.href = '/api/auth/discord';
}

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

function enterGame() {
  if (!document.getElementById('agree-check').checked) return;
  if (!gameState.user) return;

  fetch('/api/auth/agreement', { method: 'POST' })
    .then(r => r.json())
    .then(() => {
      if (gameState.user && gameState.user.faction !== 'none') {
        showPage('game');
        initGame();
      } else {
        showPage('onboarding');
        document.getElementById('nav-username').textContent = gameState.user.discordTag || gameState.user.username;
        document.getElementById('game-username').textContent = gameState.user.discordTag || gameState.user.username;
      }
    });
}

function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  if (menu) menu.classList.toggle('hidden');
}

function logout() {
  fetch('/api/auth/logout', { method: 'POST' })
    .then(() => {
      if (eventSource) eventSource.close();
      if (goldInterval) clearInterval(goldInterval);
      location.reload();
    });
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('user-menu');
  if (menu && !menu.classList.contains('hidden') && !e.target.closest('.user-profile') && !e.target.closest('#user-menu')) {
    menu.classList.add('hidden');
  }
});

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
  showPage('game');
  initGame();
}

function initGame() {
  document.getElementById('game-username').textContent = gameState.user ? (gameState.user.discordTag || gameState.user.username) : 'Miner';
  updateUserProfileDisplay();
  setupSSE();

  onCountrySelect = (country) => {
    const c = gameState.countries.find(cc => cc.code === country.code);
    if (!c) return;
    gameState.currentCountry = country.code;
    updateCountryInfoPanel(country, c);
  };

  initWorldMap('world-leaflet-map');
  loadCountries();

  loadInventory();
  loadStats();
  startGoldSimulation();

  document.getElementById('btn-upgrade').textContent =
    `升級礦層 (${formatGold(Math.pow(10, gameState.mineLevel) * 100)})`;

  initMineCanvasAnimation();
}

function loadCountries() {
  fetch('/api/game/countries')
    .then(r => r.json())
    .then(countries => {
      gameState.countries = countries;
      const gpsMap = {};
      const factionMap = {};
      countries.forEach(c => {
        gpsMap[c.code] = c.total_gold_per_sec || 0;
        if (c.dominant_faction) factionMap[c.code] = c.dominant_faction;
      });
      if (typeof setGameCountries === 'function') setGameCountries(countries);
      if (typeof updateMapData === 'function') {
        updateMapData(gameState.onlineCounts, gpsMap, factionMap);
      }
    })
    .catch(() => {});
}

function updateCountryInfoPanel(country, serverData) {
  const code3 = typeof COUNTRY_CODE_MAP !== 'undefined' ? COUNTRY_CODE_MAP[country.code] : null;
  const restData = typeof restCountriesData !== 'undefined' ? restCountriesData[code3] : null;

  document.getElementById('country-name').innerHTML = `
    ${restData ? `<img src="${restData.flag}" style="width:24px;height:16px;image-rendering:auto;vertical-align:middle;margin-right:6px;">` : ''}
    ${restData ? restData.name : (country.name_cn || country.name)}
  `;
  document.getElementById('country-online').textContent = serverData ? (serverData.online_count || 0) : 0;
  document.getElementById('country-gps').textContent = serverData ? formatGold(serverData.total_gold_per_sec || 0) : '0';
  document.getElementById('country-continent').textContent = getContinentName(country.continent);

  document.getElementById('btn-deploy').style.display = 'block';

  const restInfo = document.getElementById('country-rest-info');
  if (restInfo && restData) {
    restInfo.style.display = '';
    restInfo.innerHTML = `
      <div class="country-rest-divider"></div>
      <div class="info-row"><span class="pixel-icon icon-building"></span> <span style="color:var(--text-dim);font-size:11px;">首都:</span> <span>${restData.capital || '-'}</span></div>
      <div class="info-row"><span class="pixel-icon icon-users"></span> <span style="color:var(--text-dim);font-size:11px;">人口:</span> <span>${restData.population ? Number(restData.population).toLocaleString() : '-'}</span></div>
      <div class="info-row"><span class="pixel-icon icon-coin"></span> <span style="color:var(--text-dim);font-size:11px;">GDP (Gini):</span> <span>${restData.gdp ? '$' + Number(restData.gdp).toLocaleString() : '-'}</span></div>
      <div class="info-row"><span class="pixel-icon icon-globe"></span> <span style="color:var(--text-dim);font-size:11px;">地區:</span> <span>${restData.region || '-'}</span></div>
    `;
  } else if (restInfo) {
    restInfo.style.display = 'none';
  }
}

function onCountrySelect(country) {
  const c = gameState.countries.find(cc => cc.code === country.code);
  if (!c) return;
  gameState.currentCountry = country.code;
  updateCountryInfoPanel(country, c);
  if (typeof flyToCountry === 'function') flyToCountry(country.code);
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

function drawGacha() {
  const btn = document.getElementById('btn-gacha');
  btn.disabled = true;
  btn.textContent = '抽取中...';

  const canvas = document.getElementById('gacha-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 300;
  canvas.height = 180;

  let frame = 0;
  const animateGacha = () => {
    ctx.clearRect(0, 0, 300, 180);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 300, 180);

    for (let i = 0; i < 180; i += 8) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
      ctx.fillRect(0, i, 300, 4);
    }

    for (let i = 0; i < 20; i++) {
      const bx = Math.random() * 280;
      const by = Math.random() * 160;
      const size = 8 + Math.random() * 24;
      ctx.fillStyle = `hsl(${Math.random() * 360}, 80%, 50%)`;
      ctx.fillRect(bx, by, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.strokeRect(bx, by, size, size);
    }

    const gradient = ctx.createRadialGradient(150, 90, 10, 150, 90, 100);
    gradient.addColorStop(0, `rgba(255, 204, 0, ${0.2 + Math.sin(frame * 0.2) * 0.1})`);
    gradient.addColorStop(1, 'rgba(255, 204, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 180);

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
          <div style="font-weight:700;font-size:16px;margin-bottom:4px;">獲得：${data.artifact.name_cn || data.artifact.name}</div>
          <div style="color:var(--text-dim);font-size:12px;">${data.artifact.description || ''}</div>
        `;

        if (data.isUnique) {
          showUniqueNotification({ username: gameState.user.discordTag || gameState.user.username, artifactName: data.artifact.name_cn || data.artifact.name });
        }

        updateMiningUI();
        loadInventory();
      } else {
        const resultDiv = document.getElementById('gacha-result');
        resultDiv.className = 'gacha-result';
        resultDiv.innerHTML = `<div style="color:#ff4444;font-size:12px;">${data.error || '抽取失敗'}</div>`;
      }
    })
    .catch(e => {
      document.getElementById('btn-gacha').disabled = false;
      document.getElementById('btn-gacha').textContent = '探尋秘寶';
    });
}

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
    grid.innerHTML = '<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:24px;">倉庫空空如也...</div>';
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
        ${item.rarity === 'common' ? `<button class="btn btn-sm" onclick="salvageItem(${item.id})" style="margin-top:4px;">熔煉</button>` : ''}
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

    const level = gameState.mineLevel;
    const colors = ['#444433', '#554433', '#446688', '#443366', '#662211'];
    const lc = colors[Math.min(level - 1, colors.length - 1)];

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 300, 180);

    for (let y = 0; y < 180; y += 16) {
      ctx.fillStyle = y < 40 ? '#222222' : (y < 80 ? lc : '#1a1a1a');
      ctx.fillRect(0, y, 300, 16);
    }

    for (let i = 0; i < 5 + level * 2; i++) {
      const ox = Math.sin(i * 1.5 + frame * 0.02) * 100 + 150;
      const oy = Math.cos(i * 2.3 + frame * 0.03) * 60 + 100;
      ctx.fillStyle = level >= 3 ? '#66ccff' : (level >= 2 ? '#ffaa00' : '#888866');
      ctx.fillRect(ox, oy, 8, 8);
    }

    const px = 150 + Math.sin(frame * 0.05) * 20;
    const py = 80 + Math.sin(frame * 0.08) * 10;
    ctx.fillStyle = '#886644';
    ctx.fillRect(px - 2, py - 20, 4, 24);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(px - 6, py - 24, 8, 6);

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

/* ===== GOALS: DAILY QUESTS + ACHIEVEMENTS ===== */
function switchGoalTab(tab) {
  document.querySelectorAll('.goal-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.goal-tab[data-goaltab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.goal-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`goals-${tab}`).classList.add('active');
  if (tab === 'daily') loadQuests();
  if (tab === 'achievements') loadAchievements();
}

function loadQuests() {
  fetch('/api/game/quests/daily')
    .then(r => r.json())
    .then(data => {
      if (data.success) renderQuests(data.quests);
    })
    .catch(() => {});
}

function renderQuests(dq) {
  const container = document.getElementById('quest-list');
  const streakEl = document.getElementById('quest-streak');
  if (!container) return;

  const qNames = { login: '每日登入', mine_gold: '開採金幣', open_gacha: '開啟秘寶', salvage_item: '熔煉物品' };
  const qIcons = { login: 'icon-enter', mine_gold: 'icon-pickaxe', open_gacha: 'icon-chest', salvage_item: 'icon-recycle' };

  streakEl.textContent = `連續簽到 ${dq.streak} 天` + (dq.streak > 0 ? ` (獎勵 x${(1 + dq.streak * 0.1).toFixed(1)})` : '');

  container.innerHTML = dq.quests.map((q, i) => {
    const pct = Math.min((q.progress / q.target) * 100, 100);
    let btnHtml = '';
    if (q.claimed) {
      btnHtml = `<button class="quest-btn claimed" disabled>已領取</button>`;
    } else if (q.completed) {
      btnHtml = `<button class="quest-btn" onclick="claimQuest(${i})">領取</button>`;
    } else {
      btnHtml = `<button class="quest-btn" disabled style="opacity:0.35;">進行中</button>`;
    }
    return `
      <div class="quest-item ${q.completed ? 'completed' : ''} ${q.claimed ? 'claimed' : ''}">
        <div class="quest-icon"><span class="pixel-icon ${qIcons[q.type] || 'icon-star'}"></span></div>
        <div class="quest-info">
          <div class="quest-name">${qNames[q.type] || q.type}</div>
          <div class="quest-reward">獎勵: ${formatGold(q.rewardGold)} <span class="pixel-icon icon-coin"></span></div>
          <div class="quest-progress">
            <div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
            <div class="quest-progress-text">${Math.floor(q.progress)} / ${q.target}</div>
          </div>
        </div>
        ${btnHtml}
      </div>
    `;
  }).join('');

  document.getElementById('btn-claim-all').style.display =
    dq.quests.some(q => q.completed && !q.claimed) ? 'block' : 'none';
}

function claimQuest(index) {
  fetch('/api/game/quests/daily/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questIndex: index })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        gameState.gold = data.user.gold;
        gameState.user = data.user;
        updateMiningUI();
        renderQuests(data.quests);
      }
    })
    .catch(() => {});
}

function claimAllQuests() {
  fetch('/api/game/quests/daily/claim-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        gameState.gold = data.user.gold;
        gameState.user = data.user;
        updateMiningUI();
        renderQuests(data.quests);
      }
    })
    .catch(() => {});
}

function loadAchievements() {
  fetch('/api/game/achievements')
    .then(r => r.json())
    .then(data => {
      if (data.success) renderAchievements(data.achievements);
    })
    .catch(() => {});
}

function renderAchievements(achievements) {
  const container = document.getElementById('achievement-list');
  if (!container) return;
  container.innerHTML = achievements.map(a => {
    const pct = a.completed ? 100 : Math.min((a.progress / a.target) * 100, 100);
    let btnHtml = '';
    if (a.claimed) {
      btnHtml = `<button class="ach-btn claimed" disabled>已領取</button>`;
    } else if (a.completed) {
      btnHtml = `<button class="ach-btn" onclick="claimAchievement('${a.key}')">領取</button>`;
    } else {
      btnHtml = `<button class="ach-btn" disabled style="opacity:0.35;">${Math.floor(pct)}%</button>`;
    }
    return `
      <div class="achievement-item ${a.completed ? 'completed' : ''} ${a.claimed ? 'claimed' : ''}">
        <div class="ach-icon"><span class="pixel-icon icon-star"></span></div>
        <div class="ach-info">
          <div class="ach-name">${a.nameCn}</div>
          <div class="ach-desc">${a.desc}</div>
          <div class="ach-reward">獎勵: ${formatGold(a.rewardGold)} <span class="pixel-icon icon-coin"></span></div>
          <div class="quest-progress">
            <div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
            <div class="quest-progress-text">${a.completed ? '已完成' : Math.floor(a.progress).toLocaleString() + ' / ' + a.target.toLocaleString()}</div>
          </div>
        </div>
        ${btnHtml}
      </div>
    `;
  }).join('');
}

function claimAchievement(key) {
  fetch('/api/game/achievements/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        gameState.gold = data.user.gold;
        gameState.user = data.user;
        updateMiningUI();
        loadAchievements();
      }
    })
    .catch(() => {});
}

/* ===== CLAN ===== */
function loadClanView() {
  fetch('/api/game/clan/my')
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        if (data.clan) renderClanDetail(data.clan);
        else showClanList();
      }
    })
    .catch(() => {});
}

function renderClanDetail(clan) {
  const container = document.getElementById('clan-view');
  if (!container) return;
  const isLeader = clan.leader?._id === gameState.user?._id || clan.leader === gameState.user?._id;
  const myMember = clan.members.find(m => m.userId?._id === gameState.user?._id || m.userId === gameState.user?._id);
  const isOfficer = myMember?.role === 'officer' || isLeader;

  const roleLabels = { leader: '會長', officer: '幹部', member: '會員' };

  let html = `
    <div class="clan-header">
      <div>
        <div class="clan-name">${clan.name}</div>
        <div class="clan-level">Lv.${clan.level}</div>
      </div>
      <div class="clan-tag">${clan.tag}</div>
    </div>
    ${clan.description ? `<div class="clan-desc">${clan.description}</div>` : ''}
    <div class="clan-members-title">成員 (${clan.members.length})</div>
  `;

  clan.members.forEach(m => {
    const u = m.user || {};
    const uid = u._id || m.userId;
    html += `
      <div class="clan-member">
        <span class="clan-member-role">${roleLabels[m.role] || m.role}</span>
        <span class="clan-member-name">${u.username || '未知'}</span>
        <span class="clan-member-info">Lv.${u.mineLevel || 1} · ${formatGold(u.gold || 0)}</span>
        ${(isLeader && m.role !== 'leader') ? `<button class="btn btn-sm" onclick="kickClanMember('${uid}')" style="margin-left:auto;">踢出</button>` : ''}
        ${(isLeader && m.role !== 'leader') ? `<button class="btn btn-sm" onclick="transferClanLeader('${uid}')">轉讓</button>` : ''}
      </div>
    `;
  });

  if (isLeader && clan.joinRequests?.length > 0) {
    html += `<div class="clan-requests-section">
      <div class="clan-requests-title">加入申請 (${clan.joinRequests.length})</div>`;
    clan.joinRequests.forEach(r => {
      const ruid = r.userId?._id || r.userId;
      html += `<div class="clan-request">
        <span>${r.userId?.username || '未知'}</span>
        <div class="clan-request-actions">
          <button class="btn btn-sm btn-primary" onclick="handleClanRequest('${clan._id}', '${ruid}', true)">同意</button>
          <button class="btn btn-sm btn-danger" onclick="handleClanRequest('${clan._id}', '${ruid}', false)">拒絕</button>
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  if (!isLeader) {
    html += `<button class="btn btn-danger btn-full" onclick="leaveClan()" style="margin-top:16px;">退出公會</button>`;
  }
  if (isLeader) {
    html += `<div style="margin-top:16px;padding:12px;background:rgba(0,0,0,0.15);border:1px solid var(--border);">
      <div class="clan-members-title">公會設定</div>
      <input type="text" id="clan-desc-input" class="input" placeholder="公會描述" value="${clan.description || ''}">
      <button class="btn btn-primary btn-full" onclick="updateClanDesc()" style="margin-top:8px;">更新描述</button>
    </div>`;
  }

  container.innerHTML = html;
}

function showClanList() {
  fetch('/api/game/clan/list')
    .then(r => r.json())
    .then(data => {
      if (!data.success) return;
      const container = document.getElementById('clan-view');
      if (!container) return;

      let html = `
        <div class="clan-header">
          <div>
            <div class="clan-name" style="font-size:14px;">公會列表</div>
            <div class="clan-desc">加入公會獲得加成與夥伴！</div>
          </div>
        </div>
      `;

      if (data.clans.length === 0) {
        html += `<div style="text-align:center;padding:24px;color:var(--text-dim);">尚未有任何公會，來創建第一個吧！</div>`;
      } else {
        html += `<div style="margin-bottom:12px;">`;
        data.clans.forEach(c => {
          html += `
            <div class="clan-list-item" onclick="joinClan('${c._id}')">
              <div class="clan-list-tag">${c.tag}</div>
              <div class="clan-list-info">
                <div class="clan-list-name">${c.name}</div>
                <div class="clan-list-meta">Lv.${c.level} · ${c.memberCount} 人</div>
              </div>
              <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();joinClan('${c._id}')">加入</button>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `
        <div style="margin-top:16px;padding:16px;background:rgba(0,0,0,0.15);border:1px solid var(--border);">
          <div class="clan-members-title" style="margin-bottom:8px;">創建公會</div>
          <div class="clan-input-group">
            <input type="text" id="clan-name-input" class="input" placeholder="公會名稱">
            <input type="text" id="clan-tag-input" class="input" placeholder="標籤 (2-4字)" style="max-width:120px;">
          </div>
          <button class="btn btn-primary btn-full" onclick="createClan()">創建公會</button>
        </div>
      `;

      container.innerHTML = html;
    })
    .catch(() => {});
}

function createClan() {
  const name = document.getElementById('clan-name-input')?.value.trim();
  const tag = document.getElementById('clan-tag-input')?.value.trim();
  if (!name || !tag) { alert('請填寫公會名稱和標籤'); return; }
  if (tag.length > 4) { alert('標籤最多 4 個字'); return; }
  fetch('/api/game/clan/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, tag })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) loadClanView();
      else alert(data.error || '創建失敗');
    })
    .catch(() => alert('伺服器錯誤'));
}

function joinClan(clanId) {
  fetch('/api/game/clan/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clanId })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) alert('已送出加入申請！請等待會長審核。');
      else alert(data.error || '申請失敗');
    })
    .catch(() => alert('伺服器錯誤'));
}

function leaveClan() {
  if (!confirm('確定退出公會？')) return;
  fetch('/api/game/clan/leave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) loadClanView();
      else alert(data.error || '退出失敗');
    })
    .catch(() => alert('伺服器錯誤'));
}

function handleClanRequest(clanId, userId, accept) {
  fetch('/api/game/clan/handle-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clanId, userId, accept })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) loadClanView();
      else alert(data.error || '操作失敗');
    })
    .catch(() => alert('伺服器錯誤'));
}

function kickClanMember(userId) {
  if (!confirm('確定踢出該成員？')) return;
  fetch('/api/game/clan/kick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) loadClanView();
      else alert(data.error || '操作失敗');
    })
    .catch(() => alert('伺服器錯誤'));
}

function transferClanLeader(userId) {
  if (!confirm('確定將會長轉讓給該成員？此操作不可撤銷！')) return;
  fetch('/api/game/clan/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) loadClanView();
      else alert(data.error || '操作失敗');
    })
    .catch(() => alert('伺服器錯誤'));
}

function updateClanDesc() {
  const desc = document.getElementById('clan-desc-input')?.value.trim();
  if (desc === undefined) return;
  fetch('/api/game/clan/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: desc })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) loadClanView();
      else alert(data.error || '更新失敗');
    })
    .catch(() => alert('伺服器錯誤'));
}

function showUniqueNotification(data) {
  const notif = document.getElementById('unique-notification');
  const msg = document.getElementById('unique-msg');
  if (notif && msg) {
    notif.classList.remove('hidden');
    msg.textContent = `${data.username} 獲得了全服唯一神物【${data.artifactName}】！`;
    setTimeout(() => notif.classList.add('hidden'), 8000);
  }
}

function formatGold(amount) {
  if (amount >= 1000000000000) return (amount / 1000000000000).toFixed(1) + 'T';
  if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + 'B';
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
  return Math.floor(amount).toLocaleString();
}

setInterval(() => {
  if (gameState.stats) {
    loadCountries();
  }
}, 15000);
