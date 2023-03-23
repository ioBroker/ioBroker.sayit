'use strict';
const fs           = require('fs');
const mp3Duration  = require('mp3-duration');
const engines      = require('../admin/engines.js');
const sayitEngines = engines.sayitEngines;
const { URLSearchParams } = require('url');
let cp;
let googleTTS;
let axios;
let aws;

async function exec(adapter, cmd, args, cwd) {
    cp = cp || require('child_process');
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
                adapter.log.error(`sayIt.play: there was an error while playing the file: ${e.toString()}`));

            ls.stdout.on('data', data => adapter.log.debug(`stdout: ${data}`));
            ls.stderr.on('data', data => adapter.log.error(`stderr: ${data}`));
        } catch (e) {
            reject && reject(e.toString());
            reject = null;
            resolve = null;
        }
    });
}

class Text2Speech {
    constructor(adapter, options) {
        this.adapter           = adapter;
        this.options           = options;
        this.addToQueue        = options.addToQueue;
        this.getCachedFileName = options.getCachedFileName;
        this.isCached          = options.isCached;
        this.MP3FILE           = `${adapter.config.dataDir}/${adapter.namespace}.say.${options.outFileExt}`;
        this.appkey            = null;
        this.cloudUrl          = null;
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

    async sayItGetSpeechGoogle(text, language, volume) {
        if (!text.length) {
            throw new Error('No text to speak');
        }
        googleTTS = googleTTS || require('google-tts-api');

        if (text.length > 70) {
            const parts = Text2Speech.splitText(text);
            for (let t = 1; t < parts.length; t++) {
                this.addToQueue(parts[t], language, volume);
            }
            text = parts[0];
        }

        language = language || this.adapter.config.engine;

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
            throw new Error(`http://${this.options.host}${this.options.path}\nCannot get file: ${buf.toString()}`);
        } else {
            fs.writeFileSync(this.MP3FILE, buf, 'binary');
        }
    }

