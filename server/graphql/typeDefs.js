
const { gql } = require('apollo-server');
module.exports = gql`
type Team{
    id:ID
    title:String
    contributers:[User]
    creator:ID
    created_date:String
}
    type Project{
        id: ID
       title:String
       files:String
       editors:String
        created_date:String
    }
    type Notification{
        id: ID
       followingUserId:ID
       followingUserName:String
       status:String
       created_date:String
    }
    type User{
        id: ID
       username:String
       password:String
        token:String
        friends:[ID]
    }
    input RegisterInput{
        username:String
        password:String
        confirmPassword: String
    }
    input CreateProjectInput{
        title:String
        language:String
        editors:[ID]
    }
    type Query{
        getProjects:[Project]
        getUserProjects:[Project]
        followedUsers:[User]
        userTeams:[Team]
        allUsers:[User]
        allNotifications:[Notification]
    }
    type Mutation{
        login(username:String,password:String):User
        register(registerInput:RegisterInput):User
        createProject(createProjectInput:CreateProjectInput):Project
        deleteProject(projectId:ID):String
        createTeam(title:String,members:[ID]):Team
        followUser(friend:ID):User
        acceptFriend(friendId:ID):String
        deleteNotification(notificationId:ID):String
    }
    type Subscription{
        newProject:Project
        recieveFollowNotify:Notification
    }
`;