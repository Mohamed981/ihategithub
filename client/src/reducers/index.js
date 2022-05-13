import { combineReducers } from 'redux';
import { sessionReducer} from 'redux-react-session';


import auth from './auth';
import teams from './team';
import projectReducer from './projectReducer';

export const reducers = combineReducers({ auth, session: sessionReducer,teams, projectReducer });