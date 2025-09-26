const completeSaleService = require('./service');
const { sendSuccess, sendError } = require('./utils/responseHandler');
const { NotFoundError, ConflictError, ValidationError } = require('./utils/errors');

async function completeSale(req, res) {
  try {
    const result = await completeSaleService.execute(req.body);
    if (result.isCached) {
      res.status(result.statusCode).json(result.body);
    } else {
      sendSuccess(res, result, 'Sale completed successfully');
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendError(res, 400, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendError(res, 404, error.message);
    }
    if (error instanceof ConflictError) {
      return sendError(res, 409, error.message);
    }
    console.error('Unhandled error in completeSale controller:', error);
    sendError(res, 500, 'An unexpected server error occurred.');
  }
}

module.exports = { completeSale };
