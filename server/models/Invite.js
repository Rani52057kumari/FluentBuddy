const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema(
  {
    note: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    toEmail: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    createdAt: { type: Date, default: Date.now },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: false }
);

inviteSchema.index({ to: 1 });
inviteSchema.index({ from: 1 });
inviteSchema.index({ note: 1 });

module.exports = mongoose.model('Invite', inviteSchema);
