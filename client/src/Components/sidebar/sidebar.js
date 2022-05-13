import { FaHome, FaTasks, FaFileCode, FaPeopleArrows } from "react-icons/fa";
import { CgAdd } from "react-icons/cg";
import Tooltip from '@mui/material/Tooltip';
import 'tippy.js/dist/tippy.css';
import './sidebar.css';
import { useState, useEffect, useContext } from "react";
import { AuthContext } from '../../context/auth';
import Icon from "../Icon/Icon";
import NavBar from '../NavBar/NavBar';
import ModalProject from './Add/ModalProject';
import ModalTeam from './Add/ModalTeam';
import { Sidebar } from 'semantic-ui-react';

const SideBar = () => {
  const [visible, setVisible] = useState(true);
  const { user } = useContext(AuthContext);
  const [openNewProject, setOpenNewProject] = useState(false);
  const [openNewTeam, setOpenNewTeam] = useState(false);
  const title = ['new team', 'new project'];


  useEffect(() => {
    let add = document.getElementById("ii")
    add.addEventListener("click", function () {
      //setOpen(true);
    });
  }, []);
  function close() {
    setOpenNewProject(false);
    setOpenNewTeam(false);
  }
  function clicked() {
    setVisible(!visible);
  }
  const newOpened = e => {
    if (e.target.id === '1') {
      setOpenNewProject(true);
    } else {
      setOpenNewTeam(true);
    }
  }
  return (
    <>

      {visible && <Sidebar style={{padding:'0px'}} className="ss"
        animation='slide along'
        direction='left'
        visible={visible}
        width='thin'
      // style={{ overflow: 'hidden' }}
      >

        {openNewProject && <ModalProject opened={openNewProject} close={close} />} ||
        {openNewTeam && <ModalTeam opened={openNewTeam} close={close} />}
        <div className="sidebar-content">
          <nav className="navbar">
            <ul className="navbar-nav">
              <li className="logo">
                <a href="#" className="nav-link">
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    data-prefix="fad"
                    data-icon="angle-double-right"
                    role="img"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 448 512"
                    className="svg-inline--fa fa-angle-double-right fa-w-14 fa-5x"
                  >
                    <g className="fa-group">
                      <path
                        fill="currentColor"
                        d="M224 273L88.37 409a23.78 23.78 0 0 1-33.8 0L32 386.36a23.94 23.94 0 0 1 0-33.89l96.13-96.37L32 159.73a23.94 23.94 0 0 1 0-33.89l22.44-22.79a23.78 23.78 0 0 1 33.8 0L223.88 239a23.94 23.94 0 0 1 .1 34z"
                        className="fa-secondary"
                      ></path>
                      <path
                        fill="currentColor"
                        d="M415.89 273L280.34 409a23.77 23.77 0 0 1-33.79 0L224 386.26a23.94 23.94 0 0 1 0-33.89L320.11 256l-96-96.47a23.94 23.94 0 0 1 0-33.89l22.52-22.59a23.77 23.77 0 0 1 33.79 0L416 239a24 24 0 0 1-.11 34z"
                        className="fa-primary"
                      ></path>
                    </g>
                  </svg>
                </a>
              </li>

              <Icon comp={FaHome} link={`${user.username}/Home`} text="Home" />

              <Icon comp={FaTasks} link={`${user.username}/Tasks`} text="Tasks" />

              <Icon comp={FaFileCode} link={`${user.username}/Projects`} text="Projects" />

              <Icon comp={FaPeopleArrows} link={`${user.username}/Teams`} text="Teams" />

              <li className="nav-item">
                <Tooltip  
                title={title.map((t,index)=>(<div key={index} id={index} onClick={newOpened} style={{  cursor: 'pointer' }}>{t}</div>))} placement="top">
                  <div className="nav-linkPlus" >
                    <CgAdd id="ii" className="icon" size={40} />
                  </div>
                </Tooltip>
              </li>
            </ul>
          </nav>
        </div>
      </Sidebar>}
      <Sidebar.Pusher>
      <NavBar clicked={clicked} />
      </Sidebar.Pusher>
    </>
  );
}

export default SideBar;