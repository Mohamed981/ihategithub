import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000' });

export const validateSession = (session) => {
    // check if your session is still valid with a server check, through axios for instance
    return API.invokeRemoteSessionValidationThroughAxios(session).then(response => response.isSessionValid);
  }