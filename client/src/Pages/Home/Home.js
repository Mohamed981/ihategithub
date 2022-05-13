import React, { useState } from 'react'
import SideBar from '../../Components/sidebar/sidebar'
import { useQuery, useMutation } from "@apollo/react-hooks";
import { FETCH_ALLUSERS_QUERY, FETCH_FOLLOWED_USERS_QUERY } from '../../graphql/queries/user';
import { FOLLOW_USER } from '../../graphql/mutations/user';

import { Button, Label, Table, Loader, Sidebar } from 'semantic-ui-react'
import './Home.css';

const Home = () => {

  const { loading, data: usersToFollow } = useQuery(FETCH_ALLUSERS_QUERY);

  const [values, setValues] = useState({ friend: '' });

  const [followUser] = useMutation(FOLLOW_USER, {
    update(proxy, result) {
      
      //remove from the follow user list
      const cachedUsersToFollow = proxy.readQuery({ query: FETCH_ALLUSERS_QUERY });
      const filteredUsers = cachedUsersToFollow.allUsers.filter((value) => value.id !== result.data.followUser.id);
      proxy.writeQuery({
        query: FETCH_ALLUSERS_QUERY,
        data: { allUsers: filteredUsers }
      });
    },
    onError(err) {
      console.log("error can't follow user : ", err);
    },
    variables: values
  });

  const onSubmit = async (event) => {
    event.preventDefault();
    await setValues({ friend: event.target.name });
    console.log(usersToFollow.allUsers[event.target.name]);
    followUser();
  };
  return (
    <div>
      <SideBar />
      <Sidebar.Pusher>
        <h1 style={{ padding: "200px" }}>Hello </h1>
        <div style={{ padding: "200px" }}>
          {loading ? (
            <Loader inverted style={{ padding: "0px" }}>Loading</Loader>
          ) : (
            <Table.Body>
              {usersToFollow &&
                usersToFollow.allUsers.map((user, index) => (
                  <Table.Row key={index}>
                    <Table.Cell>
                      <Label ribbon>{user.username}</Label>
                    </Table.Cell>
                    <Table.Cell>
                      <Button name={user.id} onClick={onSubmit}>Follow</Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
            </Table.Body>
          )}
        </div>
      </Sidebar.Pusher>
    </div>
  )
}

export default Home