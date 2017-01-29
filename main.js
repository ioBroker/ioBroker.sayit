/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

var utils   = require(__dirname + '/lib/utils'); // Get common adapter utils
var libs    = {};
var path    = require('path');
var engines = require(__dirname + '/admin/engines.js');

var sayitEngines = engines.sayitEngines;
var sayitOptions = engines.sayitOptions;

var adapter = utils.adapter({
    name:   'sayit',
    unload: stop
});

process.on('SIGINT', stop);

adapter.on('stateChange', function (id, state) {
    if (state && !state.ack) {
        if (id === adapter.namespace + '.tts.volume') {
            if (adapter.config.type === 'system') {
                sayItSystemVolume(state.val);
            } else {
                sayLastVolume = state.val;
            }
        } else if (id === adapter.namespace + '.tts.text') {
            if (typeof state.val !== 'string') {
                if (state.val === null || state.val === undefined || state.val === '') {
                    adapter.log.warn('Cannot cache empty text');
                    return;
                }
                state.val = state.val.toString();
            }

            sayIt(state.val);
        } else if (id === adapter.namespace + '.tts.cachetext') {

            if (typeof state.val !== 'string') {
                if (state.val === null || state.val === undefined || state.val === '') {
                    adapter.log.warn('Cannot cache empty text');
                    return;
                }
                state.val = state.val.toString();
            }

            cacheIt(state.val);
        }
    }
});

adapter.on('ready', function () {
    main();
});

adapter.on('message', function (obj) {
    if (obj) processMessage(obj);
    processMessages();
});

function processMessage(obj) {
    if (obj && obj.command === 'stopInstance') {
        stop(function () {
            if (obj.callback) {
                adapter.sendTo(obj.from, obj.command, null, obj.callback);
            }
        });
    }
}

function processMessages() {
    adapter.getMessage(function (err, obj) {
        if (obj) setTimeout(processMessages, 0);
    });
}

function stop(callback) {
    try {
        if (adapter && adapter.log && adapter.log.info) {
            adapter.log.info('stopping...');
        }
        setTimeout(function () {
            process.exit();
        }, 1000);

        if (typeof callback === 'function') callback();
    } catch (e) {
        process.exit();
    }
}

var sayLastGeneratedText = '';
var sayLastVolume        = null;
var cacheDir             = '';
var webLink              = '';
var list                 = [];
var ivona                = null;
var lastSay              = null;
var polly                = null;
var appkey               = null;

var sayitFuncs = {
    browser:    {func: sayItBrowser   },
    mp24ftp:    {func: sayItMP24ftp   },
    mp24:       {func: sayItMP24      },
    system:     {func: sayItSystem    },
    windows:    {func: sayItWindows   },
    sonos:      {func: sayItSonos     },
    chromecast: {func: sayItChromecast},
    mpd:        {func: sayItMpd       }
};

function mkpathSync(rootpath, dirpath) {
    // Remove filename
    dirpath = dirpath.split('/');
    dirpath.pop();
    if (!dirpath.length) return;

    for (var i = 0; i < dirpath.length; i++) {
        rootpath += dirpath[i] + '/';
        if (!libs.fs.existsSync(rootpath)) {
            if (dirpath[i] !== '..') {
                libs.fs.mkdirSync(rootpath);
            } else {
                throw 'Cannot create ' + rootpath + dirpath.join('/');
            }
        }
    }
}

function copyFile(text, language, volume, source, dest, callback) {
    try {
        var input  = libs.fs.createReadStream(source);               // Input stream
        var output = libs.fs.createWriteStream(dest);                // Output stream

        input.on('data',  function (d) {
            output.write(d);
        });

        // Copy in to out
        input.on('error', function (err) {
            throw err;
        });

        // Raise errors
        input.on('end',   function () {                               // When input ends
            output.end();                                            // close output
            adapter.log.info('Copied file "' + source + '" to "' + dest + '"');
            if (callback) callback(text, language, volume);          // And notify callback
        });
    } catch (e) {
        adapter.log.error('Cannot copy file "' + source + '" to "' + dest + '": ' + e);
        if (callback) callback('', '', volume);              // And notify callback
    }
}

function getLength(fileName, callback) {
    // create a new parser from a node ReadStream
    if (fileName === adapter.config.announce && adapter.config.annoDuration) {
        if (callback) callback(adapter.config.annoDuration - 1);
        return;
    }

    if (libs.fs.existsSync(fileName)) {
        try {
            var stat = libs.fs.statSync(fileName);
            var size = stat.size;
            if (callback) callback(Math.ceil(size / 4096));
        } catch (e) {
            adapter.log.warn('Cannot read length of file ' + fileName);
            if (callback) callback(0);
        }
    } else {
        if (callback) callback(0);
    }
}

function splitText(text, max) {
    if (!max) max = 70;
    if (text.length > max) {
        var parts = text.split(/,|.|;|:/);
        var result = [];
        for (var p = 0; p < parts.length; p++) {
            if (parts[p].length < max) {
                result.push(parts[p]);
                continue;
            }

            var _parts = parts[p].split(' ');
            var i = 0;
            for (var w = 0; w < _parts.length; w++) {
                if (_parts[i] && ((result[i] || '') + ' ' + _parts[w]).length > max) {
                    i++;
                }
                if (!result[i]) {
                    result.push(_parts[w]);
                } else {
                    result[i] += ' ' + _parts[w];
                }
            }
        }
        return result;
    } else {
        return [text];
    }
}

