/**
 * Toontown Launcher.
 *
 * Application used to launch Toontown in Unity.
 *
 * @link   https://www.toontownunity.com
 * @file   JS code to launch the executable.
 * @authors Alexander, Necromoni
 */
let exec = require('child_process').execFile;
const path = require('path');
const os = require('os');
let {ipcRenderer} = require('electron');

function launch(closedCallback, eCallback){
    console.log('launch');
    let client = null;
    if (process.platform === 'darwin') {
        const execPath = path.join(os.homedir(), 'Library/Application Support/Toontown in Unity Team/client.app/Contents/MacOS/Toontown in Unity');
        client = exec(
            execPath,
            [],
            {});
    
    }
    else{
        client = exec(
            'bin/Toontown in Unity.exe',
            [],
            {});
    
    }

    ipcRenderer.invoke('hide-window');

    client.on('stdout', (output) => {
       console.log('error ', output);
    });

    client.on('error', (output) => {
        ipcRenderer.invoke('show-window');
        if(eCallback){
            eCallback(output);
        }
        throw(output);
    });

    client.on('stderr', (output) => {
        console.log('error ', output);
    });

    client.on('close', (code) => {
        ipcRenderer.invoke('show-window');
        closedCallback();
    });
}

module.exports = {
    "launch": launch
};
