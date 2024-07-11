'use strict';
const fs           = require('node:fs');
const mp3Duration  = require('mp3-duration');
const engines      = require('../admin/engines.js');
const sayitEngines = engines.sayitEngines;
const { URLSearchParams } = require('node:url');
const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');

let cp;
let googleTTS;
let axios;

class Text2Speech {
    constructor(adapter, options) {
        this.adapter           = adapter;
        this.options           = options;
        this.addToQueue        = options.addToQueue;
        this.getCachedFileName = options.getCachedFileName;
        this.isCached          = options.isCached;
        this.MP3FILE           = options.MP3FILE;
        this.polly             = null;
    }

    static splitText(text, max) {
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
                    if (_parts[i] && (`${result[i] || ''} ${_parts[w]}`).length > max) {
                        i++;
                    }
                    if (!result[i]) {
                        result.push(_parts[w]);
                    } else {
                        result[i] += ` ${_parts[w]}`;
                    }
                }
            }
            return result;
        } else {
            return [text];
        }
    }

    cacheFile(text, language, md5filename) {
        if (this.adapter.config.cache) {
            const stat = fs.statSync(this.MP3FILE);
            if (stat.size < 100) {
                this.adapter.log.warn(`Received file is too short: ${fs.readFileSync(this.MP3FILE).toString()}`);
            } else {
                this.adapter.log.debug(`Caching File ${md5filename} for "${language};${text}" now`);
                try {
                    fs.copyFileSync(this.MP3FILE, md5filename);
                } catch (error) {
                    this.adapter.log.error(error)
                }
            }
        }
    }

    async exec(cmd, args, cwd) {
        cp = cp || require('node:child_process');
        return new Promise((resolve, reject) => {
            try {
                const ls = cp.exec(`${cmd}${args && args.length ? ` ${args.join(' ')}` : ''}`, {cwd}, code => {
                    if (!code) {
                        resolve && resolve();
                    } else {
                        reject && reject(`Exit code: ${code}`);
                    }
                    reject = null;
                    resolve = null;
                });

                ls.on('error', e =>
                    this.adapter.log.error(`sayIt.play: there was an error while playing the file: ${e.toString()}`));

                ls.stdout.on('data', data => this.adapter.log.debug(`stdout: ${data}`));
                ls.stderr.on('data', data => this.adapter.log.error(`stderr: ${data}`));
            } catch (e) {
                reject && reject(e.toString());
                reject = null;
                resolve = null;
            }
        });
    }

    async sayItGetSpeechGoogle(text, language, volume, testOptions) {
        if (!text.length) {
            throw new Error('No text to speak');
        }
        googleTTS = googleTTS || require('google-tts-api');

        if (text.length > 70) {
            const parts = Text2Speech.splitText(text);
            for (let t = 1; t < parts.length; t++) {
                this.addToQueue(parts[t], language, volume, testOptions);
            }
            text = parts[0];
        }

        language = language || (testOptions && testOptions.engine) || this.adapter.config.engine;

        // get base64 text
        const data = await googleTTS.getAudioBase64(text, {
            lang: language,
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
        });

        const buf = Buffer.from(data, 'base64');
        if (buf.length < 100) {
            throw new Error('received file is too short');
        } else
        if (buf.toString().includes('302 Moved')) {
            throw new Error(`https://translate.google.com\nCannot get file: ${buf.toString()}`);
        } else {
            fs.writeFileSync(this.MP3FILE, buf, 'binary');
        }
    }

    async sayItGetSpeechYandexCloud(text, language, _, testOptions) {
        if (language === 'ru' || language === 'ru_YA' || language === 'ru_YA_CLOUD') {
            language = 'ru-RU';
        }
        axios = axios || require('axios');
        const yandexCloudVoice = (testOptions && testOptions.yandexCloudVoice) || this.adapter.config.yandexCloudVoice || '';
        const yandexKey = (testOptions && testOptions.yandexKey) || this.adapter.config.yandexKey;
        const yandexEmotion = (testOptions && testOptions.yandexEmotion) || this.adapter.config.yandexEmotion;
        const yandexFolderID = (testOptions && testOptions.yandexFolderID) || this.adapter.config.yandexFolderID;

        const params = new URLSearchParams();
        params.append('text', text);
        params.append('voice', yandexCloudVoice.replace(' Premium', ''));
        params.append('folderId', yandexFolderID || '');
        if (yandexEmotion !== 'none' && yandexEmotion) {
            params.append('emotion', yandexEmotion);
        }
        params.append('lang', language);

        const response = await axios.post(`https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize`, params, {
            headers: {
                'Authorization': `Api-Key ${yandexKey}`,
            },
            responseType: 'arraybuffer',
        });

        if (!response.data || response.data.length < 100) {
            throw new Error('Cannot get file: received file is too short');
        }
        fs.writeFileSync(this.MP3FILE, response.data, 'binary');
    }

    async sayItGetSpeechYandex(text, language, _, testOptions) {
        if (language === 'ru' || language === 'ru_YA') {
            language = 'ru-RU';
        }

        /*emotion: good, neutral, evil, mixed
        drunk:   true, false
        ill:     true, false
        robot:   true, false
        */
        const yandexVoice = (testOptions && testOptions.yandexVoice) || this.adapter.config.yandexVoice;
        const yandexKey = (testOptions && testOptions.yandexKey) || this.adapter.config.yandexKey;
        const yandexEmotion = (testOptions && testOptions.yandexEmotion) || this.adapter.config.yandexEmotion;
        const yandexDrunk = (testOptions && testOptions.yandexDrunk !== undefined ? testOptions.yandexDrunk : this.adapter.config.yandexDrunk) || this.adapter.config.yandexDrunk;
        const yandexIll = (testOptions && testOptions.yandexIll !== undefined ? testOptions.yandexIll : this.adapter.config.yandexIll) || this.adapter.config.yandexIll;
        const yandexRobot = (testOptions && testOptions.yandexRobot !== undefined ? testOptions.yandexRobot : this.adapter.config.yandexRobot) || this.adapter.config.yandexRobot;

        let url = `https://tts.voicetech.yandex.net/generate?lang=${language}&format=mp3&speaker=${yandexVoice}&key=${yandexKey}&text=${encodeURI(text.trim())}`;

        if (yandexEmotion && yandexEmotion !== 'none') {
            url += `&emotion=${yandexEmotion}`;
        }
        if (yandexDrunk === 'true' || yandexDrunk === true) {
            url += '&drunk=true';
        }
        if (yandexIll   === 'true' || yandexIll   === true) {
            url += '&ill=true';
        }
        if (yandexRobot === 'true' || yandexRobot === true) {
            url += '&robot=true';
        }
        axios = axios || require('axios');
        const response = await axios.get(url, {responseType: 'arraybuffer'});
        if (!response.data || response.data.length < 100) {
            throw new Error('Cannot get file: received file is too short');
        }
        fs.writeFileSync(this.MP3FILE, response.data, 'binary');
    }

    async sayItGetSpeechPolly(text, language, _, testOptions) {
        let _polly;
        if (testOptions) {
            _polly = new PollyClient({
                region: (testOptions && testOptions.awsRegion) || this.adapter.config.awsRegion,
                credentials: {
                    accessKeyId: (testOptions && testOptions.awsAccessKey) || this.adapter.config.awsAccessKey,
                    secretAccessKey: (testOptions && testOptions.awsSecretKey) || this.adapter.config.awsSecretKey,
                },
            });
        } else {
            this.polly = this.polly || new PollyClient({
                region: this.adapter.config.awsRegion,
                credentials: {
                    accessKeyId: this.adapter.config.awsAccessKey,
                    secretAccessKey: this.adapter.config.awsSecretKey,
                },
            });

            _polly = this.polly;
        }

        let type = 'text';
        if (text.match(/<[-+\w\s'"=]+>/)) {
            if (!text.match(/^<speak>/)) {
                text = `<speak>${text}</speak>`;
            }
            type = 'ssml';
        }

        const pParams = {
            OutputFormat: 'mp3',
            Text: text,
            TextType: type || 'text',
            VoiceId: sayitEngines[language].ename || 'Marlene',
            Engine:  sayitEngines[language].neural ? 'neural' : undefined,
        };
        const command = new SynthesizeSpeechCommand(pParams);

        const data = await _polly.send(command);
        const byteArray = data && data.AudioStream && (await data.AudioStream.transformToByteArray());

        // process data.
        if (!byteArray || !byteArray.length) {
            throw new Error('No data received');
        } else {
            fs.writeFileSync(this.MP3FILE, Buffer.from(byteArray), 'binary');
        }
    }

    async sayItGetSpeechCoquiTTS(text, language, _, testOptions) {
        language = language.substring(0, 2);
        let cmd;
        const coquiVocoder = (testOptions && testOptions.coquiVocoder) || this.adapter.config.coquiVocoder;
        if (coquiVocoder === 'default') {
            cmd = `tts --text ". ${text} ." --model_name  tts_models/${language}/${coquiVocoder.replace(' ', '/')} --out_path ${__dirname}/say.wav`;
        } else {
            if (coquiVocoder === 'libri-tts wavegrad' || coquiVocoder === 'libri-tts fullband-melgan') {
                language = 'universal';
            }
            cmd = `tts --text ". ${text} ." --model_name  tts_models/${language}/${coquiVocoder.replace(' ', '/')} --vocoder_name vocoder_models/${language}/${coquiVocoder.replace(' ', '/')} --out_path ${__dirname}/say.wav`;
        }
        try {
            await this.exec(cmd);
        } catch (e) {
            throw new Error(`Cannot create (coqui) "say.wav": ${e}`);
        }
        try {
            await this.exec(`lame ${__dirname}/say.wav ${this.MP3FILE}`)
        } catch (e) {
            throw new Error(`Cannot create (lame) "say.mp3": ${e}`);
        }
    }

    sendToPromise(adapter, command, message, timeout) {
        return this.adapter.getForeignStateAsync(`system.adapter.${adapter}.alive`)
            .then(state => {
                if (!state || !state.val) {
                    return Promise.reject(`Instance "${adapter}" is not running`);
                }

                return new Promise((resolve, reject) => {
                    let timer = setTimeout(() => {
                        timer = null;
                        reject(`Timeout (${timeout} ms) by sendTo "${adapter}"`);
                    }, timeout || 5000);

                    this.adapter.sendTo(adapter, command, message, response => {
                        if (timer) {
                            timer && clearTimeout(timer);
                            timer = null;
                            if (response.error) {
                                reject(response.error);
                            } else {
                                resolve(response);
                            }
                        }
                    });
                });
            });
    }

    async sayItGetSpeechCloud(text, language, _, testOptions) {
        let type = 'text';
        if (text.match(/<[-+\w\s'"=]+>/)) {
            if (!text.match(/^<speak>/)) {
                text = `<speak>${text}</speak>`;
            }
            type = 'ssml';
        }

        const apiKey = testOptions ? testOptions.cloudAppKey : this.adapter.config.cloudAppKey;
        const cloudInstance = (testOptions && testOptions.cloudInstance) || this.adapter.config.cloudInstance;
        let response;
        if (apiKey) {
            axios = axios || require('axios');
            let cloudUrl;

            const params = {
                text,
                apiKey,
                textType: type,
                voiceId: sayitEngines[language].ename,
                engine:  sayitEngines[language].neural ? 'neural' : undefined,
            };

            if (apiKey.startsWith('@pro_')) {
                cloudUrl = 'https://iobroker.pro:3001';
            } else {
                cloudUrl = 'https://iobroker.net:3001';
            }

            const _response = await axios.post(`${cloudUrl}/api/v1/polly`, params, {
                headers: {
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
            })
            if (_response.data) {
                response = {base64: Buffer.from(_response.data, 'binary').toString('base64')};
            } else {
                throw new Error('No data received');
            }
        } else if (cloudInstance) {
            // send message to cloud instance
            response = await this.sendToPromise(cloudInstance, 'tts', {
                text,
                voiceId: sayitEngines[language].ename,
                textType: type,
                engine: sayitEngines[language].neural ? 'neural' : undefined,
            }, 10000);
        } else {
            throw new Error('No cloud instance or app key defined');
        }

        fs.writeFileSync(this.MP3FILE, Buffer.from(response.base64, 'base64'), 'binary');
    }

    async sayItGetSpeechPicoTTS(text, language) {
        try {
            await this.exec(`pico2wave -l ${language} -w ${__dirname}/say.wav "${text}"`);
        } catch (e) {
            throw new Error(`Cannot create (pico2wave) "say.wav": ${e}`);
        }
        try {
             await this.exec(`lame ${__dirname}/say.wav ${this.MP3FILE}`)
        } catch (e) {
            throw new Error(`Cannot create (lame) "say.mp3": ${e}`);
        }
    }

    async getDuration(fileName) {
        // create a new parser from a node ReadStream
        if (fileName === this.adapter.config.announce && this.adapter.config.annoDuration) {
            return this.adapter.config.annoDuration - 1;
        }

        if (fs.existsSync(fileName)) {
            if (fileName.endsWith('.mp3')) {
                return new Promise(resolve =>
                    mp3Duration(fileName, (err, duration) => {
                        if (err) {
                            try {
                                const stat = fs.statSync(fileName);
                                const size = stat.size;
                                resolve(Math.ceil(size / 4096));
                            } catch (e) {
                                this.adapter.log.warn(`Cannot read length of file ${fileName}`);
                                resolve(0);
                            }
                        } else {
                            resolve(Math.ceil(duration));
                        }
                    }));
            } else {
                try {
                    const stat = fs.statSync(fileName);
                    const size = stat.size;
                    return Math.ceil(size / 4096);
                } catch (e) {
                    this.adapter.log.warn(`Cannot read length of file ${fileName}`);
                    return 0;
                }
            }
        } else {
            return 0;
        }
    };

    async sayItGetSpeech(text, language, volume, testOptions) {
        if (this.adapter.config.cache && !testOptions) {
            const md5filename = this.isCached(this.options.cacheDir, `${language};${text}`, this.options.outFileExt, this.adapter.config.cacheExpiryDays);

            if (md5filename) {
                return md5filename;
            }
            this.adapter.log.debug(`Cache File ${md5filename} for "${language};${text}" not found`);
        }

        if (sayitEngines[language] && sayitEngines[language].engine) {
            if (!sayitEngines[language].ssml) {
                // remove SSML
                text = text.replace(/<\/?[-+\w\s'"=]+>/g, '');
            }

            const engine = sayitEngines[language].engine;

            if (engine === 'google') {
                await this.sayItGetSpeechGoogle(text, language, volume, testOptions);
            } else if (engine === 'yandex') {
                await this.sayItGetSpeechYandex(text, language, null, testOptions);
            } else if (engine === 'yandexCloud') {
                await this.sayItGetSpeechYandexCloud(text, language, null, testOptions);
            } else if (engine === 'polly') {
                await this.sayItGetSpeechPolly(text, language, null, testOptions);
            } else if (engine === 'coquiTTS') {
                await this.sayItGetSpeechCoquiTTS(text, language, null, testOptions);
            } else if (engine === 'cloud') {
                await this.sayItGetSpeechCloud(text, language, null, testOptions);
            } else if (engine === 'PicoTTS') {
                await this.sayItGetSpeechPicoTTS(text, language, null, testOptions);
            } else {
                throw new Error(`Engine ${engine} not yet supported.`);
            }
        } else {
            // fallback to google
            await this.sayItGetSpeechGoogle(text, language, volume, testOptions);
        }

        if (this.adapter.config.cache) {
            this.cacheFile(text, language, this.getCachedFileName(this.options.cacheDir, `${language};${text}`, this.options.outFileExt));
        }

        return this.MP3FILE;
    };
}

module.exports = Text2Speech;
