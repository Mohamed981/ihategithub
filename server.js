
const express = require("express")
const http = require("http")
const socketio = require("socket.io")
const path = require("path")
const {v4:uuidV4}=require("uuid")
const fs = require("fs")
const LSeqTree = require("lseqtree")



const PORT = 80
const app = express()
const server = http.createServer(app)
const io = socketio(server)

app.use(express.static(path.join(__dirname,"public")))

const RTCMultiConnectionServer = require('rtcmulticonnection-server');

let currentSocketId= undefined;
let currentRoomId = undefined;
let dataFromFile=undefined;
let lseq_server = new LSeqTree(50000);
let currentFileName = ""

// lseq_server.insert("H",0)
// lseq_server.insert("F",1)
// lseq_server.insert("1",2)
// fs.writeFile("./files/file1.txt",JSON.stringify(lseq_server),(err)=>{if(err) console.error(err)})
// lseq_server = new LSeqTree(50000);
// lseq_server.insert("H",0)
// lseq_server.insert("F",1)
// lseq_server.insert("2",2)
// fs.writeFile("./files/file2.txt",JSON.stringify(lseq_server),(err)=>{if(err) console.error(err)})

io.on("connection",(socket)=>{
    RTCMultiConnectionServer.addSocket(socket);
    currentSocketId= socket.id;
    console.log("New socket with ID "+currentSocketId +" is connected to the server")
    
    socket.on("create-new-room",()=>
    {
        currentRoomId = uuidV4() //////////////////////////////NOT CURRENT ROOM ID- IT IS THE LAST ROOM ID

        io.to(socket.id).emit("new-room-created",currentRoomId)
        console.log("Socket with ID " +currentSocketId+ " created a room with ID = "+currentRoomId)
    })

    socket.on("joined-a-room",(roomId,socketId)=>
    {
        currentRoomId = roomId
        console.log("Socket with ID "+socketId+" joined room ID "+roomId)
    })

    socket.on("user-connected",(roomId,socketId)=>
    {
        socket.broadcast.emit("new-user-connected",roomId,socketId)
    })


    socket.on("read-file",(fileName)=>
    {
        //currentFileName = fileName

        filePath = "./files/"+fileName+".txt"
        fs.readFile(filePath,(err,data)=>
        {
            if (err) console.error(err)

            lseq_server = new LSeqTree(50000)
            lseq_server = lseq_server.fromJSON(JSON.parse(data))
            //seq_server.root.children.pop()
            //lseq_server.root.subCounter--
            //lseq_server.length--

            io.to(socket.id).emit("file-is-read",data.toString(),fileName)
        })

    


    })

    socket.on("edit-made",(fileName,data)=>
    {
        // if(currentFileName!=fileName)
        // lseq_server = new LSeqTree(50000)

        if(data.commandName=="insert")
        lseq_server.applyInsert(data.operationID)
        else if(data.commandName=="delete")
        lseq_server.applyRemove(data.operationID)


        //for(let i=0;i<lseq_server.length;i++)
        //console.log(lseq_server.get(i))
        
        let filePath = "./files/"+fileName+".txt"
        fs.writeFile(filePath,(JSON.stringify(lseq_server)),(err)=>
        {
            if(err)throw err;
            console.log("Some change made by "+socket.id+" is saved to file name "+fileName)
            io.to(socket.id).emit("changes-saved")

        })
    })

    
})


server.listen(PORT, ()=>{
    console.log("==============================")
    console.log("Server started operation")
    console.log("Listening at port number "+PORT)
    console.log("http://localhost/")
    console.log("==============================")
})