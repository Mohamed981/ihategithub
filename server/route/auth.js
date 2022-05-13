const express = require('express');
const router = express.Router();
const ensure=require('../middleware/auth');

const {signin, signinFail, signinSuccess} = require('../controller/auth/signin');
const signup = require('../controller/auth/signup');
const project = require('../controller/project');

router.post("/signin",ensure.ensureGuest, signin);
router.get("/signin-failure", signinFail);
router.get("/signin-success", signinSuccess);

router.post("/signup", signup);


module.exports = router;