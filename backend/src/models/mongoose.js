const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: null },
  username: { type: String, default: 'Miner' },
  discriminator: { type: String, default: '0' },
  avatar: { type: String, default: '' },
  banner: { type: String, default: null },
  accentColor: { type: Number, default: null },
  locale: { type: String, default: null },
  faction: { type: String, enum: ['none', 'asia', 'americas', 'europe'], default: 'none' },
  gold: { type: Number, default: 0 },
  goldPerSec: { type: Number, default: 0 },
  mineLevel: { type: Number, default: 1 },
  currentCountry: { type: String, default: null },
  totalRebirths: { type: Number, default: 0 },
  rebirthBonus: { type: Number, default: 1.0 },
  agreedAt: { type: Date, default: null },
  lastActive: { type: Date, default: Date.now },
}, { timestamps: true });

const countrySchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  nameCn: String,
  continent: String,
  pixelX: { type: Number, default: 0 },
  pixelY: { type: Number, default: 0 },
  baseGoldPerSec: { type: Number, default: 1.0 },
});

const artifactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameCn: String,
  rarity: { type: String, enum: ['common', 'epic', 'mythic', 'unique'], required: true },
  effectType: String,
  effectValue: { type: Number, default: 0 },
  image: String,
  description: String,
  countryCode: { type: String, default: null },
  totalQuantity: { type: Number, default: 1 },
  remainingQuantity: { type: Number, default: 1 },
}, { timestamps: true });

const userArtifactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artifactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artifact', required: true },
  isEquipped: { type: Boolean, default: false },
}, { timestamps: true });

