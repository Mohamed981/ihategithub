import * as actionType from '../constants/actionTypes';
import { sessionService } from 'redux-react-session';

const authReducer = (state = { authData: null }, action) => {
  switch (action.type) {
    case actionType.SIGNUP:
      // localStorage.setItem('profile', JSON.stringify({ ...action?.data }));
      
      return { ...state, authData: action.data, loading: false, errors: null };

      case actionType.SIGNIN:
        // console.log(action.data);
        // console.log(typeof(action.data.token));
        // console.log(Date(action.data.token));
        document.cookie = "USER-SESSION="+action.data.tokenId+";expires="+Date(action.data.token)+";";
        return { ...state, authData: action.data, loading: false, errors: null };
    case actionType.SIGNOUT:
      // localStorage.clear();

      return { ...state, authData: null, loading: false, errors: null };
    default:
      return state;
  }
};

export default authReducer;