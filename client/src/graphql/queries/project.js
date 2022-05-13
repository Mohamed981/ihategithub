import gql from "graphql-tag";
const FETCH_PROJECTS_QUERY = gql`
  query getUserProjects {
  getUserProjects {
    id
    title
    created_date
  }
}`

export default FETCH_PROJECTS_QUERY