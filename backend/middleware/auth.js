const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'college_faculty_high_security_jwt_secret_key_2026';

const verifyToken = (req, res, next) => {
  let token = req.headers['authorization'] || req.query.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: High Security Protocol requires authorization token.' });
  }

  if (typeof token === 'string' && token.startsWith('Bearer ')) {
    token = token.substring(7);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.faculty = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Session Expired or Invalid Token. Please log in again.' });
  }
};

module.exports = {
  verifyToken,
  JWT_SECRET
};
