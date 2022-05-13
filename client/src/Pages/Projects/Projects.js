import './Projects.css'
import { useState } from "react";
import SideBar from "../../Components/sidebar/sidebar";
import { useQuery } from "@apollo/react-hooks";
import { Sidebar } from 'semantic-ui-react';
import { Paper } from "../../constants/mui";
import { DataGrid } from '@mui/x-data-grid';
import FETCH_PROJECTS_QUERY from "../../graphql/queries/project";

const Projects = () => {
  const columns = [
  
    { field: 'title', headerName: 'Title', width: 90 },
    {
      field: 'language',
      headerName: 'Language',
      width: 150,
      editable: true,
    },
    {
      field: 'date',
      headerName: 'Date',
      width: 150,
      editable: true,
    },
   
  ];
  const { loading, data } = useQuery(FETCH_PROJECTS_QUERY);

  const [open, setOpen] = useState(false);
  function date(then){
    var now = new Date().getTime();
    var diff = now - then;
    // console.log(diff);
    if(diff/1000 < 60) return Math.ceil(diff/1000)+ " seconds ago";
    else if(diff/(1000*60) < 60) return Math.ceil(diff/60000)+' minute ago';
    else if(diff/(1000*60*60) < 24) return Math.ceil(diff/3600000)+' hour ago';
    else if(diff/(1000*60*60*24) < 30) return Math.ceil(diff/86400000)+' days ago';
    else  return Math.ceil(diff/2592e6)+' months ago';
    // var days = diff/ (1000 * 3600 * 24);
    // return days;
  }
 let rows=[];
  if(data!==undefined){
  rows=data.getUserProjects.map((row,index)=>({id:index+1,title:row.title,language:row.language,date:date(row.created_date)}));
console.log(rows.length);
  }

  return (
    <div className="content">
      <SideBar />
      <Sidebar.Pusher>
      <Paper sx={{ width: 1 ,color:'grey'}}>
      {data&&<DataGrid sx={{height:'100%',border:1,borderRadius:1,borderColor:'grey.500',width:'100%', 	'& .MuiDataGrid-sortIcon':{
        
        width:'100%',
        border:'none'

      },'& .MuiDataGrid-menuIconButton':{
     
        width:'50%',
        border:'none'
      }}} style={{ height:rows.length*75, width: '100%' }}
        rows={rows}
        columns={columns}
        // pageSize={5}
        // rowsPerPageOptions={[5]}
   
        checkboxSelection
        disableSelectionOnClick
      />}
  
    </Paper>
       </Sidebar.Pusher>
    </div>
  )

}

export default Projects;