import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';

import { AuthContext } from '../context/auth';

function AuthRoute({ component: Component,auth:Auth, ...rest }) {
  const { user } = useContext(AuthContext);
  if(Auth)
    return user ? <Component/> : <Navigate to="/" />;
  else
    return user ? <Navigate to={`/${user.username}/home`} /> : <Component />;
}

export default AuthRoute;