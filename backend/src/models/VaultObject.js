const mongoose = require('mongoose');

const replicaSchema = new mongoose.Schema(
  {
    nodeId: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    checksum: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['HEALTHY', 'MISSING', 'CORRUPTED', 'INCONSISTENT', 'REPAIRING'],
      default: 'HEALTHY',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const vaultObjectSchema = new mongoose.Schema(
  {
    objectId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    storageKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream',
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    checksum: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    replicationFactor: {
      type: Number,
      required: true,
      default: 3,
      min: 1,
      max: 5,
    },
    durabilityPolicy: {
      type: String,
      enum: ['ONE', 'QUORUM', 'ALL'],
      default: 'QUORUM',
    },
    readPolicy: {
      type: String,
      enum: ['ANY_HEALTHY', 'LOWEST_LATENCY', 'QUORUM'],
      default: 'ANY_HEALTHY',
    },
    replicas: [replicaSchema],
    status: {
      type: String,
      enum: ['HEALTHY', 'DEGRADED', 'CORRUPTED', 'REPAIRING'],
      default: 'HEALTHY',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to determine overall object health from replicas
vaultObjectSchema.methods.recalculateStatus = function () {
  const healthyReplicas = this.replicas.filter((r) => r.status === 'HEALTHY').length;
  const isRepairing = this.replicas.some((r) => r.status === 'REPAIRING');

  if (healthyReplicas === 0) {
    this.status = 'CORRUPTED';
  } else if (healthyReplicas < this.replicationFactor) {
    this.status = isRepairing ? 'REPAIRING' : 'DEGRADED';
  } else {
    this.status = 'HEALTHY';
  }
  return this.status;
};

const VaultObject = mongoose.model('VaultObject', vaultObjectSchema);

module.exports = VaultObject;
