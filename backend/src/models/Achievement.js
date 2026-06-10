const mongoose = require('mongoose');

const ACHIEVEMENT_DEFS = [
  { key: 'gold_100k', nameCn: '初階礦工', desc: '累計開採 100K 金幣', target: 100000, rewardGold: 5000 },
  { key: 'gold_1m', nameCn: '中階礦工', desc: '累計開採 1M 金幣', target: 1000000, rewardGold: 25000 },
  { key: 'gold_10m', nameCn: '高階礦工', desc: '累計開採 10M 金幣', target: 10000000, rewardGold: 100000 },
  { key: 'gold_100m', nameCn: '頂尖礦工', desc: '累計開採 100M 金幣', target: 100000000, rewardGold: 500000 },
  { key: 'gold_1b', nameCn: '傳奇礦工', desc: '累計開採 1B 金幣', target: 1000000000, rewardGold: 2000000 },
  { key: 'gacha_10', nameCn: '秘寶新手', desc: '開啟 10 次秘寶', target: 10, rewardGold: 20000 },
  { key: 'gacha_100', nameCn: '秘寶收藏家', desc: '開啟 100 次秘寶', target: 100, rewardGold: 200000 },
  { key: 'gacha_1000', nameCn: '秘寶大師', desc: '開啟 1000 次秘寶', target: 1000, rewardGold: 2000000 },
  { key: 'salvage_10', nameCn: '熔煉初體驗', desc: '熔煉 10 次', target: 10, rewardGold: 5000 },
  { key: 'salvage_100', nameCn: '熔煉專家', desc: '熔煉 100 次', target: 100, rewardGold: 50000 },
  { key: 'mine_5', nameCn: '深層開採', desc: '將礦場升到 Lv.5', target: 5, rewardGold: 100000 },
  { key: 'rebirth_1', nameCn: '首次轉生', desc: '完成第一次礦場轉生', target: 1, rewardGold: 50000 },
  { key: 'rebirth_10', nameCn: '轉生大師', desc: '完成 10 次礦場轉生', target: 10, rewardGold: 500000 },
];

const userAchievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  progress: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  claimed: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

userAchievementSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = {
  UserAchievement: mongoose.model('UserAchievement', userAchievementSchema),
  ACHIEVEMENT_DEFS,
};
