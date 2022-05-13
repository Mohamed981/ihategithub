import React, { useContext,useState } from 'react'
import { useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/react-hooks";
import { AuthContext } from '../context/auth';
import { useForm } from '../util/hooks';
import { Button, Form } from 'semantic-ui-react';

import  {REGISTER_USER}  from "../graphql/mutations/user";

const Signup = () => {
    let navigate=useNavigate()
    const context = useContext(AuthContext);
  const [cpassword,setCPassword]=useState('')
  const [formData, setForm] = useState({ username: '', password: '',confirmPassword:''});
  const [errors,setErrors]=useState({});

  const { onChange, onSubmit, values } = useForm(registerUser, {
    username: '',
    password: '',
    confirmPassword: ''
  });
const [addUser,{loading,error}] = useMutation(REGISTER_USER, {
    update(proxy,{data:{register:userData}}){
        context.login(userData);
        navigate(`/${values.username}/Home`);
    },
    onError(err) {
        setErrors(err.graphQLErrors[0].extensions.errors);
      },
    variables:{registerInput:values}
});
  
  function registerUser() {
    addUser();
  }


return (
  <div className="form-container">
    <Form onSubmit={onSubmit} noValidate className={loading ? 'loading' : ''}>
      <h1>Register</h1>
      <Form.Input
        label="Username"
        placeholder="Username.."
        name="username"
        type="text"
        value={values.username}
        error={errors.username ? true : false}
        onChange={onChange}
      />
      <Form.Input
        label="Password"
        placeholder="Password.."
        name="password"
        type="password"
        value={values.password}
        error={errors.password ? true : false}
        onChange={onChange}
      />
      <Form.Input
        label="Confirm Password"
        placeholder="Confirm Password.."
        name="confirmPassword"
        type="password"
        value={values.confirmPassword}
        error={errors.confirmPassword ? true : false}
        onChange={onChange}
      />
      <Button type="submit" primary>
        Register
      </Button>
    </Form>
    {Object.keys(errors).length > 0 && (
      <div className="ui error message">
        <ul className="list">
          {Object.values(errors).map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);
}

export default Signup
