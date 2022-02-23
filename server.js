const fs = require ('fs')
const path = require("path")
const http = require("http")
const express = require("express")
const socketio = require("socket.io")
const LSeqTree = require("lseqtree")
const port = 80
const app = express()
const server = http.createServer(app)
const io = socketio(server)
var history = [{"operation":"","command":""}]; // array containing a log of all operations 

app.use(express.static(path.join(__dirname,"public")))
io.on("connection", socket=>{

    socket.emit("message-from-server","Welcome to test application")
    socket.broadcast.emit("message-from-server","A user joined the chat")
    
    socket.on("edit-made",(editor)=>{
        socket.broadcast.emit("edit-received",editor)
        history.push(editor);
     })

     socket.on("get-history",()=>{
         for(let i=0; i<history.length;i++)
            io.to(socket.id).emit("received-history",history[i]);    
     })


     socket.on("disconnect",()=>{io.emit("server-messages","A user has left the chat")})

})

server.listen(port,()=>{console.log("Started listening at port 80\n http://localhost/")})