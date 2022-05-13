import React,{useState} from 'react'
import { Typography,Divider,Button,TextField,Autocomplete,Paper,Select,Modal,FormControl,MenuItem,InputLabel,Input,Grid,Box } from "../../constants/mui";
import { styled } from '@mui/material/styles';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import FolderIcon from '@mui/icons-material/Folder';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
const ModalTeam = ({ opened, close , selectedTeam}) => {
    const [open, setOpen] = useState(opened);
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
    function generate(element) {
        return [0, 1, 2].map((value) =>
          React.cloneElement(element, {
            key: value,
          }),
        );
      }
    const Demo = styled('div')(({ theme }) => ({
        backgroundColor: theme.palette.background.paper,
      }));
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
    <Paper elevation={1}>
     
    <Demo>
    <List >
      {generate(
        <ListItem>
          <ListItemIcon>
            <FolderIcon />
          </ListItemIcon>
          <ListItemText
            primary="Single-line item"
          />
        </ListItem>,
      )}
    </List>
  </Demo>
     </Paper>
     </Box>
    </Modal>
  )
}

export default ModalTeam