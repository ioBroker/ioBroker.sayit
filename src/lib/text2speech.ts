import fs from 'node:fs';
// @ts-expect-error no typings
import mp3Duration from 'mp3-duration';
import { sayitEngines } from './engines';
import { URLSearchParams } from 'node:url';
import { PollyClient, SynthesizeSpeechCommand, type SynthesizeSpeechCommandInput } from '@aws-sdk/client-polly';
import axios from 'axios';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { getAudioBase64 } from 'google-tts-api';
import type { EngineType, SayItAdapterConfig, SayItProps } from '../types';

/** Maximal length of a text that could be requested at once from the google translate API */
const GOOGLE_MAX_TEXT_LENGTH = 70;

/** Base address of the freetts.org service */
const FREETTS_URL = 'https://freetts.org';
/** Maximal length of a text that could be requested at once from freetts.org with a PRO API key */
const FREETTS_MAX_TEXT_LENGTH = 10000;
/** Voice used by freetts.org if nothing is configured */
const FREETTS_DEFAULT_VOICE = 'en-US-JennyNeural';

export default class Text2Speech {
    #adapter: ioBroker.Adapter;
    #addToQueue: (props: SayItProps) => Promise<void>;
    #getCachedFileName: (text: string) => string;
    #isCached: (text: string) => string | false;
    /** Absolute name of the file, where the generated speech will be stored */
    #MP3FILE: string;
    /** Absolute name of the temporary wav file, used by the local engines (PicoTTS, CoquiTTS) */
    #WAVFILE: string;
    #polly: PollyClient | null;
    #config: SayItAdapterConfig;

    constructor(
        adapter: ioBroker.Adapter,
        options: {
            addToQueue: (props: SayItProps) => Promise<void>;
            getCachedFileName: (text: string) => string;
            isCached: (text: string) => string | false;
            MP3FILE: string;
        },
    ) {
        this.#adapter = adapter;
        this.#addToQueue = options.addToQueue;
        this.#getCachedFileName = options.getCachedFileName;
        this.#isCached = options.isCached;

        this.#MP3FILE = options.MP3FILE;
        this.#WAVFILE = join(dirname(options.MP3FILE), 'say.wav');
        this.#polly = null;
        this.#config = adapter.config as SayItAdapterConfig;
    }