function sayFinished(duration) {
    duration = duration || 0;
    if (list.length) {
        adapter.log.debug('Duration "' + list[0].text + '": ' + duration);
    }
    setTimeout(function () {
        // Remember when last text finished
        lastSay = (new Date()).getTime();
        if (list.length) list.shift();
        if (list.length) {
            sayIt(list[0].text, list[0].language, list[0].volume, true);
        }
    }, duration * 1000);
}

function sayItGetSpeechGoogle(text, language, volume, callback) {
    if (typeof volume === 'function') {
        callback = volume;
        volume = undefined;
    }

    if (text.length === 0) {
        if (callback) callback('', language, volume, 0);
        return;
    }

    if (text.length > 70) {
        var parts = splitText(text);
        for (var t = 1; t < parts.length; t++) {
            sayIt(parts[t], language, volume);
        }
        text = parts[0];
    }

    language = language || adapter.config.engine;

    // https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=%D0%BE%D1%82%D0%B2%D0%B5%D1%82%D0%B8%D1%82%D1%8C%207&tl=ru&total=1&idx=0&textlen=10
    var options = {
        host: 'translate.google.com',
        //port: 443,
        path: '/translate_tts?ie=UTF-8&client=tw-ob&q=' + encodeURI(text) + '&tl=' + language + '&total=1&idx=0&textlen=' + text.length //
    };

    if (language === 'ru') {
        options.headers = {
            'Accept-Encoding':  'identity;q=1, *;q=0',
            Range:              'bytes=0-',
            Referer:            'https://www.google.de/',
            'User-Agent':       'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.125 Safari/537.36'
            //"User-Agent":      "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:25.0) Gecko/20100101 Firefox/25.0",
            //"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            //"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
            //"Accept-Encoding": "gzip, deflate"//
        };
    }

    if (!libs.https) libs.https = require('https');

    var sounddata = '';
    libs.https.get(options, function (res) {
        res.setEncoding('binary');

        res.on('data', function (chunk) {
            sounddata += chunk;
        });

        res.on('end', function () {
            if (sounddata.length < 100) {
                adapter.log.error('Cannot get file: received file is too short');
                if (callback) callback('$$$ERROR$$$' + text, language, volume, 0);
                return;
            }

            if (sounddata.toString().indexOf('302 Moved') !== -1) {
                adapter.log.error ('http://' + options.host + options.path);
                adapter.log.error ('Cannot get file: ' + sounddata);
                if (callback) callback('$$$ERROR$$$' + text, language, volume, 0);
                return;
            }

            libs.fs.writeFile(__dirname + '/say.mp3', sounddata, 'binary', function (err) {
                if (err) {
                    adapter.log.error ('File error: ' + err);
                    if (callback) callback('$$$ERROR$$$' + text, language, volume, 0);
                } else {
                    getLength(__dirname + '/say.mp3', function (seconds) {
                        if (callback) callback(text, language, volume, seconds);
                    });
                }
            });
        });
    }).on('error', function (err) {
        sounddata = '';
        adapter.log.error('Cannot get file:' + err);
    });
}

function sayItGetSpeechAcapela(text, language, volume, callback) {
    var options = {
        host: 'vaassl3.acapela-group.com',
        path: '/Services/Synthesizer?prot_vers=2&req_voice=' + language + '22k&cl_env=FLASH_AS_3.0&req_text=%5Cvct%3D100%5C+%5Cspd%3D180%5C+' +
              encodeURI(text) + '&req_asw_type=STREAM&cl_vers=1-30&req_err_as_id3=yes&cl_login=ACAPELA_BOX&cl_app=PROD&cl_pwd=0g7znor2aa'
    };

    if (!libs.https) libs.https = require('https');

    var sounddata = '';
    libs.https.get(options, function (res) {
        res.setEncoding('binary');

        res.on('data', function (chunk) {
            sounddata += chunk;
        });

        res.on('end', function () {
            if (sounddata.length < 100) {
                adapter.log.error('Cannot get file: received file is too short');
                if (callback) callback('$$$ERROR$$$' + text, language, volume);
                return;
            }

            libs.fs.writeFile(__dirname + '/say.mp3', sounddata, 'binary', function (err) {
                if (err) {
                    adapter.log.error('File error:' + err);
                    if (callback) callback('$$$ERROR$$$' + text, language, volume);
                } else {
                    console.log('File saved.');
                    if (callback) callback(text, language, volume);
                }
            });
        });
    }).on('error', function (err) {
        sounddata = '';
        adapter.log.error('Cannot get file:' + err);
    });
}

