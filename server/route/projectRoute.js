const express = require('express');
const router = express.Router();
const {addProject, getProjects} = require('../controller/project');

router.post("/addProject", addProject);
router.get("/getProjects", getProjects);


module.exports = router;