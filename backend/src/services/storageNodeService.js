const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/env');

class StorageNodeService {
  constructor() {
    this.baseStoragePath = path.resolve(config.storagePath);
    this.ensureBaseDirectory();
  }

  ensureBaseDirectory() {
    if (!fs.existsSync(this.baseStoragePath)) {
      fs.mkdirSync(this.baseStoragePath, { recursive: true });
    }
  }

  getNodeDirectory(nodeId) {
    // Sanitize nodeId to alphanumeric and dash only
    const safeNodeId = String(nodeId).replace(/[^a-zA-Z0-9_-]/g, '');
    const nodeDir = path.join(this.baseStoragePath, safeNodeId);
    if (!fs.existsSync(nodeDir)) {
      fs.mkdirSync(nodeDir, { recursive: true });
    }
    return nodeDir;
  }

  /**
   * Safe path resolution with rigorous path traversal protection
   */
  resolveReplicaPath(nodeId, storageKey) {
    const nodeDir = this.getNodeDirectory(nodeId);
    
    // Normalize and sanitize storageKey
    const normalizedKey = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.resolve(nodeDir, normalizedKey);

    // Ensure fullPath starts with nodeDir
    if (!fullPath.startsWith(nodeDir)) {
      throw new Error(`Path traversal attempt blocked for node ${nodeId} with key ${storageKey}`);
    }

    return fullPath;
  }

  async writeReplica(nodeId, storageKey, buffer) {
    const targetPath = this.resolveReplicaPath(nodeId, storageKey);
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await fs.promises.writeFile(targetPath, buffer);

    return {
      nodeId,
      path: targetPath,
      size: buffer.length,
    };
  }

  createReadStream(nodeId, storageKey) {
    const targetPath = this.resolveReplicaPath(nodeId, storageKey);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Replica file not found on node ${nodeId} for key ${storageKey}`);
    }
    return fs.createReadStream(targetPath);
  }

  async readReplicaBuffer(nodeId, storageKey) {
    const targetPath = this.resolveReplicaPath(nodeId, storageKey);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Replica file not found on node ${nodeId} for key ${storageKey}`);
    }
    return await fs.promises.readFile(targetPath);
  }

  async replicaExists(nodeId, storageKey) {
    try {
      const targetPath = this.resolveReplicaPath(nodeId, storageKey);
      await fs.promises.access(targetPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async deleteReplica(nodeId, storageKey) {
    try {
      const targetPath = this.resolveReplicaPath(nodeId, storageKey);
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[StorageNodeService] Failed to delete replica on ${nodeId}:`, err.message);
      return false;
    }
  }

  async verifyReplicaChecksum(nodeId, storageKey, expectedChecksum) {
    try {
      const buffer = await this.readReplicaBuffer(nodeId, storageKey);
      const computedHash = crypto.createHash('sha256').update(buffer).digest('hex');
      const isValid = computedHash === expectedChecksum;
      return {
        isValid,
        computedHash,
        expectedChecksum,
        match: isValid,
      };
    } catch (err) {
      return {
        isValid: false,
        error: err.message,
      };
    }
  }
}

// Export singleton instance
module.exports = new StorageNodeService();
