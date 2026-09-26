/**
 * VAULT Unified Storage Service Facade
 * 
 * Provides a high-level, unified API that coordinates:
 * - Distributed object placement and replication
 * - Raw storage node read/write streaming and byte manipulation
 * - Cryptographic checksum verification and bit-rot detection
 * - Quorum reads, durability policies, and optimistic concurrency
 */

const objectService = require('./objectService');
const storageNodeService = require('./storageNodeService');

module.exports = {
  // Object lifecycle operations
  uploadObject: objectService.uploadObject,
  updateObject: objectService.updateObject,
  downloadObject: objectService.downloadObject,
  getObjectById: objectService.getObjectById,
  getObjectReplicas: objectService.getObjectReplicas,
  listUserObjects: objectService.listUserObjects,
  deleteObject: objectService.deleteObject,

  // Low-level storage node operations
  writeReplica: storageNodeService.writeReplica.bind(storageNodeService),
  readReplicaBuffer: storageNodeService.readReplicaBuffer.bind(storageNodeService),
  createReadStream: storageNodeService.createReadStream.bind(storageNodeService),
  replicaExists: storageNodeService.replicaExists.bind(storageNodeService),
  deleteReplica: storageNodeService.deleteReplica.bind(storageNodeService),
  verifyReplicaChecksum: storageNodeService.verifyReplicaChecksum.bind(storageNodeService),
  corruptReplica: storageNodeService.corruptReplica.bind(storageNodeService),
  copyReplica: storageNodeService.copyReplica.bind(storageNodeService),
};