    async sayItGetSpeechAcapela(text, language) {
        axios = axios || require('axios');
        const url = `https://vaassl3.acapela-group.com/Services/Synthesizer?prot_vers=2&req_voice=${language}22k&cl_env=FLASH_AS_3.0&req_text=%5Cvct%3D100%5C+%5Cspd%3D180%5C+${encodeURI(text)}&req_asw_type=STREAM&cl_vers=1-30&req_err_as_id3=yes&cl_login=ACAPELA_BOX&cl_app=PROD&cl_pwd=0g7znor2aa`;

        let soundData = '';
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
        });
        if (response.data.length < 100) {
            throw new Error('received file is too short');
        }
        fs.writeFileSync(this.MP3FILE, soundData, 'binary');
    }

    async sayItGetSpeechYandexCloud(text, language) {
        if (language === 'ru' || language === 'ru_YA' || language === 'ru_YA_CLOUD') {
            language = 'ru-RU';
        }

        let voice = this.adapter.config.voice || this.adapter.config.voiceCloud || '';
        const params = new URLSearchParams();
        params.append('text', text);
        params.append('voice', voice.replace(' Premium', ''));
        params.append('folderId', this.adapter.config.folderID);
        if (this.adapter.config.emotion !== 'none' && this.adapter.config.emotion) {
            params.append('emotion', this.adapter.config.emotion);
        }
        params.append('lang', language);

        const response = await axios.post(`https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize`, params, {
            headers: {
                'Authorization': `Api-Key ${this.adapter.config.key}`,
            },
            responseType: 'arraybuffer',
        });

        if (!response.data || response.data.length < 100) {
            throw new Error('Cannot get file: received file is too short');
        }
        fs.writeFileSync(this.MP3FILE, response.data, 'binary');
    }

    async sayItGetSpeechYandex(text, language) {
        if (language === 'ru' || language === 'ru_YA') {
            language = 'ru-RU';
        }

        /*emotion: good, neutral, evil, mixed
        drunk:   true, false
        ill:     true, false
        robot:   true, false
        */

        let url = `https://tts.voicetech.yandex.net/generate?lang=${language}&format=mp3&speaker=${this.adapter.config.voice}&key=${this.adapter.config.key}&text=${encodeURI(text.trim())}`;

        if (this.adapter.config.emotion && this.adapter.config.emotion !== 'none') {
            url += `&emotion=${this.adapter.config.emotion}`;
        }
        if (this.adapter.config.drunk === 'true' || this.adapter.config.drunk === true) {
            url += '&drunk=true';
        }
        if (this.adapter.config.ill   === 'true' || this.adapter.config.ill   === true) {
            url += '&ill=true';
        }
        if (this.adapter.config.robot === 'true' || this.adapter.config.robot === true) {
            url += '&robot=true';
        }

        const response = await axios.get(url, {responseType: 'arraybuffer'});
        if (!response.data || response.data.length < 100) {
            throw new Error('Cannot get file: received file is too short');
        }
        fs.writeFileSync(this.MP3FILE, response.data, 'binary');
    }

    sayItGetSpeechPolly(text, language) {
        aws = aws || require('aws-sdk');

        this.polly = this.polly || new aws.Polly({
            accessKeyId:     this.adapter.config.accessKey,
            secretAccessKey: this.adapter.config.secretKey,
            region:          this.adapter.config.region,
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
            VoiceId:      sayitEngines[language].ename,
        };

        return new Promise((resolve, reject) => this.polly.synthesizeSpeech(params, (err, data) => {
            if (err) {
                reject(`Cannot get answer: ${JSON.stringify(err)}`);
            } else if (data) {
                if (data.AudioStream instanceof Buffer) {
                    try {
                        fs.writeFileSync(this.MP3FILE, data.AudioStream, 'binary');
                    } catch (err) {
                        return reject(`File error: ${err}`);
                    }
                    resolve();
                } else {
                    reject(`Answer in invalid format: ${data ? data.toString() : 'null'}`);
                }
            }
        }));
    }

    async sayItGetSpeechCloud(text, language, volume) {
        axios = axios || require('axios');

        if (!this.appkey) {
            const obj = await this.adapter.getForeignObjectAsync(`system.this.adapter.${this.adapter.config.cloud}`);
            this.appkey   = obj && obj.native && obj.native.apikey ? obj.native.apikey : 'error';
            this.cloudUrl = (obj && obj.native && obj.native.cloudUrl) || '';
            if (this.appkey && this.appkey.match(/^@pro_/)) {
                if (!this.cloudUrl.includes('https://iobroker.pro:') &&
                    !this.cloudUrl.includes('https://iobroker.info:')) {
                    this.cloudUrl = 'https://iobroker.pro:10555';
                }
            }
            this.cloudUrl = this.cloudUrl.replace(/https:\/\//, '').replace(/:\d+/, '');
        }

        if (this.appkey === 'error') {
            throw new Error(`No app key found in "${this.adapter.config.cloud}".`);
        }

        let type = 'text';
        if (text.match(/<[-+\w\s'"=]+>/)) {
            if (!text.match(/^<speak>/)) {
                text = `<speak>${text}</speak>`;
            }
            type = 'ssml';
        }
        const params = new URLSearchParams();
        params.append('Text', text);
        params.append('appkey', this.appkey);
        params.append('TextType', type);
        params.append('VoiceId', sayitEngines[language].ename);

        const response = await axios.post(`https://${this.cloudUrl}/this.polly/`, params, {
            headers: {
                'Content-Type':   'application/x-www-form-urlencoded',
            },
            responseType: 'arraybuffer',
        })

        if (!response.data || response.data.length < 100) {
            throw new Error('Cannot get file: received file is too short');
        }
        fs.writeFileSync(this.MP3FILE, response.data, 'binary');
    }

    async sayItGetSpeechPicoTTS(text, language, volume) {
        try {
            await exec(this.adapter, `pico2wave -l ${language} -w ${__dirname}/say.wav "${text}"`);
        } catch (e) {
            throw new Error(`Cannot create (pico2wave) "say.wav": ${e}`);
        }
        try {
             await exec(`lame ${__dirname}/say.wav ${this.MP3FILE}`)
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

    async sayItGetSpeech(text, language, volume) {
        if (this.adapter.config.cache) {
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
                await this.sayItGetSpeechGoogle(text, language, volume);
            } else if (engine === 'yandex') {
                await this.sayItGetSpeechYandex(text, language, volume);
            } else if (engine === 'yandexCloud') {
                await this.sayItGetSpeechYandexCloud(text, language, volume);
            } else if (engine === 'acapela') {
                await this.sayItGetSpeechAcapela(text, language, volume);
            } else if (engine === 'polly') {
                await this.sayItGetSpeechPolly(text, language, volume);
            } else if (engine === 'cloud') {
                await this.sayItGetSpeechCloud(text, language, volume);
            } else if (engine === 'PicoTTS') {
                await this.sayItGetSpeechPicoTTS(text, language, volume);
            } else {
                throw new Error(`Engine ${engine} not yet supported.`);
            }
        } else {
            // fallback to google
            await this.sayItGetSpeechGoogle(text, language, volume);
        }

        if (this.adapter.config.cache) {
            this.cacheFile(text, language, this.getCachedFileName(this.options.cacheDir, `${language};${text}`, this.options.outFileExt));
        }

        return this.MP3FILE;
    };
}

module.exports = Text2Speech;
