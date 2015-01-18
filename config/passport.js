var _ = require('lodash');
var passport = require('passport');
var InstagramStrategy = require('passport-instagram').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var GitHubStrategy = require('passport-github').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
var OAuthStrategy = require('passport-oauth').OAuthStrategy;
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var MongoClient = require('mongodb').MongoClient;
var fb = require('fb');
var async = require('async');
var gcal = require('google-calendar');
var myCal

var secrets = require('./secrets');
var User = require('../models/User');

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

/**
/**
 * OAuth Strategy Overview
 *
 * - User is already logged in.
 *   - Check if there is an existing account with a provider id.
 *     - If there is, return an error message. (Account merging not supported)
 *     - Else link new OAuth account with currently logged-in user.
 * - User is not logged in.
 *   - Check if it's a returning user.
 *     - If returning user, sign in and we are done.
 *     - Else check if there is an existing account with user's email.
 *       - If there is, return an error message.
 *       - Else create a new account.
 */

/**
 * Sign in with Facebook.
 */

var db;

MongoClient.connect("mongodb://localhost:27017/freelunch", function(err, _db) {
  if(!err) {
    console.log("We are connected");
    db = _db;
    // _db.collection("tokens").ensureIndex( {token:1}, { unique:true, dropDups:true }, function(err, result) {     
      // callback
    // });
  }
})  ;

passport.use(new FacebookStrategy(secrets.facebook, function(req, accessToken, refreshToken, profile, done) {
  var collection = db.collection('tokens');

  collection.update({_id: profile.id}, {token: accessToken}, {upsert: true}, function(err, result) {
    if (err) {console.log('fucked up'); console.log(err); }
    else {
      console.log('all good');
      console.log(result);
      db.collection("tokens", function(err,collection){
        collection.find({},function(err, tokens) {
          tokens.each(function(err, user) {
            if (user) { 

              fb.setAccessToken(user.token);

              fb.api('me/events', {
                'fields': ['name','start_time','end_time','location','owner','description','id']
              }, function(res) {
                if(!res || res.error) {
                  console.log(!res ? 'error occurred' : res.error);
                  return;
                }

                calendar(res.data);
              });

              fb.api('me/events/declined', {
                'fields': ['name','start_time','end_time','location','owner','description','id']
              }, function(res) {
                if(!res || res.error) {
                  console.log(!res ? 'error occurred' : res.error);
                  return;
                }
                calendar(res.data);
              });
              
              fb.api('me/events/maybe', {
                'fields': ['name','start_time','end_time','location','owner','description','id']
              }, function(res) {
                if(!res || res.error) {
                  console.log(!res ? 'error occurred' : res.error);
                  return;
                }
                calendar(res.data);
              });
              

              fb.api('me/events/not_replied', {
                  'fields': ['name','start_time','end_time','location','owner','description','id']
                }, function(res) {
                if(!res || res.error) {
                  console.log(!res ? 'error occurred' : res.error);
                  return;
                }
                calendar(res.data);
              });
            
            }
          });
        });
      });
      // db.accounts.ensureIndex( { username: 1 }, { unique: true, dropDups: true } )
      // db.tokens.ensureIndex( {tokens:1}, { unique:true, dropDups:true }, function(err, result) {
        // console.log('sweeeeeet');
      // });
    }
  });

  // collection.find().each( function(myDoc) { 
    // graph.setAccessToken(myDoc.token);
    // var query = "select eid, uid, rsvp_status from event_member where uid = me()";

    // graph.fql(query, function(err, res) {
    //   console.log(res);
    // });
  // });

  if (req.user) {
    User.findOne({ facebook: profile.id }, function(err, existingUser) {
      if (existingUser) {
        req.flash('errors', { msg: 'There is already a Facebook account that belongs to you. Sign in with that account or delete it, then link it with your current account.' });
        done(err);
      } else {
        User.findById(req.user.id, function(err, user) {
          user.facebook = profile.id;
          user.tokens.push({ kind: 'facebook', accessToken: accessToken });
          var tkDoc = {_id:accessToken};
          var collections = db.collection('tokens');
          collections.InstagramStrategyrt(tkDoc, function(err, result) {
            if (err) {console.log('fucked up')}
            else {
              console.log('all good');
              console.log(result);
            }
          });
          user.profile.name = user.profile.name || profile.displayName;
          user.profile.gender = user.profile.gender || profile._json.gender;
          user.profile.picture = user.profile.picture || 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
          user.save(function(err) {
            req.flash('info', { msg: 'Facebook account has been linked.' });
            done(err, user);
          });
        });
      }
    });
  } else {
    User.findOne({ facebook: profile.id }, function(err, existingUser) {
      if (existingUser) return done(null, existingUser);
      User.findOne({ email: profile._json.email }, function(err, existingEmailUser) {
        if (existingEmailUser) {
          req.flash('errors', { msg: 'There is already an account using this email address. Sign in to that account and link it with Facebook manually from Account Settings.' });
          done(err);
        } else {
          var user = new User();
          user.email = profile._json.email;
          user.facebook = profile.id;
          user.tokens.push({ kind: 'facebook', accessToken: accessToken }); 
          var tkDoc = {'token':accessToken};
          var collections = db.collection('tokens');
          collections.insert(tkDoc, function(err, result) {
            if (err) {console.log('fucked up')}
            else {
              console.log('all good');
              console.log(result);
            }
          });
          user.profile.name = profile.displayName;
          user.profile.gender = profile._json.gender;
          user.profile.picture = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
          user.profile.location = (profile._json.location) ? profile._json.location.name : '';
          user.save(function(err) {
            done(err, user);
          });
        }
      });
    });
  }
}));

