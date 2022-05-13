import './ProjectFolder.css';
import { AiFillFolder } from "react-icons/ai";
const ProjectFolder = ({ project }) => {
    return (
        <div className="project-folder-content">
            <div className="column1">
                <AiFillFolder className="folder" size={50} color="#b6b6b6" />
                <h2 className="text">{project.title}</h2>
                <p className="files">{project.files} files</p>
            </div>
            <div className="vl"></div>
            <div className="column2">
                <p className="files">no. of editors</p>
                <p className="files">{project.editors}</p>
            </div>

        </div>
    );
}

ProjectFolder.defaultProps = {
    text: 'Task Tracker',
    files: '40 files',
    editors: 20,
    Date: '3 months'
}
export default ProjectFolder;