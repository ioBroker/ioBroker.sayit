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
/** Base address of the freetts.org service */
const FREETTS_URL = 'https://freetts.org';
/** Maximal length of a text that could be requested at once from freetts.org with a PRO API key */
const FREETTS_MAX_TEXT_LENGTH = 10000;
/** Voice used by freetts.org if nothing is configured */
const FREETTS_DEFAULT_VOICE = 'en-US-JennyNeural';
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
     * Maximal number of characters, that could be requested at once from the given engine.
     * Longer texts must be split, because the engines answer with an error or with a truncated text.
     *
     * @param engine Name of the engine, like "de-DE_AP_Female"
     * @returns Maximal length of one request or 0 if the engine has no limit
     */
    static getMaxTextLength(engine) {
        // Unknown engines are generated with google (see "sayItGetSpeech")
        const type = engines_1.sayitEngines[engine]?.engine || 'google';
        if (type === 'google') {
            return GOOGLE_MAX_TEXT_LENGTH;
        }
        if (type === 'freeTTS') {
            return FREETTS_MAX_TEXT_LENGTH;
        }
        return 0;
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
     * Read the list of the voices offered by freetts.org.
     * Used by the configuration dialog to fill the voice selector.
     *
     * @param withPro True to offer the "Signature" voices too. Without an API key they cannot be used,
     * so they are left out by default
     * @returns List of the voices, sorted by the language name
     */
    static async getFreeTtsVoices(withPro) {
        const response = await axios_1.default.get(`${FREETTS_URL}/api/voices`, { timeout: 15000 });
        if (!Array.isArray(response.data)) {
            throw new Error('Unexpected answer from freetts.org');
        }
        return response.data
            .filter(voice => withPro || voice.SuggestedCodec)
            .map(voice => ({
            value: voice.ShortName,
            // "de-DE-KatjaNeural" => "German (Germany) - Katja (Female)".
            // Only the voices with a codec are free. The others are the "Signature" voices of the
            // service, which have no language name and are answered with "402 - hd_voice_required"
            // without a PRO API key.
            // The language prefix is removed by pattern and not with "Locale", because a few voices
            // are offered under a different locale than the one in their name ("ar-SA" / "ar-XA-…")
            label: `${voice.LocaleName || voice.Locale} - ${voice.ShortName.replace(/^[a-z]{2,3}-[A-Za-z]{2,4}-/, '').replace(/Neural$/, '')} (${voice.Gender})${voice.SuggestedCodec ? '' : ' [PRO]'}`,
        }))
            .sort((a, b) => (a.label > b.label ? 1 : a.label < b.label ? -1 : 0));
    }
    /**
     * Generate the mp3 file with the freetts.org API.
     * The language is defined by the voice, like "de-DE-KatjaNeural".
     *
     * @param props Text, language and options of the task
     */
    async #sayItGetSpeechFreeTTS(props) {
        if (!props.text.length) {
            throw new Error('No text to speak');
        }
        if (props.text.length > FREETTS_MAX_TEXT_LENGTH) {
            // freetts.org accepts only a limited number of characters at once, so the text must be split
            // and the rest of the parts must be said one after another
            const parts = _a.splitText(props.text, FREETTS_MAX_TEXT_LENGTH);
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
        // The free tier of freetts.org appends a spoken "generated with freeTTS.org" to every text,
        // which makes it useless here, so only the endpoint for the programmatic access is used
        const apiKey = props.testOptions?.freettsApiKey || this.#config.freettsApiKey;
        if (!apiKey) {
            throw new Error(`No freetts.org API key defined. Get one on ${FREETTS_URL}/pricing.`);
        }
        const headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey };
        const voice = props.testOptions?.freettsVoice || this.#config.freettsVoice || FREETTS_DEFAULT_VOICE;
        const rate = _a.#formatFreeTtsValue(props.testOptions?.freettsRate ?? this.#config.freettsRate, '%');
        const pitch = _a.#formatFreeTtsValue(props.testOptions?.freettsPitch ?? this.#config.freettsPitch, 'Hz');
        let response;
        try {
            response = await axios_1.default.post(`${FREETTS_URL}/api/v1/tts`, { text: props.text, voice, rate, pitch }, {
                headers,
                responseType: 'arraybuffer',
                timeout: 30000,
            });
        }
        catch (error) {
            throw new Error(`Cannot generate speech on freetts.org: ${_a.#getAxiosError(error)}`);
        }
        let buffer;
        if ((response.headers['content-type'] || '').toString().startsWith('audio/')) {
            // The API answered with the mp3 file directly
            buffer = Buffer.from(response.data);
        }
        else {
            // The API answered with {"file_id": "..."} and the mp3 must be downloaded in a second step
            let answer;
            const text = Buffer.from(response.data).toString('utf8');
            try {
                answer = JSON.parse(text);
            }
            catch {
                throw new Error(`Unexpected answer from freetts.org: ${text.substring(0, 200)}`);
            }
            if (!answer?.file_id) {
                throw new Error(`No file ID received from freetts.org: ${text.substring(0, 200)}`);
            }
            try {
                const audio = await axios_1.default.get(`${FREETTS_URL}/api/audio/${answer.file_id}`, {
                    headers,
                    responseType: 'arraybuffer',
                    timeout: 30000,
                });
                buffer = Buffer.from(audio.data);
            }
            catch (error) {
                throw new Error(`Cannot download speech from freetts.org: ${_a.#getAxiosError(error)}`);
            }
        }
        if (buffer.length < 100) {
            throw new Error('Cannot get file: received file is too short');
        }
        node_fs_1.default.writeFileSync(this.#MP3FILE, buffer);
    }
    /**
     * Format the rate or the pitch in the notation expected by freetts.org, like "+10%" or "-5Hz".
     * Already formatted values are accepted too.
     *
     * @param value Value from the configuration
     * @param unit Unit expected by the API
     * @returns Value with sign and unit
     */
    static #formatFreeTtsValue(value, unit) {
        const num = parseInt(value, 10) || 0;
        return `${num >= 0 ? '+' : ''}${num}${unit}`;
    }
    /**
     * Extract a readable message from an axios error.
     * The body of an error answer is a buffer, because the requests are done with "responseType: arraybuffer".
     *
     * @param error Error thrown by axios
     * @returns Text of the error
     */
    static #getAxiosError(error) {
        const data = error?.response?.data;
        if (data) {
            const text = Buffer.isBuffer(data) ? data.toString('utf8') : JSON.stringify(data);
            return `${error.response.status} - ${text.substring(0, 200)}`;
        }
        return error?.message || error?.toString();
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
     * Build the base address of the Piper server. The protocol may be omitted in the configuration.
     *
     * @param server Address from the configuration, like "192.168.1.10:5000" or "http://piper:5000/"
     * @returns Address without trailing slash, like "http://192.168.1.10:5000"
     */
    static #getPiperUrl(server) {
        server = server.trim().replace(/[/]+$/, '');
        return /^https?:[/][/]/i.test(server) ? server : `http://${server}`;
    }
    /**
     * Read the list of the voices installed on the Piper server.
     * Used by the configuration dialog to fill the voice selector.
     *
     * @param server Address of the Piper HTTP server, like "http://192.168.1.10:5000"
     * @returns List of the voices, sorted by the name
     */
    static async getPiperVoices(server) {
        const response = await axios_1.default.get(`${_a.#getPiperUrl(server)}/voices`, { timeout: 15000 });
        if (!response.data || typeof response.data !== 'object') {
            throw new Error('Unexpected answer from the Piper server');
        }
        return Object.keys(response.data)
            .map(voice => {
            const config = response.data[voice];
            const language = config?.language?.name_english ? ` (${config.language.name_english})` : '';
            const speakers = (config?.num_speakers || 1) > 1 ? ` [${config.num_speakers} speakers]` : '';
            // "de_DE-thorsten-high" => "de_DE-thorsten-high (German) [2 speakers]"
            return { value: voice, label: `${voice}${language}${speakers}` };
        })
            .sort((a, b) => (a.label > b.label ? 1 : a.label < b.label ? -1 : 0));
    }
    /**
     * Read the format and the position of the samples from a WAV file
     *
     * @param wav Content of the WAV file
     * @returns Number of channels, sample rate and position of the samples
     */
    static #readWavHeader(wav) {
        if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') {
            throw new Error(`Received file is not a WAV file: ${wav.toString('utf8', 0, 200)}`);
        }
        let channels = 0;
        let sampleRate = 0;
        let bits = 0;
        let format = 0;
        // The file consists of chunks: 4 bytes ID, 4 bytes length, data
        let pos = 12;
        while (pos + 8 <= wav.length) {
            const id = wav.toString('ascii', pos, pos + 4);
            const size = wav.readUInt32LE(pos + 4);
            if (id === 'fmt ') {
                format = wav.readUInt16LE(pos + 8);
                channels = wav.readUInt16LE(pos + 10);
                sampleRate = wav.readUInt32LE(pos + 12);
                bits = wav.readUInt16LE(pos + 22);
            }
            else if (id === 'data') {
                if (format !== 1 || bits !== 16 || (channels !== 1 && channels !== 2)) {
                    throw new Error(`Unsupported WAV format: ${format}, ${bits} bits, ${channels} channels`);
                }
                // A streamed file could have no valid length of the data
                const dataLen = size && pos + 8 + size <= wav.length ? size : wav.length - pos - 8;
                return { channels, sampleRate, dataOffset: pos + 8, dataLen };
            }
            // Chunks are aligned to 2 bytes
            pos += 8 + size + (size % 2);
        }
        throw new Error('No audio data found in the WAV file');
    }
    /**
     * Convert a WAV file (PCM, 16 bit) into mp3. It is done in JavaScript, so no external tool like "lame" is required.
     *
     * @param wav Content of the WAV file
     * @returns Content of the mp3 file
     */
    static async #wavToMp3(wav) {
        const header = _a.#readWavHeader(wav);
        // The package is an ES module only, so it must be loaded with import()
        const lamejs = await import('@breezystack/lamejs');
        // The buffer could start at an odd address, so the samples are copied instead of creating a view
        const data = wav.subarray(header.dataOffset, header.dataOffset + header.dataLen);
        const count = Math.floor(data.length / 2 / header.channels);
        const channels = [];
        for (let c = 0; c < header.channels; c++) {
            channels.push(new Int16Array(count));
        }
        for (let i = 0; i < count; i++) {
            for (let c = 0; c < header.channels; c++) {
                channels[c][i] = data.readInt16LE((i * header.channels + c) * 2);
            }
        }
        const encoder = new lamejs.Mp3Encoder(header.channels, header.sampleRate, 64);
        const chunks = [];
        // lamejs encodes the samples in blocks of 1152
        for (let i = 0; i < count; i += 1152) {
            const left = channels[0].subarray(i, i + 1152);
            const right = header.channels === 2 ? channels[1].subarray(i, i + 1152) : undefined;
            const mp3 = encoder.encodeBuffer(left, right);
            if (mp3.length) {
                chunks.push(Buffer.from(mp3));
            }
        }
        chunks.push(Buffer.from(encoder.flush()));
        return Buffer.concat(chunks);
    }
    /**
     * Generate the mp3 file with a Piper HTTP server (python3 -m piper.http_server).
     * Piper answers with a WAV file, which is converted to mp3.
     *
     * @param props Text, language and options of the task
     */
    async #sayItGetSpeechPiper(props) {
        const server = props.testOptions?.piperServer || this.#config.piperServer;
        if (!server) {
            throw new Error('No Piper server defined');
        }
        const voice = props.testOptions?.piperVoice || this.#config.piperVoice;
        const speaker = (props.testOptions?.piperSpeaker || this.#config.piperSpeaker || '').toString().trim();
        const lengthScale = parseFloat((props.testOptions?.piperLengthScale ?? this.#config.piperLengthScale));
        // Not defined values are taken by the server from its command line or from the voice
        const body = {
            text: props.text,
        };
        if (voice) {
            body.voice = voice;
        }
        if (/^[0-9]+$/.test(speaker)) {
            body.speaker_id = parseInt(speaker, 10);
        }
        else if (speaker) {
            body.speaker = speaker;
        }
        if (lengthScale > 0 && lengthScale !== 1) {
            body.length_scale = lengthScale;
        }
        let wav;
        try {
            const response = await axios_1.default.post(`${_a.#getPiperUrl(server)}/synthesize`, body, {
                responseType: 'arraybuffer',
                timeout: 60000,
            });
            wav = Buffer.from(response.data);
        }
        catch (error) {
            throw new Error(`Cannot generate speech with Piper: ${_a.#getAxiosError(error)}`);
        }
        node_fs_1.default.writeFileSync(this.#MP3FILE, await _a.#wavToMp3(wav));
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
                let timer = this.#adapter.setTimeout(() => {
                    timer = null;
                    reject(new Error(`Timeout (${timeout || 5000} ms) by sendTo "${adapter}"`));
                }, timeout || 5000);
                this.#adapter.sendTo(adapter, command, message, response => {
                    const typedResponse = response;
                    if (timer) {
                        this.#adapter.clearTimeout(timer);
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
        // A test of the voice settings must not use the cache. The "say" command uses it, if possible.
        const useCache = this.#config.cache && (!props.testOptions || !!props.testOptions.useCache);
        // The text could be changed below (SSML removed), so the key must be built from the original text
        const cacheKey = `${props.language};${props.text}`;
        if (useCache) {
            const md5filename = this.#isCached(cacheKey);
            if (md5filename) {
                return md5filename;
            }
            this.#adapter.log.debug(`Cache file for "${cacheKey}" not found`);
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
            else if (engine === 'freeTTS') {
                await this.#sayItGetSpeechFreeTTS(props);
            }
            else if (engine === 'piper') {
                await this.#sayItGetSpeechPiper(props);
            }
            else {
                throw new Error(`Engine ${engine} not yet supported.`);
            }
        }
        else {
            // fallback to google
            await this.#sayItGetSpeechGoogle(props);
        }
        // The test files are generated with the settings of the configuration dialog and not with the
        // saved ones, so they must not be stored in the cache of the saved configuration
        if (useCache) {
            this.#cacheFile(props.text, props.language, this.#getCachedFileName(cacheKey));
        }
        return this.#MP3FILE;
    }
}
_a = Text2Speech;
exports.default = Text2Speech;
//# sourceMappingURL=text2speech.js.map