const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../../data.json');

function getDefaultData() {
  return {
    users: [],
    countries: [
      { code: 'US', name: 'United States', name_cn: '美国', continent: 'americas', pixel_x: 200, pixel_y: 240, base_gold_per_sec: 3.5 },
      { code: 'CA', name: 'Canada', name_cn: '加拿大', continent: 'americas', pixel_x: 180, pixel_y: 180, base_gold_per_sec: 2.0 },
      { code: 'BR', name: 'Brazil', name_cn: '巴西', continent: 'americas', pixel_x: 260, pixel_y: 400, base_gold_per_sec: 2.5 },
      { code: 'GB', name: 'United Kingdom', name_cn: '英国', continent: 'europe', pixel_x: 420, pixel_y: 200, base_gold_per_sec: 3.0 },
      { code: 'FR', name: 'France', name_cn: '法国', continent: 'europe', pixel_x: 440, pixel_y: 230, base_gold_per_sec: 2.8 },
      { code: 'DE', name: 'Germany', name_cn: '德国', continent: 'europe', pixel_x: 460, pixel_y: 210, base_gold_per_sec: 3.2 },
      { code: 'IT', name: 'Italy', name_cn: '意大利', continent: 'europe', pixel_x: 470, pixel_y: 260, base_gold_per_sec: 2.5 },
      { code: 'ES', name: 'Spain', name_cn: '西班牙', continent: 'europe', pixel_x: 430, pixel_y: 280, base_gold_per_sec: 2.2 },
      { code: 'RU', name: 'Russia', name_cn: '俄罗斯', continent: 'asia', pixel_x: 520, pixel_y: 140, base_gold_per_sec: 4.0 },
      { code: 'CN', name: 'China', name_cn: '中国', continent: 'asia', pixel_x: 620, pixel_y: 280, base_gold_per_sec: 5.0 },
      { code: 'JP', name: 'Japan', name_cn: '日本', continent: 'asia', pixel_x: 680, pixel_y: 300, base_gold_per_sec: 4.5 },
      { code: 'KR', name: 'South Korea', name_cn: '韩国', continent: 'asia', pixel_x: 660, pixel_y: 280, base_gold_per_sec: 3.5 },
      { code: 'IN', name: 'India', name_cn: '印度', continent: 'asia', pixel_x: 580, pixel_y: 340, base_gold_per_sec: 3.0 },
      { code: 'AU', name: 'Australia', name_cn: '澳大利亚', continent: 'oceania', pixel_x: 640, pixel_y: 480, base_gold_per_sec: 2.5 },
      { code: 'ZA', name: 'South Africa', name_cn: '南非', continent: 'africa', pixel_x: 500, pixel_y: 420, base_gold_per_sec: 2.0 },
      { code: 'EG', name: 'Egypt', name_cn: '埃及', continent: 'africa', pixel_x: 520, pixel_y: 350, base_gold_per_sec: 1.8 },
      { code: 'NG', name: 'Nigeria', name_cn: '尼日利亚', continent: 'africa', pixel_x: 470, pixel_y: 370, base_gold_per_sec: 1.5 },
      { code: 'TW', name: 'Taiwan', name_cn: '台湾', continent: 'asia', pixel_x: 670, pixel_y: 310, base_gold_per_sec: 3.2 },
      { code: 'AR', name: 'Argentina', name_cn: '阿根廷', continent: 'americas', pixel_x: 280, pixel_y: 440, base_gold_per_sec: 2.0 },
      { code: 'MX', name: 'Mexico', name_cn: '墨西哥', continent: 'americas', pixel_x: 220, pixel_y: 320, base_gold_per_sec: 2.2 },
      { code: 'SE', name: 'Sweden', name_cn: '瑞典', continent: 'europe', pixel_x: 420, pixel_y: 160, base_gold_per_sec: 2.0 },
      { code: 'NO', name: 'Norway', name_cn: '挪威', continent: 'europe', pixel_x: 410, pixel_y: 140, base_gold_per_sec: 2.2 },
      { code: 'PL', name: 'Poland', name_cn: '波兰', continent: 'europe', pixel_x: 470, pixel_y: 190, base_gold_per_sec: 2.0 },
      { code: 'UA', name: 'Ukraine', name_cn: '乌克兰', continent: 'europe', pixel_x: 500, pixel_y: 180, base_gold_per_sec: 1.8 },
      { code: 'TR', name: 'Turkey', name_cn: '土耳其', continent: 'asia', pixel_x: 530, pixel_y: 280, base_gold_per_sec: 2.5 },
      { code: 'SA', name: 'Saudi Arabia', name_cn: '沙特阿拉伯', continent: 'asia', pixel_x: 540, pixel_y: 310, base_gold_per_sec: 3.8 },
      { code: 'ID', name: 'Indonesia', name_cn: '印度尼西亚', continent: 'asia', pixel_x: 660, pixel_y: 380, base_gold_per_sec: 2.5 },
      { code: 'PH', name: 'Philippines', name_cn: '菲律宾', continent: 'asia', pixel_x: 680, pixel_y: 360, base_gold_per_sec: 2.0 },
      { code: 'VN', name: 'Vietnam', name_cn: '越南', continent: 'asia', pixel_x: 640, pixel_y: 340, base_gold_per_sec: 2.2 },
      { code: 'TH', name: 'Thailand', name_cn: '泰国', continent: 'asia', pixel_x: 620, pixel_y: 350, base_gold_per_sec: 2.3 },
    ],
    artifacts: [
      { id: 1, name: 'Common Fossil', name_cn: '古老恐龙化石', rarity: 'common', effect_type: 'salvage', effect_value: 1, image: 'fossil', description: '远古生物的遗骸，可熔炼为幸运晶石', country_code: null, total_quantity: 999999, remaining_quantity: 999999 },
      { id: 2, name: 'Moa Statue', name_cn: '摩艾石像', rarity: 'epic', effect_type: 'speed', effect_value: 5, image: 'moai', description: '提升开采速度', country_code: null, total_quantity: 9999, remaining_quantity: 9999 },
      { id: 3, name: 'Egyptian Mummy', name_cn: '埃及木乃伊', rarity: 'epic', effect_type: 'speed', effect_value: 5, image: 'mummy', description: '提升开采速度', country_code: null, total_quantity: 9999, remaining_quantity: 9999 },
      { id: 4, name: 'Taipei 101 Model', name_cn: '台北101模型', rarity: 'mythic', effect_type: 'speed', effect_value: 20, image: 'taipei101', description: '亚洲之巅的象征', country_code: 'TW', total_quantity: 1, remaining_quantity: 1 },
      { id: 5, name: 'Statue of Liberty Torch', name_cn: '自由女神火炬', rarity: 'mythic', effect_type: 'speed', effect_value: 20, image: 'liberty', description: '自由与财富的灯塔', country_code: 'US', total_quantity: 1, remaining_quantity: 1 },
      { id: 6, name: 'Eiffel Tower Mini', name_cn: '巴黎铁塔模型', rarity: 'mythic', effect_type: 'speed', effect_value: 20, image: 'eiffel', description: '浪漫与艺术的结晶', country_code: 'FR', total_quantity: 1, remaining_quantity: 1 },
      { id: 7, name: 'Imperial Seal', name_cn: '始皇帝传国玉玺', rarity: 'unique', effect_type: 'speed', effect_value: 50, image: 'seal', description: '千古一帝的权威，全服唯一至宝', country_code: 'CN', total_quantity: 1, remaining_quantity: 1 },
      { id: 8, name: 'Crown Jewels', name_cn: '英国王室权杖', rarity: 'unique', effect_type: 'speed', effect_value: 50, image: 'crown', description: '日不落帝国的荣耀', country_code: 'GB', total_quantity: 1, remaining_quantity: 1 },
      { id: 9, name: 'Samurai Armor', name_cn: '武士铠甲', rarity: 'unique', effect_type: 'speed', effect_value: 50, image: 'samurai', description: '武士道的极致精神', country_code: 'JP', total_quantity: 1, remaining_quantity: 1 },
    ],
    userArtifacts: [],
    factionAura: {
      asia: 0,
      americas: 0,
      europe: 0
    },
    nextUserId: 1,
    nextArtifactId: 10,
    nextUserArtifactId: 1
  };
}

let data = null;

function getData() {
  if (data) return data;
  if (fs.existsSync(DB_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
      data = getDefaultData();
    }
  } else {
    data = getDefaultData();
  }
  return data;
}

function saveData() {
  if (data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  }
}

module.exports = {
  getData,
  saveData,
  getDefaultData
};
