var editor = CodeMirror.fromTextArea(document.getElementById("editor"),
    {
        mode: "text/x-c++src",
        theme: "vscode-dark",
        lineNumbers: true,
        lineSeparator: "\n",
        readOnly: true,     //It is read only to allow edits using only program commands. 
        extraKeys:{
            "Ctrl-A":"selectAll()",
        }
        
    })
// function selectAll()
// {
// if(editor)
//     {

//  let end_pos=this.editor.getCursor("to"); //to means the ending position of the cursor inside the selection (which is already made when Ctrl+A is clicked)
//  this.editor.setSelection({line:0,ch:0},{line:end_pos.line,ch:end_pos.ch});
//  console.log("selection is made end is "+end_pos)
//  this.editor.focus();
//     }
    
// }

function localEdit(editor, changeObject, connection, currentSocketId, lseq_client, file_name) {
    console.log(changeObject);

    if (changeObject.origin != "setValue" && currentSocketId || typeof (changeObject.origin) != undefined)// I might change this line later
    {
        let current_cursor_position = editor.getCursor();
        let current_cursor_index = editor.indexFromPos(current_cursor_position); window.current_cursor_index = current_cursor_index;// this line for debegg

        let input_character = "", input_type = "", operation_id = "";

        let select_start_index = 0, select_end_index = 0, num_selected_chars = 0;

        let selection_made = false;

        if (changeObject.from.sticky == "after" || changeObject.from.sticky == "before") {


            select_start_index = editor.indexFromPos(changeObject.from);
            select_end_index = editor.indexFromPos(changeObject.to);
            num_selected_chars = Math.abs(select_end_index - select_start_index);



            if (num_selected_chars) 
            {
                console.log("A selection operation is made");
                console.log(`Starting position ${select_start_index}`);
                console.log(`Ending positiong ${select_end_index}`);
                console.log(`Number of selected chars ${num_selected_chars}`);
                selection_made = true;
            }

        }


        //let i = 0; lower_bound = 0;
        if (!selection_made) 
        {
            select_start_index = current_cursor_index;
            select_end_index = current_cursor_index-1;
            num_selected_chars = 1;
        }



        if (changeObject.origin === "+delete" || changeObject.origin === "cut") 
        {
            input_type = "delete";
            if(selection_made)
            removeRange(select_start_index, num_selected_chars, lseq_client, connection, input_type, file_name);
            else
            removeRange(--current_cursor_index, num_selected_chars, lseq_client, connection, input_type, file_name);
            
        }
        else if (changeObject.origin === "+input") {
            if (selection_made) 
                removeRange(select_start_index, num_selected_chars, lseq_client, connection, "delete", file_name);

 
            input_type = "insert";

            if (changeObject.text.length == 2 && changeObject.text[0]==="")  
            input_character = "\n";
            else  input_character = changeObject.text[0];

            operation_id = lseq_client.insert(input_character, current_cursor_index);
            broadcastUpdates(connection, operation_id, input_type, file_name)
        }
        else if (changeObject.origin === "paste") {
            if(selection_made)
            removeRange(select_start_index, num_selected_chars, lseq_client, connection, "delete", file_name);

            
            input_type = "insert";
            let count = select_start_index;

            for(let i=0;i<changeObject.text.length;i++)
            {

                for (let j = 0; j < changeObject.text[i].length; j++) 
                {
                    operation_id = lseq_client.insert(changeObject.text[i][j], count++); // you can make it a single input but make sure the tree has the same number of entries as the editor index can point
                    broadcastUpdates(connection, operation_id, input_type, file_name);
                }

                if(changeObject.text.length>0&&(i+1!=changeObject.text.length))
                {
                    operation_id = lseq_client.insert("\n",count++);
                    broadcastUpdates(connection, operation_id, input_type, file_name);
                }
            }
        }

    }

}

function removeRange(select_start_index, num_selected_chars, lseq_client, connection, input_type, file_name) {
    for (let i=0; i < num_selected_chars; i++) 
    {
            if (lseq_client.length > 0) 
            {
                operation_id = lseq_client.remove(select_start_index);
                broadcastUpdates(connection, operation_id, input_type, file_name);
            }   
    }
}

function broadcastUpdates(connection, operation_id, input_type, file_name) 
{
    connection.socket.emit("edit-made", file_name, { operation_id, input_type }) //Notify server of updates ////////////////////////////CHANGE THIS IS HARDCODED
    connection.send({ operation_id, input_type, file_name }) //Notify other clients of updates
}
function applyChangesAtEditor(data, lseq_client) {
    let oldCursor = this.editor.getCursor();

    let edit_index = 0;
    let replacement_string = "";
    if (data.input_type == "insert") {
        edit_index = lseq_client.applyInsert(data.operation_id, false);
        console.log("I am here"+ edit_index)
        replacement_string = lseq_client.get(edit_index - 1);

        if (edit_index != -1) {
            let edit_pos = this.editor.posFromIndex(edit_index - 1);
            this.editor.replaceRange(replacement_string, edit_pos);
        }
    }
    else if (data.input_type == "delete") {
        lseq_client.applyRemove(data.operation_id);
        editor.setValue(lseq_client.traverse());
    }

    this.editor.setCursor(oldCursor);
}


module.exports = {
    editor,
    applyChangesAtEditor,
    localEdit
}