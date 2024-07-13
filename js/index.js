/**
 * Toontown Launcher.
 *
 * Application used to launch Toontown in Unity.
 *
 * @link   https://www.toontownunity.com
 * @file   JS code to launch the executable.
 * @authors Alexander, Necromoni
 */

const fs = require('fs');
const request = require('request');
const progress = require('request-progress');
const decompressZip = require('decompress-zip');
const http = require('https');
const path = require('path');
const os = require('os');

let versionFileContent = '';

$(document).on('ready', function () {
    const $playButton = $('#playButton');
    const $progressBar = $('#progressBar');
    const $progressMsg = $progressBar.find('.progress-info');
    const launcher = require('./js/launcher.js');

    $progressBar.hide();

    function setProgress(value) {
        var $oldProgress = $progressBar.find('progress');
        var $newProgress = $oldProgress.clone();
        $newProgress.attr('value', value);
        $oldProgress.replaceWith($newProgress);
    }

    function windowClosed() {
        $playButton.text('Play Again?');
        $progressBar.hide();
        $playButton.show();
    }

    function setProgressText(text) {
        var $progressText = $progressBar.find('.progress-info').first();
        $progressText.html(text);
    }

    $playButton.on('click', function () {
        if ($playButton.attr('disabled')) {
            return;
        }

        setProgress(0);
        $progressBar.show();
        $playButton.hide();
        setProgressText('Initializing...');

        function handleDownloadDone() {
            // Remove downloaded zip
            fs.unlinkSync(getDownloadFilePath());
            updateVersion();
            launchGame();
        }

        function launchGame() {
            setProgressText('Starting...');
            setProgress(100);
            launcher.launch(windowClosed);
        }

        function handleDownloadFailed() {
            setProgressText('Failed to download update!');
            setProgress(0);
            $playButton.show();
        }


        http.get({
            hostname: "api.github.com",
            path: '/repos/Toontown-Unity/releases/contents/VERSION?ref=main',
            headers: {
                'User-Agent': 'launcher'
            }
        }, (res) => {
            let data = [];
            res.on('data', chunk => {
                data.push(chunk);
            });

            res.on('end', () => {
                let responseJson = JSON.parse(Buffer.concat(data).toString());
                let content = responseJson.content;
                versionFileContent = content;
                
                if (fs.existsSync(getVersionFilePath()) ) {
                    //file exists
                    fs.readFile(getVersionFilePath(), 'utf8', (err, data) => {
                        if (err) {
                            $playButton.text('Failed to read version file');
                            return;
                        }
                        if (content != data) {
                            downloadGame(handleDownloadDone, setProgress, handleDownloadFailed);
                            updateVersion();
                        }
                        else {
                            launchGame();
                        }
                    });
                }
                else {
                    // Download game here
                    downloadGame(handleDownloadDone, setProgress, handleDownloadFailed);
                    updateVersion();
                }
            });
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.which === 123) {
            // F12
            const remote = require('electron').remote;
            remote.getCurrentWindow().webContents.toggleDevTools();
        } else if (e.which === 116) {
            // F5
            location.reload();
        }
    });

    $playButton.attr('disabled', true);

    // Check for a connection to the internet  (or use window.navigator.onLine?)
    $.ajax({
        url: 'https://www.google.com',
        method: 'GET',
        success: function () {
            $playButton.attr('disabled', false);
        },
        error: function () {
            // No internet connection
            $playButton.text('No Internet Connection');
            $playButton.attr('disabled', false);
            $playButton.unbind();
            $playButton.on('click', function () {
                launcher.launch(windowClosed, function () {
                    $playButton.text('No game files detected!')
                });
            });
        }
    });

    function getVersionFilePath(){
        if (process.platform === 'darwin') {
           var TTpath = path.join(os.homedir(), 'Library/Application Support/Toontown in Unity Team/');
           if (!fs.existsSync(TTpath)) fs.mkdirSync(TTpath,'0777', true);
           return path.join(TTpath, 'version.txt');
        }
        else if (process.platform === 'win32')
        {
            return './version.txt';
        }
    }

    function getDownloadFilePath(){
        if (process.platform === 'darwin') {
           var TTpath = path.join(os.homedir(), 'Library/Application Support/Toontown in Unity Team/');
           if (!fs.existsSync(TTpath)) fs.mkdirSync(TTpath,'0777', true);
           return path.join(TTpath, 'bin.zip');
        }
        else if (process.platform === 'win32')
        {
            return 'bin.zip';
        }
    }

    function updateVersion() {
        fs.writeFile(getVersionFilePath(), versionFileContent, err => {
            if (err) {
                console.error(err);
            }
            // file written successfully
        });
    }

    function downloadGame(callback, progback, errback) {
        // change the url based on the platform
        var downloadUrl
        // by default we want the base dir to be root
        // but on mac we want it to be Application Support/Toontown in Unity Team
        var baseDir 

        if (process.platform === 'darwin') {
            baseDir = path.join(os.homedir(), 'Library/Application Support/Toontown in Unity Team/');
            downloadUrl = 'https://github.com/Toontown-Unity/releases/releases/latest/download/darwin.zip'
        }
        // add when linux launcher is ready
        // else if (process.platform === 'linux') or (process.platform === 'linux2')) {
        //     downloadUrl = 'https://github.com/Toontown-Unity/releases/releases/latest/download/linux.zip'
        // }
        else if (process.platform === 'win32')
        {
            baseDir = "./"
            downloadUrl = 'https://github.com/Toontown-Unity/releases/releases/latest/download/windows.zip'
        }
       
        progress(request(downloadUrl), {
            throttle: 100
        })
            .on('progress', function (state) {
                var speed = state.speed;
                var sMetric = 'b/s';
                if (!speed) {
                    speed = '';
                    sMetric = '';
                }
                if (speed > 1024) {
                    speed = (speed / 1024).toFixed(2);
                    sMetric = 'kb/s';
                    if (speed > 1024) {
                        speed = (state.speed / 1024 / 1024).toFixed(2);
                        sMetric = 'Mb/s';
                    }
                }
                var progress = parseInt((state.percent * 100).toFixed(2));
                var sRemain = Math.ceil(state.time.remaining);
                let $span1 = $('<span>').text('Downloading... ' + speed + sMetric);
                let $span2 = $('<span>').text('' + sRemain + 's Remaining');
                if (sRemain && sRemain <= 1) {
                    $progressMsg.html($('<span>').text('Finalizing...').html());
                }
                else if (sRemain) {
                    $progressMsg.html($span1.html() + '<br>' + $span2.html());
                }
                else {
                    $progressMsg.html($span1.html());
                }
                if (progress > 98) {
                    progress = 100;
                }
                progback(progress);
            })
            .on('error', function (err) {
                console.dir(err);
            })
            .on('end', function () {
                progback(100);

                var unzipper = new decompressZip(getDownloadFilePath())

                unzipper.on('error', function (err) {
                    console.dir(err);
                });

                unzipper.on('extract', function (log) {
                    // On darwin we have to set the executable flag
                    if (process.platform === 'darwin') {
                        const execPath = path.join(os.homedir(), 'Library/Application Support/Toontown in Unity Team/client.app/Contents/MacOS/Toontown in Unity');
                        fs.chmodSync(execPath, 0o755); 
                    }
                    callback();
                });

                unzipper.on('progress', function (fileIndex, fileCount) {
                    setProgressText('Extracting file ' + (fileIndex + 1) + ' of ' + fileCount);
                });

                unzipper.extract({
                    path: baseDir,
                    filter: function (file) {
                        return file.type !== "SymbolicLink";
                    }
                });
            })
            .pipe(fs.createWriteStream(getDownloadFilePath()));
    }
});