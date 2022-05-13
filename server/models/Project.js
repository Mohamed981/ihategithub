const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  files:{
    type:Object
  },
  creator:{
    type:Object,
    required:true
  },
  editors:[
    {
      _id:{
        type:mongoose.Types.ObjectId,
        ref:'team'
      },
      title:{
        type:String
      }
    }
  ],
  created_date: {
    type: Date,
    default: Date.now
  }
});

module.exports =  mongoose.model('Project', ProjectSchema);