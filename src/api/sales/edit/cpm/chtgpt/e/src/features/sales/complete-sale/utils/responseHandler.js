function sendSuccess(res, data, message = 'Operation successful') {
  const response = {
    success: true,
    message,
    ...data,
  };
  res.status(200).json(response);
}

function sendError(res, statusCode, message, errors = []) {
  const response = {
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
  };
  res.status(statusCode).json(response);
}

module.exports = {
  sendSuccess,
  sendError,
};
