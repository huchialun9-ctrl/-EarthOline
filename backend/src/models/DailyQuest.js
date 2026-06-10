const mongoose = require('mongoose');

const dailyQuestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  quests: [{
    type: { type: String, required: true },
    progress: { type: Number, default: 0 },
    target: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    claimed: { type: Boolean, default: false },
    rewardGold: { type: Number, default: 0 },
  }],
  allCompleted: { type: Boolean, default: false },
  allClaimed: { type: Boolean, default: false },
  streak: { type: Number, default: 0 },
}, { timestamps: true });

dailyQuestSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyQuest', dailyQuestSchema);
