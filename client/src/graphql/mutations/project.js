import gql from "graphql-tag";
const CREATE_PROJECT=gql`
  mutation createProject(
      $title:String
      $language:String
      $editors:[ID]
  ){
    createProject(
      createProjectInput:{
        title:$title
        language:$language
        editors:$editors
    }
  )
      {
        id title created_date
      }
  }
  `
  export default CREATE_PROJECT