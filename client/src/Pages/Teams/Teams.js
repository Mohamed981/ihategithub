import React, { useState, useContext } from 'react'
import SideBar from '../../Components/sidebar/sidebar'
import ModalTeam from './ModalTeam';
import { DataGrid } from '@mui/x-data-grid';
import { Sidebar } from 'semantic-ui-react';
import { Paper } from "../../constants/mui";
import { useQuery, useMutation } from "@apollo/react-hooks";
import FETCH_TEAMS_QUERY from "../../graphql/queries/team";
import {CREATE_TEAM} from "../../graphql/mutations/team";

const Teams = () => {
    const {loading1,data} = useQuery(FETCH_TEAMS_QUERY);

    // const usersQuery = useQuery(FETCH_FOLLOWED_USERS_QUERY);
    const [selectedTeam,setSelectedTeam]=useState([]);

    const [selectedUsers, setUserSelected] = useState([]);
    
    const [teamTitle, setTeamTitle] = useState('');

    const [values, setValues] = useState([]);

    const [open,setOpen]=useState(false);

    const [addTeam,{loading,error}] = useMutation(CREATE_TEAM, {
        update(proxy, result) {
            const data = proxy.readQuery({query: FETCH_TEAMS_QUERY});
            proxy.writeQuery({ query: FETCH_TEAMS_QUERY,
                data:{userTeams:[result.data.createTeam, ...data.userTeams]}});
        },
        onError(err) {
          console.log("error can't add team : ",err);
        }, variables: {
            title:teamTitle,
            members:values
        }
    });

    const AddUser = (e) => {
        e.preventDefault();

        //this function is not working i don't know why ??despite removeuser is working well!!!
        setUserSelected(selectedUsers.filter(user => user.id !== e.target.name));

        setUserSelected([...selectedUsers, { "id": e.target.name, "username": e.target.id }]);
        setValues([...values, e.target.name]);
    }

    const RemoveUser = (e) => {
        e.preventDefault();
        setUserSelected(selectedUsers.filter(user => user.id !== e.target.name));
        setValues(values.filter(userId => userId !== e.target.name));
    }

    const createTeam = async (e) => {
        e.preventDefault();
        addTeam();
    }
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
    const columns = [
        { field: 'title', headerName: 'Title', width: 170,sortable:false },
        { field: 'creator', headerName: 'Creator', width: 120,sortable:false },
        { field: 'date', headerName: 'Date', width: 90,sortable:false },
      ];
      let rows=[];
  if(data!==undefined){
  rows=data.userTeams.map((row,index)=>({id:index+1,title:row.title,creator:row.creator,date:date(row.created_date)}));
console.log(rows.length);
  }
  function close() {
    setOpen(false);
 
  }
  const showModal=async e=>{
      setSelectedTeam([]);
      setSelectedTeam([...selectedTeam,e.row]);
      console.log(selectedTeam);
    setOpen(true);
  }
    return (
        <div>
            <SideBar />
            {open&&<ModalTeam opened={open} close={close} team={selectedTeam} />}
            <Sidebar.Pusher>
           
      <Paper sx={{ width: 1, color:'red'}}>
           {data&&<DataGrid sx={{height:'100%',border:1,borderRadius:1,borderColor:'grey.500',width:'100%',
           '& .MuiDataGrid-menuIconButton':{
                width:'5%',
                // display:'none'
              }, '& .MuiDataGrid-sortIcon':{
                // width:'5%',
                display:'none'
              },'& .MuiDataGrid-menuIconButton:active':{
                width:'5%',
                // display:'none'
              }
              ,'& .MuiDataGrid-filterIcon':{
                width:'5%',
                // display:'none'
              },'& .MuiDataGrid-filterIcon:active':{
                width:'5%',
                // display:'none'
              }
            }} style={{ height:rows.length*80, width: '100%' }}
                rows={rows}
                columns={columns}
                // pageSize={5}
                // rowsPerPageOptions={[5]}
                // autoPageSize={true}
                // checkboxSelection
                sortable={false}
                hideFooter={true}
                disableSelectionOnClick
                onRowClick={showModal}
              />}
              </Paper>
              </Sidebar.Pusher>
        </div>
    )
}

export default Teams;