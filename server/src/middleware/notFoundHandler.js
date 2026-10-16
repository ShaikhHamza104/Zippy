export const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    requestId: req.id,
  });
};
