const https = require('https');
const { getClusterContext } = require('./aiContextService');
const rebalanceService = require('./rebalanceService');
const chaosService = require('./chaosService');
const integrityService = require('./integrityService');
const networkService = require('./networkService');
const reconciliationService = require('./reconciliationService');
const { logActivity } = require('./activityService');
const config = require('../config/env');

class AssistantService {
  /**
   * Process a natural language query with live cluster context
   */
  async chat({ message, conversationHistory = [], userId = null }) {
    if (!message || typeof message !== 'string') {
      const error = new Error('Message is required and must be a string');
      error.statusCode = 400;
      throw error;
    }

    const clusterContext = await getClusterContext(userId);
    const hasApiKey = !!(config.aiApiKey || config.geminiApiKey);

    // If in production without an AI key and not in demo mode, report unconfigured per spec
    if (!hasApiKey && config.nodeEnv === 'production' && !config.demoMode) {
      return {
        reply: 'VaultOps AI is not configured. Please set the AI_API_KEY environment variable in your deployment configuration to enable the autonomous copilot.',
        proposals: [],
        clusterContext,
        modelUsed: 'unconfigured',
      };
    }

    // If API Key is provided, attempt LLM call
    if (hasApiKey) {
      try {
        const llmResult = await this.callGemini({
          message,
          conversationHistory,
          clusterContext,
        });
        if (llmResult) {
          return {
            ...llmResult,
            clusterContext,
          };
        }
      } catch (err) {
        console.warn('[AssistantService] Gemini API call failed, falling back to rule engine:', err.message);
      }
    }

    // Deterministic Intelligent Diagnostic Engine (Dev/Test/Demo fallback)
    const ruleResult = this.generateRuleBasedResponse(message, clusterContext);

    await logActivity({
      eventType: 'AI_QUERY',
      message: `VaultOps AI queried: "${message.substring(0, 60)}..."`,
      userId,
      severity: 'INFO',
    });

    return {
      ...ruleResult,
      clusterContext,
      modelUsed: 'vaultops-rule-engine-v4',
    };
  }

