'use strict';
/**
 * @module
 */

const User = require('./users-model.js');

const tokenBlacklist = [];

/**
 * A middleware function that authenticates a request using the authorization header
 * @param req
 * @param res
 * @param next
 * @returns {Promise|void}
 */
module.exports = (req, res, next) => {
  
  try {
    let [authType, authString] = req.headers.authorization.split(/\s+/);
    
    switch( authType.toLowerCase() ) {
      case 'basic': 
        return _authBasic(authString);
      case 'bearer':
        return _authBearer(authString);
      default: 
        return _authError();
    }
  }
  catch(e) {
    next(e);
  }

  /**
   * Authenticates the request using basic auth
   * @param {string} str
   * @returns {Promise}
   * @private
   */
  function _authBasic(str) {
    // str: am9objpqb2hubnk=
    let base64Buffer = Buffer.from(str, 'base64'); // <Buffer 01 02 ...>
    let bufferString = base64Buffer.toString();    // john:mysecret
    let [username, password] = bufferString.split(':'); // john='john'; mysecret='mysecret']
    let auth = {username,password}; // { username:'john', password:'mysecret' }
    
    return User.authenticateBasic(auth)
      .then(user => _authenticate(user) )
      .catch(next);
  }

  /**
   * Authenticates the request using bearer auth
   * @param {string} token
   * @returns {Promise}
   * @private
   */
  function _authBearer(token) {
    if (process.env.JWT_USES === 'single') {
      if (tokenBlacklist.includes(token)) {
        next('Invalid Token');
        return;
      }
      tokenBlacklist.push(token);
    }

    return User.authenticateToken(token)
      .then(user => _authenticate(user))
      .catch(next);
  }

  /**
   * Completes the authentication process by placing a token in the request
   * @param user
   * @private
   */
  function _authenticate(user) {
    if(user) {
      req.user = user;
      req.token = user.generateToken();
      next();
    }
    else {
      _authError();
    }
  }

  /**
   * If the authentication process hits an error, notify the client
   * @private
   */
  function _authError() {
    next('Invalid User ID/Password');
  }
  
};
