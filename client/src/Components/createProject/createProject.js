import React from 'react'

const createProject = () => {
   
    return (
	       <div className="modal-contents">
            
              <div className="columns">
              <div className="column">
                <p style={{  font:'2'}}>Template</p>
                <input id="template">
                </input>
              </div>
              <div className="column">
                <p style={{  font:'2'}}>Title</p>
                <input id="title">
                </input>
                <button >click</button>
                </div>
              </div>
	      </div>
    )
}

export default createProject
