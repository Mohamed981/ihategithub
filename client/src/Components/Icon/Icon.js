import React from 'react'
import { NavLink } from 'react-router-dom'
import "./Icon.css";
const Icon = (props) => {
    // let navigate=useNavigate()
    // navigate(`/${props.link}`)
    const isNotActiveStyle = 'flex items-center px-5 gap-3 text-gray-500 hover:text-black transition-all duration-200 ease-in-out capitalize yellow' ;
const isActiveStyle = 'flex items-center px-5 gap-3 font-extrabold border-r-2 border-black  transition-all duration-200 ease-in-out capitalize';

    return (
        <li className="nav-item">
            <NavLink style={({isActive})=>{
                return{
                    filter:isActive?"filter: grayscale(0%) opacity(1)":" grayscale(100%) opacity(.7)",
                    color:isActive?"#ffffff":""
                }
            }} to={`/${props.link}`}>
                <props.comp viewBox="0 -30 600 512" size={45} />
                <span className="link-text">{props.text}</span>
            </NavLink>
          </li>
    )
}

export default Icon