const factionAuraSchema = new mongoose.Schema({
  faction: { type: String, enum: ['asia', 'americas', 'europe'], unique: true },
  auraValue: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Country = mongoose.model('Country', countrySchema);
const Artifact = mongoose.model('Artifact', artifactSchema);
const UserArtifact = mongoose.model('UserArtifact', userArtifactSchema);
const FactionAura = mongoose.model('FactionAura', factionAuraSchema);

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/earth-online';
  await mongoose.connect(uri);
  console.log('MongoDB connected');

  await seedCountries();
  await seedArtifacts();
  await seedFactionAura();

  console.log('Database seeded');
}

async function seedCountries() {
  const count = await Country.countDocuments();
  if (count > 0) return;

  const countries = [
    { code: 'US', name: 'United States', nameCn: '美国', continent: 'americas', pixelX: 200, pixelY: 240, baseGoldPerSec: 3.5 },
    { code: 'CA', name: 'Canada', nameCn: '加拿大', continent: 'americas', pixelX: 180, pixelY: 180, baseGoldPerSec: 2.0 },
    { code: 'BR', name: 'Brazil', nameCn: '巴西', continent: 'americas', pixelX: 260, pixelY: 400, baseGoldPerSec: 2.5 },
    { code: 'GB', name: 'United Kingdom', nameCn: '英国', continent: 'europe', pixelX: 420, pixelY: 200, baseGoldPerSec: 3.0 },
    { code: 'FR', name: 'France', nameCn: '法国', continent: 'europe', pixelX: 440, pixelY: 230, baseGoldPerSec: 2.8 },
    { code: 'DE', name: 'Germany', nameCn: '德国', continent: 'europe', pixelX: 460, pixelY: 210, baseGoldPerSec: 3.2 },
    { code: 'IT', name: 'Italy', nameCn: '意大利', continent: 'europe', pixelX: 470, pixelY: 260, baseGoldPerSec: 2.5 },
    { code: 'ES', name: 'Spain', nameCn: '西班牙', continent: 'europe', pixelX: 430, pixelY: 280, baseGoldPerSec: 2.2 },
    { code: 'RU', name: 'Russia', nameCn: '俄罗斯', continent: 'asia', pixelX: 520, pixelY: 140, baseGoldPerSec: 4.0 },
    { code: 'CN', name: 'China', nameCn: '中国', continent: 'asia', pixelX: 620, pixelY: 280, baseGoldPerSec: 5.0 },
    { code: 'JP', name: 'Japan', nameCn: '日本', continent: 'asia', pixelX: 680, pixelY: 300, baseGoldPerSec: 4.5 },
    { code: 'KR', name: 'South Korea', nameCn: '韩国', continent: 'asia', pixelX: 660, pixelY: 280, baseGoldPerSec: 3.5 },
    { code: 'IN', name: 'India', nameCn: '印度', continent: 'asia', pixelX: 580, pixelY: 340, baseGoldPerSec: 3.0 },
    { code: 'AU', name: 'Australia', nameCn: '澳大利亚', continent: 'oceania', pixelX: 640, pixelY: 480, baseGoldPerSec: 2.5 },
    { code: 'ZA', name: 'South Africa', nameCn: '南非', continent: 'africa', pixelX: 500, pixelY: 420, baseGoldPerSec: 2.0 },
    { code: 'EG', name: 'Egypt', nameCn: '埃及', continent: 'africa', pixelX: 520, pixelY: 350, baseGoldPerSec: 1.8 },
    { code: 'NG', name: 'Nigeria', nameCn: '尼日利亚', continent: 'africa', pixelX: 470, pixelY: 370, baseGoldPerSec: 1.5 },
    { code: 'TW', name: 'Taiwan', nameCn: '台湾', continent: 'asia', pixelX: 670, pixelY: 310, baseGoldPerSec: 3.2 },
    { code: 'AR', name: 'Argentina', nameCn: '阿根廷', continent: 'americas', pixelX: 280, pixelY: 440, baseGoldPerSec: 2.0 },
    { code: 'MX', name: 'Mexico', nameCn: '墨西哥', continent: 'americas', pixelX: 220, pixelY: 320, baseGoldPerSec: 2.2 },
    { code: 'SE', name: 'Sweden', nameCn: '瑞典', continent: 'europe', pixelX: 420, pixelY: 160, baseGoldPerSec: 2.0 },
    { code: 'NO', name: 'Norway', nameCn: '挪威', continent: 'europe', pixelX: 410, pixelY: 140, baseGoldPerSec: 2.2 },
    { code: 'PL', name: 'Poland', nameCn: '波兰', continent: 'europe', pixelX: 470, pixelY: 190, baseGoldPerSec: 2.0 },
    { code: 'UA', name: 'Ukraine', nameCn: '乌克兰', continent: 'europe', pixelX: 500, pixelY: 180, baseGoldPerSec: 1.8 },
    { code: 'TR', name: 'Turkey', nameCn: '土耳其', continent: 'asia', pixelX: 530, pixelY: 280, baseGoldPerSec: 2.5 },
    { code: 'SA', name: 'Saudi Arabia', nameCn: '沙特阿拉伯', continent: 'asia', pixelX: 540, pixelY: 310, baseGoldPerSec: 3.8 },
    { code: 'ID', name: 'Indonesia', nameCn: '印度尼西亚', continent: 'asia', pixelX: 660, pixelY: 380, baseGoldPerSec: 2.5 },
    { code: 'PH', name: 'Philippines', nameCn: '菲律宾', continent: 'asia', pixelX: 680, pixelY: 360, baseGoldPerSec: 2.0 },
    { code: 'VN', name: 'Vietnam', nameCn: '越南', continent: 'asia', pixelX: 640, pixelY: 340, baseGoldPerSec: 2.2 },
    { code: 'TH', name: 'Thailand', nameCn: '泰国', continent: 'asia', pixelX: 620, pixelY: 350, baseGoldPerSec: 2.3 },
  ];

  await Country.insertMany(countries);
}

async function seedArtifacts() {
  const count = await Artifact.countDocuments();
  if (count > 0) return;

  const artifacts = [
    { name: 'Common Fossil', nameCn: '古老恐龙化石', rarity: 'common', effectType: 'salvage', effectValue: 1, image: 'fossil', description: '远古生物的遗骸，可熔炼为幸运晶石', totalQuantity: 999999, remainingQuantity: 999999 },
    { name: 'Moa Statue', nameCn: '摩艾石像', rarity: 'epic', effectType: 'speed', effectValue: 5, image: 'moai', description: '提升开采速度', totalQuantity: 9999, remainingQuantity: 9999 },
    { name: 'Egyptian Mummy', nameCn: '埃及木乃伊', rarity: 'epic', effectType: 'speed', effectValue: 5, image: 'mummy', description: '提升开采速度', totalQuantity: 9999, remainingQuantity: 9999 },
    { name: 'Taipei 101 Model', nameCn: '台北101模型', rarity: 'mythic', effectType: 'speed', effectValue: 20, image: 'taipei101', description: '亚洲之巅的象征', countryCode: 'TW', totalQuantity: 1, remainingQuantity: 1 },
    { name: 'Statue of Liberty Torch', nameCn: '自由女神火炬', rarity: 'mythic', effectType: 'speed', effectValue: 20, image: 'liberty', description: '自由与财富的灯塔', countryCode: 'US', totalQuantity: 1, remainingQuantity: 1 },
    { name: 'Eiffel Tower Mini', nameCn: '巴黎铁塔模型', rarity: 'mythic', effectType: 'speed', effectValue: 20, image: 'eiffel', description: '浪漫与艺术的结晶', countryCode: 'FR', totalQuantity: 1, remainingQuantity: 1 },
    { name: 'Imperial Seal', nameCn: '始皇帝传国玉玺', rarity: 'unique', effectType: 'speed', effectValue: 50, image: 'seal', description: '千古一帝的权威，全服唯一至宝', countryCode: 'CN', totalQuantity: 1, remainingQuantity: 1 },
    { name: 'Crown Jewels', nameCn: '英国王室权杖', rarity: 'unique', effectType: 'speed', effectValue: 50, image: 'crown', description: '日不落帝国的荣耀', countryCode: 'GB', totalQuantity: 1, remainingQuantity: 1 },
    { name: 'Samurai Armor', nameCn: '武士铠甲', rarity: 'unique', effectType: 'speed', effectValue: 50, image: 'samurai', description: '武士道的极致精神', countryCode: 'JP', totalQuantity: 1, remainingQuantity: 1 },
  ];

  await Artifact.insertMany(artifacts);
}

async function seedFactionAura() {
  const count = await FactionAura.countDocuments();
  if (count > 0) return;

  await FactionAura.insertMany([
    { faction: 'asia', auraValue: 0 },
    { faction: 'americas', auraValue: 0 },
    { faction: 'europe', auraValue: 0 },
  ]);
}

async function recalculateAura() {
  const factions = ['asia', 'americas', 'europe'];
  for (const faction of factions) {
    const users = await User.find({ faction });
    let totalAura = 0;
    for (const user of users) {
      const artifacts = await UserArtifact.find({ userId: user._id }).populate('artifactId');
      for (const ua of artifacts) {
        const a = ua.artifactId;
        if (a) {
          const values = { common: 1, epic: 10, mythic: 50, unique: 200 };
          totalAura += values[a.rarity] || 0;
        }
      }
      totalAura += (user.totalRebirths || 0) * 5;
    }
    await FactionAura.updateOne({ faction }, { auraValue: totalAura });
  }
}

module.exports = {
  connectDB,
  User,
  Country,
  Artifact,
  UserArtifact,
  FactionAura,
  recalculateAura,
};
