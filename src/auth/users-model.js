'use strict';
/**
 * @module
 * @type {Mongoose}
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const users = new mongoose.Schema({
  username: {type:String, required:true, unique:true},
  password: {type:String, required:true},
  email: {type: String},
  role: {type: String, default:'user', enum: ['admin','editor','user']},
});

/**
 * @module
 * @type {Mongoose}
 */
users.pre('save', function(next) {
  bcrypt.hash(this.password, 10)
    .then(hashedPassword => {
      this.password = hashedPassword;
      next();
    })
    .catch(console.error);
});

/**
 * Creates a user using an email acquired through OAuth.
 * @param email
 * @returns {Promise}
 */
users.statics.createFromOauth = function(email) {

  if(! email) { return Promise.reject('Validation Error'); }

  return this.findOne( {email} )
    .then(user => {
      if( !user ) { throw new Error('User Not Found'); }
      console.log('Welcome Back', user.username);
      return user;
    })
    .catch( error => {
      console.log('Creating new user');
      let username = email;
      let password = 'none';
      return this.create({username, password, email});
    });

};

/**
 * A static function on the Users model that looks up the user and verifies the given password.
 * @param {Object} auth - An object containing the user's username and password
 * @returns {Promise}
 */
users.statics.authenticateBasic = function(auth) {
  let query = {username:auth.username};
  return this.findOne(query)
    .then( user => user && user.comparePassword(auth.password) )
    .catch(error => {throw error;});
};

/**
 * Verifies the given token is valid.
 * @param token
 * @returns {Promise}
 */
users.statics.authenticateToken = function(token) {
  const decryptedToken = jwt.verify(token, process.env.SECRET || 'secret');
  const query = {_id: decryptedToken.id};
  return this.findOne(query);
};

/**
 * An instance method on the Users model that compares a raw password with the hashed password in the database.
 * @param password
 * @returns {Promise}
 */
users.methods.comparePassword = function(password) {
  return bcrypt.compare( password, this.password )
    .then( valid => valid ? this : null);
};

/**
 * Generate a JWT from the user id and a secret.
 * @param {string} type - Key type
 * @returns {string} The generated token
 */
users.methods.generateToken = function(type) {
  let token = {
    id: this._id,
    role: this.role,
  };

  if (type === 'key' || !process.env.JWT_EXPIRES_IN) {
    return jwt.sign(token, process.env.SECRET);
  }

  return jwt.sign(token, process.env.SECRET || 'secret', { expiresIn: process.env.JWT_EXPIRES_IN });
};

/**
 * Generates an Auth Key that does not expire.
 * @returns {string}
 */
users.methods.generateKey = function() {
  return this.generateToken('key');
};

module.exports = mongoose.model('users', users);
