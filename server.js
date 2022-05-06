const express = require("express")
const http = require("http")
const socketio = require("socket.io")
const path = require("path")
const {v4:uuidV4}=require("uuid")
const fs = require("fs")
const RTCMultiConnectionServer = require('rtcmulticonnection-server');
const LSeqTree = require("lseqtree")

const PORT = 80
const app = express()
const server = http.createServer(app)
const io = socketio(server)

app.use(express.static(path.join(__dirname,"dist")))



let currentSocketId= undefined;
let currentRoomId = undefined;


let current_trees = [];
let lseq_server = new LSeqTree(50000);


lseq_server.insert("H",0);
lseq_server.insert("F",1);
lseq_server.insert("1",2);
lseq_server.insert("8",3);
lseq_server.insert("1",4);
lseq_server.insert("1",5);
lseq_server.insert("1",6);

fs.writeFile("./files/file1.txt",JSON.stringify(lseq_server),(err)=>{if(err) console.error(err)})
current_trees.push(lseq_server);

lseq_server = new LSeqTree(50000);


lseq_server.insert("H",0);
lseq_server.insert("F",1);
lseq_server.insert("2",2);
lseq_server.insert("9",3);
lseq_server.insert("2",4);
lseq_server.insert("2",5);
lseq_server.insert("2",6);

fs.writeFile("./files/file2.txt",JSON.stringify(lseq_server),(err)=>{if(err) console.error(err)})
current_trees.push(lseq_server);


io.on("connection",(socket)=>{

    
    RTCMultiConnectionServer.addSocket(socket);
    currentSocketId= socket.id;
    console.log("New socket with ID "+currentSocketId +" is connected to the server")
    
    socket.on("create-new-room",()=>
    {
        currentRoomId = uuidV4() //////////////////////////////NOT CURRENT ROOM ID- IT IS THE LAST ROOM ID

        io.to(socket.id).emit("new-room-is-created",currentRoomId)
        console.log("Socket with ID " +currentSocketId+ " created a room with ID = "+currentRoomId)
    })

    socket.on("joined-a-room",(socketId,roomId)=>
    {
        currentRoomId = roomId
        console.log("Socket with ID "+socketId+" joined room ID "+roomId)
        socket.broadcast.emit("new-user-is-connected",socketId,roomId)
    })



    socket.on("read-file",(file_name)=>
    {


        filePath = "./files/"+file_name+".txt"
        fs.readFile(filePath,(err,data)=>
        {
            if (err) console.error(err)
            io.to(socket.id).emit("file-is-read",data.toString(),file_name)
        })

    


    })

    socket.on("edit-made",(file_name,received_operations)=>
    {
    let index=0;
    if(file_name=="file1")
    index = 0;
    else if (file_name=="file2")
    index = 1;

    
    for(let operation of received_operations)
    {
        if(operation.type === "insert")
        {
            for(let data_item of operation.data)
            {
                current_trees[index].applyInsert(data_item);
            }

        }
        else if (operation.type ==="delete")
        {
            for(let data_item of operation.data)
            {
                current_trees[index].applyRemove(data_item.id);
            }
        }
    }
   
        let filePath = "./files/"+file_name+".txt";
        fs.writeFileSync(filePath,(JSON.stringify(current_trees[index])))
        console.log("Some change made by "+socket.id+" is saved to file name "+file_name)
         io.to(socket.id).emit("changes-saved");

    })

    
})


server.listen(PORT, ()=>{
    console.log("==============================")
    console.log("Server started operation")
    console.log("Listening at port number "+PORT)
    console.log("http://localhost/")
    console.log("==============================")
})