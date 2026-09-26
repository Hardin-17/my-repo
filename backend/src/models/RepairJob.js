const mongoose = require('mongoose');

const repairJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    objectId: {
      type: String,
      required: true,
      index: true,
    },
    sourceNodeId: {
      type: String,
      default: null,
      index: true,
    },
    targetNodeId: {
      type: String,
      default: null,
      index: true,
    },
    reason: {
      type: String,
      enum: ['NODE_FAILURE', 'CORRUPTION', 'INCONSISTENCY', 'MANUAL_REPAIR'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'VERIFYING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    bytesTransferred: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Optimized compound indexes for repair queue processing and metrics
repairJobSchema.index({ status: 1, createdAt: -1 });
repairJobSchema.index({ objectId: 1, status: 1 });
repairJobSchema.index({ status: 1, startedAt: 1, completedAt: 1 });

const RepairJob = mongoose.model('RepairJob', repairJobSchema);

module.exports = RepairJob;
