'use strict';

function Text2Speech(adapter, libs, options, sayIt) {
    const that         = this;
    const engines      = require('../admin/engines.js');
    const googleTTS    = require('google-tts-api');
    const sayitEngines = engines.sayitEngines;
    const MP3FILE      = `${adapter.config.dataDir}/${adapter.namespace}.say.${options.outFileExt}`;
    let appkey         = null;
    let cloudUrl       = null;
    let polly          = null;
    let yandexCloudIAM = null;

    function splitText(text, max) {
        max = max || 70;
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

        libs.fs.copyFile(source, dest, err => {
            if (err) {
                return callback && callback(`Cannot copy file "${source}" to "${dest}": ${err}`, '', '', volume);
            } else
            if (callback) {
                adapter.log.info(`Copied file "${source}" to "${dest}"`);
                callback(null, text, language, volume);
            }
        });
        /*
        const input  = libs.fs.createReadStream(source);               // Input stream
        const output = libs.fs.createWriteStream(dest);                // Output stream

        input.on('data',  d =>output.write(d));
        // Copy in to out
        input.on('error', err => {
            if (callback) {
                callback('Cannot copy file "' + source + '" to "' + dest + '": ' + e, '', '', volume);
                callback = null;
            }              // And notify callback
        });
        output.on('error', err => {
            if (callback) {
                callback('Cannot copy file "' + source + '" to "' + dest + '": ' + e, '', '', volume);
                callback = null;
            }              // And notify callback
        });

        // Raise errors
        input.on('end', () => {                               // When input ends
            output.end();                                            // close output
            if (callback) {
                adapter.log.info('Copied file "' + source + '" to "' + dest + '"');
                callback(null, text, language, volume);          // And notify callback
                callback = null;
            }
        });
        */
    }

    function cacheFile(error, text, language, volume, seconds, callback) {
        libs.fs   = libs.fs   || require('fs');
        libs.path = libs.path || require('path');

        if (!error) {
            if (adapter.config.cache) {
                const md5filename = libs.path.join(options.cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.' + options.outFileExt);

                const stat = libs.fs.statSync(MP3FILE);
                if (stat.size < 100) {
                    adapter.log.warn('Received file is too short: ' + libs.fs.readFileSync(MP3FILE).toString());
                } else {
                    adapter.log.debug('Caching File ' + md5filename + ' for "' + language + ';' + text + '" now');
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

        if (!text.length) {
            return callback && callback(null, '', language, volume, 0);
        }

        if (text.length > 70) {
            const parts = splitText(text);
            for (let t = 1; t < parts.length; t++) {
                sayIt(parts[t], language, volume);
            }
            text = parts[0];
        }

        language = language || adapter.config.engine;
        libs.fs  = libs.fs  || require('fs');

        // get base64 text
        googleTTS
            .getAudioBase64(text, {
                lang: language,
                slow: false,
                host: 'https://translate.google.com',
                timeout: 10000,
            })
            .then(data => {
                const buf = Buffer.from(data, 'base64');

                if (buf.length < 100) {
                    return callback && callback('Cannot get file: received file is too short', text, language, volume, 0);
                } else
                if (buf.toString().includes('302 Moved')) {
                    return callback && callback(`http://${options.host}${options.path}\nCannot get file: ${buf.toString()}`, text, language, volume, 0);
                } else {
                    try {
                        libs.fs.writeFileSync(MP3FILE, buf, 'binary');
                    } catch (err) {
                        return callback && callback('File error: ' + err, text, language, volume, 0);
                    }
                    that.getLength(MP3FILE, (error, seconds) =>
                        callback && callback(error, text, language, volume, seconds));
                }
            }) // base64 text
            .catch(error =>
                callback && callback('Cannot get file:' + error, text, language, volume, 0));
    }

    function sayItGetSpeechAcapela(text, language, volume, callback) {
        const options = {
            host: 'vaassl3.acapela-group.com',
            path: '/Services/Synthesizer?prot_vers=2&req_voice=' + language + '22k&cl_env=FLASH_AS_3.0&req_text=%5Cvct%3D100%5C+%5Cspd%3D180%5C+' +
            encodeURI(text) + '&req_asw_type=STREAM&cl_vers=1-30&req_err_as_id3=yes&cl_login=ACAPELA_BOX&cl_app=PROD&cl_pwd=0g7znor2aa'
        };

        libs.https = libs.https || require('https');

        let soundData = '';
        libs.https.get(options, res => {
            res.setEncoding('binary');

            res.on('data', chunk => soundData += chunk);

            res.on('end', () => {
                if (soundData.length < 100) {
                    return callback && callback('Cannot get file: received file is too short', text, language, volume);
                } else {
                    try {
                        libs.fs.writeFileSync(MP3FILE, soundData, 'binary');
                    } catch (err) {
                        return callback && callback('File error:' + err, text, language, volume);
                    }
                    callback && callback(null, text, language, volume);
                }
            });
        }).on('error', err => {
            soundData = '';
            callback && callback('Cannot get file:' + err, text, language, volume);
        });
    }
    /**/

    function yandexGetIAM(AuthToken) {
        let lastAttempt = 0;
        let IAM = '';
        return function (callback) {
            const querystring = require('querystring');
            const https = require('https');
            const postData = {
                yandexPassportOauthToken: AuthToken,
            };
            const postBody = JSON.stringify(postData);
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': postBody.length
                },
                method: 'POST',
                host: 'iam.api.cloud.yandex.net',
                path: '/iam/v1/tokens'
            };

            const now = Date.now();
            if (now - lastAttempt > 36000000 || IAM === '') {
                lastAttempt = now;
                const req = https.request(options, res => {
                    adapter.log.debug('Requesting new IAM token...');
                    let body = '';
                    res.on('data', chunk => body += chunk);

                    res.on('end', () => {
                        try {
                            IAM = JSON.parse(body).iamToken;
                            adapter.log.debug('IAM Received');
                            callback && callback(IAM);
                        } catch (e) {
                            adapter.log.error("Response parse error");
                            callback('');
                        }
                    });
                }).on('error', err => adapter.log.error("Error: " + err));

                req.on('error', error => adapter.log.error("Error: " + error));

                req.write(postBody);
                req.end();
            } else {
                adapter.log.info('we still have actual IAM');
                callback(IAM);
            }
        };
    }

    function sayItGetSpeechYandexCloud(text, language, volume, callback) {
        if (language === 'ru' || language === 'ru_YA' || language === 'ru_YA_CLOUD') {
            language = 'ru-RU';
        }

        const querystring = require('querystring');
        libs.https = libs.https || require('https');

        if (!yandexCloudIAM) {
            yandexCloudIAM = yandexGetIAM(adapter.config.key);
            adapter.log.debug('Get IAM token for ' + adapter.config.key);
        }

        yandexCloudIAM(IAM => {
            let voice = adapter.config.voice || '';

            const postData = {
                voice: voice.replace(' Premium', ''),
                emotion: adapter.config.emotion,
                folderId: adapter.config.folderID,
                text
            };

            const postBody = querystring.stringify(postData);

            const options = {
                headers: {
                    'Authorization': 'Bearer ' + IAM,
                    //'Transfer-Encoding': 'chunked',
                    //'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postBody.length
                },
                method: 'POST',
                host: 'tts.api.cloud.yandex.net',
                path: '/speech/v1/tts:synthesize'
            };

            let soundData = '';
            const req = libs.https.request(options, res => {
                res.setEncoding('binary');
                adapter.log.debug(res.statusCode);
                adapter.log.debug(JSON.stringify(res.headers));

                res.on('data', chunk => soundData += chunk);

                res.on('end', () => {
                    if (soundData.length < 100) {
                        return callback && callback('Cannot get file: received file is too short', text, language, volume, 0);
                    }
                    try {
                        libs.fs.writeFileSync(MP3FILE, soundData, 'binary');
                    } catch(err) {
                        return callback && callback('File error: ' + err, text, language, volume, 0);
                    }
                    callback && callback(null, text, language, volume);
                });
            }).on('error', err => {
                soundData = '';
                callback && callback('Cannot get file: ' + err, text, language, volume);
            });

            req.on('error', error => adapter.log.error(error));

            try {
                req.write(postBody);
                req.end();
            } catch(e) {
                adapter.log.error('Cannot connect to Yandex Cloud ' );
            }
        });
    }

    function sayItGetSpeechYandex(text, language, volume, callback) {
        if (language === 'ru' || language === 'ru_YA') {
            language = 'ru-RU';
        }

        libs.https = libs.https || require('https');

        /*emotion: good, neutral, evil, mixed
        drunk:   true, false
        ill:     true, false
        robot:   true, false
        */
        const options = {
            host: 'tts.voicetech.yandex.net',
            path: `/generate?lang=${language}&format=mp3&speaker=${adapter.config.voice}&key=${adapter.config.key}&text=${encodeURI(text.trim())}`
        };

        if (adapter.config.emotion && adapter.config.emotion !== 'none') options.path += '&emotion=' + adapter.config.emotion;
        if (adapter.config.drunk === 'true' || adapter.config.drunk === true) options.path += '&drunk=true';
        if (adapter.config.ill   === 'true' || adapter.config.ill   === true) options.path += '&ill=true';
        if (adapter.config.robot === 'true' || adapter.config.robot === true) options.path += '&robot=true';

        let soundData = '';
        libs.https.get(options, res => {
            res.setEncoding('binary');

            res.on('data', chunk => soundData += chunk);

            res.on('end', () => {
                if (soundData.length < 100) {
                    return callback && callback('Cannot get file: received file is too short', text, language, volume, 0);
                }

                try {
                    libs.fs.writeFileSync(MP3FILE, soundData, 'binary');
                } catch (err) {
                    return callback && callback('File error: ' + err, text, language, volume, 0);
                }
                callback && callback(null, text, language, volume);
            });
        }).on('error', err => {
            soundData = '';
            callback && callback('Cannot get file: ' + err, text, language, volume);
        });
    }

    function sayItGetSpeechPolly(text, language, volume, callback) {
        libs.aws = libs.aws || require('aws-sdk');
        libs.fs  = libs.fs  || require('fs');

        try {
            polly = polly || new libs.aws.Polly({
                accessKeyId:     adapter.config.accessKey,
                secretAccessKey: adapter.config.secretKey,
                region:          adapter.config.region
            });
            let type = 'text';
            if (text.match(/<[-+\w\s'"=]+>/)) {
                if (!text.match(/^<speak>/)) {
                    text = `<speak>${text}</speak>`;
                }
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
                    callback && callback('Cannot get answer: ' + JSON.stringify(err), text, language, volume, 0);
                } else if (data) {
                    if (data.AudioStream instanceof Buffer) {
                        try {
                            libs.fs.writeFileSync(MP3FILE, data.AudioStream, 'binary');
                        } catch (err) {
                            return callback && callback('File error: ' + err, text, language, volume, 0);
                        }
                        that.getLength(MP3FILE, (error, seconds) =>
                            callback && callback(error, text, language, volume, seconds));
                    } else {
                        callback && callback('Answer in invalid format: ' + (data ? data.toString() : 'null'), text, language, volume, 0);
                    }
                }
            });
        } catch (e) {
            callback && callback(e.toString(), text, language, volume);
        }
    }

    function sayItGetSpeechCloud(text, language, volume, callback) {
        libs.https = libs.https || require('https');
        libs.fs    = libs.fs    || require('fs');

        if (!appkey) {
            adapter.getForeignObject('system.adapter.' + adapter.config.cloud, (err, obj) => {
                appkey   = obj && obj.native && obj.native.apikey ? obj.native.apikey : 'error';
                cloudUrl = (obj && obj.native && obj.native.cloudUrl) || '';
                if (appkey && appkey.match(/^@pro_/)) {
                    if (!cloudUrl.includes('https://iobroker.pro:') &&
                        !cloudUrl.includes('https://iobroker.info:')) {
                        cloudUrl = 'https://iobroker.pro:10555';
                    }
                }
                cloudUrl = cloudUrl.replace(/https:\/\//, '').replace(/:\d+/, '');
                sayItGetSpeechCloud(text, language, volume, callback);
            });
            return;
        }

        if (appkey === 'error') {
            callback && callback(`No app key found in "${adapter.config.cloud}".`, text, language, volume, 0);
            return;
        }

        try {
            let type = 'text';
            if (text.match(/<[-+\w\s'"=]+>/)) {
                if (!text.match(/^<speak>/)) {
                    text = `<speak>${text}</speak>`;
                }
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
                    if (typeof chunk === 'string') {
                        chunk = new Buffer(chunk, 'binary');
                    }
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
                        try {
                            libs.fs.writeFileSync(MP3FILE, data, 'binary');
                        } catch (err) {
                            return callback && callback('File error: ' + err, text, language, volume, 0);
                        }
                        that.getLength(MP3FILE, (error, seconds) =>
                            callback && callback(error, text, language, volume, seconds));
                    } else {
                        callback && callback('Answer in invalid format: ' + (data ? data.toString().substring(0, 100) : 'null'), text, language, volume, 0);
                    }
                });
            });

            // post the data
            postReq.write(postData);
            postReq.end();
        } catch (e) {
            callback && callback(e.toString(), text, language, volume);
        }
    }

    function sayItGetSpeechPicoTTS(text, language, volume, callback) {
        libs.fs   = libs.fs   || require('fs');
        libs.exec = libs.exec || require('child_process').exec;

        try {
            const cmd = `pico2wave -l ${language} -w ${__dirname}/say.wav "${text}"`;
            libs.exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    callback && callback('Cannot create (pico2wave) "say.wav": ' + error, text, language, volume);
                } else {
                    libs.exec('lame ' +  __dirname + '/say.wav ' + MP3FILE, (error, stdout, stderr) =>
                        callback && callback(error ? 'Cannot create (lame) "say.mp3": ' + error : null, text, language, volume));
                }
            });
        } catch (e) {
            callback && callback(e.toString(), text, language, volume);
        }
    }

    this.getLength = function (fileName, callback) {
        libs.fs = libs.fs || require('fs');

        // create a new parser from a node ReadStream
        if (fileName === adapter.config.announce && adapter.config.annoDuration) {
            return callback && callback(null, adapter.config.annoDuration - 1);
        }

        if (libs.fs.existsSync(fileName)) {
            try {
                const stat = libs.fs.statSync(fileName);
                const size = stat.size;
                callback && callback(null, Math.ceil(size / 4096));
            } catch (e) {
                adapter.log.warn('Cannot read length of file ' + fileName);
                callback && callback(null, 0);
            }
        } else {
            callback && callback(null, 0);
        }
    };

    const ENGINES = {
        'google':   sayItGetSpeechGoogle,
        'yandex':   sayItGetSpeechYandex,
        'yandexCloud':   sayItGetSpeechYandexCloud,
        'acapela':  sayItGetSpeechAcapela,
        'polly':    sayItGetSpeechPolly,
        'cloud':    sayItGetSpeechCloud,
        'PicoTTS':  sayItGetSpeechPicoTTS
    };

    this.sayItGetSpeech = function (text, language, volume, callback) {
        if (adapter.config.cache) {
            libs.path = libs.path || require('path');
            const md5filename = libs.path.join(options.cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.' + options.outFileExt);
            if (libs.fs.existsSync(md5filename)) {
                let cacheFileValid = true;
                if (adapter.config.cacheExpiryDays) {
                    const fileStat = libs.fs.statSync(md5filename);
                    if (fileStat.ctime && (Date.now() - new Date(fileStat.ctime).getTime() > adapter.config.cacheExpiryDays * 1000 * 60 * 60 * 24)) {
                        cacheFileValid = false;
                        adapter.log.info('Cached File expired, remove and re-generate');
                        libs.fs.unlinkSync(md5filename);
                    }
                }
                if (cacheFileValid) {
                    return that.getLength(md5filename, (error, seconds) =>
                        callback && callback(error, md5filename, language, volume, seconds));
                }
            }
            adapter.log.debug(`Cache File ${md5filename} for "${language};${text}" not found`);
        }

        if (sayitEngines[language] && sayitEngines[language].engine) {
            if (!sayitEngines[language].ssml) text = text.replace(/<\/?[-+\w\s'"=]+>/g, ''); // remove SSML

            if (!ENGINES[sayitEngines[language].engine]) {
                callback && callback(`Engine ${sayitEngines[language].engine} not yet supported.`, text, language, volume, 0);
            } else {
                ENGINES[sayitEngines[language].engine](text, language, volume,
                    (error, _text, _language, _volume, seconds) => cacheFile(error, _text, language, _volume, seconds, callback));
            }
        } else {
            sayItGetSpeechGoogle(text, language, volume,
                (error, _text, _language, _volume, seconds) => cacheFile(error, _text, language, _volume, seconds, callback));
        }
    };

    return this;
}

module.exports = Text2Speech;
