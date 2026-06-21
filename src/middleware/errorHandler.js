function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    status: "not_found",
    message: "Route not found.",
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    ok: false,
    status: err.code || "internal_error",
    message: err.message || "Internal server error.",
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
