# README

#Dependencies -issues
* I did not search yet on how to link the few changes I made the the LSEQ npm module, so I uploaded the entire node_modules fodler to avoid the hassle meanwhile. 
* Please make sure webpack package is installed globably, and use "webpack watch" in the project directory to get webpack to automatically bundle the changed files, and compile them into the main.js file [note that changes to server.js are not captured using this command (we can change this later]


#Code - related

* This code is not finalized yet (by any means)

* Some parts of the code are redundant; I keep cleaning the code periodically. (This is probably the 12th time I have re-written the entire project [and it's still not clean :D])
* In the past period, I got some friends to try out the editor's functionalities (and ask them to make sure instances of the editor converge to the same output). Hence, I kept finding bugs/performance issues and fixing them. 
 
 - I'm working on 2 simple issues 
 - 1] Selection by Ctrl-A is not detected properly [cause is known]
 - 2] Using backspace while the editor is empty will emit uncessary empty events to other usesrs (the issue is that this way it will take up some space in the history log)

# Work-left
* Files management is not yet dynamically implemented (there are only 2 files, but you can switch between them properly (I hope :D)).
* So, I'm trying to be able to:
* Create & delete multiple files & folder (each file is reperesented by an LSEQ tree [client & server code changes])
* Have users automatically connect to new rooms with the room-id (that should be statically created by the server (not the user (as in the way i'm doing it))
* Find a better way for new users to obtain the live sessions' LSEQ tree. I created it in a way that all changes made by any peer will also be given to the server (and new users will get the lseq tree from the server upon connecting or file switch)
* but the server does not have to save the changes immediately anyway [this is similar to the autosave feature that is triggered periodically by some text editors (or spreadsheets)]
