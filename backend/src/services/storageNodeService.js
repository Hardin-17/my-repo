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

  /**
   * Controlled byte-level data corruption injection for testing bit-rot detection & self-healing
   */
  async corruptReplica(nodeId, storageKey) {
    const targetPath = this.resolveReplicaPath(nodeId, storageKey);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Cannot corrupt: Replica not found on node ${nodeId} for key ${storageKey}`);
    }

    const buffer = await fs.promises.readFile(targetPath);
    if (buffer.length > 0) {
      // Invert bits in first byte or append bit-rot sequence
      buffer[0] = buffer[0] ^ 0xff;
    }
    const corruptedBuffer = Buffer.concat([buffer, Buffer.from('_CORRUPTED_BIT_ROT_')]);
    await fs.promises.writeFile(targetPath, corruptedBuffer);

    const newChecksum = crypto.createHash('sha256').update(corruptedBuffer).digest('hex');
    return {
      nodeId,
      storageKey,
      newSize: corruptedBuffer.length,
      newChecksum,
    };
  }

  /**
   * Actual replica copying across logical node directories with streaming
   */
  async copyReplica(sourceNodeId, targetNodeId, storageKey) {
    const sourcePath = this.resolveReplicaPath(sourceNodeId, storageKey);
    const targetPath = this.resolveReplicaPath(targetNodeId, storageKey);

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source replica not found on node ${sourceNodeId} for key ${storageKey}`);
    }

    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy stream and calculate SHA-256 incrementally
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(sourcePath);
      const writeStream = fs.createWriteStream(targetPath);
      const hash = crypto.createHash('sha256');
      let bytesTransferred = 0;

      readStream.on('data', (chunk) => {
        hash.update(chunk);
        bytesTransferred += chunk.length;
      });

      readStream.on('error', (err) => {
        writeStream.destroy();
        reject(err);
      });

      writeStream.on('error', (err) => {
        readStream.destroy();
        reject(err);
      });

      writeStream.on('finish', () => {
        const computedChecksum = hash.digest('hex');
        resolve({
          sourceNodeId,
          targetNodeId,
          storageKey,
          bytesTransferred,
          checksum: computedChecksum,
        });
      });

      readStream.pipe(writeStream);
    });
  }
}

// Export singleton instance
module.exports = new StorageNodeService();
