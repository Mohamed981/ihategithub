import gql from "graphql-tag";

const FETCH_TEAMS_QUERY = gql`
    query userTeams {
  userTeams {
    id
    title
    creator
    created_date
    contributers {
      id
    }
  }
}
    `
export default FETCH_TEAMS_QUERY