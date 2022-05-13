import React from 'react';
import { useNavigate } from "react-router-dom";

const Welcome = () => {
    let navigate=useNavigate();
  return <div>
  <h1>welcome to code collaborate</h1>
  <button onClick={()=>navigate(`/auth/signin`)}>
  Login</button>
  <button onClick={()=>navigate(`/auth/signup`)}>sign up</button></div>;
};

export default Welcome;
