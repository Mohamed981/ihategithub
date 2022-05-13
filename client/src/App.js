import './App.css';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Welcome, Signin, Signup, Tasks, Teams, IDE, Home, Projects, NotFound } from './Components';
import React from 'react';
import { AuthProvider } from './context/auth';
import AuthRoute from './util/AuthRoute';

const App = () => {

  return (
    <AuthProvider>
      <Router>
          <Routes>
            <Route path="*" element={<NotFound />} />
            <Route path="/" element={<AuthRoute component={Welcome} auth={false} />} />
            <Route path="/auth/signup" element={<AuthRoute component={Signup} auth={false} />} />
            <Route path="/auth/signin" element={<AuthRoute component={Signin} auth={false} />} />
            <Route path="/:username/Home" element={<AuthRoute component={Home} auth={true} />} />
            <Route path="/:username/Projects" element={<AuthRoute component={Projects} auth={true} />} />
            <Route path="/:username/Tasks" element={<AuthRoute component={Tasks} auth={true} />} />
            <Route path="/:username/IDE/:ide" element={<AuthRoute component={IDE} auth={true} />} />
            <Route path="/:username/Teams" element={<AuthRoute component={Teams} auth={true} />} />
          </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
