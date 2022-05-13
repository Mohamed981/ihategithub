import * as actionType from '../constants/actionTypes';

const teamRedux = (teams = { userTeam: null }, action) => {
  switch (action.type) {
    case actionType.ADDTEAM:
      
      return { ...teams, userTeam: action.data};
    case actionType.GETAVAILABLEUSERS:
    
      return { ...teams, availableUsers: action.data.Users};
  
    default:
      return teams;
  }
};

export default teamRedux;