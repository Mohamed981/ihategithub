import gql from "graphql-tag";
const REGISTER_USER=gql`
mutation Register($registerInput: RegisterInput) {
  register(registerInput: $registerInput) {
    id
    username
    password
    token
    friends
  }
}
`;

const LOGIN_USER=gql`
  mutation login($username: String,$password:String){
    login(username:$username,password:$password){
        id
      token
      username
  }   
}`;

const FOLLOW_USER=gql`
mutation followUser(
    $friend:ID
){
    followUser(
        friend:$friend
        
    ){
        id username
    }
}
`;

const ACCEPT_FRIEND = gql`
mutation AcceptFriend($friendId: ID) {
  acceptFriend(friendId: $friendId)
}
`
const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($notificationId: ID) {
  deleteNotification(notificationId: $notificationId)
}
`
export {LOGIN_USER,REGISTER_USER,FOLLOW_USER,ACCEPT_FRIEND,DELETE_NOTIFICATION};