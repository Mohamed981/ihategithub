import gql from "graphql-tag";
export const CREATE_TEAM = gql`
mutation createTeam(
    $title:String
    $members:[ID]
){
    createTeam(title:$title,members:$members){
        id
    title
    creator
    created_date
    contributers {
      id
    }
    }
}
`;