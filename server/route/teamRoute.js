const express = require('express');
const router = express.Router();

const {addTeam, getAvailableUsers} = require('../controller/team');

router.post('/addTeam', addTeam);
router.get('/availableUsers', getAvailableUsers);

module.exports = router;