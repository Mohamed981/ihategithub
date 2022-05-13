const mongoose = require('mongoose');
const Team = require('../models/Team');
const User = require('../models/User');

const addTeam = (req, res) => {

    const usersReceived = req.body;
    var users = [];

    console.log("request body is here : ",req.body);
    usersReceived.forEach(element => {
      console.log("request ids array type are here : ",typeof(element.id));
      users.push(mongoose.mongo.ObjectId(element.id));
    });
    console.log("request ids are here : ",users);
    console.log("request ids array type are here : ",typeof(users[0]));

    // console.log("are all valid : ", User.find({ _id : { $in : users } }).countDocuments());
    console.log("are all valid : ", User.find({ _id : { $in : users } }));
// { status: { $in: [ "A", "D" ] } }
    // {_id:{$all[123123]}}


    // const users = req.body;

    // const {title, users, creator} = req.body;

    // const team = new Team({
    //     title:title,
    //     users: users,
    //     creator: creator
    // });

    
    
    res.status(200).json({message:"team is created successfully"});
  };

const getAvailableUsers = async(req,res) => {
  try{
    const availableUsers = await User.find({},{password:false,salt:false,created_date:false,__v:false,original_pass:false});
    console.log("sent users to be choosen from",availableUsers);
    res.status(200).json({Users: availableUsers});
  }catch(err){
    console.log("send 500 server error : ",err);
  }
};

module.exports = {addTeam,getAvailableUsers};