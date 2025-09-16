"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
// @ts-expect-error no typings
const mp3_duration_1 = __importDefault(require("mp3-duration"));
const engines_1 = require("./engines");
const node_url_1 = require("node:url");
const client_polly_1 = require("@aws-sdk/client-polly");
const axios_1 = __importDefault(require("axios"));
const node_child_process_1 = require("node:child_process");
const google_tts_api_1 = require("google-tts-api");
class Text2Speech {
    #adapter;
    #options;
    #addToQueue;
    #getCachedFileName;
    #isCached;
    #MP3FILE;
    #polly;
    #config;
    constructor(adapter, options) {
        this.#adapter = adapter;
        this.#options = options;
        this.#addToQueue = options.addToQueue;
        this.#getCachedFileName = options.getCachedFileName;
        this.#isCached = options.isCached;
        this.#MP3FILE = options.MP3FILE;
        this.#polly = null;
        this.#config = adapter.config;
    }
    async #getFileInStates(fileName) {
        if (fileName.match(/^\/?[-_\w]+\.\d+\//)) {
            if (fileName.startsWith('/')) {
                fileName = fileName.substring(1);
            }
            // maybe it is "sayit.0/tts.userfiles/gong.mp3"
            const parts = fileName.split('/');
            const id = parts[0];
            parts.splice(0, 1);
            const file = parts.join('/');
            let data;
            try {
                data = await this.#adapter.readFileAsync(id, file);
                return data?.file;
            }
            catch (e) {
                this.#adapter.log.warn(`Cannot read length of file ${fileName}: ${e}`);
            }
        }
        return null;
    }
    static splitText(text, max) {
        max ||= 70;
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
                    if (_parts[i] && `${result[i] || ''} ${_parts[w]}`.length > max) {
                        i++;
                    }
                    if (!result[i]) {
                        result.push(_parts[w]);
                    }
                    else {
                        result[i] += ` ${_parts[w]}`;
                    }
                }
            }
            return result;
        }
        return [text];
    }
    #cacheFile(text, language, md5filename) {
        if (this.#config.cache) {
            const stat = node_fs_1.default.statSync(this.#MP3FILE);
            if (stat.size < 100) {
                this.#adapter.log.warn(`Received file is too short: ${node_fs_1.default.readFileSync(this.#MP3FILE).toString()}`);
            }
            else {
                this.#adapter.log.debug(`Caching File ${md5filename} for "${language};${text}" now`);
                try {
                    node_fs_1.default.copyFileSync(this.#MP3FILE, md5filename);
                }
                catch (error) {
                    this.#adapter.log.error(error);
                }
            }
        }
    }
    async #exec(cmd, args, cwd) {
        return new Promise((resolve, reject) => {
            try {
                const _cmd = `${cmd}${args?.length ? ` ${args.join(' ')}` : ''}`;
                this.#adapter.log.debug(`Execute ${cmd} ${args?.length ? args.join(' ') : ''}`);
                const ls = (0, node_child_process_1.exec)(_cmd, { cwd }, code => {
                    if (!code) {
                        resolve?.();
                    }
                    else {
                        reject?.(new Error(`Exit code: ${code.code}`));
                    }
                    reject = null;
                    resolve = null;
                });
                ls.on('error', e => this.#adapter.log.error(`sayIt.play: there was an error while playing the file: ${e.toString()}`));
                ls.stdout?.on('data', data => this.#adapter.log.debug(`stdout: ${data}`));
                ls.stderr?.on('data', data => this.#adapter.log.error(`stderr: ${data}`));
            }
            catch (e) {
                reject?.(e);
                reject = null;
                resolve = null;
            }
        });
    }
    async #sayItGetSpeechGoogle(props) {
        if (!props.text.length) {
            throw new Error('No text to speak');
        }
        if (props.text.length > 70) {
            const parts = _a.splitText(props.text);
            try {
                for (let t = 1; t < parts.length; t++) {
                    await this.#addToQueue(parts[t], JSON.parse(JSON.stringify(props)));
                }
            }
            catch (error) {
                console.error('Cannot add to queue', error);
            }
            props.text = parts[0];
        }
        props.language ||= props.testOptions?.engine || this.#config.engine;
        // get base64 text
        const data = await (0, google_tts_api_1.getAudioBase64)(props.text, {
            lang: props.language,
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
        });
        const buf = Buffer.from(data, 'base64');
        if (buf.length < 100) {
            throw new Error('received file is too short');
        }
        else if (buf.toString().includes('302 Moved')) {
            throw new Error(`https://translate.google.com\nCannot get file: ${buf.toString()}`);
        }
        else {
            node_fs_1.default.writeFileSync(this.#MP3FILE, buf, 'binary');
        }
    }
    async #sayItGetSpeechYandexCloud(props) {
        if (props.language === 'ru' || props.language === 'ru_YA' || props.language === 'ru_YA_CLOUD') {
            props.language = 'ru-RU';
        }
        const yandexCloudVoice = props.testOptions?.yandexCloudVoice || this.#config.yandexCloudVoice || '';
        const yandexKey = props.testOptions?.yandexKey || this.#config.yandexKey;
        const yandexEmotion = props.testOptions?.yandexEmotion || this.#config.yandexEmotion;
        const yandexFolderID = props.testOptions?.yandexFolderID || this.#config.yandexFolderID;
        const params = new node_url_1.URLSearchParams();
        params.append('text', props.text);
        params.append('voice', yandexCloudVoice.replace(' Premium', ''));
        params.append('folderId', yandexFolderID || '');
        if (yandexEmotion !== 'none' && yandexEmotion) {
            params.append('emotion', yandexEmotion);
        }
        params.append('lang', props.language);
        const response = await axios_1.default.post(`https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize`, params, {
            headers: {
                Authorization: `Api-Key ${yandexKey}`,
            },
            responseType: 'arraybuffer',
        });
        if (!response.data || response.data.length < 100) {
            throw new Error('Cannot get file: received file is too short');
        }
        node_fs_1.default.writeFileSync(this.#MP3FILE, response.data, 'binary');
    }
    async #sayItGetSpeechYandex(props) {
        if (props.language === 'ru' || props.language === 'ru_YA') {
            props.language = 'ru-RU';
        }
        /*emotion: good, neutral, evil, mixed
        drunk:   true, false
        ill:     true, false
        robot:   true, false
        */
        const yandexVoice = props.testOptions?.yandexVoice || this.#config.yandexVoice;
        const yandexKey = props.testOptions?.yandexKey || this.#config.yandexKey;
        const yandexEmotion = props.testOptions?.yandexEmotion || this.#config.yandexEmotion;
        const yandexDrunk = props.testOptions?.yandexDrunk !== undefined
            ? props.testOptions?.yandexDrunk
            : this.#config.yandexDrunk || this.#config.yandexDrunk;
        const yandexIll = props.testOptions?.yandexIll !== undefined
            ? props.testOptions?.yandexIll
            : this.#config.yandexIll || this.#config.yandexIll;
        const yandexRobot = props.testOptions?.yandexRobot !== undefined
            ? props.testOptions?.yandexRobot
            : this.#config.yandexRobot || this.#config.yandexRobot;
        let url = `https://tts.voicetech.yandex.net/generate?lang=${props.language}&format=mp3&speaker=${yandexVoice}&key=${yandexKey}&text=${encodeURI(props.text.trim())}`;
        if (yandexEmotion && yandexEmotion !== 'none') {
            url += `&emotion=${yandexEmotion}`;
        }
        if (yandexDrunk) {
            url += '&drunk=true';
        }
        if (yandexIll) {
            url += '&ill=true';
        }
        if (yandexRobot) {
            url += '&robot=true';
        }
        const response = await axios_1.default.get(url, { responseType: 'arraybuffer' });
        if (!response.data || response.data.length < 100) {
            throw new Error('Cannot get file: received file is too short');
        }
        node_fs_1.default.writeFileSync(this.#MP3FILE, response.data, 'binary');
    }
    async #sayItGetSpeechPolly(props) {
        let _polly;
        if (props.testOptions) {
            _polly = new client_polly_1.PollyClient({
                region: props.testOptions?.awsRegion || this.#config.awsRegion,
                credentials: {
                    accessKeyId: props.testOptions?.awsAccessKey || this.#config.awsAccessKey,
                    secretAccessKey: props.testOptions?.awsSecretKey || this.#config.awsSecretKey,
                },
            });
        }
        else {
            this.#polly ||= new client_polly_1.PollyClient({
                region: this.#config.awsRegion,
                credentials: {
                    accessKeyId: this.#config.awsAccessKey,
                    secretAccessKey: this.#config.awsSecretKey,
                },
            });
            _polly = this.#polly;
        }
        let type = 'text';
        if (props.text.match(/<[-+\w\s'"=]+>/)) {
            if (!props.text.match(/^<speak>/)) {
                props.text = `<speak>${props.text}</speak>`;
            }
            type = 'ssml';
        }
        const pParams = {
            OutputFormat: 'mp3',
            Text: props.text,
            TextType: type || 'text',
            VoiceId: engines_1.sayitEngines[props.language].ename || 'Marlene',
            Engine: engines_1.sayitEngines[props.language].neural ? 'neural' : undefined,
        };
        const command = new client_polly_1.SynthesizeSpeechCommand(pParams);
        const data = await _polly.send(command);
        const byteArray = data && data.AudioStream && (await data.AudioStream.transformToByteArray());
        // process data.
        if (!byteArray?.length) {
            throw new Error('No data received');
        }
        else {
            node_fs_1.default.writeFileSync(this.#MP3FILE, Buffer.from(byteArray), 'binary');
        }
    }
    async #sayItGetSpeechCoquiTTS(props) {
        props.language = props.language.substring(0, 2);
        let cmd;
        const coquiVocoder = props.testOptions?.coquiVocoder || this.#config.coquiVocoder;
        if (coquiVocoder === 'default') {
            cmd = `tts --text ". ${props.text} ." --model_name  tts_models/${props.language}/${coquiVocoder.replace(' ', '/')} --out_path ${__dirname}/say.wav`;
        }
        else {
            let language = props.language;
            if (coquiVocoder === 'libri-tts wavegrad' || coquiVocoder === 'libri-tts fullband-melgan') {
                language = 'universal';
            }
            cmd = `tts --text ". ${props.text} ." --model_name  tts_models/${language}/${coquiVocoder.replace(' ', '/')} --vocoder_name vocoder_models/${language}/${coquiVocoder.replace(' ', '/')} --out_path ${__dirname}/say.wav`;
        }
        try {
            await this.#exec(cmd);
        }
        catch (e) {
            throw new Error(`Cannot create (coqui) "say.wav": ${e}`);
        }
        try {
            await this.#exec(`lame ${__dirname}/say.wav ${this.#MP3FILE}`);
        }
        catch (e) {
            throw new Error(`Cannot create (lame) "say.mp3": ${e}`);
        }
    }
    #sendToPromise(adapter, command, message, timeout) {
        return this.#adapter.getForeignStateAsync(`system.adapter.${adapter}.alive`).then(state => {
            if (!state || !state.val) {
                return Promise.reject(new Error(`Instance "${adapter}" is not running)`));
            }
            return new Promise((resolve, reject) => {
                let timer = setTimeout(() => {
                    timer = null;
                    reject(new Error(`Timeout (${timeout} ms) by sendTo "${adapter}"`));
                }, timeout || 5000);
                this.#adapter.sendTo(adapter, command, message, response => {
                    const typedResponse = response;
                    if (timer) {
                        if (timer) {
                            clearTimeout(timer);
                            timer = null;
                        }
                        if (typedResponse.error) {
                            reject(new Error(typedResponse.error));
                        }
                        else {
                            resolve(typedResponse);
                        }
                    }
                });
            });
        });
    }
    async #sayItGetSpeechCloud(props) {
        let type = 'text';
        if (props.text.match(/<[-+\w\s'"=]+>/)) {
            if (!props.text.match(/^<speak>/)) {
                props.text = `<speak>${props.text}</speak>`;
            }
            type = 'ssml';
        }
        const apiKey = props.testOptions?.cloudAppKey || this.#config.cloudAppKey;
        const cloudInstance = props.testOptions?.cloudInstance || this.#config.cloudInstance;
        let response = {};
        if (apiKey) {
            let cloudUrl;
            const params = {
                text: props.text,
                apiKey,
                textType: type,
                voiceId: engines_1.sayitEngines[props.language].ename,
                engine: engines_1.sayitEngines[props.language].neural ? 'neural' : undefined,
            };
            if (apiKey.startsWith('@pro_')) {
                cloudUrl = 'https://iobroker.pro:3001';
            }
            else {
                cloudUrl = 'https://iobroker.net:3001';
            }
            const _response = await axios_1.default.post(`${cloudUrl}/api/v1/polly`, params, {
                headers: {
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
            });
            if (_response.data) {
                response = { base64: Buffer.from(_response.data, 'binary').toString('base64') };
            }
            else {
                throw new Error('No data received');
            }
        }
        else if (cloudInstance) {
            // send message to cloud instance
            response = await this.#sendToPromise(cloudInstance, 'tts', {
                text: props.text,
                voiceId: engines_1.sayitEngines[props.language].ename,
                textType: type,
                engine: engines_1.sayitEngines[props.language].neural ? 'neural' : undefined,
            }, 10000);
        }
        else {
            throw new Error('No cloud instance or app key defined');
        }
        if (!response.base64) {
            throw new Error('No data received');
        }
        node_fs_1.default.writeFileSync(this.#MP3FILE, Buffer.from(response.base64, 'base64'), 'binary');
    }
    async #sayItGetSpeechPicoTTS(text, language) {
        try {
            await this.#exec(`pico2wave -l ${language} -w ${__dirname}/say.wav "${text}"`);
        }
        catch (e) {
            throw new Error(`Cannot create (pico2wave) "say.wav": ${e}`);
        }
        try {
            await this.#exec(`lame ${__dirname}/say.wav ${this.#MP3FILE}`);
        }
        catch (e) {
            throw new Error(`Cannot create (lame) "say.mp3": ${e}`);
        }
    }
    async getDuration(fileName) {
        // create a new parser from a node ReadStream
        if (fileName === this.#config.announce && this.#config.annoDuration) {
            return this.#config.annoDuration - 1;
        }
        if (node_fs_1.default.existsSync(fileName)) {
            if (fileName.endsWith('.mp3')) {
                return new Promise(resolve => (0, mp3_duration_1.default)(fileName, (err, duration) => {
                    if (err || duration === undefined) {
                        try {
                            const stat = node_fs_1.default.statSync(fileName);
                            const size = stat.size;
                            resolve(Math.ceil(size / 4096));
                        }
                        catch {
                            this.#adapter.log.warn(`Cannot read length of file ${fileName}`);
                            resolve(0);
                        }
                    }
                    else {
                        resolve(Math.ceil(duration));
                    }
                }));
            }
            try {
                const stat = node_fs_1.default.statSync(fileName);
                const size = stat.size;
                return Math.ceil(size / 4096);
            }
            catch {
                this.#adapter.log.warn(`Cannot read length of file ${fileName}`);
                return 0;
            }
        }
        const data = await this.#getFileInStates(fileName);
        if (data) {
            if (fileName.endsWith('.mp3')) {
                return new Promise(resolve => (0, mp3_duration_1.default)(data, (err, duration) => {
                    if (err || duration === undefined) {
                        try {
                            const stat = node_fs_1.default.statSync(fileName);
                            const size = stat.size;
                            resolve(Math.ceil(size / 4096));
                        }
                        catch {
                            this.#adapter.log.warn(`Cannot read length of file ${fileName}`);
                            resolve(0);
                        }
                    }
                    else {
                        resolve(Math.ceil(duration));
                    }
                }));
            }
            try {
                const size = data.length;
                return Math.ceil(size / 4096);
            }
            catch {
                this.#adapter.log.warn(`Cannot read length of file ${fileName}`);
                return 0;
            }
        }
        return 0;
    }
    async sayItGetSpeech(props) {
        if (this.#config.cache && !props.testOptions) {
            const md5filename = this.#isCached(this.#options.cacheDir, `${props.language};${props.text}`, this.#options.outFileExt, this.#config.cacheExpiryDays);
            if (md5filename) {
                return md5filename;
            }
            this.#adapter.log.debug(`Cache File ${md5filename} for "${props.language};${props.text}" not found`);
        }
        if (engines_1.sayitEngines[props.language] && engines_1.sayitEngines[props.language].engine) {
            if (!engines_1.sayitEngines[props.language].ssml) {
                // remove SSML
                props.text = props.text.replace(/<\/?[-+\w\s'"=]+>/g, '');
            }
            const engine = engines_1.sayitEngines[props.language].engine;
            if (engine === 'google') {
                await this.#sayItGetSpeechGoogle(props);
            }
            else if (engine === 'yandex') {
                await this.#sayItGetSpeechYandex(props);
            }
            else if (engine === 'yandexCloud') {
                await this.#sayItGetSpeechYandexCloud(props);
            }
            else if (engine === 'polly') {
                await this.#sayItGetSpeechPolly(props);
            }
            else if (engine === 'CoquiTTS') {
                await this.#sayItGetSpeechCoquiTTS(props);
            }
            else if (engine === 'cloud') {
                await this.#sayItGetSpeechCloud(props);
            }
            else if (engine === 'PicoTTS') {
                await this.#sayItGetSpeechPicoTTS(props.text, props.language);
            }
            else {
                throw new Error(`Engine ${engine} not yet supported.`);
            }
        }
        else {
            // fallback to google
            await this.#sayItGetSpeechGoogle(props);
        }
        if (this.#config.cache) {
            this.#cacheFile(props.text, props.language, this.#getCachedFileName(this.#options.cacheDir, `${props.language};${props.text}`, this.#options.outFileExt));
        }
        return this.#MP3FILE;
    }
}
_a = Text2Speech;
exports.default = Text2Speech;
//# sourceMappingURL=text2speech.js.map