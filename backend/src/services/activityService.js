const Activity = require('../models/Activity');
const { getDbStatus } = require('../config/db');

const logActivity = async ({
  eventType,
  message,
  userId = null,
  objectId = null,
  nodeId = null,
  severity = 'INFO',
  metadata = {},
}) => {
  try {
    const dbStatus = getDbStatus();
    if (dbStatus.readyState !== 1) return null;

    const activity = await Activity.create({
      eventType,
      message,
      userId,
      objectId,
      nodeId,
      severity,
      metadata,
      timestamp: new Date(),
    });
    return activity;
  } catch (error) {
    console.error('[Activity] Error recording event:', error.message);
    return null;
  }
};

const getRecentActivities = async (limit = 20) => {
  const dbStatus = getDbStatus();
  if (dbStatus.readyState !== 1) return [];

  return await Activity.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email role')
    .lean();
};

module.exports = {
  logActivity,
  getRecentActivities,
};
