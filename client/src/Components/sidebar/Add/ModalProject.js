import React, { useState, useContext } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { Loader } from 'semantic-ui-react';
import { Typography,Divider,Button,TextField,Autocomplete,Paper,Select,Modal,FormControl,MenuItem,InputLabel,Input,Grid,Box } from "../../../constants/mui";
import { useMutation, useQuery } from "@apollo/react-hooks";
import CREATE_PROJECT from "../../../graphql/mutations/project";
import FETCH_PROJECTS_QUERY from '../../../graphql/queries/project';
import { AuthContext } from '../../../context/auth';
import FETCH_TEAMS_QUERY from "../../../graphql/queries/team";
var _ = require('lodash');

const ModalProject= ({ opened, close }) => {
  const { loadingTeams, data } = useQuery(FETCH_TEAMS_QUERY);
  const { loadingProjects, data:projects } = useQuery(FETCH_PROJECTS_QUERY);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(opened);
  const [Data, setData] = useState({ title: '',language: '', editors: [] });
  const [editorsidx, setEditors] = useState([]);
  const [errors, setErrors] = useState({});
  const options = [
    { key: 'af', value: 'af', flag: 'af', text: 'Afghanistan' },
    { key: 'c++', value: 'c++', text: "c++", icon: 'node js', },
    { key: 'python', value: 'python', text: 'python' },
  ]
  const [teams, setTeams] = useState([]);
  const [addProject, { loading, error }] = useMutation(CREATE_PROJECT, {
    update(proxy, result) {
      const data = proxy.readQuery({
        query: FETCH_PROJECTS_QUERY
      });
      console.log("data : ",data);
      console.log("proxy : ",proxy);
      proxy.writeQuery({
        query: FETCH_PROJECTS_QUERY,
        data: { getUserProjects: [result.data.createProject, ...data.getUserProjects] }
      });
      navigate(`/${user.username}/IDE/${Data.title}`);
    },onError(err){
      console.log("failed to create project : ",err);
    },
    variables: Data
  });

  const click = (e) => {
    if(!Data.title){
      alert("Please enter a project title");
      return;
    }
    if(!Data.language){
      alert("Please enter a project language");
      return;
    }
    if(Data.editors.length<1){
      alert("at least must have one editor");
      return;
    }
    addProject();
    setOpen(false);
  }
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
  
  const handleChange = async (event,newValue) => {
    setTeams([]);
    await newValue.map((value,index)=>{
      setTeams([...teams,value.title]);
      setData({...Data,'editors':[...Data.editors,value.id]});
    });
  };
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
    <Typography variant="h4"sx={{color:'white'}}>Create Project</Typography>
    <Divider />
        <Grid container justifyContent="center" spacing={3} sx={{borderColor: 'divider',py:2}}> 
        <Grid item xs={6} >
        <Paper elevation={1}>
       
        <FormControl fullWidth sx={{pb:2}}>
          <InputLabel id="demo-simple-select-label" >Select Language</InputLabel>
          <Select 
      
            labelId="demo-simple-select-label"
           
            onChange={(e) => {
              setData({ ...Data, 'language': e.target.value });
            }}
        
            value={Data.language}

          >
            {options.map((option, index) => (
              <MenuItem key={index} value={option.value}>{option.value}</MenuItem>
            ))}
          </Select>
        </FormControl>
       
        {loadingTeams?(<Loader/>):(
        <Autocomplete
        multiple
        id="tags-standard"
        options={data && data.userTeams?data.userTeams:""}
        getOptionLabel={(option) => option.title}
        onChange={handleChange}
        sx={{height:'100%',border:1,borderRadius:1,borderColor:'grey.500',width:'100%', 	'& .MuiAutocomplete-clearIndicator':{
          width:'100%',
          border:'none'
        },'& .MuiAutocomplete-popupIndicator':{
          width:'50%',
          border:'none',
        }}}

        renderInput={(params) => (
          <TextField
            {...params}
            variant="standard"
            placeholder="   Select Team"
   
          />
        )}
      />)}
        </Paper>
      </Grid>
      <Grid item xs={6} >
        <FormControl fullWidth>
          <Input
          color="secondary"
            id="demo-simple-select-label"
            placeholder="Project Title"
            onChange={(e) => {
              setData({ ...Data, 'title': e.target.value });
            }}>
            Project Title</Input>
        </FormControl>
      </Grid>
        </Grid>
      <Divider />          
        <Button sx={{ mx:'auto'}} onClick={click}>
          Create
        </Button>
   </Box>
    </Modal>
  )
}

export default ModalProject