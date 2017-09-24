
function Speech2Device(adapter, libs, options, sayItIsPlayFile, sayFinished) {
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

    // Google home
    var Client;
    var DefaultMediaReceiver;
    var MP3FILE      = __dirname + '/../say.mp3';
    var ERROR        = '$$$ERROR$$$';
    // If text is gong.mp3 or bong.wav
    function sayItGetFileName(text) {
        if (sayItIsPlayFile(text)) {
            if (libs.fs.existsSync(text)) {
                return text;
            } else {
                return __dirname + '/' + text;
            }
        }

        return MP3FILE;
    }

    function sayItBrowser (text, language, volume, duration) {
        if (text.substring(0, 11) === ERROR) {
            sayFinished(0);
            return;
        }

        var fileData;
        if (sayItIsPlayFile(text)) {
            try {
                fileData = libs.fs.readFileSync(text);
            } catch (e) {
                adapter.log.error('Cannot play file "' + text + '": ' + e.toString());
                sayFinished(0);
                return;
            }
        } else {
            try {
                fileData = libs.fs.readFileSync(MP3FILE);
            } catch (e) {
                adapter.log.error('Cannot play file "' + MP3FILE + '": ' + e.toString());
                sayFinished(0);
                return;
            }
        }
        adapter.setBinaryState(adapter.namespace + '.tts.mp3', fileData);
        adapter.setForeignState('vis.0.control.instance', adapter.config.instance);
        adapter.setForeignState('vis.0.control.data',     '/state/' + adapter.namespace + '.tts.mp3');
        adapter.setForeignState('vis.0.control.command',  'playSound');
        sayFinished(duration);
    }

    function sayItSonos (text, language, volume, duration) {
        if (text.substring(0, 11) === ERROR) {
            sayFinished(0);
            return;
        }

        var fileData;
        if (sayItIsPlayFile(text)) {
            try {
                fileData = libs.fs.readFileSync(text);
            } catch (e) {
                adapter.log.error('Cannot play file "' + text + '": ' + e.toString());
                sayFinished(0);
                return;
            }
        } else {
            try {
                fileData = libs.fs.readFileSync(MP3FILE);
            } catch (e) {
                adapter.log.error('Cannot play file "' + MP3FILE + '": ' + e.toString());
                sayFinished(0);
                return;
            }
        }

        volume = volume || options.sayLastVolume;

        adapter.setBinaryState(adapter.namespace + '.tts.mp3', fileData);

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
        sayFinished(duration);
    }

    function sayItMpd (text, language, volume, duration) {
        if (text.substring(0, 11) === ERROR) {
            sayFinished(0);
            return;
        }

        var fileData;
        if (sayItIsPlayFile(text)) {
            try {
                fileData = libs.fs.readFileSync(text);
            } catch (e) {
                adapter.log.error('Cannot play file "' + text + '": ' + e.toString());
                sayFinished(0);
                return;
            }
        } else {
            try {
                fileData = libs.fs.readFileSync(MP3FILE);
            } catch (e) {
                adapter.log.error('Cannot play file "' + MP3FILE + '": ' + e.toString());
                sayFinished(0);
                return;
            }
        }
        volume = volume || options.sayLastVolume;
        adapter.setBinaryState(adapter.namespace + '.tts.mp3', fileData);

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
        sayFinished(duration);
    }

    function sayItChromecast (text, language, volume, duration) {
        if (text.substring(0, 11) === ERROR) {
            sayFinished(0);
            return;
        }

        var fileData;
        if (sayItIsPlayFile(text)) {
            try {
                fileData = libs.fs.readFileSync(text);
            } catch (e) {
                adapter.log.error('Cannot play file "' + text + '": ' + e.toString());
                sayFinished(0);
                return;
            }
        } else {
            try {
                fileData = libs.fs.readFileSync(MP3FILE);
            } catch (e) {
                adapter.log.error('Cannot play file "' + MP3FILE + '": ' + e.toString());
                sayFinished(0);
                return;
            }
        }

        volume = volume || options.sayLastVolume;

        adapter.setBinaryState(adapter.namespace + '.tts.mp3', fileData);

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
            adapter.log.info('Set "' + adapter.config.cDevice + '.player.announcement: ' + announcementJSON);
            adapter.setForeignState(adapter.config.cDevice + '.player.announcement', announcementJSON);
        } else {
            adapter.log.warn('Web server is unavailable!');
        }
        sayFinished(duration);
    }

    function launchGoogleHome(client, url, callback) {
        client.launch(DefaultMediaReceiver, function (err, player) {
            var media = {
                contentId:   url,
                contentType: 'audio/mp3',
                streamType:  'BUFFERED' // or LIVE
            };
            player.load(media, {autoplay: true}, function (err, status) {
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
                client.setVolume({ level: volume / 100 }, function (err, newvol) {
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

    function sayItGoogleHome (text, language, volume, duration) {
        if (text.substring(0, 11) === ERROR) {
            sayFinished(0);
            return;
        }

        Client               = Client               || require('castv2-client').Client;
        DefaultMediaReceiver = DefaultMediaReceiver || require('castv2-client').DefaultMediaReceiver;

        var fileData;
        if (sayItIsPlayFile(text)) {
            try {
                fileData = libs.fs.readFileSync(text);
            } catch (e) {
                adapter.log.error('Cannot play file "' + text + '": ' + e.toString());
                sayFinished(0);
                return;
            }
        } else {
            try {
                fileData = libs.fs.readFileSync(MP3FILE);
            } catch (e) {
                adapter.log.error('Cannot play file "' + MP3FILE + '": ' + e.toString());
                sayFinished(0);
                return;
            }
        }

        volume = volume || options.sayLastVolume;

        adapter.setBinaryState(adapter.namespace + '.tts.mp3', fileData);

        if (volume === 'null') volume = 0;

        if (adapter.config.server && options.webLink) {
            var url = options.webLink + '/state/' + adapter.namespace + '.tts.mp3';
            adapter.log.debug('Send to google home "' + adapter.config.server + '": ' + url);

            sendToGoogleHome(adapter.config.server, url, volume, function (err) {
                if (err) adapter.log.error(err);
            });
        } /*else if (options.webLink) {
        adapter.log.info('Send to Chromecast (announcement): ' + announcementJSON);
        adapter.sendTo('chromecast', 'announcement', announcementJSON);
    } */ else {
            adapter.log.warn('Web server is unavailable!');
        }
        sayFinished(duration);

        /*getSpeechUrl(text, adapter.config.googleHome, language, function (res) {
            adapter.log.debug('Pronounce result: ' + JSON.stringify(res));
            sayFinished(0);
        });*/
    }

    function sayItMP24 (text, language, volume, duration) {
        if (text.substring(0, 11) === ERROR) {
            sayFinished(0);
            return;
        }

        if (adapter.config.server && !sayItIsPlayFile(text)) {
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
                    adapter.log.error('Cannot say text on MediaPlayer24 "' + adapter.config.server + '":' + e.message);
                }
            });
        }
        sayFinished(duration + 2);
    }

    function sayItMP24ftp (text, language, volume, duration) {
        if (text.substring(0, 11) === ERROR) {
            sayFinished(0);
            return;
        }

        // Copy mp3 file to android device to play it later with MediaPlayer
        if (adapter.config.port && adapter.config.server) {

            var file = sayItGetFileName(text);

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
                    ftp.raw.quit(function (err, data) {
                        if (err) adapter.log.error(err);
                        ftp.destroy();
                    });
                });
            } catch (e) {
                adapter.log.error('Cannot upload file to ' + adapter.config.server + ':' + adapter.config.port);
            }
        }
        sayFinished(duration + 2);
    }

    function sayItSystem (text, language, volume, duration) {
        if (text.substring(0, 11) === ERROR) {
            sayFinished(0);
            return;
        }
        if (!libs.os) libs.os = require('os');

        var p = libs.os.platform();
        var ls = null;
        var file = sayItGetFileName(text);
        var cmd;

        sayItSystemVolume(volume);

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
            ls = libs.child_process.exec(cmd, function (error, stdout, stderr) {
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
                    cmd = 'mpg321 ' + file;
                }
                ls = libs.child_process.exec(cmd, function (error, stdout, stderr) {
                    if (error) adapter.log.error('Cannot play:' + error);
                    adapter.setState('tts.playing', false);
                });
            } else if (p.match(/^win/)) {
                //windows
                adapter.setState('tts.playing', true);
                ls = libs.child_process.exec('cmdmp3.exe "' + file + '"', {cwd: __dirname + '/cmdmp3/'}, function (error, stdout, stderr) {
                    if (error) adapter.log.error('Cannot play:' + error);
                    adapter.setState('tts.playing', false);
                });
            } else if (p === 'darwin') {
                //mac osx
                adapter.setState('tts.playing', true);
                ls = libs.child_process.exec('/usr/bin/afplay ' + file, function (error, stdout, stderr) {
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
            sayFinished(duration);
        } else {
            sayFinished(duration + 2);
        }
    }

    function sayItWindows (text, language, volume, duration) {
        if (text.substring(0, 11) === ERROR) {
            sayFinished(0);
            return;
        }

        // If mp3 file
        if (sayItIsPlayFile(text)) {
            sayItSystem(text, language, volume);
            return;
        }

        if (!libs.os) libs.os = require('os');

        // Call windows own text 2 speech
        var p    = libs.os.platform();
        var ls   = null;
        var file = sayItGetFileName(text);

        if (volume || volume === 0) sayItSystemVolume(volume);

        if (p.match(/^win/)) {
            //windows
            adapter.setState('tts.playing', true);
            ls = libs.child_process.exec(__dirname + '/Say/SayStatic.exe ' + text, function (error, stdout, stderr) {
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
        sayFinished(duration + 2);
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

        if (p === 'linux') {
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
            ls = libs.child_process.spawn (__dirname + '/nircmd/nircmdc.exe', ['setsysvolume', level]);
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

    return this;
}

module.exports = Speech2Device;