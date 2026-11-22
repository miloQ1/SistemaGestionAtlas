module.exports = function rbacMiddleware(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'Acceso prohibido: No posees los permisos requeridos para ejecutar esta acción.',
        rol_actual: req.user ? req.user.rol : 'Sin rol',
      });
    }
    return next();
  };
};
