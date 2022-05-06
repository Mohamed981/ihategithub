const connctionManager = require("./client/connection.js");
const roomManager = require("./client/rooms.js");
const UI = require("./ui.js");
const editorManager = require("./editor/editorv2.js")
const LSeqTree = require("lseqtree");

let editor_manager = new editorManager();
window.editor_manager = editor_manager;
let op_history = [];
let undo_ptr = -1; let redo_ptr =-1;

window.op_history = op_history;


UI.loadDOM(createRoom, joinRoom, File1, File2);

let connection, currentSocketId = undefined;
(async function establishConnection() {
    [connection, currentSocketId] = await connctionManager.connect();
    setListeners();
})();


let currentRoomId = undefined;
async function createRoom() {
    currentRoomId = await roomManager.create(connection)
    UI.displayOnJoin(currentSocketId, currentRoomId);
    UI.showCopyButton();
}

async function joinRoom() {

    currentRoomId = UI.getRoomId();
    if (currentRoomId && currentSocketId) {

        let isConnected = await roomManager.join(connection, currentRoomId);
        if (isConnected) UI.displayOnJoin(currentSocketId, currentRoomId);

    }
}

function setListeners() {

    connection.socket.on("new-user-is-connected", (socketId, roomId) => { if (currentRoomId == roomId) UI.displayOnNewUser(socketId, roomId) })    // ONLY USED FOR DEBUGGING 

    connection.socket.on("file-is-read", (data) => { initializeLSEQ(data) })

    connection.socket.on("changes-saved", () => { console.log("Your changes are saved") })

    editor_manager.instance.on("beforeChange", (instance, changeObject) => {
        if (currentSocketId && currentRoomId);
        localChange(changeObject);
    })
    connection.onmessage = function (event) {
        remoteChange(event.data)
    }
}
function localChange(changeObject) {

    let [operations, options] = editor_manager.localEdit(changeObject);

    if (options == "normal_op") {
        for (let operation of operations) {
            operation["data"] = [];
            if (operation.type === "insert") {
                let insert_index = operation.index;
                for (let i = 0; i < operation.value.length; i++) {
                    let data = lseq_client.insert(operation.value[i], insert_index++);
                    operation.data.push(data);
                }
                delete operation.value;
            }
            else if (operation.type === "delete") {
                let delete_index = operation.index;
                let num_of_deletions = operation.number;
                for (let i = 0; i < num_of_deletions; i++) {
                    let data_id = lseq_client.remove(delete_index);
                    operation.data.push({ elem: operation.value[i], id: data_id });
                }
                delete operation.value
            }

        }

        if(op_history.length+1>200)
        {
            op_history.shift();
            undo_ptr--;
            redo_ptr--;

        }
        
        op_history.push(operations);
         undo_ptr=   op_history.length-1;
        console.log(op_history);
        

    }
    else if (options === "undo") {
      if(op_history.length)
      {
        if(undo_ptr!=-1)
        {
            
            let recent_operations = op_history[undo_ptr];
            undoChanges(recent_operations,operations);
                    redo_ptr=undo_ptr;
            undo_ptr--;

        }
      }
    }
    else if (options === "redo") {
        if (op_history.length) 
        {
            if(redo_ptr!=-1&& redo_ptr<op_history.length)
            {
                let recent_operations = op_history[redo_ptr];
                redoChanges(recent_operations,operations);
                undo_ptr=redo_ptr;
                redo_ptr++;

            }
       

        }

    }
    if (options) 
    broadcastToEveryone(file_name, operations);
    

}
function undoChanges(recent_operations,operations)
{
    for (let operation of recent_operations) {
        if (operation.type === "insert") {

            for (let data_item of operation.data)
                lseq_client.applyRemove(data_item.id);

            operations.push({ type: "delete", data: operation.data });

        }
        else if (operation.type === "delete") {

            let new_data = [];

            for (let data_item of operation.data) {
                let deleted_text = data_item.elem;
                for (let char of deleted_text) {
                    new_data.push({ elem: char, id: data_item.id });
                    lseq_client.applyInsert(new_data.at(-1));
                }
            }
            operations.push({ type: "insert", data: new_data });
        }
    
    }
}

function redoChanges(recent_operations,operations)
{
    for (let operation of recent_operations) {
        if (operation.type === "insert") {

            let new_data = [];
    
            for (let data_item of operation.data) {
                let deleted_text = data_item.elem;
                for (let char of deleted_text) {
                    new_data.push({ elem: char, id: data_item.id });
                    lseq_client.applyInsert(new_data.at(-1));
                }
            }
            operations.push({ type: "insert", data: new_data });
            
        }
        else if (operation.type === "delete") {
            for (let data_item of operation.data)
                lseq_client.applyRemove(data_item.id);
    
    
            operations.push({ type: "delete", data: operation.data });

        }
    
    }
}
function broadcastToEveryone(file_name, operations) {
    connection.send({ file_name, operations }); //Sending the edit details to all peers.
    connection.socket.emit("edit-made", file_name, operations); //Sending the change details to the server.
}
function remoteChange(received) {
    if (file_name == received.file_name)  //If current open file is the same as the one that received a change, then the remote update should be applied.
    {
      
        


        let old_cursor_pos = editor_manager.getCursor();
        const start = performance.now();

        for (let operation of received.operations) {
            if (operation.type === "insert") {
                for (let data_item of operation.data) {
                    lseq_client.applyInsert(data_item);
                }
            }
            else if (operation.type === "delete") {
                for (let data_item of operation.data) {
                    lseq_client.applyRemove(data_item.id);
                }
            }

        }

        const duration = performance.now() - start;
        console.log(duration);
        editor_manager.changeText(lseq_client.traverse());
        editor_manager.setCursor(old_cursor_pos);

        if(op_history.length+1>200)
        { op_history.shift();
            if(redo_ptr>=200)
            redo_ptr--;
        }
       

        op_history.push(received.operations);

    }



}
let file_name = "";
function File1() {
    if (currentRoomId != undefined && file_name != "file1") {
        file_name = "file1";
        connection.socket.emit("read-file", file_name) //should emit file.name extension later on
        editor_manager.permitEdit();
        op_history = [];
        undo_ptr=-1;
        redo_ptr=-1;
    }
}
function File2() {
    if (currentRoomId != undefined && file_name != "file2") {
        file_name = "file2";
        connection.socket.emit("read-file", file_name) //should emit file.name extension later on
        editor_manager.permitEdit();
        op_history=[];
        undo_ptr=-1;
        redo_ptr=-1;
    }
}

lseq_client = new LSeqTree(50000);
function initializeLSEQ(data) {
    lseq_client = (new LSeqTree(0)).fromJSON(JSON.parse(data));

    let text = lseq_client.traverse();
    editor_manager.changeText(text);

    editor_manager.clearHistory();
}

