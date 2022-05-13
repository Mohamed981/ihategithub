import { ADDPROJECT,GETPROJECTS } from "../constants/actionTypes";
import * as api from '../api/index.js';

export const addProject = (dt, router) => async (dispatch) => {
    try {
      const { data } = await api.addtProject(dt);
        // console.log(data);
      dispatch({ type: ADDPROJECT, data });
      // console.log('connected');
      router(`/${dt.editors}/${dt.title}.cpp`);
    } catch (error) {
      console.log("error project:",error);
    }
  };
export const getProjects = () => async (dispatch) => {
    try {
      console.log('getProjects');
      const { data } = await api.getProjects();
        console.log(data);
      dispatch({ type: GETPROJECTS, data });
      // console.log('connected');
    //   router(`/${dt.editors}/${dt.title}.cpp`);
    } catch (error) {
      console.log("error project:",error);
    }
  };