
function Speech2Device(adapter, libs, options) {
    var sayitFuncs = {
        browser:    {func: sayItBrowser    },
        mp24ftp:    {func: sayItMP24ftp    },
        mp24:       {func: sayItMP24       },
        system:     {func: sayItSystem     },
        windows:    {func: sayItWindows    },
        sonos:      {func: sayItSonos      },
        chromecast: {func: sayItChromecast },
        mpd:        {func: sayItMpd        },
        googleHome: {func: sayItGoogleHome }
    };
    var MP3FILE    = __dirname + '/../say.mp3';
    var that       = this;
    
    // Function to fill the .tts.mp3 state
    function uploadToStates(text) {
        var fileData;
        if (isPlayFile(text)) {
            try {
                fileData = libs.fs.readFileSync(text);
            } catch (e) {
                callback && callback('Cannot upload file "' + text + '" to state: ' + e.toString(), 0);
                return;
            }
        } else {
            try {
                fileData = libs.fs.readFileSync(MP3FILE);
            } catch (e) {
                callback && callback('Cannot upload file "' + MP3FILE + '" to state: ' + e.toString(), 0);
                return;
            }
        }        
        adapter.setBinaryState(adapter.namespace + '.tts.mp3', fileData);
    }

    // Google home
    var Client;
    var DefaultMediaReceiver;

    function isPlayFile(text) {
        if (text.length > 4) {
            var ext = text.substring(text.length - 4).toLowerCase();
            if (ext === '.mp3' || ext === '.wav') {
                return true;
            }
        }
        return false;
    }

    // If text is gong.mp3 or bong.wav
    function sayItGetFileName(text) {
        if (isPlayFile(text)) {
            if (libs.fs.existsSync(text)) {
                return text;
            } else {
                return __dirname + '/' + text;
            }
        }

        return MP3FILE;
    }

    function sayItBrowser(error, text, language, volume, duration, callback) {
        if (error) {
            callback && callback(error, 0);
            return;
        }
        uploadToStates(text);        
        adapter.setForeignState('vis.0.control.instance', adapter.config.instance);
        adapter.setForeignState('vis.0.control.data',     '/state/' + adapter.namespace + '.tts.mp3');
        adapter.setForeignState('vis.0.control.command',  'playSound');
        callback && callback(null, duration);
    }

    function sayItSonos(error, text, language, volume, duration, callback) {
        if (error) {
            callback && callback(error, 0);
            return;
        }

        volume = volume || options.sayLastVolume;
        uploadToStates(text);

        if (volume === 'null') volume = 0;

        if (adapter.config.device && options.webLink) {
            adapter.log.info('Set "' + adapter.config.device + '.tts: ' + (volume ? (volume + ';') : '') + options.webLink + '/state/' + adapter.namespace + '.tts.mp3');
            adapter.setForeignState(adapter.config.device + '.tts', (volume ? (volume + ';') : '') + options.webLink + '/state/' + adapter.namespace + '.tts.mp3');
        } else if (options.webLink) {
            adapter.log.info('Send to sonos ' + (volume ? (volume + ';') : '') + options.webLink + '/state/' + adapter.namespace + '.tts.mp3');
            adapter.sendTo('sonos', 'send', (volume ? (volume + ';') : '') + options.webLink + '/state/' + adapter.namespace + '.tts.mp3');
        } else {
            adapter.log.warn('Web server is unavailable!');
        }
        callback && callback(null, duration);
    }

    function sayItMpd(error, text, language, volume, duration, callback) {
        if (error) {
            callback && callback(error, 0);
            return;
        }

        volume = volume || options.sayLastVolume;        
        uploadToStates(text);

        if (volume === 'null') volume = 0;

        if (adapter.config.mpd_device && options.webLink) {
            adapter.log.info('Set "' + adapter.config.mpd_device + '.say: ' + (volume ? (volume + ';') : '') + options.webLink + '/state/' + adapter.namespace + '.tts.mp3');
            adapter.setForeignState(adapter.config.mpd_device + '.say', (volume ? (volume + ';') : '') + options.webLink + '/state/' + adapter.namespace + '.tts.mp3');
        } else if (options.webLink) {
            adapter.log.info('Send to MPD ' + (volume ? (volume + ';') : '') + options.webLink + '/state/' + adapter.namespace + '.tts.mp3');
            adapter.sendTo('mpd', 'say', (volume ? (volume + ';') : '') + options.webLink + '/state/' + adapter.namespace + '.tts.mp3');
        } else {
            adapter.log.warn('Web server is unavailable!');
        }
        callback && callback(null, duration);
    }

    function sayItChromecast(error, text, language, volume, duration, callback) {
        if (error) {
            callback && callback(error, 0);
            return;
        }

        volume = volume || options.sayLastVolume;
        uploadToStates(text);

        if (volume === 'null') volume = 0;

        //Create announcement JSON
        var announcement = {
            url: options.webLink + '/state/' + adapter.namespace + '.tts.mp3'
        };
        if (volume) {
            announcement.volume = volume;
        }
        var announcementJSON = JSON.stringify(announcement);

        if (adapter.config.cDevice && options.webLink) {
            var chromecast_anouncement_dev = adapter.config.cDevice + '.player.announcement';
            adapter.log.info('Set "' + chromecast_anouncement_dev + ' to ' + announcementJSON);
            adapter.setForeignState(chromecast_anouncement_dev, announcementJSON, function () {
              //Check every 500 ms if the announcement has finished playing
              var intervalHandler = setInterval(function(){
                adapter.getForeignState(chromecast_anouncement_dev, function(err, state) {
                  if(!err && state.ack) {
                    adapter.log.debug(chromecast_anouncement_dev + ' finished playing announcement: '+announcementJSON);
                    clearInterval(intervalHandler);
                    callback();
                  }
                });
              }, 500);
            });
        } else {
            adapter.log.warn('Web server is unavailable!');
        }
        callback && callback(null, duration);
    }

    function launchGoogleHome(client, url, callback) {
        client.launch(DefaultMediaReceiver, function (err, player) {
            var media = {
                contentId:   url,
                contentType: 'audio/mp3',
                streamType:  'BUFFERED' // or LIVE
            };
            player.load(media, {autoplay: true}, function (err /*, status */) {
                if (err) {
                    adapter.log.error(err);
                }
                client.close();
                callback(err);
            });
        });
    }

    function sendToGoogleHome(host, url, volume, callback) {
        var client = new Client();
        client.connect(host, function() {
            if (volume !== undefined) {
                client.setVolume({ level: volume / 100 }, function (err /* , newvol */) {
                    if (err) adapter.log.error('there was an error setting the volume: ' + err);
                    launchGoogleHome(client, url, callback);
                });
            } else {
                launchGoogleHome(client, url, callback);
            }
        });

        client.on('error', function (err) {
            client.close();
            callback(err);
        });
    }

    function sayItGoogleHome(error, text, language, volume, duration, callback) {
        if (error) {
            callback && callback(error, 0);
            return;
        }

        Client               = Client               || require('castv2-client').Client;
        DefaultMediaReceiver = DefaultMediaReceiver || require('castv2-client').DefaultMediaReceiver;

        volume = volume || options.sayLastVolume;
        uploadToStates(text);

        if (volume === 'null') volume = 0;

        if (adapter.config.server && options.webLink) {
            var url = options.webLink + '/state/' + adapter.namespace + '.tts.mp3';
            adapter.log.debug('Send to google home "' + adapter.config.server + '": ' + url);

            sendToGoogleHome(adapter.config.server, url, volume, function (err) {
                if (err) adapter.log.error(err);
            });
        } else {
            error = 'Web server is unavailable!';
        }
        callback && callback(error, duration);

    }

    function sayItMP24(error, text, language, volume, duration, callback) {
        if (error) {
            callback && callback(error, 0);
            return;
        }
        
        uploadToStates(text);

        if (adapter.config.server && !isPlayFile(text)) {
            adapter.log.debug('Request MediaPlayer24 "http://' + adapter.config.server + ':50000/tts=' + encodeURI(text) + '"');
            var opts = {
                host: adapter.config.server,
                port: 50000,
                path: '/tts=' + encodeURI(text)
            };
            libs.http.get(opts, function (res) {
                var body = '';
                res.on('data', function (chunk) {
                    body += chunk;
                });
                res.on('end', function () {
                    // all data has been downloaded
                    adapter.log.debug('Response from MediaPlayer24 "' + adapter.config.server + '": ' + body);
                });
                res.on('error', function (e) {
                    adapter.log.error('Cannot say text on MediaPlayer24 "' + adapter.config.server + '":' + e.message);
                });
            }).on('error', function (e) {
                if (e.message === 'Parse Error') {
                    adapter.log.debug('Played successfully');
                } else {
                    error = 'Cannot say text on MediaPlayer24 "' + adapter.config.server + '":' + e.message;
                }
            });
        }
        callback && callback(error, duration + 2);
    }

    function sayItMP24ftp(error, text, language, volume, duration, callback) {
        if (error) {
            callback && callback(error, 0);
            return;
        }
        
        uploadToStates(text);
        
        // Copy mp3 file to android device to play it later with MediaPlayer
        if (adapter.config.port && adapter.config.server) {

            var file = sayItGetFileName(text);
            libs.jsftp = libs.jsftp || require('jsftp');

            var ftp = new libs.jsftp({
                host: adapter.config.server,
                port: parseInt(adapter.config.port, 10), // defaults to 21
                user: adapter.config.user || 'anonymous', // defaults to 'anonymous'
                pass: adapter.config.pass || 'anonymous'  // defaults to 'anonymous'
            });

            try {
                // Copy file to FTP server
                ftp.put(file, 'say.mp3', function (hadError) {
                    if (!hadError) {
                        var opts = {
                            host: adapter.config.server,
                            port: 50000,
                            path: '/track=say.mp3'
                        };

                        libs.http.get(opts, function (res) {
                            var body = '';
                            res.on('data', function (chunk) {
                                body += chunk;
                            });
                            res.on('end', function () {
                                // all data has been downloaded
                                adapter.log.debug('Response from MediaPlayer24 "' + adapter.config.server + '": ' + body);
                            });
                            res.on('error', function (e) {
                                adapter.log.error('Cannot say text on MediaPlayer24 "' + adapter.config.server + '":' + e.message);
                            });
                        }).on('error', function (e) {
                            if (e.message === 'Parse Error') {
                                adapter.log.debug('Played successfully');
                            } else {
                                adapter.log.error('Cannot say text on MediaPlayer24 "' + adapter.config.server + '":' + e.message);
                            }
                        });
                    } else {
                        adapter.log.error ('FTP error:' + hadError);
                    }
                    ftp.raw.quit(function (err /* , data */) {
                        if (err) adapter.log.error(err);
                        ftp.destroy();
                    });
                });
            } catch (e) {
                error = 'Cannot upload file to ' + adapter.config.server + ':' + adapter.config.port;
            }
        }
        callback && callback(error, duration + 2);
    }

    function sayItSystem(error, text, language, volume, duration, callback) {
        if (error) {
            callback && callback(error, 0);
            return;
        }
        if (!libs.os) libs.os = require('os');

        uploadToStates(text);

        var p = libs.os.platform();
        var ls = null;
        var file = sayItGetFileName(text);
        var cmd;

        that.sayItSystemVolume(volume);

        if (adapter.config.command) {
            //custom command
            adapter.setState('tts.playing', true);
            if (adapter.config.command.indexOf('%s') !== -1) {
                cmd = adapter.config.command.replace('%s', file);
            } else {
                if (p.match(/^win/)) {
                    cmd = adapter.config.command + ' "' + file + '"';
                } else {
                    cmd = adapter.config.command + ' ' + file;
                }
            }
            ls = libs.child_process.exec(cmd, function (error /* , stdout, stderr */) {
                if (error) adapter.log.error('Cannot play:' + error);
                adapter.setState('tts.playing', false);
            });
        } else {
            if (p === 'linux') {
                //linux
                adapter.setState('tts.playing', true);

                if (adapter.config.player === 'omxplayer') {
                    cmd = 'omxplayer -o local ' + file;
                } else {
                    cmd = 'mpg321 -g ' + options.sayLastVolume + ' ' + file;
                }
                ls = libs.child_process.exec(cmd, function (error /* , stdout, stderr */) {
                    if (error) adapter.log.error('Cannot play:' + error);
                    adapter.setState('tts.playing', false);
                });
            } else if (p.match(/^win/)) {
                //windows
                adapter.setState('tts.playing', true);
                ls = libs.child_process.exec('cmdmp3.exe "' + file + '"', {cwd: __dirname + '/../cmdmp3/'}, function (error /* , stdout, stderr */) {
                    if (error) adapter.log.error('Cannot play:' + error);
                    adapter.setState('tts.playing', false);
                });
            } else if (p === 'darwin') {
                //mac osx
                adapter.setState('tts.playing', true);
                ls = libs.child_process.exec('/usr/bin/afplay ' + file, function (error /* , stdout, stderr */) {
                    if (error) adapter.log.error('Cannot play:' + error);
                    adapter.setState('tts.playing', false);
                });
            }
        }

        if (ls) {
            ls.on('error', function (e) {
                throw new Error('sayIt.play: there was an error while playing the mp3 file:' + e);
            });
        }
        if (text === adapter.config.announce) {
            callback && callback(null, duration);
        } else {
            callback && callback(null, duration + 2);
        }
    }

    function sayItWindows(error, text, language, volume, duration, callback) {
        if (error) {
            callback && callback(error, 0);
            return;
        }

        // If mp3 file
        if (isPlayFile(text)) {
            sayItSystem(text, language, volume);
            return;
        }

        if (!libs.os) libs.os = require('os');

        // Call windows own text 2 speech
        var p    = libs.os.platform();
        var ls   = null;
        // var file = sayItGetFileName(text);

        if (volume || volume === 0) that.sayItSystemVolume(volume);

        if (p.match(/^win/)) {
            //windows
            adapter.setState('tts.playing', true);
            ls = libs.child_process.exec(__dirname + '/../say/SayStatic.exe ' + text, function (error /* , stdout, stderr */) {
                if (error) adapter.log.error ('sayItWindows: ' + error);
                adapter.setState('tts.playing', false);
            });
        } else {
            adapter.log.error ('sayItWindows: only windows OS is supported for Windows default mode');
        }

        if (ls) {
            ls.on('error', function (e) {
                throw new Error('sayIt.play: there was an error while text2speech on window:' + e);
            });
        }
        callback && callback(null, duration + 2);
    }

    this.sayItSystemVolume = function (level) {
        if ((!level && level !== 0) || level === 'null') return;

        level = parseInt(level);
        if (level < 0)   level = 0;
        if (level > 100) level = 100;

        if (level === options.sayLastVolume) return;
        if (!libs.os) libs.os = require('os');

        adapter.setState('tts.volume', level, true);

        options.sayLastVolume = level;

        var p  = libs.os.platform();
        var ls = null;

        if (p === 'linux' && adapter.config.player !== 'mpg321') {
            //linux
            try {
                ls = libs.child_process.spawn('amixer', ['cset', 'name="Master Playback Volume"', '--', level + '%']);
            } catch (err) {
                adapter.log.error('amixer is not available, so you may hear no audio. Install manually!');
                ls = null;
            }
        } else if (p.match(/^win/)) {
            //windows
            // windows volume is from 0 to 65535
            level = Math.round((65535 * level) / 100); // because this level is from 0 to 100
            ls = libs.child_process.spawn(__dirname + '/../nircmd/nircmdc.exe', ['setsysvolume', level]);
        } else if (p === 'darwin') {
            //mac osx
            ls = libs.child_process.spawn('sudo', ['osascript', '-e', '"set Volume ' + Math.round(level / 10) + '"']);
        }

        if (ls) {
            ls.on('error', function (e) {
                adapter.log.error('sayIt.play: there was an error while playing the mp3 file:' + e);
            });
        }
    };

    this.getFunction = function (type) {
        if (sayitFuncs[type]) {
            return sayitFuncs[type].func;
        } else {
            adapter.log.error('No processor for "' + type + '"');
            return null;
        }
    };

    this.sayItIsPlayFile = isPlayFile;

    return this;
}

module.exports = Speech2Device;
