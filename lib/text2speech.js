'use strict';

function Text2Speech(adapter, libs, options, sayIt) {
    const that         = this;
    const engines      = require('../lib/definitions.js').engines;
    const googleTTS    = require('google-tts-api');
    const sayitEngines = engines;
    const MP3FILE      = `${adapter.config.dataDir}/${adapter.namespace}.say.${options.outFileExt}`;
    let appkey         = null;
    let cloudUrl       = null;
    let polly          = null;
    let yandexCloudIAM = null;


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

    async function sayItGetSpeechGoogle(text, language, volume, callback) {
        if (typeof volume === 'function') {
            callback = volume;
            volume = undefined;
        }

        if (!text.length) {
            return callback && callback(null, '', language, volume, 0);
        }

        /*if (text.length > 70) {
            const parts = splitText(text);
            for (let t = 1; t < parts.length; t++) {
                sayIt(parts[t], language, volume);
            }
            text = parts[0];
        }*/

            switch (adapter.config.language) {
                case 'en-EN':
                    language = 'en';
                    break;
                case 'de-DE':
                    language = 'de';
                    break;
                case 'pl-PL':
                    language = 'pl';
                    break;
                case 'uk-UK':
                    language = 'uk';
                    break;
                case 'ru-RU':
                    language = 'ru';
                    break;
                case 'it-IT':
                    language = 'it';
                    break;
                case 'pt-PT':
                    language = 'pt';
                    break;
                case 'es-ES':
                    language = 'es';
                    break;
                case 'fr-FR':
                    language = 'fr';
                    break;
                case 'nl-NL':
                    language = 'nl';
                    break;
                case 'zh-CN':
                    language = 'zh-CN';
                    break;
            }


        libs.fs  = libs.fs  || require('fs');

        const options = {
            lang: language,
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
        }

        // get base64 text
        let audio;
        if (text.length > 200) {
            audio = await googleTTS.getAllAudioBase64(text, options);
        } else {
            audio = await googleTTS.getAudioBase64(text, options);
        }
        console.log(typeof audio);
        if (audio) {
            let buf;
            if(typeof audio === 'string'){
                buf = Buffer.from(audio, 'base64');
            } else {
                let input = [];
                for (let i in audio){
                    input.push(Buffer.from(audio[i].base64, 'base64'));
                }
                buf = Buffer.concat(input);
            }

            //console.log(audio);
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
        } else {
            callback && callback('Cannot get file: ', text, language, volume, 0);
        }
    }

    function yandexGetIAM(AuthToken) {
        let lastAttempt = 0;
        let IAM = '';
        return function (callback) {
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
                VoiceId:      adapter.config.voice
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

    async function sayItGetSpeechCloud(text, language, volume, callback) {
        libs.https = libs.https || require('https');
        libs.fs    = libs.fs    || require('fs');

        if (!appkey) {
            appkey   = adapter.config.cloudAPIkey ? adapter.config.cloudAPIkey : 'error';
            cloudUrl = 'https://iobroker.net:10555';
            if (appkey && appkey.match(/^@pro_/)) {
                if (!cloudUrl.includes('https://iobroker.pro:') &&
                    !cloudUrl.includes('https://iobroker.info:')) {
                    cloudUrl = 'https://iobroker.pro:10555';
                }
            }
            cloudUrl = cloudUrl.replace(/https:\/\//, '').replace(/:\d+/, '');
            sayItGetSpeechCloud(text, language, volume, callback);
        }

        if (appkey === 'error') {
            callback && callback(`No app key found in "${adapter.config.cloudAPIkey}".`, text, language, volume, 0);
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
                VoiceId:  adapter.config.voice
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
                        chunk = Buffer.from(chunk, 'binary');
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

    function sayItGetSpeechCoquiTTS(text, language, volume, callback) {
        libs.fs   = libs.fs   || require('fs');
        libs.exec = libs.exec || require('child_process').exec;

        switch(language){
            case 'en-EN':
                language = 'en'
                break;
            case 'es-ES':
                language = 'es'
                break;
            case 'fr-FR':
                language = 'fr'
                break;
            case 'de-DE':
                language = 'de'
                break;
            case 'nl-NL':
                language = 'nl'
                break;
            case 'ja-JA':
                language = 'ja'
                break;
        }
        try {
            let cmd;
                if(adapter.config.vocoderName === 'default'){
                    cmd = `tts --text ". ${text} ." --model_name  tts_models/${language}/${adapter.config.modelName.replace(' ', '/')} --out_path ${__dirname}/say.wav`;
                }else{
                    if(adapter.config.vocoder === 'libri-tts wavegrad' || adapter.config.vocoder === 'libri-tts fullband-melgan'){
                        language = 'universal';
                    }
                    cmd = `tts --text ". ${text} ." --model_name  tts_models/${language}/${adapter.config.modelName.replace(' ', '/')} --vocoder_name vocoder_models/${language}/${adapter.config.vocoder.replace(' ', '/')} --out_path ${__dirname}/say.wav`;
                }
            libs.exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    callback && callback('Cannot create (tts2wave) "say.wav": ' + error, text, language, volume);
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
        'yandexCloud':   sayItGetSpeechYandexCloud,
        'polly':    sayItGetSpeechPolly,
        'cloud':    sayItGetSpeechCloud,
        'PicoTTS':  sayItGetSpeechPicoTTS,
        'coquiTTS': sayItGetSpeechCoquiTTS
    };

    this.sayItGetSpeech = async function (text, language, volume, callback) {
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
        const engine = await getArrayMemberByValue(sayitEngines, 'value', adapter.config.engine);
        if (engine) {
            if (!engine.ssml) text = text.replace(/<\/?[-+\w\s'"=]+>/g, ''); // remove SSML

            if (!ENGINES[engine.value]) {
                callback && callback(`Engine ${engine.label} not yet supported.`, text, language, volume, 0);
            } else {
                ENGINES[engine.value](text, language, volume,
                    (error, _text, _language, _volume, seconds) => cacheFile(error, _text, language, _volume, seconds, callback));
            }
        } else {
            sayItGetSpeechGoogle(text, language, volume,
                (error, _text, _language, _volume, seconds) => cacheFile(error, _text, language, _volume, seconds, callback));
        }
    };

    return this;
}

/**
 *
 * @param {array} array
 * @param {string} key
 * @param {string} value
 * @returns {Promise<object>}
 */
async function getArrayMemberByValue(array, key, value){
    for(let i in array){
        if(array[i][key] === value){
            return array[i];
        }
    }
}

module.exports = Text2Speech;
