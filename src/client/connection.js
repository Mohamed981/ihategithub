var RTCMultiConnection = require("./RTC-MultiConnection.js");
async function connect()
{
    let connection = new RTCMultiConnection();
    connection.socketURL = "http://localhost:80/";
    connection.session = {data: true};
    connection.enableLogs = true;
    
 
    return new Promise(function(resolve, reject) {
        connection.connectSocket(()=>
        {
            connection.getSocket((socket)=>
            {
                let socketID = socket.id
                resolve([connection,socketID])
            })
               
        })
    })
    
}

module.exports = 
{
    connect,
}