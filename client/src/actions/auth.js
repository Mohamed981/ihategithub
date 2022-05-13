import { SIGNUP, SIGNIN } from '../constants/actionTypes';
import * as api from '../api/index.js';

export const signin = (formData, router) => async (dispatch) => {
  try {
    console.log("hhhhhhhhhhhhhh",formData);
    const { data } = await api.signIn(formData);
    console.log("dddddddddddddd",data);

    dispatch({ type: SIGNIN, data });
    // console.log('connected');
    router(`/${formData.username}/Home`);
  } catch (error) {
    console.log("error1:",error);
  }
};

export const signup = (formData, router) => async (dispatch) => {
  try {
    const { data } = await api.signUp(formData);
    console.log("response : ",data);

    dispatch({ type: SIGNUP, data });

    router(`/${formData.username}/Home`);
  } catch (error) {
    console.log(error);
  }
};
