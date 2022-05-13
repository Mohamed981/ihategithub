const Team = require('../../models/Team');
const User = require('../../models/User');
const checkAuth = require('../../util/check-auth');
const {UserInputError}=require('apollo-server');

module.exports = {
    Query: {
        async userTeams(_,__, context) {

            const user = checkAuth(context);
            const teams = await Team.find({$or:[{ creator: user.id },{"contributers._id":user.id}]}).sort({ created_date: -1 });
            return teams;
        }
    },
    Mutation: {
        async createTeam(_, { title, members }, context) {
            try {
                //validate
                //check title not empty
                if(!title)throw new UserInputError("title sould not be empty");
                //check auth
                const user = checkAuth(context);
                //bring all members and count them if dublicate member then considered once
                const membersFound = await User.find({ "_id": { $in: members } },{"_id":1});
                const foundCount = membersFound.length;
                //compare the member count by the found count
                if(members.length != foundCount){throw new UserInputError("not vaild users");}

                const newTeam = new Team({
                    title,
                    creator:user.id,
                    contributers: membersFound,
                    created_date: new Date()
                });

                await newTeam.save();

                return newTeam;
            } catch (err) {
                console.log("error can't create team ",err);
            }
        }

    }

}