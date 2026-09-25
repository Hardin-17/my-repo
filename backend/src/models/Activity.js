const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        'OBJECT_UPLOADED',
        'OBJECT_DOWNLOADED',
        'REPLICA_CREATED',
        'NODE_REGISTERED',
        'NODE_HEARTBEAT',
        'OBJECT_VERIFIED',
      ],
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    objectId: {
      type: String,
      default: null,
      index: true,
    },
    nodeId: {
      type: String,
      default: null,
      index: true,
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'ERROR'],
      default: 'INFO',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
