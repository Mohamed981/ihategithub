 async function create(connection)
{
   
    connection.socket.emit("create-new-room");

    return new Promise(function(resolve, reject) {
        connection.socket.on("new-room-is-created",(currentRoomId)=>
        {
            

                connection.openOrJoin(currentRoomId,()=>
                {
                    connection.socket.emit("joined-a-room",(connection.socket.id),currentRoomId);
                    resolve(currentRoomId)
                    
                })
                
        })

    })    
}

async function join(connection,currentRoomId)
{
    return new Promise(function(resolve, reject) {
    connection.join(currentRoomId,()=>
    {
        connection.socket.emit("joined-a-room",connection.socket.id,currentRoomId);
        
    })
    
    let isConnected = true
    resolve(isConnected)
    })
}

module.exports =
{   
    create,
    join,

}