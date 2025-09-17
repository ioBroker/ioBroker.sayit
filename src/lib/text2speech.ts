import fs from 'node:fs';
// @ts-expect-error no typings
import mp3Duration from 'mp3-duration';
import { sayitEngines } from './engines';
import { URLSearchParams } from 'node:url';
import { PollyClient, SynthesizeSpeechCommand, type SynthesizeSpeechCommandInput } from '@aws-sdk/client-polly';
import axios from 'axios';
import { exec } from 'node:child_process';
import { getAudioBase64 } from 'google-tts-api';
import type { EngineType, SayItAdapterConfig, SayItProps } from '../types';

export default class Text2Speech {
    #adapter: ioBroker.Adapter;
    #addToQueue: (props: SayItProps) => Promise<void>;
    #getCachedFileName: (text: string) => string;
    #isCached: (text: string) => string | false;
    #MP3FILE: string;
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
        this.#polly = null;
        this.#config = adapter.config as SayItAdapterConfig;
    }

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

    static splitText(text: string, max?: number): string[] {
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
                    } else {
                        result[i] += ` ${_parts[w]}`;
                    }
                }
            }
            return result;
        }
        return [text];
    }

    #cacheFile(text: string, language: EngineType, md5filename: string): void {
        if (this.#config.cache) {
            const stat = fs.statSync(this.#MP3FILE);
            if (stat.size < 100) {
                this.#adapter.log.warn(`Received file is too short: ${fs.readFileSync(this.#MP3FILE).toString()}`);
            } else {
                this.#adapter.log.debug(`Caching File ${md5filename} for "${language};${text}" now`);
                try {
                    fs.copyFileSync(this.#MP3FILE, md5filename);
                } catch (error) {
                    this.#adapter.log.error(error);
                }
            }
        }
    }

    async #exec(cmd: string, args?: string[], cwd?: string): Promise<void> {
        return new Promise<void>((resolve: null | (() => void), reject: null | ((error: Error) => void)) => {
            try {
                const _cmd = `${cmd}${args?.length ? ` ${args.join(' ')}` : ''}`;
                this.#adapter.log.debug(`Execute ${cmd} ${args?.length ? args.join(' ') : ''}`);
                const ls = exec(_cmd, { cwd }, code => {
                    if (!code) {
                        resolve?.();
                    } else {
                        reject?.(new Error(`Exit code: ${code.code}`));
                    }
                    reject = null;
                    resolve = null;
                });

                ls.on('error', e =>
                    this.#adapter.log.error(`sayIt.play: there was an error while playing the file: ${e.toString()}`),
                );

                ls.stdout?.on('data', data => this.#adapter.log.debug(`stdout: ${data}`));
                ls.stderr?.on('data', data => this.#adapter.log.error(`stderr: ${data}`));
            } catch (e) {
                reject?.(e as Error);
                reject = null;
                resolve = null;
            }
        });
    }

    async #sayItGetSpeechGoogle(props: SayItProps): Promise<void> {
        if (!props.text.length) {
            throw new Error('No text to speak');
        }

        if (props.text.length > 70) {
            const parts = Text2Speech.splitText(props.text);
            try {
                for (let t = 1; t < parts.length; t++) {
                    await this.#addToQueue({
                        ...props,
                        text: parts[t],
                    });
                }
            } catch (error) {
                console.error('Cannot add to queue', error);
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
            fs.writeFileSync(this.#MP3FILE, buf as any, 'binary');
        }
    }

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
            props.testOptions?.yandexDrunk !== undefined
                ? props.testOptions?.yandexDrunk
                : this.#config.yandexDrunk;
        const yandexIll =
            props.testOptions?.yandexIll !== undefined
                ? props.testOptions?.yandexIll
                : this.#config.yandexIll || this.#config.yandexIll;
        const yandexRobot =
            props.testOptions?.yandexRobot !== undefined
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
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        if (!response.data || response.data.length < 100) {
            throw new Error('Cannot get file: received file is too short');
        }
        fs.writeFileSync(this.#MP3FILE, response.data, 'binary');
    }

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

        const pParams: SynthesizeSpeechCommandInput = {
            OutputFormat: 'mp3',
            Text: props.text,
            TextType: type || 'text',
            VoiceId: sayitEngines[props.language].ename || 'Marlene',
            Engine: sayitEngines[props.language].neural ? 'neural' : undefined,
        };
        const command = new SynthesizeSpeechCommand(pParams);

        const data = await _polly.send(command);
        const byteArray = data && data.AudioStream && (await data.AudioStream.transformToByteArray());

        // process data.
        if (!byteArray?.length) {
            throw new Error('No data received');
        } else {
            fs.writeFileSync(this.#MP3FILE, Buffer.from(byteArray) as any, 'binary');
        }
    }

    async #sayItGetSpeechCoquiTTS(props: SayItProps): Promise<void> {
        props.language = props.language.substring(0, 2) as EngineType;
        let cmd;
        const coquiVocoder = props.testOptions?.coquiVocoder || this.#config.coquiVocoder;
        if (coquiVocoder === 'default') {
            cmd = `tts --text ". ${props.text} ." --model_name  tts_models/${props.language}/${coquiVocoder.replace(' ', '/')} --out_path ${__dirname}/say.wav`;
        } else {
            let language: string = props.language;
            if (coquiVocoder === 'libri-tts wavegrad' || coquiVocoder === 'libri-tts fullband-melgan') {
                language = 'universal';
            }
            cmd = `tts --text ". ${props.text} ." --model_name  tts_models/${language}/${coquiVocoder.replace(' ', '/')} --vocoder_name vocoder_models/${language}/${coquiVocoder.replace(' ', '/')} --out_path ${__dirname}/say.wav`;
        }
        try {
            await this.#exec(cmd);
        } catch (e) {
            throw new Error(`Cannot create (coqui) "say.wav": ${e}`);
        }
        try {
            await this.#exec(`lame ${__dirname}/say.wav ${this.#MP3FILE}`);
        } catch (e) {
            throw new Error(`Cannot create (lame) "say.mp3": ${e}`);
        }
    }

    #sendToPromise(adapter: string, command: string, message: any, timeout?: number): Promise<{ base64?: string }> {
        return this.#adapter.getForeignStateAsync(`system.adapter.${adapter}.alive`).then(state => {
            if (!state || !state.val) {
                return Promise.reject(new Error(`Instance "${adapter}" is not running)`));
            }

            return new Promise<{ base64?: string }>((resolve, reject) => {
                let timer: NodeJS.Timeout | null = setTimeout(() => {
                    timer = null;
                    reject(new Error(`Timeout (${timeout} ms) by sendTo "${adapter}"`));
                }, timeout || 5000);

                this.#adapter.sendTo(adapter, command, message, response => {
                    const typedResponse = response as { error?: string; base64?: string };
                    if (timer) {
                        if (timer) {
                            clearTimeout(timer);
                            timer = null;
                        }
                        if (typedResponse.error) {
                            reject(new Error(typedResponse.error));
                        } else {
                            resolve(typedResponse);
                        }
                    }
                });
            });
        });
    }

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
        let response: { base64?: string } = {};
        if (apiKey) {
            let cloudUrl;

            const params = {
                text: props.text,
                apiKey,
                textType: type,
                voiceId: sayitEngines[props.language].ename,
                engine: sayitEngines[props.language].neural ? 'neural' : undefined,
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
                    voiceId: sayitEngines[props.language].ename,
                    textType: type,
                    engine: sayitEngines[props.language].neural ? 'neural' : undefined,
                },
                10000,
            );
        } else {
            throw new Error('No cloud instance or app key defined');
        }

        if (!response.base64) {
            throw new Error('No data received');
        }
        fs.writeFileSync(this.#MP3FILE, Buffer.from(response.base64, 'base64') as any, 'binary');
    }

    async #sayItGetSpeechPicoTTS(text: string, language: EngineType): Promise<void> {
        try {
            await this.#exec(`pico2wave -l ${language} -w ${__dirname}/say.wav "${text}"`);
        } catch (e) {
            throw new Error(`Cannot create (pico2wave) "say.wav": ${e}`);
        }
        try {
            await this.#exec(`lame ${__dirname}/say.wav ${this.#MP3FILE}`);
        } catch (e) {
            throw new Error(`Cannot create (lame) "say.mp3": ${e}`);
        }
    }

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
        const data = await this.#getFileInStates(fileName);

        if (data) {
            if (fileName.endsWith('.mp3')) {
                return new Promise(resolve =>
                    mp3Duration(data, (err: Error | null, duration?: number) => {
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
                const size = data.length;
                return Math.ceil(size / 4096);
            } catch {
                this.#adapter.log.warn(`Cannot read length of file ${fileName}`);
                return 0;
            }
        }
        return 0;
    }

    async sayItGetSpeech(props: SayItProps): Promise<string> {
        if (this.#config.cache && !props.testOptions) {
            const md5filename = this.#isCached(`${props.language};${props.text}`);

            if (md5filename) {
                return md5filename;
            }
            this.#adapter.log.debug(`Cache File ${md5filename} for "${props.language};${props.text}" not found`);
        }

        if (sayitEngines[props.language] && sayitEngines[props.language].engine) {
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
            } else {
                throw new Error(`Engine ${engine as string} not yet supported.`);
            }
        } else {
            // fallback to google
            await this.#sayItGetSpeechGoogle(props);
        }

        if (this.#config.cache) {
            this.#cacheFile(props.text, props.language, this.#getCachedFileName(`${props.language};${props.text}`));
        }

        return this.#MP3FILE;
    }
}
