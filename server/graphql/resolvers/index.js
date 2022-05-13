const projectsResolvers=require('./projects');
const usersResolvers=require('./users');
const teamsResolvers=require('./team');

module.exports={
    Query:{
        ...projectsResolvers.Query,
        ...usersResolvers.Query,
        ...teamsResolvers.Query
        
    },
    Mutation:{
        ...usersResolvers.Mutation,
        ...projectsResolvers.Mutation,
        ...teamsResolvers.Mutation
    },
    Subscription:{
        // ...projectsResolvers.Subscription,
        ...usersResolvers.Subscription
    }
}