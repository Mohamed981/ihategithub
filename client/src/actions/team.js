import { ADDTEAM, GETAVAILABLEUSERS } from '../constants/actionTypes';
import * as api from '../api/index.js';

export const addTeam = (selectedUsers, router) => async (dispatch) => {
  try {
    console.log("selected users before send",selectedUsers);
    const { data } = await api.addTeam(selectedUsers);
    console.log("response data after send",data);

    dispatch({ type: ADDTEAM, data });
    // console.log('connected');
    router(`/${"hazem"}/Teams`);
  } catch (error) {
    console.log("error1:",error);
  }
};

export const getAvailableUsersForTeam = (router) => async (dispatch) => {
  try {
    const { data } = await api.getAvailableUsersForTeam();
    console.log("recievied users from server : ",data);

    dispatch({ type: GETAVAILABLEUSERS, data });
    // console.log('connected');
    router(`/${"hazem"}/Teams`);
  } catch (error) {
    console.log("error1:",error);
  }
};