'use strict';
/**
 * @module
 */

/**
 * Middleware to handle 404 responses if no other path is matched.
 * @param req - Request object
 * @param res - Response object
 * @param next - Calls the next middleware function
 */
module.exports = (req,res,next) => {
  let error = { error: 'Resource Not Found' };
  res.status(404).json(error);
};
