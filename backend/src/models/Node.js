const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema(
  {
    nodeId: {
      type: String,
      required: [true, 'Node ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Node name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['ONLINE', 'DEGRADED', 'OFFLINE', 'REPAIRING'],
      default: 'ONLINE',
      index: true,
    },
    capacity: {
      type: Number,
      required: true,
      default: 100 * 1024 * 1024 * 1024, // 100 GB in bytes
    },
    usedStorage: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableStorage: {
      type: Number,
      default: 100 * 1024 * 1024 * 1024,
      min: 0,
    },
    objectCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    replicaCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    latency: {
      type: Number,
      default: 15, // in milliseconds
    },
    zone: {
      type: String,
      default: 'us-east-1',
    },
    address: {
      type: String,
      default: '127.0.0.1',
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
      index: true,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate available storage before saving
nodeSchema.pre('save', function (next) {
  this.availableStorage = Math.max(0, this.capacity - this.usedStorage);
  next();
});

// Optimized compound indexes for node selection and heartbeat monitoring
nodeSchema.index({ status: 1, availableStorage: -1 });
nodeSchema.index({ lastHeartbeat: -1 });

const Node = mongoose.model('Node', nodeSchema);

module.exports = Node;
