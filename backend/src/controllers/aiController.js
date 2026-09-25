const assistantService = require('../services/assistantService');
const { successResponse, errorResponse } = require('../utils/response');

const chat = async (req, res, next) => {
  try {
    const { message, conversationHistory } = req.body;
    if (!message) {
      return errorResponse(res, 'Message is required', 400);
    }

    const response = await assistantService.chat({
      message,
      conversationHistory: conversationHistory || [],
      userId: req.user._id,
    });

    return successResponse(res, response, 'Assistant response generated');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const executeAction = async (req, res, next) => {
  try {
    const { action, payload } = req.body;
    if (!action) {
      return errorResponse(res, 'action is required', 400);
    }

    const result = await assistantService.executeAction({
      action,
      payload: payload || {},
      userId: req.user._id,
    });

    return successResponse(res, result, `Action "${action}" executed successfully`);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  chat,
  executeAction,
};
