const VaultObject = require('../models/VaultObject');
const Node = require('../models/Node');
const storageNodeService = require('./storageNodeService');
const repairService = require('./repairService');
const { logActivity } = require('./activityService');

class ReconciliationService {
  /**
   * Scan all objects and node disks to detect metadata and replica inconsistencies
   */
  async scanInconsistencies() {
    const objects = await VaultObject.find().lean();
    const nodes = await Node.find().lean();
    const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));

    const report = {
      totalObjectsScanned: objects.length,
      inconsistentObjects: [],
      versionMismatches: 0,
      checksumMismatches: 0,
      missingDiskFiles: 0,
      degradedObjects: 0,
      healthyCount: 0,
    };

    for (const obj of objects) {
      let objHasInconsistency = false;
      const issues = [];

      for (const rep of obj.replicas) {
        const node = nodeMap.get(rep.nodeId);
        const isOnline = node && node.status === 'ONLINE';

        // 1. Version check
        if (rep.version && obj.version && rep.version < obj.version) {
          report.versionMismatches++;
          objHasInconsistency = true;
          issues.push({
            type: 'VERSION_MISMATCH',
            nodeId: rep.nodeId,
            replicaVersion: rep.version,
            objectVersion: obj.version,
          });
        }

        // 2. Physical disk file existence check (if node is online)
        if (isOnline) {
          const exists = await storageNodeService.replicaExists(rep.nodeId, obj.storageKey);
          if (!exists) {
            report.missingDiskFiles++;
            objHasInconsistency = true;
            issues.push({
              type: 'MISSING_DISK_FILE',
              nodeId: rep.nodeId,
              status: rep.status,
            });
          } else {
            // 3. Verify actual disk checksum matches object checksum
            const check = await storageNodeService.verifyReplicaChecksum(
              rep.nodeId,
              obj.storageKey,
              obj.checksum
            );
            if (!check.match) {
              report.checksumMismatches++;
              objHasInconsistency = true;
              issues.push({
                type: 'CHECKSUM_MISMATCH',
                nodeId: rep.nodeId,
                diskChecksum: check.computedHash,
                expectedChecksum: obj.checksum,
              });
            }
          }
        }
      }

      const healthyCount = obj.replicas.filter((r) => r.status === 'HEALTHY').length;
      if (healthyCount < obj.replicationFactor) {
        report.degradedObjects++;
      }

      if (objHasInconsistency) {
        report.inconsistentObjects.push({
          objectId: obj.objectId,
          originalName: obj.originalName,
          issues,
        });
      } else {
        report.healthyCount++;
      }
    }

    return report;
  }

  /**
   * Reconcile detected inconsistencies by updating replica statuses and scheduling auto-repair jobs
   */
  async reconcile({ userId = null } = {}) {
    const scan = await this.scanInconsistencies();
    const repairJobsCreated = [];

    for (const item of scan.inconsistentObjects) {
      const obj = await VaultObject.findOne({ objectId: item.objectId });
      if (!obj) continue;

      let modified = false;

      for (const issue of item.issues) {
        const replica = obj.replicas.find((r) => r.nodeId === issue.nodeId);
        if (!replica) continue;

        if (issue.type === 'VERSION_MISMATCH' || issue.type === 'CHECKSUM_MISMATCH') {
          replica.status = 'INCONSISTENT';
          modified = true;
        } else if (issue.type === 'MISSING_DISK_FILE') {
          replica.status = 'MISSING';
          modified = true;
        }
      }

      if (modified) {
        obj.recalculateStatus();
        await obj.save();
      }

      // Schedule repair job to reconcile from a healthy replica
      const healthyReplicas = obj.replicas.filter((r) => r.status === 'HEALTHY').length;
      if (healthyReplicas > 0 && healthyReplicas < obj.replicationFactor) {
        const job = await repairService.createRepairJob({
          objectId: obj.objectId,
          reason: 'RECONCILIATION_REPAIR',
        });
        if (job) {
          repairJobsCreated.push(job.jobId);
        }
      }
    }

    await logActivity({
      eventType: 'SYSTEM_MAINTENANCE',
      message: `Reconciliation executed: ${scan.inconsistentObjects.length} objects processed, ${repairJobsCreated.length} auto-repairs scheduled`,
      userId,
      severity: 'INFO',
    });

    return {
      scan,
      repairJobsCreated,
      reconciledAt: new Date(),
    };
  }
}

module.exports = new ReconciliationService();
