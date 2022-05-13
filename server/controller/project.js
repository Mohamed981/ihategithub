const Project = require("../models/Project");

const addProject = async (req, res) => {

  try {
    const  data =req.body;
    console.log(data);
    const newProject = new Project({
      title: data.title,
      files:2,
      editors: data.editors,

    });

    await newProject.save()

    res.status(200).json({ message: "successfully added" });

  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

const getProjects = async (req,res) => {
  console.log(req);
  const ll=await Project.find({});
  // console.log(ll);
  res.status(200).json({Projects:ll});
};
module.exports = {addProject,getProjects};