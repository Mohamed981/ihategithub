/*********************************/
/*********Initialization**********/

//const LSeqTree = require("lseqtree");

//const stringify = require("./stringifier.js")
let socketId = undefined;
let currentRoomId = undefined
var connection = new RTCMultiConnection();
connection.socketURL = "http://localhost:80/"
connection.session = {data: true};
connection.enableLogs = false;


connection.connectSocket(()=>
{
    socketId = connection.getSocket(()=>{}).id
})
/*********************************/
function createRoom()
{
    connection.socket.emit("create-new-room");
    document.getElementById("copyRoomID").style.visibility = "visible"
}

connection.socket.on("new-room-created",(roomId)=>
{
    currentRoomId = roomId
    connection.openOrJoin(roomId,()=>
    {
    connection.socket.emit("joined-a-room",roomId,socketId)
    display_this_when_room_is_joined(roomId)
    })
})

function joinRoom()
{
    currentRoomId = document.getElementById("otherRoomId").value
    if(currentRoomId!=undefined && socketId!=undefined)
    {
    connection.join(currentRoomId,()=>
    {
    display_this_when_room_is_joined(currentRoomId)
    connection.socket.emit("user-connected",currentRoomId,socketId)
    });
    }
}


connection.socket.on("new-user-connected",(roomId,socketId)=>
{
    console.log("Socket with ID "+socketId+" is connected to current room with ID ( " +roomId+" )")  
})


/*********************************/
/*********************************/
/*********************************/
/*********************************/

connection.onopen = function(event)
{
/*****************************/
};
    

connection.onmessage = function(event) 
{
    //console.log(event.data)
    if(file1_is_read_flag!=0)
applyChangesAtEditor(event.data)
// console.log("User with ID" + event.userid + "\n sent")// console.log(event.data)
};
    








let file1_is_read_flag = 0
function File1()
{
    if(currentRoomId!=undefined && file1_is_read_flag==0)
    {
        connection.socket.emit("read-file","file1") //should emit file.name extension later on
        
        file1_is_read_flag = 1
    }
}

function File2()
{   if(roomId!=undefined)
    editor.setOption("readOnly",false)
}


connection.getSocket((socket)=>
{
    // fileNameC = "file2.txt"
    // socket.emit("read-file",fileNameC)
    
})



connection.socket.on("file-is-read",(data,fileNameS)=>
{
       initializeLSEQ(data)
    
})

/*********************************/
/*********************************/
/*********************************/
/*********************************/
function display_this_when_room_is_joined(roomId)
{
    editor.setOption("readOnly",false)
    console.log("You succsefully joined the room! Mabrook")
    console.log("Current Room ID is "+roomId)
    document.getElementById("currentRoom").innerHTML= "Your current room number is "
    document.getElementById("roomId").innerHTML= roomId
}


function copyRoomID()
{
    navigator.clipboard.writeText(document.getElementById("roomId").innerHTML);
}
function pasteRoomId()
{
    navigator.clipboard.readText().then((data)=>{document.getElementById("otherRoomId").innerHTML=data});
}
    


connection.socket.on("changes-saved",()=>
{
    console.log("Your changes are saved")
})


function initializeLSEQ(data)
{
    lseq_client = new LSeqTree(50000)
    lseq_client = lseq_client.fromJSON(JSON.parse(data))
    lseq_client.root.children.pop()
    lseq_client.root.subCounter--
    lseq_client.length--


    editor.setValue(""); 
    let output=""; 
    for(let i=0;i<lseq_client.length;i++)
    output = output + lseq_client.get(i);
    editor.setValue(output) 
}
// var lseq_server = new LSeqTree(50000)

// lseq_server.insert("a",0)
// lseq_server.insert("b",1)
// lseq_server.insert("c",2)
// //lseq_server.applyInsert(operationID)
// //lseq_server.applyInsert(lseq_server.insert("b",1))
// //lseq_server.applyInsert(lseq_server.insert("c",2))

// console.log("Tree length before stringification"+lseq_server.length)
// for(let i=0;i<lseq_server.length;i++)
// console.log(lseq_server.get(i))

// var temptemp = JSON.stringify(lseq_server)

// //var normalJSON = JSON.stringify(lseq_server)
// var test = JSON.parse(temptemp)
// var newLSEQTree   =    new LSeqTree(50000)
// //newLSEQTree.remove(newLSEQTree.null)
// newLSEQTree= newLSEQTree.fromJSON(test)
// //newLSEQTree.root.del(newLSEQTree._get(newLSEQTree.length-1))

// newLSEQTree.root.children.pop()
// newLSEQTree.root.subCounter= newLSEQTree.root.subCounter-1
// newLSEQTree.length = newLSEQTree.length-1

// //newLSEQTree.root.children.pop()
// console.log("Tree length after stringification"+newLSEQTree.length)
// for(let i=0;i<newLSEQTree.length;i++)
// console.log(newLSEQTree.get(i))

