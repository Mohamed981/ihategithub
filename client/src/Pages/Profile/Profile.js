import React,{useState} from 'react'
import { useQuery } from "@apollo/react-hooks";
import { TableHead,Table,TableBody,TableCell,TableRow,Button,CircularProgress,Backdrop,Box } from "../../constants/mui";
import { Segment,Menu } from 'semantic-ui-react'
import { display } from '@mui/system';
import { Grid, GridItem } from '@chakra-ui/react'
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import { styled } from '@mui/material/styles';
import { Sidebar } from 'semantic-ui-react';
import SideBar from "../../Components/sidebar/sidebar";
import FETCH_PROJECTS_QUERY from "../../graphql/queries/project";

const Profile = () => {
  const { loading, data } = useQuery(FETCH_PROJECTS_QUERY);
  const [open, setOpen] = useState(false);
  const Img = styled('img')({
    margin: '5px',
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
  });
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
  const buttonStyles = {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'capitalize',
    borderRadius: 2.5,
  backgroundColor: 'red',
  '&:hover': {
    backgroundColor: 'yellow',
  }
 };
 const [state,setState]=useState('projects');

//  handleItemClick = (e, { name }) => setState({ activeItem: name })

  return (
    <div>
    <SideBar />
    <Sidebar.Pusher>
    <Grid style={{color:'red'}}  h='200px'
    templateRows='repeat(2, 1fr)'
    templateColumns='repeat(5, 1fr)'
    gap={4}>
    <GridItem colSpan={1} rowSpan={1} >
            <Img sx={{ width: '1', height: '1' }} alt="complex" src="https://www.tom-archer.com/wp-content/uploads/2018/06/milford-sound-night-fine-art-photography-new-zealand.jpg" />
    </GridItem>
    <GridItem colSpan={1} rowSpan={1} >
    <Button> + connect</Button>
   </GridItem>
   
    <GridItem rowSpan={1} colspan={5}>
    <Menu  pointing secondary horizontal="true">
        <Menu.Item style={{color:'red'}}
          name='projects'
          active={state === 'projects'}
          onClick={ (e, { name }) => setState( name )}
        />
        <Menu.Item style={{color:'red'}}
          name='friends'
          active={state === 'friends'}
          onClick={ (e, { name }) => setState(name )}
        />
      </Menu>
      <Box display={state!=='projects'?'none':true}>
      <Table style={{fontSize:'300px',
      backgroundColor:'grey',width:'100%'}} aria-label="caption table">
        <TableHead>
      
        </TableHead>
        <TableBody >
          {loading ? (
            <Backdrop
          sx={{ color: '#fff'}}
          open={open} 
              >
              <CircularProgress color="inherit" />
            </Backdrop>
          ) :(data && data.getUserProjects.map((row,index) => (
            <TableRow sx={{height:5}} key={index}>
              <TableCell align="left" component="th" scope="row">
                {row.title}
              </TableCell>
             
              <TableCell align="left" component="th" scope="row">
              {row.language}
            </TableCell>
            <TableCell align="left" component="th" scope="row">
                {date(row.created_date) }
              </TableCell>
            </TableRow>
          )))}
        </TableBody>
      </Table>
</Box>
<Box display={state!=='friends'?'none':true}>
     svv
</Box>
    {/*
    <TabContext value={tab}>
    <Box >
        <Tabs variant ="contained"  value={tab} onChange={handleTab} >
          <Tab sx={{ buttonStyles }} label="Item One" id="0"/>
          <Tab label="Item Two" id="1"/>
        </Tabs>
      </Box>
      <TabPanel value={tab} index={0}>
        Item One
      </TabPanel>
      <TabPanel value={tab} index={1}>
        Item Two
      </TabPanel>
      </TabContext>
    */}
  </GridItem>
  </Grid>
   
    
    </Sidebar.Pusher>
</div>
  )
}

export default Profile