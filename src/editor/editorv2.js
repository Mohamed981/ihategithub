class editorManager {

   
    constructor() {
        this.editor = CodeMirror.fromTextArea(document.getElementById("editor"),
            {
                mode: "text/x-c++src",
                theme: "vscode-dark",
                lineNumbers: true,
                lineSeparator: "\n",
                readOnly: false,     //It is read only to allow edits using only program commands. 
                extraKeys: {
                    "Ctrl-A": selectAll,
                },
                historyEventDelay:1 //Interval between edits that would register an input to the 

            })
        function selectAll() 
        {
            //console.log("Hi")
        }
    }
    get instance() {
        return this.editor;
    }
    localEdit(changeObject) {

        console.log(changeObject);


        this.operations = [];
        
        this.options = "";
        if (changeObject.origin != "setValue" && (changeObject.origin) != undefined)// I might change this line later
        {
            this.options = "normal_op";
            let value= "", type = "";

            let select_start_index = 0, select_end_index = 0, num_selected_chars = 0;

            let current_cursor_position = this.editor.getCursor();
            let current_cursor_index = this.editor.indexFromPos(current_cursor_position); window.current_cursor_index = current_cursor_index;// this line for debegg
            let selection_made = false;

            if (changeObject.from.sticky == "after" || changeObject.from.sticky == "before") {


                select_start_index = this.editor.indexFromPos(changeObject.from);
                select_end_index = this.editor.indexFromPos(changeObject.to);
                num_selected_chars = Math.abs(select_end_index - select_start_index);



                if (num_selected_chars) {
                    console.log("A selection operation is made");
                    console.log(`Starting position ${select_start_index}`);
                    console.log(`Ending positiong ${select_end_index}`);
                    console.log(`Number of selected chars ${num_selected_chars}`);
                    selection_made = true;
                }

            }

            if (!selection_made) {
                select_start_index = current_cursor_index;
                select_end_index = current_cursor_index - 1;
                num_selected_chars = 1;
            }



            if (changeObject.origin === "+delete" || changeObject.origin === "cut") {
                type = "delete";
                if (selection_made)
                    this.removeRange(select_start_index, num_selected_chars);
                else
                    this.removeRange(--current_cursor_index, num_selected_chars);

            }
            else if (changeObject.origin === "+input") {
                if (selection_made)
                {

                    this.removeRange(select_start_index, num_selected_chars);
                    console.log("Selection start")
                    console.log(select_start_index);
                    console.log("Selection end")
                    console.log(select_end_index);
                    current_cursor_index = this.editor.indexFromPos(this.editor.getCursor());
                }
                
                type = "insert";

                if (changeObject.text.length == 2 && changeObject.text[0] === "")
                    value = "\n";
                else value = changeObject.text[0];

                this.operations.push({ type, value, index: current_cursor_index, number:1});

            }
            else if (changeObject.origin === "paste") 
            {
                
                if (selection_made)
                this.removeRange(select_start_index, num_selected_chars);
                
                type = "insert";
                let count = select_start_index;

                for (let i = 0; i < changeObject.text.length; i++) {

    
                        this.operations.push({ type, value: changeObject.text[i], index: count, number:changeObject.text[i].length });
                        count= count + changeObject.text[i].length;

                    if (changeObject.text.length > 0 && (i + 1 != changeObject.text.length)) {
                        this.operations.push({ type, value: "\n", index: count,number:1});
                        count++;
                    }
                }
            }
            else if (changeObject.origin ==="undo")
            {
               this.options = "undo";
            }
            else if(changeObject === "redo")
            {
                this.options = "redo";
            }
            
        }
        


        return [this.operations,this.options];

        
    }
    removeRange(delete_index, num_selected_chars) {
     
            let deleted_text = this.editor.getRange(this.getPosFromIndex(delete_index),this.getPosFromIndex(delete_index+num_selected_chars));
            this.operations.push({ type: "delete", value:deleted_text, index: delete_index,number:num_selected_chars })
            this.editor.setCursor(this.getPosFromIndex(delete_index));
    }

    permitEdit() {
        this.editor.setOption("readOnly", false)
    }
    changeText(text) {
        this.editor.setValue(text)
    }
    getCursor() {
        return this.editor.getCursor();
    }
    setCursor(cursor_pos) {
        this.editor.setCursor(cursor_pos);
    }
    getPosFromIndex(index) {
        return this.editor.posFromIndex(index)
    }
    getIndexFromPos(pos)
    {
        return this.editor.indexFromPos(pos);
    }
    addCharsToIndex(value, index) {
        this.editor.replaceRange(value, this.editor.posFromIndex(index));
    }
    clearHistory()
    {
        this.editor.clearHistory();
    }

}

module.exports = editorManager;
