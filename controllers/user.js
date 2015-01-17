var _ = require('lodash');
var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var passport = require('passport');
var User = require('../models/User');
var secrets = require('../config/secrets');

/**
 * GET /login
 * Login page.
 */
exports.getLogin = function(req, res) {
  if (req.user) return res.redirect('/');
  res.render('account/login', {
    title: 'Login'
  });
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = function(req, res) {
  req.logout();
  res.redirect('/');
};
/**
 * GET /account
 * Profile page.
 */
exports.getAccount = function(req, res) {
  res.render('account/profile', {
    title: 'Account Management'
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = function(req, res, next) {
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    user.email = req.body.email || '';
    user.profile.name = req.body.name || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';

    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Profile information updated.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = function(req, res, next) {
  User.remove({ _id: req.user.id }, function(err) {
    if (err) return next(err);
    req.logout();
    req.flash('info', { msg: 'Your account has been deleted.' });
    res.redirect('/');
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = function(req, res, next) {
  var provider = req.params.provider;
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user[provider] = undefined;
    user.tokens = _.reject(user.tokens, function(token) { return token.kind === provider; });

    user.save(function(err) {
      if (err) return next(err);
      req.flash('info', { msg: provider + ' account has been unlinked.' });
      res.redirect('/account');
    });
  });
};

exports.freeFilter = function(title, description) {
  var pass = 0;

  var bestWords = {
    "free",
    "food",
    "drinks",
    "beverages",
    "refreshments",
    "snacks",
    "provided",
    "lunch",
    "dinner"
  }

  var goodWords = {
    "sandwich",
    "pizza",
    "burger",
    "burrito",
    "salad",
    "chicken",
    "wings",
    "coffee",
    "donuts",
    "cookies"
  }

  var badWords = {
    "dollar",
    "pay"
  }

  var regex = /\$\d+/;

  for (var i = 0; i < bestWords.length; i++) {
    if (title.indexOf(bestWords[i]) != -1) {
      pass += 1;
    }
    if (description.indexOf(bestWords[i]) != -1) {
      pass += 1;
    }
  }

  for (var i = 0; i < goodWords.length; i++) {
    if (title.indexOf(goodWords[i]) != -1) {
      pass += 1;
    }
    if (description.indexOf(goodWords[i]) != -1) {
      pass += 1;
    }
  }

  for (var i = 0; i < badWords.length; i++) {
    if (title.indexOf(badWords[i]) != -1) {
      pass -= 5;
    }
    if (description.indexOf(badWords[i]) != -1) {
      pass -= 5;
    }
  }

  for (var i = 0; i < goodWords.length; i++) {
    if (title.match(regex).length != 0) {
      pass -= 5;
    }
    if (description.match(regex).length != 0) {
      pass -= 5;
    }
  }

  return (pass > 1);
}