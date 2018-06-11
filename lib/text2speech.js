'use strict';

function Text2Speech(adapter, libs, options, sayIt) {
    const that         = this;
    const engines      = require(__dirname + '/../admin/engines.js');
    const sayitEngines = engines.sayitEngines;
    const MP3FILE      = __dirname + '/../' + adapter.namespace + '.say.mp3';
    let appkey         = null;
    let cloudUrl       = null;
    let polly          = null;

    function splitText(text, max) {
        if (!max) max = 70;
        if (text.length > max) {
            const parts = text.split(/,|.|;|:/);
            const result = [];
            for (let p = 0; p < parts.length; p++) {
                if (parts[p].length < max) {
                    result.push(parts[p]);
                    continue;
                }

                const _parts = parts[p].split(' ');
                let i = 0;
                for (let w = 0; w < _parts.length; w++) {
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

    function copyFile(text, language, volume, source, dest, callback) {
        libs.fs = libs.fs || require('fs');

        try {
            const input  = libs.fs.createReadStream(source);               // Input stream
            const output = libs.fs.createWriteStream(dest);                // Output stream

            input.on('data',  d =>output.write(d));
            // Copy in to out
            input.on('error', err => {
                throw err;
            });

            // Raise errors
            input.on('end', () => {                               // When input ends
                output.end();                                            // close output
                adapter.log.info('Copied file "' + source + '" to "' + dest + '"');
                if (callback) callback(null, text, language, volume);          // And notify callback
            });
        } catch (e) {
            if (callback) callback('Cannot copy file "' + source + '" to "' + dest + '": ' + e, '', '', volume);              // And notify callback
        }
    }

    function cacheFile(error, text, language, volume, seconds, callback) {
        libs.fs   = libs.fs   || require('fs');
        libs.path = libs.path || require('path');

        if (!error) {
            if (adapter.config.cache) {
                const md5filename = libs.path.join(options.cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.mp3');

                const stat = libs.fs.statSync(MP3FILE);
                if (stat.size < 100) {
                    adapter.log.warn('Received file is too short: ' + libs.fs.readFileSync(MP3FILE).toString());
                } else {
                    copyFile(text, language, volume, MP3FILE, md5filename, (error, text, language, volume) => {
                        if (error) adapter.log.error(error);
                    });
                }
            }
        }

        callback(error, text, language, volume, seconds);
    }

    function sayItGetSpeechGoogle(text, language, volume, callback) {
        if (typeof volume === 'function') {
            callback = volume;
            volume = undefined;
        }

        if (text.length === 0) {
            if (callback) callback(null, '', language, volume, 0);
            return;
        }

        if (text.length > 70) {
            const parts = splitText(text);
            for (let t = 1; t < parts.length; t++) {
                sayIt(parts[t], language, volume);
            }
            text = parts[0];
        }

        language = language || adapter.config.engine;

        // https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=%D0%BE%D1%82%D0%B2%D0%B5%D1%82%D0%B8%D1%82%D1%8C%207&tl=ru&total=1&idx=0&textlen=10
        const options = {
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
        if (!libs.fs)    libs.fs    = require('fs');

        let sounddata = '';
        libs.https.get(options, res => {
            res.setEncoding('binary');

            res.on('data', chunk => sounddata += chunk);

            res.on('end', () => {
                if (sounddata.length < 100) {
                    if (callback) callback('Cannot get file: received file is too short', text, language, volume, 0);
                    return;
                }

                if (sounddata.toString().indexOf('302 Moved') !== -1) {
                    if (callback) callback('http://' + options.host + options.path + '\nCannot get file: ' + sounddata, text, language, volume, 0);
                    return;
                }

                libs.fs.writeFile(MP3FILE, sounddata, 'binary', err => {
                    if (err) {
                        if (callback) callback('File error: ' + err, text, language, volume, 0);
                    } else {
                        that.getLength(MP3FILE, (error, seconds) => {
                            if (callback) callback(error, text, language, volume, seconds);
                        });
                    }
                });
            });
        }).on('error', err => {
            sounddata = '';
            if (callback) callback('Cannot get file:' + err, text, language, volume, 0);
        });
    }

    function sayItGetSpeechAcapela(text, language, volume, callback) {
        const options = {
            host: 'vaassl3.acapela-group.com',
            path: '/Services/Synthesizer?prot_vers=2&req_voice=' + language + '22k&cl_env=FLASH_AS_3.0&req_text=%5Cvct%3D100%5C+%5Cspd%3D180%5C+' +
            encodeURI(text) + '&req_asw_type=STREAM&cl_vers=1-30&req_err_as_id3=yes&cl_login=ACAPELA_BOX&cl_app=PROD&cl_pwd=0g7znor2aa'
        };

        if (!libs.https) libs.https = require('https');

        let sounddata = '';
        libs.https.get(options, res => {
            res.setEncoding('binary');

            res.on('data', chunk => sounddata += chunk);

            res.on('end', () => {
                if (sounddata.length < 100) {
                    if (callback) callback('Cannot get file: received file is too short', text, language, volume);
                    return;
                }

                libs.fs.writeFile(MP3FILE, sounddata, 'binary', err => {
                    if (err) {
                        if (callback) callback('File error:' + err, text, language, volume);
                    } else {
                        console.log('File saved.');
                        if (callback) callback(null, text, language, volume);
                    }
                });
            });
        }).on('error', err => {
            sounddata = '';
            if (callback) callback('Cannot get file:' + err, text, language, volume);
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
        const options = {
            host: 'tts.voicetech.yandex.net',
            path: '/generate?lang=' + language + '&format=mp3&speaker=' + adapter.config.voice + '&key=' + adapter.config.key +
            '&text=' + encodeURI(text.trim())
        };

        if (adapter.config.emotion && adapter.config.emotion !== 'none') options.path += '&emotion=' + adapter.config.emotion;
        if (adapter.config.drunk === 'true' || adapter.config.drunk === true) options.path += '&drunk=true';
        if (adapter.config.ill   === 'true' || adapter.config.ill   === true) options.path += '&ill=true';
        if (adapter.config.robot === 'true' || adapter.config.robot === true) options.path += '&robot=true';

        let sounddata = '';
        libs.https.get(options, res => {
            res.setEncoding('binary');

            res.on('data', chunk => sounddata += chunk);

            res.on('end', () => {
                if (sounddata.length < 100) {
                    if (callback) callback('Cannot get file: received file is too short', text, language, volume, 0);
                    return;
                }

                libs.fs.writeFile(MP3FILE, sounddata, 'binary', err => {
                    if (err) {
                        if (callback) callback('File error: ' + err, text, language, volume, 0);
                    } else {
                        if (callback) callback(null, text, language, volume);
                    }
                });
            });
        }).on('error', err => {
            sounddata = '';
            if (callback) callback('Cannot get file: ' + err, text, language, volume);
        });
    }

    function sayItGetSpeechPolly(text, language, volume, callback) {
        if (!libs.aws) libs.aws = require('aws-sdk');
        if (!libs.fs)  libs.fs  = require('fs');

        try {
            polly = polly || new libs.aws.Polly({
                accessKeyId:     adapter.config.accessKey,
                secretAccessKey: adapter.config.secretKey,
                region:          adapter.config.region
            });
            let type = 'text';
            if (text.match(/<[-+\w\s'"=]+>/)) {
                if (!text.match(/^<speak>/)) text = '<speak>' + text + '</speak>';
                type = 'ssml';
            }
            const params = {
                Text:         text,
                OutputFormat: 'mp3',
                TextType:     type,
                VoiceId:      sayitEngines[language].ename
            };

            polly.synthesizeSpeech(params, (err, data) => {
                if (err) {
                    if (callback) callback('Cannot get answer: ' + JSON.stringify(err), text, language, volume, 0);
                } else if (data) {
                    if (data.AudioStream instanceof Buffer) {
                        libs.fs.writeFile(MP3FILE, data.AudioStream, 'binary', err => {
                            if (err) {
                                if (callback) callback('File error: ' + err, text, language, volume, 0);
                            } else {
                                that.getLength(MP3FILE, (error, seconds) => {
                                    if (callback) callback(error, text, language, volume, seconds);
                                });
                            }
                        });
                    } else {
                        if (callback) callback('Answer in invalid format: ' + (data ? data.toString() : 'null'), text, language, volume, 0);
                    }
                }
            });
        } catch (e) {
            if (callback) callback(e.toString(), text, language, volume);
        }
    }

    function sayItGetSpeechCloud(text, language, volume, callback) {
        if (!libs.https) libs.https = require('https');
        if (!libs.fs)    libs.fs    = require('fs');

        if (!appkey) {
            adapter.getForeignObject('system.adapter.' + adapter.config.cloud, (err, obj) => {
                appkey   = obj && obj.native && obj.native.apikey ? obj.native.apikey : 'error';
                cloudUrl = (obj && obj.native && obj.native.cloudUrl) || '';
                if (appkey && appkey.match(/^@pro_/)) {
                    if (cloudUrl.indexOf('https://iobroker.pro:')  === -1 &&
                        cloudUrl.indexOf('https://iobroker.info:') === -1) {
                        cloudUrl = 'https://iobroker.pro:10555';
                    }
                }
                cloudUrl = cloudUrl.replace(/https\:\/\//, '').replace(/:\d+/, '');
                sayItGetSpeechCloud(text, language, volume, callback);
            });
            return;
        }

        if (appkey === 'error') {
            if (callback) callback('No app key found in "' + adapter.config.cloud + '".', text, language, volume, 0);
            return;
        }

        try {
            let type = 'text';
            if (text.match(/<[-+\w\s'"=]+>/)) {
                if (!text.match(/^<speak>/)) text = '<speak>' + text + '</speak>';
                type = 'ssml';
            }
            const postData = JSON.stringify({
                Text:     text,
                appkey:   appkey,
                TextType: type,
                VoiceId:  sayitEngines[language].ename
            });

            const postOptions = {
                host: cloudUrl,
                port: 443,
                path: '/polly/',
                method: 'POST',
                headers: {
                    'Content-Type':   'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            // Set up the request
            const postReq = libs.https.request(postOptions, (res) => {
                adapter.log.debug('Status code: ' + res.statusCode);
                if (res.statusCode === 200) {
                    res.setEncoding('binary');
                } else {
                    res.setEncoding('utf8');
                }
                let data = [];
                res.on('data', chunk => {
                    if (typeof chunk === 'string') chunk = new Buffer(chunk, 'binary');
                    data.push(chunk);
                });

                res.on('error', error => {
                    if (callback) {
                        callback('Cannot read: ' + error, text, language, volume, 0);
                        callback = null;
                    }
                });

                res.on('end', () => {
                    data = Buffer.concat(data);
                    if (data instanceof Buffer && data.length > 500) {
                        libs.fs.writeFile(MP3FILE, data, 'binary', err => {
                            if (err) {
                                if (callback) callback('File error: ' + err, text, language, volume, 0);
                            } else {
                                that.getLength(MP3FILE, (error, seconds) => {
                                    if (callback) callback(error, text, language, volume, seconds);
                                });
                            }
                        });
                    } else {
                        if (callback) callback('Answer in invalid format: ' + (data ? data.toString().substring(0, 100) : 'null'), text, language, volume, 0);
                    }
                });
            });

            // post the data
            postReq.write(postData);
            postReq.end();
        } catch (e) {
            if (callback) callback(e.toString(), text, language, volume);
        }
    }

    function sayItGetSpeechPicoTTS(text, language, volume, callback) {
        if (!libs.fs)   libs.fs   = require('fs');
        if (!libs.exec) libs.exec = require('child_process').exec;

        try {
            const cmd = 'pico2wave -l ' + language + ' -w ' + __dirname + '/say.wav "' + text + '"';
            libs.exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    if (callback) callback('Cannot create (pico2wave) "say.wav": ' + error, text, language, volume);
                } else {
                    libs.exec('lame ' +  __dirname + '/say.wav ' + MP3FILE, (error, stdout, stderr) => {
                        if (callback) callback(error ? 'Cannot create (lame) "say.mp3": ' + error : null, text, language, volume);
                    });
                }
            });
        } catch (e) {
            if (callback) callback(e.toString(), text, language, volume);
        }
    }

    this.getLength = function (fileName, callback) {
        libs.fs = libs.fs || require('fs');

        // create a new parser from a node ReadStream
        if (fileName === adapter.config.announce && adapter.config.annoDuration) {
            if (callback) callback(null, adapter.config.annoDuration - 1);
            return;
        }

        if (libs.fs.existsSync(fileName)) {
            try {
                const stat = libs.fs.statSync(fileName);
                const size = stat.size;
                if (callback) callback(null, Math.ceil(size / 4096));
            } catch (e) {
                adapter.log.warn('Cannot read length of file ' + fileName);
                if (callback) callback(null, 0);
            }
        } else {
            if (callback) callback(null, 0);
        }
    };

    const ENGINES = {
        'google':   sayItGetSpeechGoogle,
        'yandex':   sayItGetSpeechYandex,
        'acapela':  sayItGetSpeechAcapela,
        'polly':    sayItGetSpeechPolly,
        'cloud':    sayItGetSpeechCloud,
        'PicoTTS':  sayItGetSpeechPicoTTS
    };

    this.sayItGetSpeech = function (text, language, volume, callback) {
        if (adapter.config.cache) {
            libs.path = libs.path || require('path');
            const md5filename = libs.path.join(options.cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.mp3');
            if (libs.fs.existsSync(md5filename)) {
                let cacheFileValid = true;
                if (adapter.config.cacheExpiryDays) {
                    const fileStat = libs.fs.statSync(md5filename);
                    if (fileStat.ctime && (new Date().getTime()-new Date(fileStat.ctime).getTime() > adapter.config.cacheExpiryDays*1000*60*60*24)) {
                        cacheFileValid = false;
                        adapter.log.info('Cached File expired, remove and re-generate');
                        libs.fs.unlinkSync(md5filename);
                    }
                }
                if (cacheFileValid) {
                    that.getLength(md5filename, (error, seconds) => {
                        if (callback) callback(error, md5filename, language, volume, seconds);
                    });
                    return;
                }
            }
        }

        if (sayitEngines[language] && sayitEngines[language].engine) {
            if (!sayitEngines[language].ssml) text = text.replace(/<\/?[-+\w\s'"=]+>/g, ''); // remove SSML

            if (!ENGINES[sayitEngines[language].engine]) {
                callback && callback('Engine ' + sayitEngines[language].engine + ' not yet supported.', text, language, volume, 0);
            } else {
                ENGINES[sayitEngines[language].engine](text, language, volume,
                    (error, _text, _language, _volume, seconds) => cacheFile(error, _text, _language, _volume, seconds, callback));
            }
        } else {
            sayItGetSpeechGoogle(text, language, volume,
                (error, _text, _language, _volume, seconds) => cacheFile(error, _text, _language, _volume, seconds, callback));
        }
    };

    return this;
}

module.exports = Text2Speech;
