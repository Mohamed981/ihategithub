import React, { useContext, useState } from 'react';
import { useNavigate } from "react-router-dom";
import './NavBar.css';
import { Search, Icon, Image, Menu, Dropdown, Button, Card, Loader } from 'semantic-ui-react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { AuthContext } from '../../context/auth';
import { useSubscription, useQuery, useMutation } from "@apollo/react-hooks";
import { NOTIFICATION } from '../../graphql/subscribtions/user';
import { USER_NOTIFICATIONS } from '../../graphql/queries/user';
import { FETCH_ALLUSERS_QUERY, FETCH_FOLLOWED_USERS_QUERY } from '../../graphql/queries/user';
import { ACCEPT_FRIEND, DELETE_NOTIFICATION } from '../../graphql/mutations/user';
import { Hidden } from '@mui/material';
var _ = require('lodash');

const NavBar = ({ clicked }) => {
  const { user, logout } = useContext(AuthContext);

  const [acceptedNotify, setAcceptedNotify] = useState({ friendId: '' });

  const [notificationIdToDelete, setNotificationIdToDelete] = useState('');

  const { loading: loadingSearchUsers, data: searchUsers } = useQuery(FETCH_ALLUSERS_QUERY);

  const { loading: loadingNotifications, data: userNotifications } = useQuery(USER_NOTIFICATIONS);

  const [acceptUserAsFriend] = useMutation(ACCEPT_FRIEND, {
    update(proxy , result) {
      const allNotifiesCached = proxy.readQuery({
        query: USER_NOTIFICATIONS
      });
      var modifiedAllNotifiesCached = allNotifiesCached.allNotifications.map((notify,index)=>{
        return (notify.followingUserId == acceptedNotify.friendId)?
           {...notify, status:"acepted"}:notify;
      });
      proxy.writeQuery({
        query: USER_NOTIFICATIONS,
        data: {allNotifications: modifiedAllNotifiesCached}
      });

      //add to the creat team list
      if(!("followedUsers" in proxy.data.data.ROOT_QUERY))return;
      const cachedFollowedUsers = proxy.readQuery({ query: FETCH_FOLLOWED_USERS_QUERY });
      const usersFollowedFiltered = [result.data.followUser, ...cachedFollowedUsers.followedUsers];
      proxy.writeQuery({
        query: FETCH_FOLLOWED_USERS_QUERY,
        data: { followedUsers: usersFollowedFiltered }
      });
    }, onError(err) {
      console.log(err);
    },
    variables: acceptedNotify
  });

  const [deleteNotification] = useMutation(DELETE_NOTIFICATION, {
    update(proxy, result) {
      const data = proxy.readQuery({
        query: USER_NOTIFICATIONS
      });
      proxy.writeQuery({
        query: USER_NOTIFICATIONS,
        data: {allNotifications: data.allNotifications.filter((notify, index) => notify.id != notificationIdToDelete)}
      });
    },
    variables: { notificationId: notificationIdToDelete }
  });

  const { loading } = useSubscription(NOTIFICATION,
    {
      onSubscriptionData: ({ client, subscriptionData: { data, error } }) => {
        if (error) {
          console.log(error);
          return
        }
        if (!data) {
          console.log(data);
          return
        }
        const current = client.readQuery({ query: USER_NOTIFICATIONS });
        client.writeQuery({
          query: USER_NOTIFICATIONS,
          data: {
            allNotifications: [data.recieveFollowNotify, ...current.allNotifications],
          },
        });
      }
    }
  );
  const [loading1, setLoading] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const handleSearch = (e, newValue) => {
    setLoading(true);
    setFilteredData(searchUsers.allUsers.filter((value, index) => {
      return value.username.includes(newValue);
    }))

    if (newValue.length <= 1) {
      setFilteredData([]);

    }
    console.log(newValue)
    setLoading(false)
  }
  const aceptRequest = async (e) => {
    await setAcceptedNotify({ friendId: userNotifications.allNotifications[e.target.id].followingUserId });
    acceptUserAsFriend();
  }

  const deleteRequest = async (e) => {
    await setNotificationIdToDelete(userNotifications.allNotifications[e.target.id].id);
    deleteNotification();
  }

  return (
    <div style={{padding:'0px'}}>
      <Menu style={{padding:'0px'}} atached="top" inverted>
        <Menu.Item>
          <Image size="mini" src="https://react.semantic-ui.com/logo.png" />
        </Menu.Item>
        <Menu.Item>
          <Icon name="bars" sx={{ fontSize: 40, width: 120 }} size={'big'} onClick={clicked} />

        </Menu.Item>
        <Menu.Item>

          <Dropdown text={user.username} icon='bell' color='blue' >
            <Dropdown.Menu>
              {loadingNotifications ? (
                <Loader inverted style={{ padding: "200px" }}>Loading</Loader>
              ) : (<div>{userNotifications &&
                userNotifications.allNotifications.map((notify, index) => (
                  <Dropdown.Item inverted="true" key={index}>
                    <Card key={index}>
                      <Card.Content>
                        <Card.Header>Friend request {notify.followingUserName}</Card.Header>
                        <p color='black'>{notify.followingUserName} sent u friend request</p>
                      </Card.Content>
                      <Card.Content>
                        {notify.status == "waiting" ? (<Button primary style={{ width: '130px' }} id={index} onClick={aceptRequest}>Acept</Button>) : null}
                        <Button secondary style={{ width: '130px' }} id={index} onClick={deleteRequest}>Delete</Button>
                      </Card.Content>
                    </Card>
                  </Dropdown.Item>
                ))}</div>)}
            </Dropdown.Menu>
          </Dropdown>

        </Menu.Item>

        <Menu.Item position="right">
          <Autocomplete
            color="white"

            sx={{

              width: 500,

            }}
            id="free-solo-demo"
            freeSolo
            disableClearable
            placeholder={"search..."}
            options={filteredData && filteredData.map((option) => option.username)}
            renderInput={(params) => params && <TextField {...params} placeholder="Search..." />}
            onInputChange={handleSearch}
          />
          <div className="dataResult">
            {filteredData.slice(0, 15).map((value, key) => {
              return (
                <a key={key} className="dataItem" href={value.link} target="_blank">
                  <p>{value.title} </p>
                </a>
              );
            })}
          </div>
        </Menu.Item>
        <Menu.Item>
          <Button inverted style={{ padding: '10px', margin: '0px', boarder: '0px', width: '100px' }} onClick={logout}>Logout</Button>
        </Menu.Item>
      </Menu>
    </div>
  )
}

export default NavBar