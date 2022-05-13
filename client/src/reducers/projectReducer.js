import * as actionType from '../constants/actionTypes';

const projectReducer = (projects = [], action) => {
  switch (action.type) {
    case actionType.ADDPROJECT:
      return { ...projects, userTeam: action.data};

      case actionType.GETPROJECTS:
      return { ...projects, userProjects: action.data.Projects};

    default:
      return projects;
  }
};

export default projectReducer;