    /**
     * Try to read a file from the ioBroker file storage, like "sayit.0/tts.userfiles/gong.mp3"
     *
     * @param fileName Name of the file in the ioBroker file storage
     * @returns Content of the file or null if it is not a file in the ioBroker file storage
     */
    async #getFileInStates(fileName: string): Promise<Buffer | string | null> {
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
            } catch (e) {
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
    static getMaxTextLength(engine: EngineType): number {
        // Unknown engines are generated with google (see "sayItGetSpeech")
        const type = sayitEngines[engine]?.engine || 'google';
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
    static splitText(text: string, max?: number): string[] {
        max ||= GOOGLE_MAX_TEXT_LENGTH;
        if (text.length <= max) {
            return [text];
        }

        const result: string[] = [];
        let current = '';

        /** Store the collected text as one part */
        const flush = (): void => {
            if (current) {
                result.push(current);
                current = '';
            }
        };

        /** Add a word or a sentence to the current part or start a new part if it does not fit anymore */
        const append = (part: string): void => {
            if (!part) {
                return;
            }
            if (!current) {
                current = part;
            } else if (`${current} ${part}`.length <= max) {
                current += ` ${part}`;
            } else {
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
                } else {
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
    #cacheFile(text: string, language: EngineType, md5filename: string): void {
        if (!this.#config.cache) {
            return;
        }
        try {
            const stat = fs.statSync(this.#MP3FILE);
            if (stat.size < 100) {
                this.#adapter.log.warn(`Received file is too short: ${fs.readFileSync(this.#MP3FILE).toString()}`);
                return;
            }
        } catch (error) {
            this.#adapter.log.error(`Cannot read generated file "${this.#MP3FILE}": ${error.toString()}`);
            return;
        }

        this.#adapter.log.debug(`Caching File ${md5filename} for "${language};${text}" now`);
        try {
            fs.copyFileSync(this.#MP3FILE, md5filename);
        } catch (error) {
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
    async #spawn(cmd: string, args: string[]): Promise<void> {
        return new Promise<void>((resolve: null | (() => void), reject: null | ((error: Error) => void)) => {
            try {
                this.#adapter.log.debug(`Execute ${cmd} ${args.join(' ')}`);
                const ls = spawn(cmd, args);

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
                    } else {
                        reject?.(new Error(`Exit code: ${code}`));
                    }
                    reject = null;
                    resolve = null;
                });
            } catch (e) {
                reject?.(e as Error);
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
    async #sayItGetSpeechGoogle(props: SayItProps): Promise<void> {
        if (!props.text.length) {
            throw new Error('No text to speak');
        }

        if (props.text.length > GOOGLE_MAX_TEXT_LENGTH) {
            // The google API accepts only short texts, so the text must be split
            // and the rest of the parts must be said one after another
            const parts = Text2Speech.splitText(props.text);
            try {
                for (let t = 1; t < parts.length; t++) {
                    await this.#addToQueue({
                        ...props,
                        text: parts[t],
                    });
                }
            } catch (error) {
                this.#adapter.log.error(`Cannot add to queue: ${error.toString()}`);
            }
            props.text = parts[0];
        }

        props.language ||= props.testOptions?.engine || this.#config.engine;

        // get base64 text
        const data = await getAudioBase64(props.text, {
            lang: props.language,
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
        });

        const buf = Buffer.from(data, 'base64');
        if (buf.length < 100) {
            throw new Error('received file is too short');
        } else if (buf.toString().includes('302 Moved')) {
            throw new Error(`https://translate.google.com\nCannot get file: ${buf.toString()}`);
        } else {
            fs.writeFileSync(this.#MP3FILE, buf);
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
    static async getFreeTtsVoices(withPro?: boolean): Promise<{ value: string; label: string }[]> {
        const response = await axios.get<
            { ShortName: string; Gender: string; Locale: string; LocaleName?: string; SuggestedCodec?: string }[]
        >(`${FREETTS_URL}/api/voices`, { timeout: 15000 });

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
    async #sayItGetSpeechFreeTTS(props: SayItProps): Promise<void> {
        if (!props.text.length) {
            throw new Error('No text to speak');
        }

        if (props.text.length > FREETTS_MAX_TEXT_LENGTH) {
            // freetts.org accepts only a limited number of characters at once, so the text must be split
            // and the rest of the parts must be said one after another
            const parts = Text2Speech.splitText(props.text, FREETTS_MAX_TEXT_LENGTH);
            try {
                for (let t = 1; t < parts.length; t++) {
                    await this.#addToQueue({
                        ...props,
                        text: parts[t],
                    });
                }
            } catch (error) {
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
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-api-key': apiKey };

        const voice = props.testOptions?.freettsVoice || this.#config.freettsVoice || FREETTS_DEFAULT_VOICE;
        const rate = Text2Speech.#formatFreeTtsValue(props.testOptions?.freettsRate ?? this.#config.freettsRate, '%');
        const pitch = Text2Speech.#formatFreeTtsValue(
            props.testOptions?.freettsPitch ?? this.#config.freettsPitch,
            'Hz',
        );

        let response;
        try {
            response = await axios.post(
                `${FREETTS_URL}/api/v1/tts`,
                { text: props.text, voice, rate, pitch },
                {
                    headers,
                    responseType: 'arraybuffer',
                    timeout: 30000,
                },
            );
        } catch (error) {
            throw new Error(`Cannot generate speech on freetts.org: ${Text2Speech.#getAxiosError(error)}`);
        }

        let buffer: Buffer;

        if ((response.headers['content-type'] || '').toString().startsWith('audio/')) {
            // The API answered with the mp3 file directly
            buffer = Buffer.from(response.data);
        } else {
            // The API answered with {"file_id": "..."} and the mp3 must be downloaded in a second step
            let answer: { file_id?: string };
            const text = Buffer.from(response.data).toString('utf8');
            try {
                answer = JSON.parse(text);
            } catch {
                throw new Error(`Unexpected answer from freetts.org: ${text.substring(0, 200)}`);
            }
            if (!answer?.file_id) {
                throw new Error(`No file ID received from freetts.org: ${text.substring(0, 200)}`);
            }

            try {
                const audio = await axios.get(`${FREETTS_URL}/api/audio/${answer.file_id}`, {
                    headers,
                    responseType: 'arraybuffer',
                    timeout: 30000,
                });
                buffer = Buffer.from(audio.data);
            } catch (error) {
                throw new Error(`Cannot download speech from freetts.org: ${Text2Speech.#getAxiosError(error)}`);
            }
        }

        if (buffer.length < 100) {
            throw new Error('Cannot get file: received file is too short');
        }
        fs.writeFileSync(this.#MP3FILE, buffer);
    }

    /**
     * Format the rate or the pitch in the notation expected by freetts.org, like "+10%" or "-5Hz".
     * Already formatted values are accepted too.
     *
     * @param value Value from the configuration
     * @param unit Unit expected by the API
     * @returns Value with sign and unit
     */
    static #formatFreeTtsValue(value: number | string | undefined, unit: '%' | 'Hz'): string {
        const num = parseInt(value as string, 10) || 0;
        return `${num >= 0 ? '+' : ''}${num}${unit}`;
    }

    /**
     * Extract a readable message from an axios error.
     * The body of an error answer is a buffer, because the requests are done with "responseType: arraybuffer".
     *
     * @param error Error thrown by axios
     * @returns Text of the error
     */
    static #getAxiosError(error: any): string {
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
    async #sayItGetSpeechYandexCloud(props: SayItProps): Promise<void> {
        if (props.language === 'ru' || props.language === 'ru_YA' || props.language === 'ru_YA_CLOUD') {
            props.language = 'ru-RU';
        }
        const yandexCloudVoice = props.testOptions?.yandexCloudVoice || this.#config.yandexCloudVoice || '';
        const yandexKey = props.testOptions?.yandexKey || this.#config.yandexKey;
        const yandexEmotion = props.testOptions?.yandexEmotion || this.#config.yandexEmotion;
        const yandexFolderID = props.testOptions?.yandexFolderID || this.#config.yandexFolderID;

        const params = new URLSearchParams();
        params.append('text', props.text);
        params.append('voice', yandexCloudVoice.replace(' Premium', ''));
        params.append('folderId', yandexFolderID || '');
        if (yandexEmotion !== 'none' && yandexEmotion) {
            params.append('emotion', yandexEmotion);
        }
        params.append('lang', props.language);

        const response = await axios.post(`https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize`, params, {
            headers: {
                Authorization: `Api-Key ${yandexKey}`,
            },
            responseType: 'arraybuffer',
        });

        if (!response.data || response.data.length < 100) {
            throw new Error('Cannot get file: received file is too short');
        }
        fs.writeFileSync(this.#MP3FILE, response.data, 'binary');
    }

    /**
     * Generate the mp3 file with the (old) Yandex API
     *
     * @param props Text, language and options of the task
     */
    async #sayItGetSpeechYandex(props: SayItProps): Promise<void> {
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
        const yandexDrunk =
            props.testOptions?.yandexDrunk !== undefined ? props.testOptions.yandexDrunk : this.#config.yandexDrunk;
        const yandexIll =
            props.testOptions?.yandexIll !== undefined ? props.testOptions.yandexIll : this.#config.yandexIll;
        const yandexRobot =
            props.testOptions?.yandexRobot !== undefined ? props.testOptions.yandexRobot : this.#config.yandexRobot;

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
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        if (!response.data || response.data.length < 100) {
            throw new Error('Cannot get file: received file is too short');
        }
        fs.writeFileSync(this.#MP3FILE, response.data, 'binary');
    }

    /**
     * Generate the mp3 file directly with the AWS Polly API
     *
     * @param props Text, language and options of the task
     */
    async #sayItGetSpeechPolly(props: SayItProps): Promise<void> {
        let _polly;
        if (props.testOptions) {
            _polly = new PollyClient({
                region: props.testOptions?.awsRegion || this.#config.awsRegion,
                credentials: {
                    accessKeyId: props.testOptions?.awsAccessKey || this.#config.awsAccessKey,
                    secretAccessKey: props.testOptions?.awsSecretKey || this.#config.awsSecretKey,
                },
            });
        } else {
            this.#polly ||= new PollyClient({
                region: this.#config.awsRegion,
                credentials: {
                    accessKeyId: this.#config.awsAccessKey,
                    secretAccessKey: this.#config.awsSecretKey,
                },
            });

            _polly = this.#polly;
        }

        let type: 'text' | 'ssml' = 'text';
        if (props.text.match(/<[-+\w\s'"=]+>/)) {
            if (!props.text.match(/^<speak>/)) {
                props.text = `<speak>${props.text}</speak>`;
            }
            type = 'ssml';
        }

        const engine = this.#getEngine(props.language);

        const pParams: SynthesizeSpeechCommandInput = {
            OutputFormat: 'mp3',
            Text: props.text,
            TextType: type,
            VoiceId: engine.ename || 'Marlene',
            Engine: engine.neural ? 'neural' : undefined,
        };
        const command = new SynthesizeSpeechCommand(pParams);

        const data = await _polly.send(command);
        const byteArray = data && data.AudioStream && (await data.AudioStream.transformToByteArray());

        // process data.
        if (!byteArray?.length) {
            throw new Error('No data received');
        } else {
            fs.writeFileSync(this.#MP3FILE, Buffer.from(byteArray));
        }
    }

    /**
     * Generate the mp3 file with the locally installed CoquiTTS (tts) and convert it with "lame" to mp3
     *
     * @param props Text, language and options of the task
     */
    async #sayItGetSpeechCoquiTTS(props: SayItProps): Promise<void> {
        props.language = props.language.substring(0, 2) as EngineType;
        const coquiVocoder = props.testOptions?.coquiVocoder || this.#config.coquiVocoder;
        if (!coquiVocoder) {
            throw new Error('No CoquiTTS model defined');
        }

        const args = ['--text', `. ${props.text} .`];

        if (coquiVocoder === 'default') {
            args.push('--model_name', `tts_models/${props.language}/${coquiVocoder.replace(' ', '/')}`);
        } else {
            let language: string = props.language;
            if (coquiVocoder === 'libri-tts wavegrad' || coquiVocoder === 'libri-tts fullband-melgan') {
                language = 'universal';
            }
            args.push('--model_name', `tts_models/${language}/${coquiVocoder.replace(' ', '/')}`);
            args.push('--vocoder_name', `vocoder_models/${language}/${coquiVocoder.replace(' ', '/')}`);
        }
        args.push('--out_path', this.#WAVFILE);

        try {
            await this.#spawn('tts', args);
        } catch (e) {
            throw new Error(`Cannot create (coqui) "say.wav": ${e}`);
        }
        try {
            await this.#spawn('lame', [this.#WAVFILE, this.#MP3FILE]);
        } catch (e) {
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
    #sendToPromise(adapter: string, command: string, message: any, timeout?: number): Promise<{ base64?: string }> {
        return this.#adapter.getForeignStateAsync(`system.adapter.${adapter}.alive`).then(state => {
            if (!state || !state.val) {
                return Promise.reject(new Error(`Instance "${adapter}" is not running`));
            }

            return new Promise<{ base64?: string }>((resolve, reject) => {
                let timer: NodeJS.Timeout | null = setTimeout(() => {
                    timer = null;
                    reject(new Error(`Timeout (${timeout || 5000} ms) by sendTo "${adapter}"`));
                }, timeout || 5000);

                this.#adapter.sendTo(adapter, command, message, response => {
                    const typedResponse = response as { error?: string; base64?: string };
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;

                        if (typedResponse?.error) {
                            reject(new Error(typedResponse.error));
                        } else {
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
    #getEngine(language: EngineType): (typeof sayitEngines)[string] {
        const engine = sayitEngines[language];
        if (!engine) {
            throw new Error(`Unknown engine: ${language as string}`);
        }
        return engine;
    }

    /**
     * Generate the mp3 file with the AWS Polly API over the ioBroker cloud (iobroker.net/iobroker.pro)
     *
     * @param props Text, language and options of the task
     */
    async #sayItGetSpeechCloud(props: SayItProps): Promise<void> {
        let type: 'text' | 'ssml' = 'text';
        if (props.text.match(/<[-+\w\s'"=]+>/)) {
            if (!props.text.match(/^<speak>/)) {
                props.text = `<speak>${props.text}</speak>`;
            }
            type = 'ssml';
        }

        const apiKey = props.testOptions?.cloudAppKey || this.#config.cloudAppKey;
        const cloudInstance = props.testOptions?.cloudInstance || this.#config.cloudInstance;
        const engine = this.#getEngine(props.language);
        let response: { base64?: string } = {};
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
            } else {
                cloudUrl = 'https://iobroker.net:3001';
            }

            const _response = await axios.post(`${cloudUrl}/api/v1/polly`, params, {
                headers: {
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
            });
            if (_response.data) {
                response = { base64: Buffer.from(_response.data, 'binary').toString('base64') };
            } else {
                throw new Error('No data received');
            }
        } else if (cloudInstance) {
            // send message to cloud instance
            response = await this.#sendToPromise(
                cloudInstance,
                'tts',
                {
                    text: props.text,
                    voiceId: engine.ename,
                    textType: type,
                    engine: engine.neural ? 'neural' : undefined,
                },
                10000,
            );
        } else {
            throw new Error('No cloud instance or app key defined');
        }

        if (!response.base64) {
            throw new Error('No data received');
        }
        fs.writeFileSync(this.#MP3FILE, Buffer.from(response.base64, 'base64'));
    }

    /**
     * Generate the mp3 file with the locally installed PicoTTS and convert it with "lame" to mp3
     *
     * @param text Text to say
     * @param language Language of the text, like "de-DE"
     */
    async #sayItGetSpeechPicoTTS(text: string, language: EngineType): Promise<void> {
        try {
            await this.#spawn('pico2wave', ['-l', language, '-w', this.#WAVFILE, text]);
        } catch (e) {
            throw new Error(`Cannot create (pico2wave) "say.wav": ${e}`);
        }
        try {
            await this.#spawn('lame', [this.#WAVFILE, this.#MP3FILE]);
        } catch (e) {
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
    async getDuration(fileName: string): Promise<number | null> {
        // create a new parser from a node ReadStream
        if (fileName === this.#config.announce && this.#config.annoDuration) {
            return (this.#config.annoDuration as number) - 1;
        }

        if (fs.existsSync(fileName)) {
            if (fileName.endsWith('.mp3')) {
                return new Promise<number>(resolve =>
                    mp3Duration(fileName, (err: Error | null, duration?: number) => {
                        if (err || duration === undefined) {
                            try {
                                const stat = fs.statSync(fileName);
                                const size = stat.size;
                                resolve(Math.ceil(size / 4096));
                            } catch {
                                this.#adapter.log.warn(`Cannot read length of file ${fileName}`);
                                resolve(0);
                            }
                        } else {
                            resolve(Math.ceil(duration));
                        }
                    }),
                );
            }
            try {
                const stat = fs.statSync(fileName);
                const size = stat.size;
                return Math.ceil(size / 4096);
            } catch {
                this.#adapter.log.warn(`Cannot read length of file ${fileName}`);
                return 0;
            }
        }
        // Maybe the file is stored in the ioBroker file storage
        const data = await this.#getFileInStates(fileName);

        if (data) {
            if (fileName.endsWith('.mp3')) {
                return new Promise(resolve =>
                    mp3Duration(data, (err: Error | null, duration?: number) => {
                        if (err || duration === undefined) {
                            // Estimate the duration from the size of the file
                            resolve(Math.ceil(data.length / 4096));
                        } else {
                            resolve(Math.ceil(duration));
                        }
                    }),
                );
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
    async sayItGetSpeech(props: SayItProps): Promise<string> {
        if (this.#config.cache && !props.testOptions) {
            const md5filename = this.#isCached(`${props.language};${props.text}`);

            if (md5filename) {
                return md5filename;
            }
            this.#adapter.log.debug(`Cache file for "${props.language};${props.text}" not found`);
        }

        if (sayitEngines[props.language]?.engine) {
            if (!sayitEngines[props.language].ssml) {
                // remove SSML
                props.text = props.text.replace(/<\/?[-+\w\s'"=]+>/g, '');
            }

            const engine = sayitEngines[props.language].engine;

            if (engine === 'google') {
                await this.#sayItGetSpeechGoogle(props);
            } else if (engine === 'yandex') {
                await this.#sayItGetSpeechYandex(props);
            } else if (engine === 'yandexCloud') {
                await this.#sayItGetSpeechYandexCloud(props);
            } else if (engine === 'polly') {
                await this.#sayItGetSpeechPolly(props);
            } else if (engine === 'CoquiTTS') {
                await this.#sayItGetSpeechCoquiTTS(props);
            } else if (engine === 'cloud') {
                await this.#sayItGetSpeechCloud(props);
            } else if (engine === 'PicoTTS') {
                await this.#sayItGetSpeechPicoTTS(props.text, props.language);
            } else if (engine === 'freeTTS') {
                await this.#sayItGetSpeechFreeTTS(props);
            } else {
                throw new Error(`Engine ${engine as string} not yet supported.`);
            }
        } else {
            // fallback to google
            await this.#sayItGetSpeechGoogle(props);
        }

        // The test files are generated with the settings of the configuration dialog and not with the
        // saved ones, so they must not be stored in the cache of the saved configuration
        if (this.#config.cache && !props.testOptions) {
            this.#cacheFile(props.text, props.language, this.#getCachedFileName(`${props.language};${props.text}`));
        }

        return this.#MP3FILE;
    }
}
