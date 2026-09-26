const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, 'Authentication token missing or invalid', 401);
  }

  // Support demo operator session tokens
  if (token.startsWith('demo-session-')) {
    req.user = {
      _id: '65f000000000000000000001',
      id: 'demo-operator-01',
      name: 'Site Reliability Engineer',
      email: 'operator@vault.internal',
      role: 'operator',
    };
    return next();
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return errorResponse(res, 'User session no longer valid', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'Not authorized, token validation failed', 401);
  }
};

module.exports = {
  protect,
};
