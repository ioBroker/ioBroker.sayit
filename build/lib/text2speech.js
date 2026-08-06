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
const node_path_1 = require("node:path");
const google_tts_api_1 = require("google-tts-api");
/** Maximal length of a text that could be requested at once from the google translate API */
const GOOGLE_MAX_TEXT_LENGTH = 70;
class Text2Speech {
    #adapter;
    #addToQueue;
    #getCachedFileName;
    #isCached;
    /** Absolute name of the file, where the generated speech will be stored */
    #MP3FILE;
    /** Absolute name of the temporary wav file, used by the local engines (PicoTTS, CoquiTTS) */
    #WAVFILE;
    #polly;
    #config;
    constructor(adapter, options) {
        this.#adapter = adapter;
        this.#addToQueue = options.addToQueue;
        this.#getCachedFileName = options.getCachedFileName;
        this.#isCached = options.isCached;
        this.#MP3FILE = options.MP3FILE;
        this.#WAVFILE = (0, node_path_1.join)((0, node_path_1.dirname)(options.MP3FILE), 'say.wav');
        this.#polly = null;
        this.#config = adapter.config;
    }
    /**
     * Try to read a file from the ioBroker file storage, like "sayit.0/tts.userfiles/gong.mp3"
     *
     * @param fileName Name of the file in the ioBroker file storage
     * @returns Content of the file or null if it is not a file in the ioBroker file storage
     */
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
    /**
     * Split a long text into parts, which are not longer than "max" characters.
     * The text will be split by the punctuation marks and, if that is not enough, by the words.
     *
     * @param text Text to split
     * @param max Maximal length of one part. Default is 70 characters
     * @returns Array with the parts of the text
     */
    static splitText(text, max) {
        max ||= GOOGLE_MAX_TEXT_LENGTH;
        if (text.length <= max) {
            return [text];
        }
        const result = [];
        let current = '';
        /** Store the collected text as one part */
        const flush = () => {
            if (current) {
                result.push(current);
                current = '';
            }
        };
        /** Add a word or a sentence to the current part or start a new part if it does not fit anymore */
        const append = (part) => {
            if (!part) {
                return;
            }
            if (!current) {
                current = part;
            }
            else if (`${current} ${part}`.length <= max) {
                current += ` ${part}`;
            }
            else {
                flush();
                current = part;
            }
        };
        // Split by the punctuation marks first
        const sentences = text
            .split(/[,.;:]/)
            .map(sentence => sentence.trim())
            .filter(sentence => sentence);
        for (const sentence of sentences) {
            if (sentence.length <= max) {
                append(sentence);
                continue;
            }
            // The sentence is too long, so split it by words
            for (const word of sentence.split(/\s+/)) {
                if (word.length > max) {
                    // A single word is longer than the maximal length, so it must be cut
                    flush();
                    for (let i = 0; i < word.length; i += max) {
                        result.push(word.substring(i, i + max));
                    }
                }
                else {
                    append(word);
                }
            }
        }
        flush();
        return result.length ? result : [text];
    }
    /**
     * Copy the generated file into the cache directory
     *
     * @param text Text that was generated
     * @param language Engine that was used for the generation
     * @param md5filename Name of the cache file
     */
    #cacheFile(text, language, md5filename) {
        if (!this.#config.cache) {
            return;
        }
        try {
            const stat = node_fs_1.default.statSync(this.#MP3FILE);
            if (stat.size < 100) {
                this.#adapter.log.warn(`Received file is too short: ${node_fs_1.default.readFileSync(this.#MP3FILE).toString()}`);
                return;
            }
        }
        catch (error) {
            this.#adapter.log.error(`Cannot read generated file "${this.#MP3FILE}": ${error.toString()}`);
            return;
        }
        this.#adapter.log.debug(`Caching File ${md5filename} for "${language};${text}" now`);
        try {
            node_fs_1.default.copyFileSync(this.#MP3FILE, md5filename);
        }
        catch (error) {
            this.#adapter.log.error(`Cannot cache file "${md5filename}": ${error.toString()}`);
        }
    }
    /**
     * Execute an external program and wait till it is finished.
     * The arguments are given as an array, so no shell is involved and the text cannot break the command line.
     *
     * @param cmd Name of the executable
     * @param args Arguments of the executable
     */
    async #spawn(cmd, args) {
        return new Promise((resolve, reject) => {
            try {
                this.#adapter.log.debug(`Execute ${cmd} ${args.join(' ')}`);
                const ls = (0, node_child_process_1.spawn)(cmd, args);
                ls.on('error', e => {
                    reject?.(new Error(`Cannot execute "${cmd}": ${e.toString()}`));
                    reject = null;
                    resolve = null;
                });
                ls.stdout.on('data', data => this.#adapter.log.debug(`stdout: ${data}`));
                ls.stderr.on('data', data => this.#adapter.log.debug(`stderr: ${data}`));
                ls.on('close', code => {
                    if (!code) {
                        resolve?.();
                    }
                    else {
                        reject?.(new Error(`Exit code: ${code}`));
                    }
                    reject = null;
                    resolve = null;
                });
            }
            catch (e) {
                reject?.(e);
                reject = null;
                resolve = null;
            }
        });
    }
    /**
     * Generate the mp3 file with the free google translate API
     *
     * @param props Text, language and options of the task
     */
    async #sayItGetSpeechGoogle(props) {
        if (!props.text.length) {
            throw new Error('No text to speak');
        }
        if (props.text.length > GOOGLE_MAX_TEXT_LENGTH) {
            // The google API accepts only short texts, so the text must be split
            // and the rest of the parts must be said one after another
            const parts = _a.splitText(props.text);
            try {
                for (let t = 1; t < parts.length; t++) {
                    await this.#addToQueue({
                        ...props,
                        text: parts[t],
                    });
                }
            }
            catch (error) {
                this.#adapter.log.error(`Cannot add to queue: ${error.toString()}`);
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
            node_fs_1.default.writeFileSync(this.#MP3FILE, buf);
        }
    }
    /**
     * Generate the ogg file with the Yandex cloud API
     *
     * @param props Text, language and options of the task
     */
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
    /**
     * Generate the mp3 file with the (old) Yandex API
     *
     * @param props Text, language and options of the task
     */
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
        const yandexDrunk = props.testOptions?.yandexDrunk !== undefined ? props.testOptions.yandexDrunk : this.#config.yandexDrunk;
        const yandexIll = props.testOptions?.yandexIll !== undefined ? props.testOptions.yandexIll : this.#config.yandexIll;
        const yandexRobot = props.testOptions?.yandexRobot !== undefined ? props.testOptions.yandexRobot : this.#config.yandexRobot;
        let url = `https://tts.voicetech.yandex.net/generate?lang=${props.language}&format=mp3&speaker=${yandexVoice}&key=${yandexKey}&text=${encodeURIComponent(props.text.trim())}`;
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
    /**
     * Generate the mp3 file directly with the AWS Polly API
     *
     * @param props Text, language and options of the task
     */
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
        const engine = this.#getEngine(props.language);
        const pParams = {
            OutputFormat: 'mp3',
            Text: props.text,
            TextType: type,
            VoiceId: engine.ename || 'Marlene',
            Engine: engine.neural ? 'neural' : undefined,
        };
        const command = new client_polly_1.SynthesizeSpeechCommand(pParams);
        const data = await _polly.send(command);
        const byteArray = data && data.AudioStream && (await data.AudioStream.transformToByteArray());
        // process data.
        if (!byteArray?.length) {
            throw new Error('No data received');
        }
        else {
            node_fs_1.default.writeFileSync(this.#MP3FILE, Buffer.from(byteArray));
        }
    }
    /**
     * Generate the mp3 file with the locally installed CoquiTTS (tts) and convert it with "lame" to mp3
     *
     * @param props Text, language and options of the task
     */
    async #sayItGetSpeechCoquiTTS(props) {
        props.language = props.language.substring(0, 2);
        const coquiVocoder = props.testOptions?.coquiVocoder || this.#config.coquiVocoder;
        if (!coquiVocoder) {
            throw new Error('No CoquiTTS model defined');
        }
        const args = ['--text', `. ${props.text} .`];
        if (coquiVocoder === 'default') {
            args.push('--model_name', `tts_models/${props.language}/${coquiVocoder.replace(' ', '/')}`);
        }
        else {
            let language = props.language;
            if (coquiVocoder === 'libri-tts wavegrad' || coquiVocoder === 'libri-tts fullband-melgan') {
                language = 'universal';
            }
            args.push('--model_name', `tts_models/${language}/${coquiVocoder.replace(' ', '/')}`);
            args.push('--vocoder_name', `vocoder_models/${language}/${coquiVocoder.replace(' ', '/')}`);
        }
        args.push('--out_path', this.#WAVFILE);
        try {
            await this.#spawn('tts', args);
        }
        catch (e) {
            throw new Error(`Cannot create (coqui) "say.wav": ${e}`);
        }
        try {
            await this.#spawn('lame', [this.#WAVFILE, this.#MP3FILE]);
        }
        catch (e) {
            throw new Error(`Cannot create (lame) "say.mp3": ${e}`);
        }
    }
    /**
     * Send a message to another instance and wait for the answer
     *
     * @param adapter Name of the instance, like "cloud.0"
     * @param command Command of the message
     * @param message Payload of the message
     * @param timeout Timeout in ms. Default is 5000 ms
     * @returns Answer of the instance
     */
    #sendToPromise(adapter, command, message, timeout) {
        return this.#adapter.getForeignStateAsync(`system.adapter.${adapter}.alive`).then(state => {
            if (!state || !state.val) {
                return Promise.reject(new Error(`Instance "${adapter}" is not running`));
            }
            return new Promise((resolve, reject) => {
                let timer = setTimeout(() => {
                    timer = null;
                    reject(new Error(`Timeout (${timeout || 5000} ms) by sendTo "${adapter}"`));
                }, timeout || 5000);
                this.#adapter.sendTo(adapter, command, message, response => {
                    const typedResponse = response;
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                        if (typedResponse?.error) {
                            reject(new Error(typedResponse.error));
                        }
                        else {
                            resolve(typedResponse || {});
                        }
                    }
                });
            });
        });
    }
    /**
     * Read the definition of the given engine
     *
     * @param language Name of the engine, like "de-DE_AP_Female"
     * @returns Definition of the engine
     */
    #getEngine(language) {
        const engine = engines_1.sayitEngines[language];
        if (!engine) {
            throw new Error(`Unknown engine: ${language}`);
        }
        return engine;
    }
    /**
     * Generate the mp3 file with the AWS Polly API over the ioBroker cloud (iobroker.net/iobroker.pro)
     *
     * @param props Text, language and options of the task
     */
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
        const engine = this.#getEngine(props.language);
        let response = {};
        if (apiKey) {
            let cloudUrl;
            const params = {
                text: props.text,
                apiKey,
                textType: type,
                voiceId: engine.ename,
                engine: engine.neural ? 'neural' : undefined,
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
                voiceId: engine.ename,
                textType: type,
                engine: engine.neural ? 'neural' : undefined,
            }, 10000);
        }
        else {
            throw new Error('No cloud instance or app key defined');
        }
        if (!response.base64) {
            throw new Error('No data received');
        }
        node_fs_1.default.writeFileSync(this.#MP3FILE, Buffer.from(response.base64, 'base64'));
    }
    /**
     * Generate the mp3 file with the locally installed PicoTTS and convert it with "lame" to mp3
     *
     * @param text Text to say
     * @param language Language of the text, like "de-DE"
     */
    async #sayItGetSpeechPicoTTS(text, language) {
        try {
            await this.#spawn('pico2wave', ['-l', language, '-w', this.#WAVFILE, text]);
        }
        catch (e) {
            throw new Error(`Cannot create (pico2wave) "say.wav": ${e}`);
        }
        try {
            await this.#spawn('lame', [this.#WAVFILE, this.#MP3FILE]);
        }
        catch (e) {
            throw new Error(`Cannot create (lame) "say.mp3": ${e}`);
        }
    }
    /**
     * Detect the play duration of the given file in seconds.
     * If the duration cannot be detected, it will be estimated from the file size.
     *
     * @param fileName Name of the file on the disk or in the ioBroker file storage
     * @returns Duration in seconds
     */
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
        // Maybe the file is stored in the ioBroker file storage
        const data = await this.#getFileInStates(fileName);
        if (data) {
            if (fileName.endsWith('.mp3')) {
                return new Promise(resolve => (0, mp3_duration_1.default)(data, (err, duration) => {
                    if (err || duration === undefined) {
                        // Estimate the duration from the size of the file
                        resolve(Math.ceil(data.length / 4096));
                    }
                    else {
                        resolve(Math.ceil(duration));
                    }
                }));
            }
            return Math.ceil(data.length / 4096);
        }
        return 0;
    }
    /**
     * Generate the speech file for the given text.
     * If the caching is enabled, the file will be stored in the cache directory.
     *
     * @param props Text, language and options of the task
     * @returns Name of the generated (or cached) file
     */
    async sayItGetSpeech(props) {
        if (this.#config.cache && !props.testOptions) {
            const md5filename = this.#isCached(`${props.language};${props.text}`);
            if (md5filename) {
                return md5filename;
            }
            this.#adapter.log.debug(`Cache file for "${props.language};${props.text}" not found`);
        }
        if (engines_1.sayitEngines[props.language]?.engine) {
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
            this.#cacheFile(props.text, props.language, this.#getCachedFileName(`${props.language};${props.text}`));
        }
        return this.#MP3FILE;
    }
}
_a = Text2Speech;
exports.default = Text2Speech;
//# sourceMappingURL=text2speech.js.map