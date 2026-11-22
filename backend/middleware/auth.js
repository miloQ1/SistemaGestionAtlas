const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const authorization = req.get('Authorization');
  const match = authorization && authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    req.user = jwt.verify(
      match[1],
      process.env.JWT_SECRET || 'JWT_Secret_Atlas_ISY1102_2026_Key!'
    );
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};
