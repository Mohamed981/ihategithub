const LSeqTree = require("lseqtree")
//var lseq_client = new LSeqTree(50000)
var lseq_client = new LSeqTree(50000);

//CodeMirror Editor Initialization. 
var editor = CodeMirror.fromTextArea(document.getElementById("editor"),
{
    mode:"text/x-c++src",
    theme: "lucario",
    lineNumbers:true,
    lineSeparator: "\n",
    readOnly: true       //It is read only to allow edits using only program commands. 
})


//var LSEQ_flag = 1

editor.on("beforeChange",(editor,changeObject)=>{
    //var temp = editor.getValue();
    //console.log(changeObject)
    if(changeObject.origin!="setValue" && socketId!=undefined)// I might change this line later
    {
        let currentCursor = editor.getCursor();
        let index1D = editor.indexFromPos(currentCursor);
        let inputCharacter ="";
        let commandName="";
        let operationID="";
        if(changeObject.origin =="+delete")
            {
                commandName = "delete";
                    if(lseq_client.length>0)
                    operationID=lseq_client.remove(index1D-1)
            }
        else
        {
            
            commandName = "insert";
            if(changeObject.text.length==2)
            inputCharacter="\n";
            else
            inputCharacter = changeObject.text[0]
            operationID = lseq_client.insert(inputCharacter,index1D);
            
        }

        console.log(operationID)
        connection.socket.emit("edit-made","file1",{operationID,commandName}) ////////////////////////////CHANGE THIS IS HARDCODED
        if(connection.peers.getLength()>0)
        connection.send({operationID,commandName})


    }
    })

function applyChangesAtEditor(data)
{
    let oldCursor = editor.getCursor(); 
   
   
    if(data.commandName=="insert") 
    lseq_client.applyInsert(data.operationID);
    else if (data.commandName == "delete")
    lseq_client.applyRemove(data.operationID)
 
    

    editor.setValue(""); 

    let output=""; 

        for(let i=0;i<lseq_client.length;i++)
        output = output + lseq_client.get(i);
    

    
    editor.setValue(output) 
    editor.setCursor(oldCursor)


   

}