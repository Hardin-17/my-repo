const mongoose = require('mongoose');

const blockedPairSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  { _id: false }
);

const networkPartitionSchema = new mongoose.Schema(
  {
    partitionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    groups: {
      type: [[String]],
      required: true,
    },
    blockedPairs: [blockedPairSchema],
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED'],
      default: 'ACTIVE',
      index: true,
    },
    reason: {
      type: String,
      default: 'Chaos injected network partition',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const NetworkPartition = mongoose.model('NetworkPartition', networkPartitionSchema);

module.exports = NetworkPartition;
