const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const bcrypt = require('bcrypt');

const customFields = {
    usernameField: 'username',
    passwordField: 'password'
};

const verifyCallback = (username, password, done) => {

    console.log("server side username : ",username);
    console.log("server side password : ",password);

    User.findOne({ username: username })
        .then((user) => {

            if (!user) { return done(null, false) }
            
			const hash = bcrypt.hashSync(password, user.salt);
            
            if (hash == user.password) {
                return done(null, user);
            } else {
                return done(null, false);
            }
        })
        .catch((err) => {   
            done(err);
        });

}

const strategy  = new LocalStrategy(customFields, verifyCallback);

passport.use(strategy);

passport.serializeUser((user, done) => {
    console.log("user : ",user._id)
    done(null, user._id);
});

passport.deserializeUser((userId, done) => {
    User.findById(userId)
    .then((user) => {
        done(null, user);
    })
    .catch(err => done(err))

});

module.exports = passport;