passport.use(new GoogleStrategy(secrets.google, function(accessToken, refreshToken, profile, done) {
  myCal = new gcal.GoogleCalendar(accessToken);
}))

/**
 * Login Required middleware.
 */
exports.isAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};

/**
 * Authorization Required middleware.
 */
exports.isAuthorized = function(req, res, next) {
  var provider = req.path.split('/').slice(-1)[0];

  if (_.find(req.user.tokens, { kind: provider })) {
    next();
  } else {
    res.redirect('/auth/' + provider);
  }
};

function calendar(events) {
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
  var num = 0;
  for (var i = 0; i < events.length; i++) {
    var single = events[i];
    if (freeFilter(single.name, single.description)) {
      myCal.calendarList.list(function(err, calendarList) {
        console.log('JUST BEFORE CALENDAR ||||||||||||||||||||||||||||||||||||||||||||||||');
        console.log(calendarList);
      });
    }
  }
  console.log(num);
}

function freeFilter(name, description) {
  name = name.toLowerCase();
  description = description.toLowerCase();
  
  var bestWords = [
    "free",
    "food",
    "drink",
    "beverage",
    "refreshment",
    "snack",
    "provided",
    "lunch",
    "dinner",
    "sandwich",
    "pizza",
    "burger",
    "burrito",
    "salad",
    "chicken",
    "wings",
    "coffee",
    "donuts",
    "cookies",
    "serve",
    "wishbone",
    "jimmy",
    "chipotle",
    "greek lady",
    "qdoba",
    "allegro",
    "chick fil",

  ];

  var badWords = [
    "dollar",
    "pay",
    "$"
  ];

  // var regex = /\$\d+/;

  for (var i = 0; i < bestWords.length; i++) {
    if (name.indexOf(bestWords[i]) != -1) {
      return true;
    } else if (description.indexOf(bestWords[i]) != -1) {
      return true;
    }
  }

  // for (var i = 0; i < badWords.length; i++) {
  //   if (title.indexOf(badWords[i]) != -1) {
  //     pass -= 5;
  //   }
  //   if (description.indexOf(badWords[i]) != -1) {
  //     pass -= 5;
  //   }
  // }

  // if (title.match(regex).length != 0) {
  //   pass -= 5;
  // }
  // if (description.match(regex).length != 0) {
  //   pass -= 5;
  // }

  return false;
}
