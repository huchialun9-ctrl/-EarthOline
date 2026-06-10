// Earth Online - Professional Icon System
// Replaces all emoji with SVG-based pixel icons
// Icons are defined as reusable canvas-drawn pixel art

const ICONS = {
  // Factions
  asia: {
    path: 'icon-temple',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <rect x="3" y="2" width="10" height="2" fill="#ff4444"/>
      <rect x="4" y="4" width="8" height="2" fill="#cc0000"/>
      <rect x="5" y="6" width="6" height="2" fill="#ff4444"/>
      <rect x="2" y="8" width="12" height="2" fill="#880000"/>
      <rect x="3" y="10" width="10" height="4" fill="#cc0000"/>
      <rect x="6" y="11" width="4" height="3" fill="#ffcc00"/>
    </svg>`
  },
  americas: {
    path: 'icon-building',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <rect x="2" y="3" width="4" height="11" fill="#3366ff"/>
      <rect x="7" y="1" width="4" height="13" fill="#2255cc"/>
      <rect x="12" y="4" width="3" height="10" fill="#3366ff"/>
      <rect x="3" y="5" width="1" height="2" fill="#ffcc00"/>
      <rect x="8" y="3" width="1" height="2" fill="#ffcc00"/>
      <rect x="13" y="6" width="1" height="2" fill="#ffcc00"/>
    </svg>`
  },
  europe: {
    path: 'icon-castle',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <rect x="1" y="5" width="2" height="9" fill="#55aa55"/>
      <rect x="13" y="5" width="2" height="9" fill="#55aa55"/>
      <rect x="3" y="3" width="2" height="11" fill="#338833"/>
      <rect x="11" y="3" width="2" height="11" fill="#338833"/>
      <rect x="5" y="1" width="6" height="13" fill="#55aa55"/>
      <rect x="6" y="2" width="1" height="1" fill="#ffcc00"/>
      <rect x="9" y="2" width="1" height="1" fill="#ffcc00"/>
      <rect x="7" y="10" width="2" height="4" fill="#886633"/>
    </svg>`
  },
  // Resources
  gold: {
    path: 'icon-coin',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" fill="#ffcc00"/>
      <circle cx="8" cy="8" r="4" fill="#ffaa00"/>
      <text x="8" y="10" text-anchor="middle" font-size="8" font-weight="bold" fill="#cc8800">$</text>
    </svg>`
  },
  pickaxe: {
    path: 'icon-pickaxe',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <rect x="8" y="4" width="2" height="10" fill="#886644" transform="rotate(30 9 9)"/>
      <rect x="1" y="1" width="6" height="2" fill="#aaaaaa"/>
      <rect x="3" y="3" width="4" height="2" fill="#888888"/>
      <rect x="5" y="5" width="3" height="2" fill="#aaaaaa"/>
      <rect x="8" y="11" width="4" height="2" fill="#886644"/>
    </svg>`
  },
  // Artifacts
  fossil: {
    path: 'icon-fossil',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <rect x="2" y="7" width="4" height="2" fill="#bbaa88"/>
      <rect x="6" y="5" width="2" height="6" fill="#bbaa88"/>
      <rect x="8" y="6" width="4" height="4" fill="#bbaa88"/>
      <rect x="10" y="10" width="2" height="2" fill="#bbaa88"/>
      <rect x="5" y="4" width="1" height="2" fill="#bbaa88"/>
      <rect x="7" y="3" width="1" height="2" fill="#bbaa88"/>
      <rect x="11" y="5" width="1" height="2" fill="#bbaa88"/>
      <rect x="12" y="7" width="2" height="1" fill="#bbaa88"/>
    </svg>`
  },
  moai: {
    path: 'icon-moai',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <rect x="3" y="2" width="10" height="2" fill="#887766"/>
      <rect x="4" y="4" width="8" height="8" fill="#998877"/>
      <rect x="5" y="6" width="2" height="3" fill="#443322"/>
      <rect x="9" y="6" width="2" height="3" fill="#443322"/>
      <rect x="6" y="10" width="4" height="1" fill="#443322"/>
      <rect x="5" y="12" width="6" height="2" fill="#887766"/>
    </svg>`
  },
  mummy: {
    path: 'icon-mummy',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <rect x="4" y="2" width="8" height="2" fill="#ddcc88"/>
      <rect x="5" y="4" width="6" height="1" fill="#ccbb77"/>
      <rect x="6" y="5" width="4" height="2" fill="#443322"/>
      <rect x="4" y="7" width="8" height="7" fill="#ddcc88"/>
      <rect x="5" y="10" width="1" height="4" fill="#ccbb77"/>
      <rect x="10" y="10" width="1" height="4" fill="#ccbb77"/>
    </svg>`
  },
  taipei101: {
    path: 'icon-taipei',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <rect x="5" y="1" width="6" height="2" fill="#44aa44"/>
      <rect x="6" y="3" width="4" height="2" fill="#338833"/>
      <rect x="5" y="5" width="6" height="9" fill="#44aa44"/>
      <rect x="4" y="7" width="2" height="1" fill="#ffcc00"/>
      <rect x="10" y="7" width="2" height="1" fill="#ffcc00"/>
      <rect x="6" y="10" width="4" height="2" fill="#338833"/>
    </svg>`
  },
  liberty: {
    path: 'icon-liberty',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <rect x="7" y="1" width="2" height="4" fill="#44aa44"/>
      <rect x="6" y="5" width="4" height="1" fill="#44aa44"/>
      <rect x="5" y="6" width="6" height="4" fill="#44aa44"/>
      <rect x="4" y="10" width="8" height="4" fill="#338833"/>
      <rect x="8" y="3" width="1" height="3" fill="#ffcc00"/>
    </svg>`
  },
  eiffel: {
    path: 'icon-eiffel',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <polygon points="8,1 10,5 10,11 8,13 6,11 6,5" fill="#888888"/>
      <rect x="7" y="6" width="2" height="2" fill="#666666"/>
      <rect x="5" y="11" width="6" height="4" fill="#777777"/>
      <rect x="6" y="13" width="4" height="1" fill="#888888"/>
    </svg>`
  },
  seal: {
    path: 'icon-seal',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <rect x="2" y="3" width="12" height="10" rx="1" fill="#cc8800"/>
      <rect x="3" y="4" width="10" height="8" fill="#ffcc00"/>
      <rect x="6" y="5" width="4" height="6" rx="1" fill="#cc8800"/>
      <rect x="7" y="6" width="2" height="2" fill="#ff4444"/>
    </svg>`
  },
  crown: {
    path: 'icon-crown-jewel',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <polygon points="1,12 2,5 5,8 8,3 11,8 14,5 15,12" fill="#ffcc00"/>
      <rect x="3" y="12" width="10" height="2" fill="#ffaa00"/>
      <circle cx="5" cy="7" r="1" fill="#ff4444"/>
      <circle cx="8" cy="5" r="1" fill="#4444ff"/>
      <circle cx="11" cy="7" r="1" fill="#44ff44"/>
    </svg>`
  },
  samurai: {
    path: 'icon-samurai',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <rect x="6" y="1" width="4" height="3" fill="#444444"/>
      <rect x="5" y="4" width="6" height="2" fill="#555555"/>
      <rect x="4" y="6" width="8" height="4" fill="#666666"/>
      <rect x="5" y="10" width="6" height="4" fill="#555555"/>
      <rect x="7" y="4" width="2" height="10" fill="#888888"/>
      <rect x="2" y="8" width="2" height="2" fill="#444444"/>
      <rect x="12" y="8" width="2" height="2" fill="#444444"/>
    </svg>`
  },
  // UI Icons
  warning: {
    path: 'icon-warning',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <polygon points="8,1 15,14 1,14" fill="#ffaa00"/>
      <rect x="7" y="6" width="2" height="4" fill="#ffffff"/>
      <rect x="7" y="11" width="2" height="2" fill="#ffffff"/>
    </svg>`
  },
  info: {
    path: 'icon-info',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" fill="#44aaff"/>
      <rect x="7" y="6" width="2" height="5" fill="#ffffff"/>
      <circle cx="8" cy="4" r="1" fill="#ffffff"/>
    </svg>`
  },
  globe: {
    path: 'icon-globe',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" fill="#33aaff"/>
      <rect x="2" y="7" width="12" height="2" fill="#55cc55"/>
      <ellipse cx="8" cy="8" rx="3" ry="6" fill="#55cc55"/>
      <circle cx="8" cy="8" r="2" fill="#33aaff"/>
    </svg>`
  },
  compass: {
    path: 'icon-compass',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" fill="#333333"/>
      <polygon points="8,2 10,6 8,10 6,6" fill="#ff4444"/>
      <polygon points="8,10 10,14 8,14 6,14" fill="#ffffff"/>
    </svg>`
  },
  star: {
    path: 'icon-star',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <polygon points="8,1 10,5 14,6 11,9 12,14 8,11 4,14 5,9 2,6 6,5" fill="#ffcc00"/>
    </svg>`
  }
};

function getIconSVG(name) {
  const icon = ICONS[name];
  if (!icon) return '';
  return icon.svg;
}

function createIconElement(name, className = 'pixel-icon') {
  const span = document.createElement('span');
  span.className = className;
  span.innerHTML = getIconSVG(name);
  return span;
}