function sayItGetSpeechYandex(text, language, volume, callback) {
    if (language === 'ru' || language === 'ru_YA') {
        language = 'ru-RU';
    }

    if (!libs.https) libs.https = require('https');

    /*emotion: good, neutral, evil, mixed
    drunk:   true, false
    ill:     true, false
    robot:   true, false
    */
    var options = {
        host: 'tts.voicetech.yandex.net',
        path: '/generate?lang=' + language + '&format=mp3&speaker=' + adapter.config.voice + '&key=' + adapter.config.key +
              '&text=' + encodeURI(text.trim())
    };

    if (adapter.config.emotion && adapter.config.emotion !== 'none') options.path += '&emotion=' + adapter.config.emotion;
    if (adapter.config.drunk === 'true' || adapter.config.drunk === true) options.path += '&drunk=true';
    if (adapter.config.ill   === 'true' || adapter.config.ill   === true) options.path += '&ill=true';
    if (adapter.config.robot === 'true' || adapter.config.robot === true) options.path += '&robot=true';

    var sounddata = '';
    libs.https.get(options, function (res) {
        res.setEncoding('binary');

        res.on('data', function (chunk) {
            sounddata += chunk;
        });

        res.on('end', function () {
            if (sounddata.length < 100) {
                adapter.log.error('Cannot get file: received file is too short');
                if (callback) callback('$$$ERROR$$$' + text, language, volume, 0);
                return;
            }

            libs.fs.writeFile(__dirname + '/say.mp3', sounddata, 'binary', function (err) {
                if (err) {
                    adapter.log.error('File error:' + err);
                    if (callback) callback('$$$ERROR$$$' + text, language, volume, 0);
                } else {
                    if (callback) callback(text, language, volume);
                }
            });
        });
    }).on('error', function (err) {
        sounddata = '';
        adapter.log.error('Cannot get file:' + err);
    });
}

function sayItGetSpeechAmazon(text, language, volume, callback) {
    if (!libs.Ivona) libs.Ivona = require('ivona-node');

    if (!ivona) ivona = new libs.Ivona({
        accessKey: adapter.config.accessKey,
        secretKey: adapter.config.secretKey
    });

    if (!libs.fs) libs.fs = require('fs');

    try {
        ivona.createVoice(text, {
            body: {
                voice: {
                    name:     sayitEngines[language].ename,
                    language: sayitEngines[language].language,
                    gender:   sayitEngines[language].gender
                }
            }
        }).pipe(libs.fs.createWriteStream(__dirname + '/say.mp3')).on('finish', function () {
            if (callback) callback(text, language, volume);
        });
    } catch (e) {
        adapter.log.error(e.toString());
        if (callback) callback('$$$ERROR$$$' + text, language, volume);
    }
}

