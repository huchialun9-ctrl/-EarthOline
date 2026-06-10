const mongoose = require('mongoose');

const clanSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true, trim: true },
  tag: { type: String, required: true, maxlength: 4 },
  description: { type: String, default: '' },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  goldPool: { type: Number, default: 0 },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['leader', 'officer', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  }],
  joinRequests: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Clan', clanSchema);
