const bcrypt = require('bcrypt');
const passport = require('passport');
const User = require('../../models/User');
const signin = passport.authenticate('local', { failureRedirect: '/auth/signin-failure', successRedirect: '/auth/signin-success' });

const signinFail = (req, res) => {
  res.status(401).json({message:"fail to signin uncorrect username or password"});
};

const signinSuccess = (req, res) => {

  console.log("session before sent",req.User);
  console.log("session before sent",req.sessionID);
  res.status(200).json({message:'successfully signin', token: req.session.cookie.expires, tokenId: req.sessionID});

};

module.exports = {signin, signinSuccess, signinFail};