function sayItGetSpeechPolly(text, language, volume, callback) {
    if (!libs.aws) libs.aws = require('aws-sdk');
    if (!libs.fs)  libs.fs   = require('fs');

    try {
        polly = polly || new libs.aws.Polly({
            accessKeyId:     adapter.config.accessKey,
            secretAccessKey: adapter.config.secretKey,
            region:          adapter.config.region
        });
        var type = 'text';
        if (text.match(/<[-+\w\s'"=]+>/)) {
            if (!text.match(/^<speak>/)) text = '<speak>' + text + '</speak>';
            type = 'ssml';
        }
        var params = {
            Text:         text,
            OutputFormat: 'mp3',
            TextType:     type,
            VoiceId:      sayitEngines[language].ename
        };

        polly.synthesizeSpeech(params, function (err, data) {
            if (err) {
                adapter.log.error('Cannot get answer: ' + JSON.stringify(err));
                if (callback) callback('$$$ERROR$$$' + text, language, volume, 0);
            } else if (data) {
                if (data.AudioStream instanceof Buffer) {
                    libs.fs.writeFile(__dirname + '/say.mp3', data.AudioStream, 'binary', function (err) {
                        if (err) {
                            adapter.log.error ('File error: ' + err);
                            if (callback) callback('$$$ERROR$$$' + text, language, volume, 0);
                        } else {
                            getLength(__dirname + '/say.mp3', function (seconds) {
                                if (callback) callback(text, language, volume, seconds);
                            });
                        }
                    });
                } else {
                    adapter.log.error('Answer in invalid format: ' + (data ? data.toString() : 'null'));
                    if (callback) callback('$$$ERROR$$$' + text, language, volume, 0);
                }
            }
        });
    } catch (e) {
        adapter.log.error(e.toString());
        if (callback) callback('$$$ERROR$$$' + text, language, volume);
    }
}

function sayItGetSpeechCloud(text, language, volume, callback) {
    if (!libs.https) libs.https = require('https');
    if (!libs.fs)    libs.fs    = require('fs');

    if (!appkey) {
        adapter.getForeignObject('system.adapter.' + adapter.config.cloud, function (err, obj) {
            appkey = obj && obj.native && obj.native.apikey ? obj.native.apikey : 'error';
            sayItGetSpeechCloud(text, language, volume, callback);
        });
        return;
    }

    if (appkey === 'error') {
        adapter.log.error('No app key found in "' + adapter.config.cloud + '".');
        if (callback) callback('$$$ERROR$$$' + text, language, volume, 0);
        return;
    }

    try {
        var type = 'text';
        if (text.match(/<[-+\w\s'"=]+>/)) {
            if (!text.match(/^<speak>/)) text = '<speak>' + text + '</speak>';
            type = 'ssml';
        }
        var postData = JSON.stringify({
            Text:     text,
            appkey:   appkey,
            TextType: type,
            VoiceId:  sayitEngines[language].ename
        });
        adapter.log.debug(postData);

        var postOptions = {
            host: 'iobroker.net',
            port: 443,
            path: '/polly/',
            method: 'POST',
            headers: {
                'Content-Type':   'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        // Set up the request
        var postReq = libs.https.request(postOptions, function (res) {
            adapter.log.debug('Status code: ' + res.statusCode);
            if (res.statusCode === 200) {
                res.setEncoding('binary');
            } else {
                res.setEncoding('utf8');
            }
            var data = [];
            res.on('data', function (chunk) {
                if (typeof chunk === 'string') chunk = new Buffer(chunk, 'binary');
                data.push(chunk);
            });

            res.on('error', function (error) {
                adapter.log.error('Cannot read: ' + error);
            });

            res.on('end', function () {
                data = Buffer.concat(data);
                if (data instanceof Buffer && data.length > 500) {
                    libs.fs.writeFile(__dirname + '/say.mp3', data, 'binary', function (err) {
                        if (err) {
                            adapter.log.error('File error: ' + err);
                            if (callback) callback('$$$ERROR$$$' + text, language, volume, 0);
                        } else {
                            getLength(__dirname + '/say.mp3', function (seconds) {
                                if (callback) callback(text, language, volume, seconds);
                            });
                        }
                    });
                } else {
                    adapter.log.error('Answer in invalid format: ' + (data ? data.toString().substring(0, 100) : 'null'));
                    if (callback) callback('$$$ERROR$$$' + text, language, volume, 0);
                }
            });
        });

        // post the data
        postReq.write(postData);
        postReq.end();
    } catch (e) {
        adapter.log.error(e.toString());
        if (callback) callback('$$$ERROR$$$' + text, language, volume);
    }
}

function sayItGetSpeechPicoTTS(text, language, volume, callback) {
    if (!libs.fs)   libs.fs   = require('fs');
    if (!libs.exec) libs.exec = require('child_process').exec;

    try {
        var cmd = 'pico2wave -l ' + language + ' -w ' + __dirname + '/say.wav "' + text + '"';
        libs.exec(cmd, function (error, stdout, stderr) {
            if (error) {
                adapter.log.error('Cannot create (pico2wave) "say.wav": ' + error);
                if (callback) callback(text, language, volume);
            } else {
                libs.exec('lame ' +  __dirname + '/say.wav ' + __dirname + '/say.mp3', function (error, stdout, stderr) {
                    if (error) adapter.log.error('Cannot create (lame) "say.mp3": ' + error);
                    if (callback) callback(text, language, volume);
                });
            }
        });
    } catch (e) {
        adapter.log.error(e.toString());
        if (callback) callback('$$$ERROR$$$' + text, language, volume);
    }
}

function cacheFile(text, language, volume, seconds, callback) {
    if (text.substring(0, 11) !== '$$$ERROR$$$') {
        if (adapter.config.cache) {
            var md5filename = path.join(cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.mp3');

            var stat = libs.fs.statSync(__dirname + '/say.mp3');
            if (stat.size < 100) {
                adapter.log.warn('Received file is too short: ' + libs.fs.readFileSync(__dirname + '/say.mp3').toString());
            } else {
                copyFile(text, language, volume, __dirname + '/say.mp3', md5filename);
            }
        }
    }

    callback(text, language, volume, seconds);
}

function sayItGetSpeech(text, language, volume, callback) {
    if (adapter.config.cache) {
        var md5filename = path.join(cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.mp3');
        if (libs.fs.existsSync(md5filename)) {
            getLength(md5filename, function (seconds) {
                if (callback) callback(md5filename, language, volume, seconds);
            });
            return;
        }
    }

    if (sayitEngines[language] && sayitEngines[language].engine) {
        switch (sayitEngines[language].engine) {
            case 'google':
                sayItGetSpeechGoogle(text, language, volume, function (_text, _language, _volume, seconds) {
                    cacheFile(_text, _language, _volume, seconds, callback);
                });
                break;

            case 'yandex':
                sayItGetSpeechYandex(text, language, volume, function (_text, _language, _volume, seconds) {
                    cacheFile(_text, _language, _volume, seconds, callback);
                });
                break;

            case 'acapela':
                sayItGetSpeechAcapela(text, language, volume, function (_text, _language, _volume, seconds) {
                    cacheFile(_text, _language, _volume, seconds, callback);
                });
                break;

            case 'ivona':
                sayItGetSpeechAmazon(text, language, volume, function (_text, _language, _volume, seconds) {
                    cacheFile(_text, _language, _volume, seconds, callback);
                });
                break;

            case 'polly':
                sayItGetSpeechPolly(text, language, volume, function (_text, _language, _volume, seconds) {
                    cacheFile(_text, _language, _volume, seconds, callback);
                });
                break;

            case 'cloud':
                sayItGetSpeechCloud(text, language, volume, function (_text, _language, _volume, seconds) {
                    cacheFile(_text, _language, _volume, seconds, callback);
                });
                break;

            case 'PicoTTS':
                sayItGetSpeechPicoTTS(text, language, volume, function (_text, _language, _volume, seconds) {
                    cacheFile(_text, _language, _volume, seconds, callback);
                });
                break;

            default:
                adapter.log.warn('Engine ' + sayitEngines[language].engine + ' not yet supported.');
                sayFinished();
                break;

        }
    } else {
        sayItGetSpeechGoogle(text, language, volume, function (_text, _language, _volume, seconds) {
            cacheFile(_text, _language, _volume, seconds, callback);
        });
    }
}

function sayItBrowser(text, language, volume, duration) {
    if (text.substring(0, 11) === '$$$ERROR$$$') {
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
            fileData = libs.fs.readFileSync(__dirname + '/say.mp3');
        } catch (e) {
            adapter.log.error('Cannot play file "' + __dirname + '/say.mp3' + '": ' + e.toString());
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

function sayItSonos(text, language, volume, duration) {
    if (text.substring(0, 11) === '$$$ERROR$$$') {
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
            fileData = libs.fs.readFileSync(__dirname + '/say.mp3');
        } catch (e) {
            adapter.log.error('Cannot play file "' + __dirname + '/say.mp3": ' + e.toString());
            sayFinished(0);
            return;
        }
    }

    volume = volume || sayLastVolume;

    adapter.setBinaryState(adapter.namespace + '.tts.mp3', fileData);

    if (volume === 'null') volume = 0;

    if (adapter.config.device && webLink) {
        adapter.log.info('Set "' + adapter.config.device + '.tts: ' + (volume ? (volume + ';') : '') + webLink + '/state/' + adapter.namespace + '.tts.mp3');
        adapter.setForeignState(adapter.config.device + '.tts', (volume ? (volume + ';') : '') + webLink + '/state/' + adapter.namespace + '.tts.mp3');
    } else if (webLink) {
        adapter.log.info('Send to sonos ' + (volume ? (volume + ';') : '') + webLink + '/state/' + adapter.namespace + '.tts.mp3');
        adapter.sendTo('sonos', 'send', (volume ? (volume + ';') : '') + webLink + '/state/' + adapter.namespace + '.tts.mp3');
    } else {
        adapter.log.warn('Web server is unavailable!');
    }
    sayFinished(duration);
}

function sayItMpd(text, language, volume, duration) {
    if (text.substring(0, 11) === '$$$ERROR$$$') {
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
            fileData = libs.fs.readFileSync(__dirname + '/say.mp3');
        } catch (e) {
            adapter.log.error('Cannot play file "' + __dirname + '/say.mp3": ' + e.toString());
            sayFinished(0);
            return;
        }
    }
    volume = volume || sayLastVolume;
    adapter.setBinaryState(adapter.namespace + '.tts.mp3', fileData);
	
    if (volume === 'null') volume = 0;
	
    if (adapter.config.mpd_device && webLink) {
	adapter.log.info('Set "' + adapter.config.mpd_device + '.say: ' + (volume ? (volume + ';') : '') + webLink + '/state/' + adapter.namespace + '.tts.mp3');
	adapter.setForeignState(adapter.config.mpd_device + '.say', (volume ? (volume + ';') : '') + webLink + '/state/' + adapter.namespace + '.tts.mp3');
    } else if (webLink) {
	adapter.log.info('Send to MPD ' + (volume ? (volume + ';') : '') + webLink + '/state/' + adapter.namespace + '.tts.mp3');
        adapter.sendTo('mpd', 'say', (volume ? (volume + ';') : '') + webLink + '/state/' + adapter.namespace + '.tts.mp3');    
    } else {
        adapter.log.warn('Web server is unavailable!');
    }
    sayFinished(duration);
}

function sayItChromecast(text, language, volume, duration) {
    if (text.substring(0, 11) === '$$$ERROR$$$') {
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
            fileData = libs.fs.readFileSync(__dirname + '/say.mp3');
        } catch (e) {
            adapter.log.error('Cannot play file "' + __dirname + '/say.mp3": ' + e.toString());
            sayFinished(0);
            return;
        }
    }

    volume = volume || sayLastVolume;

    adapter.setBinaryState(adapter.namespace + '.tts.mp3', fileData);

    if (volume === 'null') volume = 0;

    //Create announcement JSON
    var announcement = {
	url: webLink + '/state/' + adapter.namespace + '.tts.mp3'
    };
    if (volume) {
      announcement.volume = volume;
    }
    var announcementJSON = JSON.stringify(announcement);

    if (adapter.config.cDevice && webLink) {
        adapter.log.info('Set "' + adapter.config.cDevice + '.player.announcement: ' + announcementJSON);
        adapter.setForeignState(adapter.config.cDevice + '.player.announcement', announcementJSON);
    } else if (webLink) {
        adapter.log.info('Send to Chromecast (announcement): ' + announcementJSON);
        adapter.sendTo('chromecast', 'announcement', announcementJSON);
    } else {
        adapter.log.warn('Web server is unavailable!');
    }
    sayFinished(duration);
}

function sayItMP24(text, language, volume, duration) {
    if (text.substring(0, 11) === '$$$ERROR$$$') {
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

function sayItMP24ftp(text, language, volume, duration) {
    if (text.substring(0, 11) === '$$$ERROR$$$') {
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

function sayItIsPlayFile(text) {
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
    if (sayItIsPlayFile(text)) {
        if (libs.fs.existsSync(text)) {
            return text;
        } else {
            return __dirname + '/' + text;
        }
    }

    return __dirname + '/say.mp3';
}

function sayItSystem(text, language, volume, duration) {
    if (text.substring(0, 11) === '$$$ERROR$$$') {
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

function sayItWindows(text, language, volume, duration) {
    if (text.substring(0, 11) === '$$$ERROR$$$') {
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

function sayItSystemVolume(level) {
    if ((!level && level !== 0) || level === 'null') return;

    level = parseInt(level);
    if (level < 0)   level = 0;
    if (level > 100) level = 100;

    if (level === sayLastVolume) return;
    if (!libs.os) libs.os = require('os');

    adapter.setState('tts.volume', level, true);

    sayLastVolume = level;

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
}
var cacheRunning = false;
var cacheFiles   = [];

function cacheIt(text, language) {
    // process queue
    if (text === true) {
        if (!cacheFiles.length) {
            cacheRunning = false;
            return;
        }
        // get next queued text
        var toCache = cacheFiles.shift();

        text     = toCache.text;
        language = toCache.language;
    } else {
        // new text to cache
        if (!adapter.config.cache) {
            adapter.log.warn('Cache is not enabled. Unable to cache: ' + text);
            return;
        }

        // Extract language from "en;volume;Text to say"
        if (text.indexOf(';') !== -1) {
            var arr = text.split(';', 3);
            // If language;text or volume;text
            if (arr.length === 2) {
                // If number
                if (parseInt(arr[0]) != arr[0]) {
                    language = arr[0];
                }
                text = arr[1];
            } else if (arr.length === 3) {
                // If language;volume;text or volume;language;text
                // If number
                if (parseInt(arr[0]) == arr[0]) {
                    language = arr[1];
                } else {
                    language = arr[0];
                }
                text = arr[2];
            }
        }
        // if no text => do not process
        if (!text.length) {
            return;
        }

        // Check: may be it is file from DB filesystem, like /vis.0/main/img/door-bell.mp3
        if (text[0] === '/') {
            adapter.log.warn('mp3 file must not be cached: ' + text);
            return;
        }

        var isGenerate = false;
        if (!language) language = adapter.config.engine;

        // find out if say.mp3 must be generated
        if (!sayItIsPlayFile(text)) isGenerate = sayitOptions[adapter.config.type].mp3Required;

        if (!isGenerate) {
            if (sayItIsPlayFile(text)) {
                adapter.log.warn('mp3 file must not be cached: ' + text);
            } else {
                adapter.log.warn('Cache does not required for this engine: ' + adapter.config.engine);
            }
            return;
        }

        var md5filename = path.join(cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.mp3');

        if (libs.fs.existsSync(md5filename)) {
            adapter.log.debug('Text is yet cached: ' + text);
            return;
        }

        if (cacheRunning) {
            cacheFiles.push({text: text, language: language});
            return;
        }
    }

    cacheRunning = true;

    sayItGetSpeech(text, language, false, function (md5filename, _language, volume, seconds) {
        if (md5filename.substring(0, 11) === '$$$ERROR$$$') {
            adapter.log.error('Cannot cache text: "' + text.substring(11));
        } else {
            adapter.log.debug('Text is cached: "' + text + '" under ' + md5filename);
        }
        setTimeout(function () {
            cacheIt(true);
        }, 2000);
    });
}

function sayIt(text, language, volume, process) {
    var md5filename;

    // Extract language from "en;volume;Text to say"
    if (text.indexOf(';') !== -1) {
        var arr = text.split(';', 3);
        // If language;text or volume;text
        if (arr.length === 2) {
            // If number
            if (parseInt(arr[0]) == arr[0]) {
                volume = arr[0];
            } else {
                language = arr[0];
            }
            text = arr[1];
        } else if (arr.length === 3) {
            // If language;volume;text or volume;language;text
            // If number
            if (parseInt(arr[0]) == arr[0]) {
                volume   = arr[0];
                language = arr[1];
            } else {
                volume   = arr[1];
                language = arr[0];
            }
            text = arr[2];
        }
    }

    // if no text => do not process
    if (!text.length) {
        sayFinished(0);
        return;
    }

    // Check: may be it is file from DB filesystem, like /vis.0/main/img/door-bell.mp3
    if (text[0] === '/') {
        var cached = false;
        if (adapter.config.cache) {
            md5filename = path.join(cacheDir, libs.crypto.createHash('md5').update(text).digest('hex') + '.mp3');

            if (libs.fs.existsSync(md5filename)) {
                cached = true;
                text = md5filename;
            }
        }
        if (!cached) {
            var parts = text.split('/');
            var adap = parts[0];
            parts.splice(0, 1);
            var _path = parts.join('/');

            adapter.readFile(adap, _path, function (err, data) {
                if (data) {
                    try {
                        // Cache the file
                        if (md5filename) libs.fs.writeFileSync(md5filename, data);
                        libs.fs.writeFileSync(__dirname + '/say.mp3', data);
                        sayIt(__dirname + '/say.mp3', language, volume, process);
                    } catch (e) {
                        adapter.log.error('Cannot write file "' + __dirname + '/say.mp3": ' + e.toString());
                        sayFinished(0);
                    }
                } else {
                    // may be file from real FS
                    if (libs.fs.existsSync(text)) {
                        data = libs.fs.readFileSync(text);
                        // Cache the file
                        if (md5filename) libs.fs.writeFileSync(md5filename, data);
                        libs.fs.writeFileSync(__dirname + '/say.mp3', data);
                        sayIt(__dirname + '/say.mp3', language, volume, process);
                    } else {
                        adapter.log.warn('File "' + text + '" not found');
                        sayFinished(0);
                    }
                }
            });
            return;
        }
    }

    if (!process) {
        var time = (new Date()).getTime();

        // Workaround for double text
        if (list.length > 1 && (list[list.length - 1].text === text) && (time - list[list.length - 1].time < 500)) {
            adapter.log.warn('Same text in less than half a second.. Strange. Ignore it.');
            return;
        }
        // If more time than 15 seconds
        if (adapter.config.announce && !list.length && (!lastSay || (time - lastSay > adapter.config.annoTimeout * 1000))) {
            // place as first the announce mp3
            list.push({text: adapter.config.announce, language: language, volume: (volume || adapter.config.volume) / 2, time: time});
            // and then text
            list.push({text: text, language: language, volume: (volume || adapter.config.volume), time: time});
            text = adapter.config.announce;
            volume = Math.round((volume || adapter.config.volume) / 100 * adapter.config.annoVolume);
        } else {
            list.push({text: text, language: language, volume: (volume || adapter.config.volume), time: time});
            if (list.length > 1) return;
        }
    }

    adapter.log.info('saying: ' + text);

    var isGenerate = false;
    if (!language) language = adapter.config.engine;
    if (!volume && adapter.config.volume)   volume = adapter.config.volume;

    // find out if say.mp3 must be generated
    if (!sayItIsPlayFile(text)) isGenerate = sayitOptions[adapter.config.type].mp3Required;

    // If text first must be generated
    if (isGenerate && sayLastGeneratedText !== '[' + language + ']' + text) {
        sayLastGeneratedText = '[' + language + ']' + text;
        sayItGetSpeech(text, language, volume, sayitFuncs[adapter.config.type].func);
    } else {
        if (sayItIsPlayFile(text)) {
            getLength(text, function (duration) {
                sayitFuncs[adapter.config.type].func(text, language, volume, duration);
            });
        } else {
            if (!isGenerate) {
                sayitFuncs[adapter.config.type].func(text, language, volume, 0);
            } else if (adapter.config.cache) {
                md5filename = path.join(cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.mp3');
                if (libs.fs.existsSync(md5filename)) {
                    getLength(md5filename, function (duration) {
                        sayitFuncs[adapter.config.type].func(md5filename, language, volume, duration);
                    });
                } else {
                    sayLastGeneratedText = '[' + language + ']' + text;
                    sayItGetSpeech(text, language, volume, sayitFuncs[adapter.config.type].func);
                }
            } else {
                getLength(__dirname + '/say.mp3', function (duration) {
                    sayitFuncs[adapter.config.type].func(text, language, volume, duration);
                });
            }
        }
    }
}

function uploadFile(file, callback) {
    adapter.readFile(adapter.namespace, 'tts.userfiles/' + file, function (err, data) {
        if (err || !data) {
            try {
                adapter.writeFile(adapter.namespace, 'tts.userfiles/' + file, libs.fs.readFileSync(path.join(__dirname + '/mp3/', file)), function () {
                    if (callback) callback();
                });
            } catch (e) {
                adapter.log.error('Cannot read file "' + __dirname + '/mp3/' + file + '": ' + e.toString());
                if (callback) callback();
            }
        } else {
            if (callback) callback();
        }
    });
}

function _uploadFiles(files, callback) {
    if (!files || !files.length) {
        adapter.log.info('All files uploaded');
        if (callback) callback();
        return;
    }

    uploadFile(files.pop(), function () {
        setTimeout(_uploadFiles, 0, files, callback);
    });
}
function uploadFiles(callback) {
    if (libs.fs.existsSync(__dirname + '/mp3')) {
        adapter.log.info('Upload announce mp3 files');
        _uploadFiles(libs.fs.readdirSync(__dirname + '/mp3'), callback);
    } else if (callback) {
        callback();
    }
}

function start() {
    if (adapter.config.announce) {
        adapter.config.annoDuration = parseInt(adapter.config.annoDuration) || 0;
        adapter.config.annoTimeout  = parseInt(adapter.config.annoTimeout)  || 15;
        adapter.config.annoVolume   = parseInt(adapter.config.annoVolume)   || 70; // percent from actual volume

        if (!libs.fs.existsSync(path.join(__dirname, adapter.config.announce))) {
            adapter.readFile(adapter.namespace, 'tts.userfiles/' + adapter.config.announce, function (err, data) {
                if (data) {
                    try {
                        libs.fs.writeFileSync(path.join(__dirname, adapter.config.announce), data);
                        adapter.config.announce = path.join(__dirname, adapter.config.announce);
                    } catch (e) {
                        adapter.log.error('Cannot write file: ' + e.toString());
                        adapter.config.announce = '';
                    }
                }
            });
        } else {
            adapter.config.announce = __dirname + '/' + adapter.config.announce;
        }
    }

    // If cache enabled
    if (adapter.config.cache) {
        if (adapter.config.cacheDir && (adapter.config.cacheDir[0] === '/' || adapter.config.cacheDir[0] === '\\')) adapter.config.cacheDir = adapter.config.cacheDir.substring(1);
        cacheDir = path.join(__dirname, adapter.config.cacheDir);
        if (cacheDir) {
            cacheDir = cacheDir.replace(/\\/g, '/');
            if (cacheDir[cacheDir.length - 1] === '/') cacheDir = cacheDir.substring(0, cacheDir.length - 1);
        } else {
            cacheDir = '';
        }

        var parts = cacheDir.split('/');
        var i = 0;
        while (i < parts.length) {
            if (parts[i] === '..') {
                parts.splice(i - 1, 2);
                i--;
            } else {
                i++;
            }
        }
        cacheDir = parts.join('/');
        // Create cache dir if does not exist
        if (!libs.fs.existsSync(cacheDir)) {
            try {
                mkpathSync(__dirname + '/', adapter.config.cacheDir);
            } catch (e) {
                adapter.log.error('Cannot create "' + cacheDir + '": ' + e.message);
            }
        } else {
            var engine = '';
            // Read the old engine
            if (libs.fs.existsSync(path.join(cacheDir, 'engine.txt'))) {
                try {
                    engine = libs.fs.readFileSync(path.join(cacheDir, 'engine.txt')).toString();
                } catch (e) {
                    adapter.log.error('Cannot read file "' + path.join(cacheDir, 'engine.txt') + ': ' + e.toString());
                }
            }
            // If engine changed
            if (engine !== adapter.config.engine) {
                // Delete all files in this directory
                var files = libs.fs.readdirSync(cacheDir);
                for (var f = 0; f < files.length; f++) {
                    if (files[f] === 'engine.txt') continue;
                    if (libs.fs.existsSync(path.join(cacheDir, files[f])) && libs.fs.lstatSync(path.join(cacheDir, files[f])).isDirectory()) {
                        libs.fs.unlinkSync(path.join(cacheDir, files[f]));
                    }
                }
                try {
                    libs.fs.writeFileSync(path.join(cacheDir, 'engine.txt'), adapter.config.engine);
                } catch (e) {
                    adapter.log.error('Cannot write file "' + path.join(cacheDir, 'engine.txt') + ': ' + e.toString());
                }
            }
        }
    }

    // Load libs
    for (var j = 0; j < sayitOptions[adapter.config.type].libs.length; j++) {
        libs[sayitOptions[adapter.config.type].libs[j]] = require(sayitOptions[adapter.config.type].libs[j]);
    }

    adapter.getState('tts.text', function (err, state) {
        if (err || !state) {
            adapter.setState('tts.text', '', true);
        }
    });

    adapter.getState('tts.volume', function (err, state) {
        if (err || !state) {
            adapter.setState('tts.volume', 70, true);
            if (adapter.config.type !== 'system') sayLastVolume = 70;
        } else {
            if (adapter.config.type !== 'system') sayLastVolume = state.val;
        }
    });

    adapter.getState('tts.playing', function (err, state) {
        if (err || !state) {
            adapter.setState('tts.playing', false, true);
        }
    });

    if (adapter.config.type === 'system') {
        // Read volume
        adapter.getState('tts.volume', function (err, state) {
            if (!err && state) {
                sayItSystemVolume(state.val);
            } else {
                sayItSystemVolume(70);
            }
        });
    }

    if ((adapter.config.type === 'sonos') ||
        (adapter.config.type === 'chromecast') ||
        (adapter.config.type === 'mpd')) {
        adapter.getForeignObject('system.adapter.' + adapter.config.web, function (err, obj) {
            if (!err && obj && obj.native) {
                webLink = 'http';
                if (obj.native.auth) {
                    adapter.log.error('Cannot use server "' + adapter.config.web + '" with authentication for sonos/chromecast. Select other or create another one.');
                } else {
                    if (obj.native.secure) webLink += 's';
                    webLink += '://';
                    if (obj.native.bind === 'localhost' || obj.native.bind === '127.0.0.1') {
                        adapter.log.error('Selected web server "' + adapter.config.web + '" is only on local device available. Select other or create another one.');
                    } else {
                        if (obj.native.bind === '0.0.0.0') {
                            webLink += adapter.config.webServer;
                        } else {
                            webLink += obj.native.bind;
                        }
                    }

                    webLink += ':' + obj.native.port;
                }
            } else {
                adapter.log.error('Cannot read information about "' + adapter.config.web + '". No web server is active');
            }
        });
    }

    adapter.subscribeStates('*');

}

function main() {
    libs.fs = require('fs');

    if ((process.argv && process.argv.indexOf('--install') !== -1) ||
        ((!process.argv || process.argv.indexOf('--force') === -1) && (!adapter.common || !adapter.common.enabled))) {
        adapter.log.info('Install process. Upload files and stop.');
        // Check if files exists in datastorage
        uploadFiles(function () {
            if (adapter.stop) {
                adapter.stop();
            } else {
                process.exit();
            }
        });
    } else {
        // Check if files exists in datastorage
        uploadFiles(start);
    }
}
