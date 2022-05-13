const bcrypt = require('bcrypt');
const passport = require('passport');
const User = require('../../models/User');

const signup = async (req, res) => {

  try {
    const { username, password } = req.body;

    if (!username) {
      res.status(500).json({ message: "username field is required" });
    }
    if (!password) {
      res.status(500).json({ message: "password field is required" });
    }

    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync(password, salt);

    const newUser = new User({
      username: username,
      original_pass:password,
      password: hash,
      salt: salt
    });

    await newUser.save()

    res.status(200).json({ message: "successfully rejestered" });

  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = signup;