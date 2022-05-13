import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000' });

export const signIn = (formData) => API.post('/auth/signin', formData);
export const signUp = (formData) => API.post('/auth/signup', formData);
export const signOut = (formData) => API.post('/auth/signout', formData);
export const Home = () => API.get('/:username/Home');
export const IDE = () => API.get('/:username/IDE');
export const Teams = () => API.get('/:username/Teams');
export const getProjects = () => API.get('/project/getProjects');
export const addtProject = (title) => API.post('/project/addProject',title);

export const addTeam = (selectedUsers) => API.post('/teams/addTeam',selectedUsers);
export const getAvailableUsersForTeam = () => API.get('/teams/availableUsers');