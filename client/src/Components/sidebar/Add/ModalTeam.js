import React,{useState,useContext} from 'react'
import { useQuery, useMutation } from "@apollo/react-hooks";
import { Typography,Divider,Button,TextField,Autocomplete,Paper,Select,Modal,FormControl,MenuItem,InputLabel,Input,Grid,Box } from "../../../constants/mui";
import { FETCH_FOLLOWED_USERS_QUERY } from "../../../graphql/queries/user";
import FETCH_TEAMS_QUERY from "../../../graphql/queries/team";

import {CREATE_TEAM} from "../../../graphql/mutations/team";

import { Loader } from 'semantic-ui-react';
import { AuthContext } from '../../../context/auth';

const ModalTeam = ({ opened, close }) => {
  const teamsQuery = useQuery(FETCH_TEAMS_QUERY);
  const [open, setOpen] = useState(opened);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setUserSelected] = useState([]);
    
  const [Data, setData] = useState({ title: '', members: [] });
  
  const { loadingUsers, data } = useQuery(FETCH_FOLLOWED_USERS_QUERY);
  const [addTeam,{loading,error}] = useMutation(CREATE_TEAM, {
    update(proxy, result) {
     
        const data = proxy.readQuery({query: FETCH_TEAMS_QUERY});
        proxy.writeQuery({ query: FETCH_TEAMS_QUERY,
            data:{userTeams:[result.data.createTeam, ...data.userTeams]}});
            console.log(data);
          },
    onError(err) {
      console.log("error can't add team : ",err);
    }, variables: Data
});

  var _ = require('lodash');
  const { user } = useContext(AuthContext);
  const [editorsidx, setEditors] = useState([]);


  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    pt: 2,
    px: 4,
    pb: 3,
  };

  const handleChange = async (e,newValue) => {
    console.log(newValue);
    await setData({...Data,'members':[]});
    await newValue.map(async (value,index)=>{
   
      await setData({...Data,'members':[value.id,...Data.members]});
      console.log(value.id);
    });
  };
  const click = (e) => {
    if(!Data.title){
      alert("Please enter a team title");
      return;
    }
    if(Data.members.length<1){
      alert("Please select at least one member");
      return;
    }
    addTeam();
    setOpen(false);
  }
  if(data!==undefined){
    console.log(data.followedUsers);
  }
  return (
    <Modal  keepMounted
      // dimmer={'inverted'}
      open={open}
      onClose={() => {
        setOpen(false)
        close()
      }}
      aria-labelledby="child-modal-title"
        aria-describedby="child-modal-description"
    >
    <Box  sx={{ ...style, width: 800  }}>
    <Typography variant="h4"sx={{color:'white'}}>Create Team</Typography>
  
      <Divider />          
      <Grid item xs={6} >
      <Paper elevation={1}>
     
      <FormControl fullWidth sx={{pb:2}}>
        <Input placeholder="Team Title"    onChange={(e) => {
          setData({ ...Data, 'title': e.target.value });
        }}></Input>
       </FormControl>
       {data&&
        
        <Autocomplete
        multiple
        id="tags-standard"
        options={data.followedUsers}
        getOptionLabel={(option) => option.username}
        
        onChange={handleChange}
        sx={{height:'100%',border:1,borderRadius:1,borderColor:'grey.500',width:'100%', 	'& .MuiAutocomplete-clearIndicator':{
        
          width:'100%',
          border:'none'

        },'& .MuiAutocomplete-popupIndicator':{
       
          width:'50%',
          border:'none'
        }}}

        renderInput={(params) => (
          <TextField
            {...params}
            variant="standard"
            placeholder="   Select User"
   
          />
        )}
      />}
       </Paper>
       </Grid>
       <Divider />          
        <Button sx={{ mx:'auto'}} onClick={click}>
          Create Team
        </Button>
   </Box>
    </Modal>
  )
}

export default ModalTeam