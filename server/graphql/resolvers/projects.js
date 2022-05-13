// const { Mutation } = require('.');
const Project=require('../../models/Project');
const Team=require('../../models/Team');
const checkAuth = require('../../util/check-auth');
const mongoose = require('mongoose');

module.exports={
    Query:{
    async getProjects(){
        try{
            const projects=await Project.find().sort({created_date:-1});
            // console.log("PROJECTS:",projects);
            return projects
        }catch(err){
            throw new Error(err);
        }
    },
    async getUserProjects(_,__,context){
        try{
            const user = checkAuth(context);
            const teams = await Team.find({$or:[{"contributers._id":user.id},{"creator":user.id}]},{"_id":1});
            const projects=await Project.find({$or:[{"creator.id":user.id},{"editors._id":{$in:teams}}]}).sort({created_date:-1});
            return projects;
        }catch(err){
            throw new Error(err);
        }
    }
},
Mutation:{
    async createProject(_, 
        {
            createProjectInput:{title,language,editors}
        },
      context
      ) {
          try {
              const user = checkAuth(context);
              //validate editors teams
              const foundEditors = await Team.find({"_id":{"$in":editors}},{"_id":1,"title":1});
              if(foundEditors.length !== editors.length)throw new Error("teams are not vaild");
        
              const newProject = new Project({
                title,
                language,
                creator:user.id,
                editors:foundEditors
              });
        
              const project = await newProject.save();
      
              context.pubsub.publish('NEW_PROJECT',{
                  newProject: project
              });
              return newProject;
          } catch (err) {
              console.log(err);
          }
      },
      async deleteProject(_, { projectId }, context) {
        // const user = checkAuth(context);
  
        try {
          const project = await Project.findById(projectId);
        //   if (user.username === project.username) {
            await project.delete();
            return 'Project deleted successfully';
        //   } else {
        //     throw new AuthenticationError('Action not allowed');
        //   }
        } catch (err) {
          throw new Error(err);
        }
      }
},
Subscription:{
    newproject:{
        subscribe:()=>pubsub.asyncIterator('NEW_PROJECT')
    }
}
}