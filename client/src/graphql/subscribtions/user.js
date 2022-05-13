import gql from "graphql-tag";

export const NOTIFICATION = gql`
subscription RecieveFollowNotify {
  recieveFollowNotify {
    id
    followingUserId
    followingUserName
    status
    created_date
  }
}
`;