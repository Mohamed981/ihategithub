import gql from "graphql-tag";

export const FETCH_FOLLOWED_USERS_QUERY = gql`
 query {
  followedUsers{
         id username
       }
     }
    `
export const FETCH_ALLUSERS_QUERY = gql`
  query {
  allUsers {
    id username
  }
}
`
export const USER_NOTIFICATIONS = gql`
  query {
  allNotifications {
    id
    followingUserId
    followingUserName
    status
    created_date
  }
}
`