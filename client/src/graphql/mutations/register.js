import gql from "graphql-tag";
const REGISTER_USER=gql`
mutation register(
    $username:String
    $original_pass:String
    $confirmPassword:String
    # $password:String
){
    register(
        registerInput:{
            username:$username
            original_pass:$original_pass
            confirmPassword:$confirmPassword
            # password:$password
        }
    ){
        id username original_pass password token
    }
}
`
export default REGISTER_USER