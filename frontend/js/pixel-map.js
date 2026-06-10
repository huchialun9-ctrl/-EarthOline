// Earth Online - Pixel World Map Renderer
// 2D pixelated world map with drag, zoom, and country interactions

const COUNTRY_DATA = [
  { code: 'US', name: 'United States', name_cn: '美国', continent: 'americas', x: 0.18, y: 0.35, w: 0.12, h: 0.08 },
  { code: 'CA', name: 'Canada', name_cn: '加拿大', continent: 'americas', x: 0.16, y: 0.22, w: 0.14, h: 0.10 },
  { code: 'BR', name: 'Brazil', name_cn: '巴西', continent: 'americas', x: 0.24, y: 0.58, w: 0.08, h: 0.10 },
  { code: 'GB', name: 'United Kingdom', name_cn: '英国', continent: 'europe', x: 0.42, y: 0.27, w: 0.03, h: 0.05 },
  { code: 'FR', name: 'France', name_cn: '法国', continent: 'europe', x: 0.44, y: 0.32, w: 0.04, h: 0.05 },
  { code: 'DE', name: 'Germany', name_cn: '德国', continent: 'europe', x: 0.46, y: 0.28, w: 0.04, h: 0.05 },
  { code: 'IT', name: 'Italy', name_cn: '意大利', continent: 'europe', x: 0.47, y: 0.36, w: 0.03, h: 0.06 },
  { code: 'ES', name: 'Spain', name_cn: '西班牙', continent: 'europe', x: 0.43, y: 0.38, w: 0.04, h: 0.05 },
  { code: 'RU', name: 'Russia', name_cn: '俄罗斯', continent: 'europe', x: 0.48, y: 0.15, w: 0.20, h: 0.12 },
  { code: 'CN', name: 'China', name_cn: '中国', continent: 'asia', x: 0.62, y: 0.35, w: 0.10, h: 0.10 },
  { code: 'JP', name: 'Japan', name_cn: '日本', continent: 'asia', x: 0.70, y: 0.38, w: 0.03, h: 0.08 },
  { code: 'KR', name: 'South Korea', name_cn: '韩国', continent: 'asia', x: 0.67, y: 0.36, w: 0.02, h: 0.04 },
  { code: 'IN', name: 'India', name_cn: '印度', continent: 'asia', x: 0.58, y: 0.45, w: 0.06, h: 0.08 },
  { code: 'AU', name: 'Australia', name_cn: '澳大利亚', continent: 'oceania', x: 0.65, y: 0.68, w: 0.08, h: 0.06 },
  { code: 'ZA', name: 'South Africa', name_cn: '南非', continent: 'africa', x: 0.50, y: 0.62, w: 0.06, h: 0.06 },
  { code: 'EG', name: 'Egypt', name_cn: '埃及', continent: 'africa', x: 0.52, y: 0.48, w: 0.04, h: 0.04 },
  { code: 'NG', name: 'Nigeria', name_cn: '尼日利亚', continent: 'africa', x: 0.47, y: 0.52, w: 0.05, h: 0.04 },
  { code: 'TW', name: 'Taiwan', name_cn: '台湾', continent: 'asia', x: 0.68, y: 0.42, w: 0.02, h: 0.04 },
  { code: 'AR', name: 'Argentina', name_cn: '阿根廷', continent: 'americas', x: 0.28, y: 0.65, w: 0.05, h: 0.10 },
  { code: 'MX', name: 'Mexico', name_cn: '墨西哥', continent: 'americas', x: 0.21, y: 0.45, w: 0.05, h: 0.05 },
  { code: 'SE', name: 'Sweden', name_cn: '瑞典', continent: 'europe', x: 0.42, y: 0.18, w: 0.04, h: 0.06 },
  { code: 'NO', name: 'Norway', name_cn: '挪威', continent: 'europe', x: 0.41, y: 0.16, w: 0.03, h: 0.04 },
  { code: 'PL', name: 'Poland', name_cn: '波兰', continent: 'europe', x: 0.47, y: 0.24, w: 0.04, h: 0.04 },
  { code: 'UA', name: 'Ukraine', name_cn: '乌克兰', continent: 'europe', x: 0.50, y: 0.22, w: 0.05, h: 0.05 },
  { code: 'TR', name: 'Turkey', name_cn: '土耳其', continent: 'asia', x: 0.53, y: 0.36, w: 0.04, h: 0.05 },
  { code: 'SA', name: 'Saudi Arabia', name_cn: '沙特阿拉伯', continent: 'asia', x: 0.54, y: 0.42, w: 0.05, h: 0.05 },
  { code: 'ID', name: 'Indonesia', name_cn: '印度尼西亚', continent: 'asia', x: 0.66, y: 0.54, w: 0.06, h: 0.04 },
  { code: 'PH', name: 'Philippines', name_cn: '菲律宾', continent: 'asia', x: 0.69, y: 0.50, w: 0.02, h: 0.05 },
  { code: 'VN', name: 'Vietnam', name_cn: '越南', continent: 'asia', x: 0.64, y: 0.47, w: 0.02, h: 0.05 },
  { code: 'TH', name: 'Thailand', name_cn: '泰国', continent: 'asia', x: 0.62, y: 0.49, w: 0.03, h: 0.04 },
];

