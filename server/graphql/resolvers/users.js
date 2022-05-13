const User = require('../../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { UserInputError } = require('apollo-server');
const checkAuth = require('../../util/check-auth');
const checkAuthSub = require('../../util/check-auth-sub');

const {
  validateRegisterInput,
  validateLoginInput
} = require('../../util/validators');

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username
    },
    process.env.SECRET,
    { expiresIn: '1h' }
  );
}

module.exports = {
  Query: {
    async followedUsers(_, __, context) {
      try {
        const user = checkAuth(context);
        const friends = await User.findOne({ "_id": user.id }, { "_id": 0, "friends": 1 });
        return friends.friends;
      } catch (err) {
        throw new Error(err);
      }
    },
    async allUsers(_, __, context) {
      try {
        const user = checkAuth(context);
        let currentUserFollowing = await User.findOne({ "_id": user.id }, { "_id": 0, "friends._id": 1, "notification.followingUserId":1 });
        currentUserFollowing.notification.map((notify)=>{
          currentUserFollowing.friends.push({ "_id": notify.followingUserId });
        });
        currentUserFollowing.friends.push({ "_id": user.id });
        const currentUsersRequested = await User.find({ "notification.followingUserId": user.id },{"_id":1});
        currentUsersRequested.map((userReq)=>{
          currentUserFollowing.friends.push({ "_id": userReq._id });
        });
        const users = await User.find({ "_id": { "$nin": currentUserFollowing.friends } }, { _id: 1, username: 1 });
        return users;
      } catch (err) {
        throw new Error(err);
      }
    },
    async allNotifications(_, __, context) {
      try {
        const user = checkAuth(context);
        const notification = await User.findOne({ "_id": user.id }, { "_id": 0, "notification": 1 });
        return notification.notification;
      } catch (err) {
        throw new Error(err);
      }
    }
  },
  Mutation: {
    async register(_,
      {
        registerInput: { username, password, confirmPassword }
      },
      context,
      info
    ) {
      const { valid, errors } = validateRegisterInput(
        username,
        password,
        confirmPassword
      );
      if (!valid) {
        throw new UserInputError('Errors', { errors });
      }
      // TODO: Make sure user doesnt already exist
      const user = await User.findOne({ username });
      if (user) {
        throw new UserInputError('Username is taken', {
          errors: {
            username: 'This username is taken'
          }
        });
      }
      // hash password and create an auth token
      const salt = await bcrypt.genSaltSync(12);
      const hash = await bcrypt.hashSync(password, salt);

      const newUser = new User({
        username,
        password: hash,
        salt,
        created_date: new Date()
      });

      const res = await newUser.save();

      const token = generateToken(res);

      return {
        ...res._doc,
        id: res._id,
        created_date: res.created_date.toISOString(),
        token
      };
    },
    async login(_, { username, password }) {
      const { errors, valid } = validateLoginInput(username, password);

      if (!valid) {
        throw new UserInputError('Errors', { errors });
      }

      const user = await User.findOne({ username });

      if (!user) {
        errors.general = 'User not found';
        throw new UserInputError('User not found', { errors });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        errors.general = 'Wrong crendetials';
        throw new UserInputError('Wrong crendetials', { errors });
      }

      const token = generateToken(user);

      return {
        id: user._id,
        username: user.username,
        token
      };
    }, async followUser(_, { friend }, context) {
      try {
        const user = checkAuth(context);
        const followed = await User.findOne({ "_id": friend }, { "_id": 1, "username": 1 });
        if (followed) {
          const notify = await User.findOneAndUpdate(
            { "_id": followed._id, "notification.followingUserId": { $ne: user.id } },
            { "$addToSet": { "notification": { "followingUserId": user.id, followingUserName: user.username } } },
            { returnOriginal: false }
          )
          if (notify) {
            const pubNotify = notify.notification.filter((obj)=>obj.followingUserId==user.id)[0];
            context.pubsub.publish(friend, {
              recieveFollowNotify: {
                id:pubNotify._id,
                followingUserId:pubNotify.followingUserId,
                followingUserName:pubNotify.followingUserName,
                status:pubNotify.status,
                created_date:pubNotify.created_date.toISOString()
              }
            });
          }
          // await User.updateOne({"_id":user.id},{"$addToSet":{"friends":followed}});
        }

        return {
          id: followed._id,
          username: followed.username
        };
      } catch (err) {
        throw new Error(err);
      }
    },
    async acceptFriend(_, { friendId }, context) {
      try {
        const user = checkAuth(context);
        const friend = await User.findOne({"_id":friendId},{"username":1});
        const notification = await User.findOneAndUpdate(
          {"_id":user.id,"notification.followingUserId":friend._id},
          { "$addToSet": { "friends": { "_id": friend._id, "username": friend.username} } ,
            "$set":{ "notification.$.status": "acepted" }},
          { returnOriginal: false }
          );
        const friendNotification = await User.findOneAndUpdate(
          {"_id":friend._id},
          { "$addToSet": { "friends": { "_id": user.id, "username": user.username} } },
          { returnOriginal: false }
        );
        return "done";
      } catch (error) {
        console.log(error);
      }
    },
    async deleteNotification(_, { notificationId }, context) {
      try {
        const user = checkAuth(context);
        await User.updateOne({"_id":user.id},{ $pull: { notification: { _id : notificationId } } });
        return "done";
      } catch (error) {
        console.log(error);
      }
    }
  },
  Subscription: {
    recieveFollowNotify: {
      subscribe: (_, __, context) => {
        try {
          const user = checkAuthSub(context);
          return context.pubsub.asyncIterator(user.id);
        } catch (error) {
          console.log(error);
        }
      }
    }
  }
}