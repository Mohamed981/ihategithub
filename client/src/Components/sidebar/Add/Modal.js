import React, { useState, useContext } from 'react';
import { useNavigate } from "react-router-dom";
import { Label, Button, Loader } from 'semantic-ui-react';
import { Paper, Select, Modal, FormControl, MenuItem, InputLabel, Input, Grid, Box } from "../../../constants/mui";
import { useMutation, useQuery } from "@apollo/react-hooks";
import CREATE_PROJECT from "../../../graphql/mutations/project";
import FETCH_PROJECTS_QUERY from '../../../graphql/queries/project';
import { AuthContext } from '../../../context/auth';
import FETCH_TEAMS_QUERY from "../../../graphql/queries/team";
var _ = require('lodash');

const ModalItem = ({ opened, close }) => {
  const { loadingTeams, data } = useQuery(FETCH_TEAMS_QUERY);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(opened);
  const [Data, setData] = useState({ title: '',language: '', editors: [] });
  const [editorsidx, setEditors] = useState([]);
  const [teams, setTeams] = useState([]);
  const options = [
    { key: 'af', value: 'af', flag: 'af', text: 'Afghanistan' },
    { key: 'c++', value: 'c++', text: "c++", icon: 'node js', },
    { key: 'python', value: 'python', text: 'python' }
  ]
  const [addProject] = useMutation(CREATE_PROJECT, {
    update(proxy, result) {
      const data = proxy.readQuery({
        query: FETCH_PROJECTS_QUERY
      });
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
    console.log("look here : ",Data);
    addProject();
    setOpen(false);
  }

  const addTeamToProject = (e)=>{
    setEditors(_.pullAll(editorsidx, [e.target.id]));
    setEditors([e.target.id, ...editorsidx]);
    setData({...Data, editors: _.at(Data.userTeams ,editorsidx)});
  }

  const removeTeamFromProject  = (e)=>{
    setEditors(_.pullAll(editorsidx, [e.target.id]));
    setData({...Data, editors: _.at(Data.userTeams ,editorsidx)});
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
  const handleChange = (event) => {
    setTeams(event.target.value);
    console.log(teams);
  };

  return (
    <Modal keepMounted
      open={open}
      onClose={() => {
        setOpen(false)
        close()
      }}
      aria-labelledby="child-modal-title"
      aria-describedby="child-modal-description"
    >
      <Box sx={{ ...style, width: 800 }}>
        <Grid container justifyContent="center" spacing={1}>
          <Grid item xs={6}>
            <Paper>

              <FormControl fullWidth>
                <InputLabel id="demo-simple-select-label">Select Language</InputLabel>
                <Select inverted="true"
                  labelId="demo-simple-select-label"
                  label="Select a language"
                  onChange={(e) => {
                    setData({ ...Data, 'language': e.target.value });
                  }}
                  placeholder='Select Template'
                  value={Data.language}

                >
                  {options.map((option, index) => (
                    <MenuItem key={index} value={option.value}>{option.value}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {loadingTeams ? (<Loader />) : (
                <FormControl fullWidth>
                  <InputLabel id="demo-simple-select-label">Select teams</InputLabel>
                  <Select
                    label="Select a team"
                    multiple
                    value={teams}
                    onChange={handleChange}

                  >
                    {data &&
                      data.userTeams.map((team, index) => (
                        <MenuItem value={team.title} key={index}>
                          {team.title}
                        </MenuItem>))
                    }

                  </Select>
                </FormControl>)}

            </Paper>
          </Grid>
          <Grid item xs={6} >

            <Label>Title</Label>
            <FormControl fullWidth>
              <Input
                color="secondary"
                label="Select a language"
                id="demo-simple-select-label"
                onChange={(e) => {
                  setData({ ...Data, 'title': e.target.value });
                }}>
                Project Title</Input>
            </FormControl>
          </Grid>
        </Grid>

        <Button negative onClick={click}>
          Create
        </Button>



      </Box>
    </Modal>
  )
}

export default ModalItem