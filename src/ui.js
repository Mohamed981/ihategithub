
 function loadDOM(createRoom,joinRoom,File1,File2)
{
    document.querySelector("#createRoom").addEventListener("click",createRoom)
    document.querySelector("#joinRoom").addEventListener("click",joinRoom)
    document.querySelector("#File1").addEventListener("click",File1)
    document.querySelector("#File2").addEventListener("click",File2)

    document.querySelector("#copyRoomId").addEventListener("click",copyRoomId)
    document.querySelector("#pasteRoomId").addEventListener("click",pasteRoomId)
}

 function showCopyButton()
{
    document.getElementById("copyRoomId").style.visibility = "visible";
}
 function getRoomId()
{
    return document.getElementById("otherRoomId").value;
}
 function copyRoomId()
{
    navigator.clipboard.writeText(document.getElementById("roomId").innerHTML);
}
 function pasteRoomId()
{
    navigator.clipboard.readText().then((data)=>{document.getElementById("otherRoomId").innerHTML=data});
}

 function displayOnJoin(currentSocketId,currentRoomId)
{
    console.log("You succsefully joined the room! Mabrook")
    console.log("Your socket with ID "+currentSocketId+" joined room with ID "+currentRoomId)
    document.getElementById("currentRoom").innerHTML= "Your current room number is "
    document.getElementById("roomId").innerHTML= currentRoomId;
    
}

 function displayOnNewUser(socketId,roomId)
{
console.log("Socket with ID "+socketId+" joined current room with ID "+roomId)
}

module.exports = {
    loadDOM,
    showCopyButton,
    getRoomId,
    pasteRoomId,
    displayOnJoin,
    displayOnNewUser,
}