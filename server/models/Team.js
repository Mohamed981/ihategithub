const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  contributers:[
    {
      _id: {
        type:mongoose.Schema.Types.ObjectId
      }
    }
  ],
  creator:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user',
    required:true
  },
  created_date: {
    type: Date,
    default: Date.now
  }
});

module.exports =  mongoose.model('Team', TeamSchema);