  /**
   * Call Google Gemini API with cluster context
   */
  async callGemini({ message, conversationHistory = [], clusterContext }) {
    return new Promise((resolve, reject) => {
      const systemInstruction = `You are VaultOps AI, the real-time operational co-pilot for the VAULT distributed object storage system.
Your job is to diagnose cluster failures, analyze storage skew, detect network partitions, and suggest actionable remediation steps.
Here is the current live cluster state:
${JSON.stringify(clusterContext, null, 2)}

When suggesting operational interventions (recovering nodes, clearing network partitions, triggering storage rebalance, running integrity scrub), format each proposal as a JSON block with:
\`\`\`json
{
  "type": "ACTION_PROPOSAL",
  "action": "TRIGGER_REBALANCE" | "RECOVER_NODE" | "TRIGGER_INTEGRITY_SCAN" | "RECOVER_PARTITION" | "RUN_RECONCILIATION",
  "payload": { ... },
  "description": "Clear human-readable description of what this action will do"
}
\`\`\`
Never claim you executed an action directly; specify that operator confirmation is required. Be concise, precise, and professional.`;

      const contents = [];
      for (const turn of conversationHistory.slice(-4)) {
        contents.push({
          role: turn.role === 'user' ? 'user' : 'model',
          parts: [{ text: turn.content }],
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const bodyData = JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400 || parsed.error) {
              return reject(new Error(parsed.error?.message || `Gemini API returned HTTP ${res.statusCode}`));
            }

            const candidateText =
              parsed.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

            // Extract action proposals if present in JSON code blocks
            const proposals = [];
            const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
            let match;
            while ((match = jsonBlockRegex.exec(candidateText)) !== null) {
              try {
                const parsedJson = JSON.parse(match[1]);
                if (parsedJson.type === 'ACTION_PROPOSAL') {
                  proposals.push(parsedJson);
                }
              } catch (e) {
                // Ignore non-proposal JSON
              }
            }

            resolve({
              reply: candidateText,
              proposals,
              modelUsed: 'gemini-1.5-flash',
            });
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(8000, () => {
        req.destroy();
        reject(new Error('Gemini API request timed out'));
      });

      req.write(bodyData);
      req.end();
    });
  }

  /**
   * Deterministic Intelligent Diagnostic Rule Engine
   */
  generateRuleBasedResponse(message, context) {
    const text = message.toLowerCase();
    const proposals = [];
    let reply = '';

    const offlineNodes = context.nodes.filter((n) => n.status === 'OFFLINE');
    const degradedObjects = context.objects.degraded;
    const corruptedObjects = context.objects.corrupted;
    const activePartitions = context.activePartitions;
    const activeRepairs = context.activeRepairs;
    const skew = context.storage.skewSpreadPercent;
    const needsRebalance = context.storage.needsRebalance;

    if (text.includes('rebalance') || text.includes('skew') || text.includes('capacity') || text.includes('utilization')) {
      reply = `### ⚖️ Storage Distribution & Rebalance Analysis\n\n`;
      reply += `- **Total Mesh Capacity:** ${context.storage.totalCapacityMb} MB\n`;
      reply += `- **Total Used Storage:** ${context.storage.totalUsedMb} MB\n`;
      reply += `- **Current Utilization Spread:** **${skew}%**\n`;
      reply += `- **Rebalance Threshold:** 20%\n`;
      reply += `- **Status:** ${needsRebalance ? '⚠️ Rebalance Recommended' : '✅ Balanced within acceptable bounds'}\n\n`;

      reply += `**Per-Node Utilization:**\n`;
      context.nodes.forEach((n) => {
        reply += `- **${n.nodeId}**: ${n.usedMb} MB / ${n.capacityMb} MB (${n.utilizationPercent}%)\n`;
      });

      proposals.push({
        type: 'ACTION_PROPOSAL',
        action: 'TRIGGER_REBALANCE',
        payload: { maxMoves: 5 },
        description: 'Execute background rebalancing migration (copy-then-verify before source deletion)',
      });
    } else if (text.includes('partition') || text.includes('split') || text.includes('mesh')) {
      reply = `### 🌐 Network Mesh & Partition Status\n\n`;
      if (activePartitions.length === 0) {
        reply += `✅ **No Active Network Partitions.** Full mesh connectivity exists between all ${context.nodes.length} storage nodes.\n\n`;
        reply += `You can simulate partial network partitions using the Chaos Engineering controls in the dashboard.`;
      } else {
        reply += `⚠️ **Active Partitions Detected:**\n`;
        activePartitions.forEach((p) => {
          reply += `- **Partition ID:** \`${p.partitionId}\`\n`;
          reply += `  Groups: ${p.groups.map((g) => `[${g.join(', ')}]`).join(' ⚡ [BLOCKED] ⚡ ')}\n`;
          reply += `  Blocked Links: ${p.blockedPairsCount} pairs\n`;
        });
        proposals.push({
          type: 'ACTION_PROPOSAL',
          action: 'RECOVER_PARTITION',
          payload: {},
          description: 'Heal network partitions and restore full inter-node communication',
        });
      }
    } else if (text.includes('diagnos') || text.includes('health') || text.includes('status') || text.includes('issue') || text.includes('problem')) {
      reply = `### 🛰️ VaultOps Cluster Health Diagnostic Report\n\n`;
      reply += `**Overall Health State:** \`${context.clusterStatus}\`\n\n`;

      if (offlineNodes.length > 0) {
        reply += `⚠️ **Storage Node Outages Detected:** ${offlineNodes.length} node(s) currently OFFLINE:\n`;
        offlineNodes.forEach((n) => {
          reply += `- **${n.nodeId}** (${n.name}): Offline / Unreachable\n`;
          proposals.push({
            type: 'ACTION_PROPOSAL',
            action: 'RECOVER_NODE',
            payload: { nodeId: n.nodeId },
            description: `Bring storage node ${n.nodeId} back online and initiate replica sync`,
          });
        });
        reply += `\n`;
      } else {
        reply += `✅ **Storage Mesh:** All ${context.nodes.length} storage nodes are online with healthy latencies.\n\n`;
      }

      if (activePartitions.length > 0) {
        reply += `⚡ **Network Partitions Active:** ${activePartitions.length} partition(s) active separating node groups.\n`;
        activePartitions.forEach((p) => {
          reply += `- Partition \`${p.partitionId}\`: ${p.groups.map((g) => `[${g.join(',')}]`).join(' <-> ')}\n`;
        });
        proposals.push({
          type: 'ACTION_PROPOSAL',
          action: 'RECOVER_PARTITION',
          payload: {},
          description: 'Recover all active network partitions and restore full mesh connectivity',
        });
        reply += `\n`;
      }

      if (corruptedObjects > 0 || degradedObjects > 0) {
        reply += `🔴 **Object Health Inconsistency:** ${corruptedObjects} corrupted object(s), ${degradedObjects} degraded object(s).\n`;
        proposals.push({
          type: 'ACTION_PROPOSAL',
          action: 'TRIGGER_INTEGRITY_SCAN',
          payload: {},
          description: 'Run full cryptographic SHA-256 integrity scrub across all stored objects',
        });
      } else {
        reply += `🛡️ **Cryptographic Integrity:** All ${context.objects.total} stored objects are healthy and verified.\n\n`;
      }

      if (needsRebalance) {
        reply += `⚖️ **Storage Skew Warning:** Utilization spread is **${skew}%** (threshold: 20%). Background rebalance recommended.\n`;
        proposals.push({
          type: 'ACTION_PROPOSAL',
          action: 'TRIGGER_REBALANCE',
          payload: { maxMoves: 5 },
          description: 'Execute copy-then-verify background storage rebalance across nodes',
        });
      }

      if (proposals.length === 0) {
        reply += `\nAll systems operational. No remediation actions required at this time.`;
      }
    } else if (text.includes('repair') || text.includes('heal') || text.includes('recover') || text.includes('reconcil')) {
      reply = `### 🛠️ Self-Healing & Reconciliation Status\n\n`;
      reply += `- **Active Repairs:** ${activeRepairs.length}\n`;
      reply += `- **Degraded Objects:** ${degradedObjects}\n`;
      reply += `- **Corrupted Objects:** ${corruptedObjects}\n\n`;

      if (activeRepairs.length > 0) {
        reply += `**Running Repair Jobs:**\n`;
        activeRepairs.forEach((j) => {
          reply += `- Job \`${j.jobId}\` for object \`${j.objectId}\`: status \`${j.status}\` (Reason: ${j.reason})\n`;
        });
        reply += `\n`;
      }

      proposals.push({
        type: 'ACTION_PROPOSAL',
        action: 'RUN_RECONCILIATION',
        payload: {},
        description: 'Scan metadata against disk state and schedule automated replica reconciliation',
      });
      proposals.push({
        type: 'ACTION_PROPOSAL',
        action: 'TRIGGER_INTEGRITY_SCAN',
        payload: {},
        description: 'Execute SHA-256 bit-rot scrub across all stored object replicas',
      });
    } else if (text.includes('node') || text.includes('server')) {
      reply = `### 🖥️ Storage Node Cluster Status\n\n`;
      context.nodes.forEach((n) => {
        const icon = n.status === 'ONLINE' ? '🟢' : '🔴';
        reply += `${icon} **${n.nodeId}** (${n.name}) — Status: \`${n.status}\` | Latency: ${n.latencyMs}ms | Disk: ${n.usedMb}MB / ${n.capacityMb}MB\n`;
      });

      if (offlineNodes.length > 0) {
        proposals.push({
          type: 'ACTION_PROPOSAL',
          action: 'RECOVER_NODE',
          payload: { nodeId: offlineNodes[0].nodeId },
          description: `Recover failed node ${offlineNodes[0].nodeId}`,
        });
      }
    } else {
      reply = `Hello! I am **VaultOps AI**, your autonomous distributed storage co-pilot.\n\n`;
      reply += `Current Cluster Health: **${context.clusterStatus}** (${context.nodes.filter((n) => n.status === 'ONLINE').length}/${context.nodes.length} nodes online, ${context.objects.total} objects stored).\n\n`;
      reply += `Here are things you can ask me:\n`;
      reply += `- **"Diagnose cluster health"** — scan for node failures, bit rot, and degraded replicas\n`;
      reply += `- **"Check storage skew"** — evaluate disk skew and trigger background rebalancing\n`;
      reply += `- **"Check network partitions"** — view active network splits and simulate quorum healing\n`;
      reply += `- **"Run reconciliation"** — detect and repair metadata or replica inconsistencies\n`;
    }

    return {
      reply,
      proposals,
    };
  }

  /**
   * Execute an operator-confirmed action proposal
   */
  async executeAction({ action, payload = {}, userId = null }) {
    const allowedActions = [
      'TRIGGER_REBALANCE',
      'RECOVER_NODE',
      'TRIGGER_INTEGRITY_SCAN',
      'RECOVER_PARTITION',
      'RUN_RECONCILIATION',
    ];

    if (!allowedActions.includes(action)) {
      const error = new Error(`Action "${action}" is not recognized or permitted`);
      error.statusCode = 400;
      throw error;
    }

    let result = null;

    switch (action) {
      case 'TRIGGER_REBALANCE':
        result = await rebalanceService.runRebalance({
          maxMoves: payload.maxMoves || 5,
          userId,
        });
        break;

      case 'RECOVER_NODE':
        if (!payload.nodeId) {
          const error = new Error('nodeId is required for RECOVER_NODE action');
          error.statusCode = 400;
          throw error;
        }
        result = await chaosService.recoverNode(payload.nodeId, userId);
        break;

      case 'TRIGGER_INTEGRITY_SCAN':
        result = await integrityService.scanAll(userId);
        break;

      case 'RECOVER_PARTITION':
        if (payload.partitionId) {
          result = await networkService.recoverPartition(payload.partitionId, userId);
        } else {
          result = await networkService.recoverAllPartitions(userId);
        }
        break;

      case 'RUN_RECONCILIATION':
        result = await reconciliationService.reconcile({ userId });
        break;
    }

    await logActivity({
      eventType: 'SYSTEM_MAINTENANCE',
      message: `VaultOps AI executed confirmed action: ${action}`,
      userId,
      severity: 'INFO',
    });

    return {
      action,
      executedAt: new Date(),
      result,
    };
  }
}

module.exports = new AssistantService();
