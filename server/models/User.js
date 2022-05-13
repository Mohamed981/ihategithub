const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  friends:[{
    _id:{
      type:mongoose.Types.ObjectId,
      ref:'user'
    },
    username:{
      type:String,
      required: true
    }
  }],
  notification:[{
    followingUserId:{
      type:mongoose.Types.ObjectId,
      ref:'user'
    },
    followingUserName:{
      type:String
    },
    status:{
      type:String,
      default:"waiting"
    },
    created_date:{
      type:Date,
      default:Date.now
    }
  }]
  ,salt: {
    type: String,
    required: true
  },
  created_date: {
    type: Date,
    default: Date.now
  }
});

module.exports =  mongoose.model('User', UserSchema);