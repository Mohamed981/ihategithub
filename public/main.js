const socket = io();
const LSeqTree = require("lseqtree")
const lseq1 = new LSeqTree(50000)
var userID;
var delay = 0;
//CodeMirror Editor Initialization. 
var editor = CodeMirror.fromTextArea(document.getElementById("editor"),
{
    mode:"text/x-c++src",
    theme: "lucario",
    lineNumbers:true,
    lineSeparator: "\n",
    readOnly: true       //It is read only to allow edits using only program commands. 
})


socket.on("connect",()=>
{
//Once a user enters the connection
userID = socket.id; //The user ID is saved.
console.log(userID)
socket.emit("get-history"); //The new user asks for the latest version from the server
})

socket.on("received-history",(history)=>{
 applyEdit(history) //When the latest version is received from the server, it is applied locally to the client that requested it.
})


socket.on("message-from-server", (message)=>{console.log(message);}) //Not important. Used for debugging. 

document.addEventListener("keydown",(event)=> //Listener for keypresses. When an edit is made, the key is saved. (Subject to change later on)
{
    
    var inputCharacter = event.key // The current key is saved
    var currentCursor = editor.getCursor(); // The current cursor position is saved.
    var index = editor.indexFromPos(currentCursor); // The cursor position is transformed from 2D to 1D position.
    let operationID=""; //OperationID is the ID returned when an insert or delete operation is made.
    let commandName =""; //Determines the command type. 
    if(inputCharacter=="Backspace")
    {
        commandName = "delete";
        if(lseq1.length>0)
        operationID=lseq1.remove(index-1)   //Removed element from LSEQtree (-1 because it selects the element before the cursor)
        editor.execCommand("delCharBefore") //Delete character before the current cursor.
    }
    else if (inputCharacter=="Enter")
    {
        commandName="insert";
        operationID = lseq1.insert("\n",index)
        editor.replaceRange("\n",currentCursor) //Replace range is used to insert characters at the given cursor position
    }
    else if (inputCharacter.length==1)
    {
        commandName = "insert";
        operationID = lseq1.insert(inputCharacter,index);
        editor.replaceRange(inputCharacter,currentCursor)
    }
    //Time out function stimulates the delay in sending the command to other users.
    setTimeout(function(){socket.emit("edit-made",{operationID,commandName})},delay) //Once the edits are made, they are broadcasted to server then to all other users. 

},false)

socket.on("edit-received", (received)=> //When the server sends an edit operation, the following function is executed. 
{
    setTimeout(()=>{ applyEdit(received) },delay)
   
})

function applyEdit(received)
{
    var oldCursor = editor.getCursor(); //Saves the old cursor position.
    if(received.commandName=="insert") // Fetches the received to command type in order to apply the insertion or deletion using the previously generation operationID.
    lseq1.applyInsert(received.operationID);
    else if (received.commandName == "delete")
    lseq1.applyRemove(received.operationID)

    editor.setValue(""); //Clears the editor typing area.

    var output=""; //String for holding the text after traversal from LSEQ tree. (Subject to change)
    for(let i=0;i<lseq1.length;i++)
    output = output + lseq1.get(i);

    
    editor.setValue(output) // Fills the editor text area with the string.
    editor.setCursor(oldCursor) // Brings the cursor back to its original position. 
}

function showDelay()
{
    console.log(delay);
}

function makeDelay()
{
    delay = 5000;
}

function resetDelay()
{
    delay = 0;
}