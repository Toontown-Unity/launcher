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
let {ipcRenderer} = require('electron');

function launch(closedCallback, eCallback){
    console.log('launch');
    let client = exec(
        'bin/Toontown Unity.exe',
        [],
        {});

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