const FACTION_COLORS = {
  asia: { base: '#cc3333', highlight: '#ff6666', aura: 'rgba(204,51,51,0.3)' },
  americas: { base: '#3366cc', highlight: '#6699ff', aura: 'rgba(51,102,204,0.3)' },
  europe: { base: '#33aa33', highlight: '#66dd66', aura: 'rgba(51,170,51,0.3)' },
};

class PixelMap {
  constructor(canvas, container) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.container = container;
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
    this.dragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.selectedCountry = null;
    this.onSelectCountry = null;
    this.onlineCounts = {};
    this.countryGps = {};

    this._setupEventListeners();
    this._resize();
    this.render();
  }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width * 2;
    this.canvas.height = rect.height * 2;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.scale(2, 2);
    this.render();
  }

  _setupEventListeners() {
    window.addEventListener('resize', () => this._resize());

    this.canvas.addEventListener('mousedown', (e) => {
      this.dragging = true;
      this.dragStartX = e.clientX - this.offsetX;
      this.dragStartY = e.clientY - this.offsetY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      this.offsetX = e.clientX - this.dragStartX;
      this.offsetY = e.clientY - this.dragStartY;
      this.render();
    });

    window.addEventListener('mouseup', () => {
      if (this.dragging) {
        this.dragging = false;
        this.render();
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this.zoom = Math.max(0.5, Math.min(4, this.zoom + delta));
      this.render();
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.dragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;

      const mapW = this.zoom * 0.8;
      const mapH = this.zoom * 0.5;
      const startX = 0.1 + this.offsetX / rect.width;
      const startY = 0.25 + this.offsetY / rect.height;

      for (const country of COUNTRY_DATA) {
        const cx = startX + country.x * mapW;
        const cy = startY + country.y * mapH;
        const cw = country.w * mapW;
        const ch = country.h * mapH;

        if (mx >= cx && mx <= cx + cw && my >= cy && my <= cy + ch) {
          this.selectedCountry = country;
          if (this.onSelectCountry) this.onSelectCountry(country);
          this.render();
          break;
        }
      }
    });
  }

  updateData(onlineCounts, countryGps) {
    this.onlineCounts = onlineCounts || {};
    this.countryGps = countryGps || {};
    this.render();
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width / 2;
    const h = this.canvas.height / 2;

    ctx.clearRect(0, 0, w, h);

    // Ocean background with pixel grid
    ctx.fillStyle = '#0a0a2a';
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y += 32) {
      for (let x = 0; x < w; x += 32) {
        const shade = ((x + y) % 64 === 0) ? 'rgba(10,10,50,0.5)' : 'rgba(5,5,30,0.5)';
        ctx.fillStyle = shade;
        ctx.fillRect(x, y, 32, 32);
      }
    }

    const mapW = this.zoom * 0.8;
    const mapH = this.zoom * 0.5;
    const startX = 0.1 + this.offsetX / w;
    const startY = 0.25 + this.offsetY / h;

    // Draw continents as pixel blobs
    const continents = {
      americas: { cx: 0.22, cy: 0.42, rx: 0.08, ry: 0.20 },
      europe: { cx: 0.44, cy: 0.26, rx: 0.06, ry: 0.08 },
      asia: { cx: 0.62, cy: 0.35, rx: 0.14, ry: 0.12 },
      africa: { cx: 0.50, cy: 0.52, rx: 0.06, ry: 0.10 },
      oceania: { cx: 0.68, cy: 0.68, rx: 0.06, ry: 0.05 },
    };

    for (const [cont, data] of Object.entries(continents)) {
      const cx = (startX + data.cx * mapW) * w;
      const cy = (startY + data.cy * mapH) * h;
      const rx = data.rx * mapW * w;
      const ry = data.ry * mapH * h;

      ctx.fillStyle = '#1a3a1a';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pixel border
      ctx.strokeStyle = '#2a5a2a';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw countries
    for (const country of COUNTRY_DATA) {
      const cx = (startX + country.x * mapW) * w;
      const cy = (startY + country.y * mapH) * h;
      const cw = country.w * mapW * w;
      const ch = country.h * mapH * h;

      const isSelected = this.selectedCountry && this.selectedCountry.code === country.code;
      const isHighlighted = this.onlineCounts[country.code] > 0;

      const colorSet = FACTION_COLORS[country.continent] || FACTION_COLORS.europe;
      ctx.fillStyle = isSelected ? colorSet.highlight : (isHighlighted ? colorSet.base : '#333344');
      ctx.fillRect(cx, cy, Math.max(cw, 4), Math.max(ch, 4));

      if (isSelected) {
        ctx.strokeStyle = '#00cccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 1, cy - 1, Math.max(cw, 4) + 2, Math.max(ch, 4) + 2);
      } else {
        ctx.strokeStyle = '#555566';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cy, Math.max(cw, 4), Math.max(ch, 4));
      }

      // Draw online count indicator
      if (this.onlineCounts[country.code] > 0) {
        ctx.fillStyle = '#44cc44';
        const dotSize = Math.min(Math.max(this.onlineCounts[country.code] / 10, 2), 6);
        ctx.fillRect(cx + cw - dotSize, cy - dotSize, dotSize, dotSize);

        // Pickaxe animation indicator
        ctx.fillStyle = 'rgba(200,200,200,0.6)';
        ctx.font = '8px monospace';
        ctx.fillText('⛏', cx + cw/2 - 4, cy - 4);
      }

      // Country code label
      ctx.fillStyle = isSelected ? '#ffffff' : '#888899';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(country.code, cx + cw / 2, cy + ch / 2 + 3);

      // Country name short
      if (cw > 30) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '5px monospace';
        ctx.fillText(country.name_cn, cx + cw / 2, cy + ch - 2);
      }
    }

    // Legend
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(8, h - 40, 120, 32);

    ctx.fillStyle = '#44cc44';
    ctx.fillRect(12, h - 34, 6, 6);
    ctx.fillStyle = '#888899';
    ctx.font = '6px monospace';
    ctx.fillText('Online Miners', 22, h - 28);

    ctx.fillStyle = '#00cccc';
    ctx.fillRect(12, h - 22, 6, 6);
    ctx.fillStyle = '#888899';
    ctx.font = '6px monospace';
    ctx.fillText('Selected Country', 22, h - 16);
  }

  zoomIn() {
    this.zoom = Math.min(4, this.zoom + 0.2);
    this.render();
  }

  zoomOut() {
    this.zoom = Math.max(0.5, this.zoom - 0.2);
    this.render();
  }

  resetView() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
    this.render();
  }
}
