import {
    existsSync,
    mkdirSync,
    writeFileSync,
    statSync,
    unlinkSync,
    readFileSync,
    readdirSync,
    lstatSync,
} from 'node:fs';
import { normalize, join } from 'node:path';
import { createHash } from 'node:crypto';
import { sayitOptions } from './lib/engines';
import Text2Speech from './lib/text2speech';
import Speech2Device from './lib/speech2device';
import { Adapter, type AdapterOptions, getAbsoluteDefaultDataDir } from '@iobroker/adapter-core';
import type { EngineType, SayItAdapterConfig, SayItDeviceProps, SayItProps, TestOptions } from './types';

interface Service {
    addresses: string[];
    flags: number;
    fullname: string;
    host: string;
    interfaceIndex: number;
    name?: string | undefined;
    rawTxtRecord?: Buffer | undefined;
    txtRecord?: any;
    networkInterface: string;
    port: number;
    replyDomain: string;
}

interface Browser extends NodeJS.EventEmitter {
    start(): any;
    stop(): any;
    on(event: 'error', listener: (error: string) => void): this;
    on(event: 'serviceUp', listener: (info: Service) => void): this;
    on(event: 'serviceDown', listener: (info: Service) => void): this;
}

export class SayItAdapter extends Adapter {
    declare config: SayItAdapterConfig;
    private dataDir = join(getAbsoluteDefaultDataDir(), 'sayit');

    private processMessageTimeout: NodeJS.Timeout | null = null;
    private timeoutRunning: NodeJS.Timeout | null = null;
    private lang!: ioBroker.Languages;

    private sayLastGeneratedText = '';
    private lastSay: number | null = null;
    private fileExt = 'mp3';
    private text2speech: Text2Speech | null = null;
    private speech2device: null | Speech2Device = null;
    private MP3FILE!: string;
    private readonly tasks: {
        ts: number;
        combined: string;
        text: string;
        volume?: number;
        language: EngineType;
        onlyCache?: boolean;
        testOptions?: SayItProps['testOptions'];
    }[] = [];
    private processing = false;
    private helloCounter = 1;
    private cacheDir: string = '';
    private outFileExt: string = 'mp3';
    private webLink: string = '';
    private options!: {
        addToQueue: (props: SayItProps) => Promise<void>;
        getCachedFileName: (text: string) => string;
        isCached: (text: string) => string | false;
        MP3FILE: string;
        outFileExt: string;
        webLink: string;
        sayLastVolume: number;
        getWebLink: (
            instance: ioBroker.InstanceObject,
            webServer: string,
            webInstance: `${string}.${number}`,
        ) => string;
    };

    public constructor(options: Partial<AdapterOptions> = {}) {
        super({
            ...options,
            name: 'sayit',
            ready: () => this.main(),
            message: (obj: ioBroker.Message) => obj && this.processMessage(obj),
            stateChange: (id, state) => {
                if (state && !state.ack) {
                    if (id === `${this.namespace}.tts.clearQueue`) {
                        if (this.tasks.length > 1) {
                            this.tasks.splice(1);
                            void this.setState('tts.clearQueue', false, true);
                        }
                    } else if (id === `${this.namespace}.tts.volume`) {
                        if (this.config.type === 'system') {
                            void this.speech2device
                                ?.sayItSystemVolume(state.val as number | string)
                                .catch((err: Error) => this.log.error(`Cannot set volume: ${err}`));
                        } else {
                            this.options.sayLastVolume = parseInt(state.val as string, 10);
                        }
                    } else if (id === `${this.namespace}.tts.text`) {
                        if (typeof state.val !== 'string') {
                            if (state.val === null || state.val === undefined) {
                                return this.log.warn('Cannot cache empty text');
                            }
                            state.val = state.val.toString();
                        }

                        this.addToQueue({ text: state.val }).catch(e =>
                            this.log.error(`Cannot add to queue ${e.toString()}`),
                        );
                    } else if (id === `${this.namespace}.tts.cachetext`) {
                        if (typeof state.val !== 'string') {
                            if (state.val === null || state.val === undefined) {
                                return this.log.warn('Cannot cache empty text');
                            }
                            state.val = state.val.toString();
                        }

                        this.addToQueue({ text: state.val }, true).catch(e =>
                            this.log.error(`Cannot add to queue ${e.toString()}`),
                        );
                    }
                }
            },
            objectChange: (id, obj) => {
                if (id === `system.adapter.${this.config.webInstance}`) {
                    this.webLink = this.getWebLink(
                        obj as ioBroker.InstanceObject,
                        this.config.webServer,
                        this.config.webInstance,
                    );
                }
            },
            unload: (callback: () => void): void => this.stopInstance(true, callback),
        });
        process.on('SIGINT', this.stopInstance);
    }

    async browseMdns(obj: ioBroker.Message): Promise<void> {
        try {
            const mdns = await import('mdns');
            let browser: Browser | null = mdns.default.createBrowser(mdns.tcp('googlecast'));

            const result: { name: string; ip: string }[] = [];
            browser.on('serviceUp', service =>
                result.push({ name: service.name || service.fullname, ip: service.addresses[0] }),
            );
            browser.on('error', (err: string) => this.log.error(`Error on MDNS discovery: ${err}`));
            this.processMessageTimeout = setTimeout(() => {
                this.processMessageTimeout = null;
                if (browser) {
                    browser.stop();
                    browser = null;
                }
                if (obj.command === 'browseGoogleHome') {
                    this.sendTo(
                        obj.from,
                        obj.command,
                        result.map(s => ({ label: `${s.name}[${s.ip}]`, value: s.ip })),
                        obj.callback,
                    );
                } else {
                    this.sendTo(obj.from, obj.command, result, obj.callback);
                }
            }, 2000);

            browser.start();
        } catch (e) {
            this.log.debug(`Cannot browse mdns: ${e}`);
            this.sendTo(obj.from, obj.command, null, obj.callback);
        }
    }

    processMessage(obj: ioBroker.Message): void {
        if (obj.command === 'say') {
            const text: string | undefined = obj.message?.text as string;
            const language: EngineType | undefined = obj.message?.language as EngineType;
            const volume = obj.message?.volume ? parseInt(obj.message.volume as string, 10) : undefined;
            const browserVis = obj.message?.browserVis as '' | '1' | '2';
            const browserInstance = obj.message?.browserInstance as string;
            const sonosDevice = obj.message?.sonosDevice as string;
            const heosDevice = obj.message?.heosDevice as string;
            const mpdInstance = obj.message?.mpdInstance as `${string}.${number}`;
            const chromecastDevice = obj.message?.chromecastDevice as string;

            if (text) {
                if (obj.callback) {
                    const testOptions: TestOptions = { ...obj.message };
                    testOptions.callback = (error?: string): void => {
                        this.sendTo(obj.from, obj.command, { error, result: error ? undefined : 'Ok' }, obj.callback);
                    };
                    this.addToQueue({ text, language, volume, testOptions }).catch(e =>
                        this.log.error(`Cannot add to queue ${e}`),
                    );
                } else {
                    this.addToQueue({
                        text,
                        language,
                        volume,
                        testOptions: {
                            engine: language,
                            type: this.config.type,
                            browserVis,
                            sonosDevice,
                            heosDevice,
                            mpdInstance,
                            browserInstance,
                            chromecastDevice,
                        },
                    }).catch(e => this.log.error(`Cannot add to queue ${e.toString()}`));
                }
            } else {
                this.sendTo(obj.from, obj.command, { error: 'No text' }, obj.callback);
            }
        } else if (obj.command === 'stopInstance') {
            this.stopInstance(false, () => {
                if (obj.callback) {
                    this.sendTo(obj.from, obj.command, null, obj.callback);
                }
            });
        } else if (obj.callback && obj.command === 'browseGoogleHome') {
            this.browseMdns(obj).catch(e => {
                this.log.debug(`Cannot browse mdns: ${e}`);
                if (obj.callback) {
                    this.sendTo(obj.from, obj.command, null, obj.callback);
                }
            });
        } else if (obj.callback && obj.command === 'browseChromecast') {
            this.getObjectView(
                'system',
                'device',
                { startkey: 'chromecast.', endkey: 'chromecast.\u9999' },
                (err, res) => {
                    const list: { value: string; label: string }[] = [];
                    if (!err && res) {
                        res.rows.forEach(row => {
                            let name = row.value?.common?.name;
                            if (typeof name === 'object') {
                                name = name[this.lang] || name.en;
                            }

                            list.push({ value: row.id, label: `${name} [${row.id}]` });
                        });
                    }
                    this.sendTo(obj.from, obj.command, list, obj.callback);
                },
            );
        } else if (obj.callback && obj.command === 'browseHeos') {
            this.getObjectView('system', 'device', { startkey: 'heos.', endkey: 'heos.\u9999' }, (err, res) => {
                const list: { value: string; label: string }[] = [];
                res?.rows.forEach(row => {
                    let name = row.value?.common?.name;
                    if (typeof name === 'object') {
                        name = name[this.lang] || name.en;
                    }
                    if (row.id.includes('.players.')) {
                        list.push({
                            value: row.id,
                            label: `${row.id.replace(/^heos\.\d+\.players\./, '')} [${name}]`,
                        });
                    }
                });
                this.sendTo(obj.from, obj.command, list, obj.callback);
            });
        } else if (obj.callback && obj.command === 'browseSonos') {
            this.getObjectView('system', 'device', { startkey: 'sonos.', endkey: 'heos.\u9999' }, (err, res) => {
                const list: { value: string; label: string }[] = [];
                res?.rows.forEach(row => {
                    let name = row.value?.common?.name;
                    if (typeof name === 'object') {
                        name = name[this.lang] || name.en;
                    }
                    if (row.id.includes('.players.')) {
                        list.push({
                            value: row.id,
                            label: `${row.id.replace(/^sonos\.\d+\.root\./, '')} [${name}]`,
                        });
                    }
                });
                this.sendTo(obj.from, obj.command, list, obj.callback);
            });
        } else if (obj.callback && obj.command === 'test') {
            const language = (obj.message?.engine || this.config.engine).substring(0, 2);
            let text = 'Hello';
            if (language === 'de') {
                text = 'Hallo';
            } else if (language === 'pl') {
                text = 'Cześć';
            } else if (language === 'uk') {
                text = 'Привіт';
            } else if (language === 'ru') {
                text = 'Привет';
            } else if (language === 'it') {
                text = 'Ciao';
            } else if (language === 'pt') {
                text = 'Olá';
            } else if (language === 'es') {
                text = 'Hola';
            } else if (language === 'fr') {
                text = 'Bonjour';
            } else if (language === 'nl') {
                text = 'Hallo';
            } else if (language === 'zh') {
                text = '你好';
            }
            text += ` ${this.helloCounter++}`;
            const testOptions = { ...obj.message };
            if (obj.callback) {
                testOptions.callback = (error?: string): void => {
                    this.sendTo(obj.from, obj.command, { error, result: error ? undefined : 'Ok' }, obj.callback);
                };
            }

            this.addToQueue({ text, testOptions }).catch(e => this.log.error(`Cannot add to queue ${e}`));
        }
    }

    stopInstance = (unload?: boolean, callback?: () => void): void => {
        if (this.processMessageTimeout) {
            clearTimeout(this.processMessageTimeout);
            this.processMessageTimeout = null;
        }

        if (this.timeoutRunning) {
            clearTimeout(this.timeoutRunning);
            this.timeoutRunning = null;
        }

        try {
            this?.log?.info?.('stopping...');
        } catch {
            // ignore
        }

        if (typeof callback === 'function') {
            callback();
        }

        if (!unload) {
            setTimeout(() => (this.terminate ? this.terminate() : process.exit()), 500);
        }
    };

    static mkpathSync(rootPath: string, dirPath: string): void {
        // Remove filename
        const dirPathArr = dirPath.split('/');
        dirPathArr.pop();
        if (!dirPathArr.length) {
            return;
        }

        for (let i = 0; i < dirPathArr.length; i++) {
            rootPath += `${dirPathArr[i]}/`;
            if (!existsSync(rootPath)) {
                if (dirPathArr[i] !== '..') {
                    mkdirSync(rootPath);
                } else {
                    throw new Error(`Cannot create ${rootPath}${dirPathArr.join('/')}`);
                }
            }
        }
    }

    addToQueue = async (
        props: Omit<SayItProps, 'type' | 'language'> & { type?: SayItAdapterConfig['type']; language?: EngineType },
        onlyCache?: boolean,
    ): Promise<void> => {
        // Extract language from "en;volume;Text to say"
        if (props.text.includes(';')) {
            const arr = props.text.split(';', 3);
            // If "language;text" or "volume;text"
            if (arr.length === 2) {
                // If number
                if (parseInt(arr[0]).toString() === arr[0].toString()) {
                    props.volume = parseInt(arr[0].trim(), 10);
                } else {
                    props.language = arr[0].trim() as EngineType;
                }
                props.text = arr[1].trim();
            } else if (arr.length === 3) {
                // If language;volume;text or volume;language;text
                // If number
                if (parseInt(arr[0]).toString() === arr[0].toString()) {
                    props.volume = parseInt(arr[0].trim(), 10);
                    props.language = arr[1].trim() as EngineType;
                } else {
                    props.volume = parseInt(arr[1].trim(), 10);
                    props.language = arr[0].trim() as EngineType;
                }
                props.text = arr[2].trim();
            }
        }

        // Workaround for double text
        // find all similar texts with interval less han 500 ms
        const combined = [props.text, props.language || '', props.volume || ''].filter(t => t).join(';');
        if (this.tasks.find(task => task.combined === combined && Date.now() - task.ts < 500)) {
            // ignore it
            return;
        }

        const highPriority = props.text.startsWith('!');

        props.volume ||= parseInt(this.config.volume as string, 10);
        if (Number.isNaN(props.volume)) {
            props.volume = undefined;
        }
        if (props.volume === undefined || props.volume === null) {
            try {
                const state = await this.getStateAsync('tts.volume');
                if (state?.val) {
                    props.volume = parseInt(state.val as string, 10);
                }
            } catch {
                // ignore
            }
        }

        let announce = props.testOptions?.announce !== undefined ? props.testOptions.announce : this.config.announce;
        const annoTimeout = parseInt(
            props.testOptions?.annoTimeout !== undefined
                ? (props.testOptions.annoTimeout as string)
                : (this.config.annoTimeout as string),
            10,
        );

        const task: {
            ts: number;
            combined: string;
            text: string;
            volume?: number;
            language: EngineType;
            onlyCache?: boolean;
            testOptions?: SayItProps['testOptions'];
        } = {
            text: props.text,
            language: props.language || (props.testOptions && props.testOptions.engine) || this.config.engine,
            volume: props.volume,
            onlyCache,
            ts: Date.now(),
            combined,
            testOptions: props.testOptions,
        };

        // If more time than 15 seconds till last text, add announcement
        if (
            !onlyCache &&
            announce &&
            !this.tasks.length &&
            (!this.lastSay || Date.now() - this.lastSay > annoTimeout * 1000)
        ) {
            if (props.testOptions) {
                await this.prepareAnnounceFiles(props.testOptions);
            }
            const annoVolumeInPercent = parseInt(
                props.testOptions?.annoVolume !== undefined
                    ? (props.testOptions.annoVolume as string)
                    : (this.config.annoVolume as string),
                10,
            );
            announce = props.testOptions?.announce !== undefined ? props.testOptions.announce : this.config.announce;

            // We take the percent from actual volume
            const annoVolume = Math.round(((props.volume || 70) / 100) * (annoVolumeInPercent || 50));
            // place as first the announcement mp3
            this.tasks.push({
                combined: [announce, task.language, annoVolume].filter(t => t).join(';'),
                text: announce,
                language: task.language,
                volume: annoVolume,
                ts: task.ts,
                testOptions: props.testOptions,
            });
            // and then text
            this.tasks.push(task);
        } else if (!onlyCache && highPriority) {
            this.tasks.unshift(task);
        } else {
            this.tasks.push(task);
        }

        this.processTasks().catch(() => {});
    };

    getCachedFileName = (text: string): string => {
        return normalize(join(this.cacheDir, `${createHash('md5').update(text).digest('hex')}.${this.fileExt}`));
    };

    isCached = (text: string): string | false => {
        const md5filename = this.getCachedFileName(text);

        if (existsSync(md5filename)) {
            if (this.config.cacheExpiryDays) {
                const fileStat = statSync(md5filename);
                if (
                    fileStat.ctime &&
                    Date.now() - new Date(fileStat.ctime).getTime() > this.config.cacheExpiryDays * 1000 * 60 * 60 * 24
                ) {
                    this.log.info('Cached File expired, remove and re-generate');
                    unlinkSync(md5filename);
                    return false;
                }
            }
            return md5filename;
        }

        return false;
    };

    async processTasks(): Promise<void> {
        if (this.processing) {
            return;
        }
        this.processing = true;
        const { onlyCache, testOptions } = this.tasks[0];
        let { text, language, volume } = this.tasks[0];
        let error: string | undefined;

        if (text[0] === '!') {
            text = text.substring(1);
        }
        const type = testOptions?.type || this.config.type;

        if (volume === undefined || volume === null) {
            try {
                const state = await this.getStateAsync('tts.volume');
                if (state?.val) {
                    volume = parseInt(state.val as string, 10);
                }
            } catch {
                // ignore
            }
        }

        volume ||= parseInt((testOptions?.volume as string) || (this.config.volume as string), 10);
        if (Number.isNaN(volume)) {
            volume = undefined;
        }

        let fileName: string | undefined;

        // find out if say.mp3 must be generated
        const isGenerate = !Speech2Device.isPlayFile(text) && sayitOptions[type].mp3Required;

        language ||= (testOptions && testOptions.engine) || this.config.engine;

        // if no text => does not process
        if (isGenerate && text.length && this.text2speech && this.speech2device) {
            // Check: may be it is a file from DB filesystem, like /vis.0/main/img/door-bell.mp3
            if (text[0] === '/') {
                let fileNameTemp: string | false | undefined;
                if (!testOptions && (this.config.cache || onlyCache)) {
                    fileNameTemp = this.isCached(text);
                }

                if (!fileNameTemp) {
                    const parts = text.split('/');
                    const _adapter = parts[0];
                    parts.shift();
                    const _path = parts.join('/');

                    let data: { file: string | Buffer; mimeType?: string } | undefined;

                    try {
                        data = await this.readFileAsync(_adapter, _path);
                    } catch {
                        // this.log.error(`Cache file does not exist "${text}": ${e.toString()}`);
                    }

                    if (!data) {
                        // maybe the file is from real FS
                        if (existsSync(text)) {
                            try {
                                data = { file: readFileSync(text) };
                            } catch (e) {
                                this.log.error(`Cannot read file "${text}": ${e.toString()}`);
                            }
                        } else {
                            this.log.warn(`File "${text}" not found`);
                        }
                    }

                    if (data?.file) {
                        try {
                            // Cache the file
                            if (this.config.cache || onlyCache) {
                                // get file name for cache
                                fileName = this.getCachedFileName(text);
                            } else {
                                fileName = this.MP3FILE;
                            }
                            writeFileSync(fileName, data.file as any);
                        } catch (e) {
                            this.log.error(`Cannot write file "${this.MP3FILE}": ${e.toString()}`);
                        }
                    }
                } else {
                    fileName = fileNameTemp;
                }
            }

            this.log.info(`saying: ${text}`);

            // If a text first must be generated, and it is different from the last one
            if (!fileName && isGenerate) {
                // do not cache if test options active, to test the voice generation too
                if (this.sayLastGeneratedText !== `[${language}]${text}` || testOptions) {
                    if (this.config.cache && !testOptions) {
                        const md5filename = this.isCached(`${language};${text}`);
                        if (md5filename) {
                            fileName = md5filename;
                        }
                    }

                    if (!fileName) {
                        try {
                            fileName = await this.text2speech.sayItGetSpeech({
                                type,
                                text,
                                language,
                                volume,
                                testOptions,
                            });
                            this.sayLastGeneratedText = `[${language}]${text}`;
                        } catch (e) {
                            fileName = '';
                            error = `Cannot generate speech file: ${e}`;
                            this.log.error(error);
                        }
                    }
                } else {
                    fileName = this.MP3FILE;
                }
            }
        }

        const props: SayItDeviceProps = { type, text, language, volume, testOptions, duration: 0 };

        if (!onlyCache && text.length) {
            await this.setStateAsync('tts.playing', true, true);
            try {
                // play file
                if (fileName && this.text2speech && this.speech2device) {
                    props.duration = (await this.text2speech.getDuration(fileName)) || 0;
                    props.fileName = fileName;
                    await this.speech2device.playFile(props);
                } else if (!isGenerate) {
                    if (Speech2Device.isPlayFile(text) && this.text2speech) {
                        props.duration = (await this.text2speech.getDuration(text)) || 0;
                    }

                    await this.speech2device?.playFile(props);
                }
                this.lastSay = Date.now();
            } catch (e) {
                error = `Cannot play file: ${e}`;
                this.log.error(error);
            }
            await this.setStateAsync('tts.playing', false, true);
        }

        if (this.tasks[0]?.testOptions?.callback) {
            this.tasks[0].testOptions.callback(error);
            this.tasks[0].testOptions.callback = undefined;
        }

        this.tasks.shift();

        if (this.tasks.length) {
            this.timeoutRunning = setTimeout(
                () => {
                    this.timeoutRunning = null;
                    this.processing = false;
                    this.processTasks().catch(e => this.log.error(`Cannot process tasks: ${e.toString()}`));
                },
                100 + props.duration * 1000,
            );
        } else {
            this.processing = false;
        }
    }

    async uploadFile(file: string): Promise<void> {
        try {
            const stat = statSync(join(`${__dirname}/mp3/`, file));

            if (!stat.isFile()) {
                // ignore not a file
                return;
            }
        } catch {
            // ignore not a file
            return;
        }

        let data;
        try {
            data = await this.readFileAsync(this.namespace, `tts.userfiles/${file}`);
        } catch {
            // ignore error
        }

        if (!data) {
            try {
                data = readFileSync(join(`${__dirname}/mp3/`, file));
                this.log.debug(`Upload file: ${join(`${__dirname}/mp3/`, file)} (${data.length} bytes`);
                await this.writeFileAsync(this.namespace, `tts.userfiles/${file}`, data);
            } catch (e) {
                this.log.error(`Cannot write file "${__dirname}/mp3/${file}": ${e.toString()}`);
            }
        }
    }

    async uploadFiles(): Promise<void> {
        if (existsSync(`${__dirname}/mp3`)) {
            this.log.info('Upload announce mp3 files');
            let obj;
            try {
                obj = await this.getForeignObjectAsync(this.namespace);
            } catch {
                // ignore
            }

            if (!obj) {
                await this.setForeignObjectAsync(this.namespace, {
                    type: 'meta',
                    common: {
                        name: 'User files for SayIt',
                        type: 'meta.user',
                    },
                    native: {},
                });
            }

            const files = readdirSync(`${__dirname}/mp3`);
            for (let f = 0; f < files.length; f++) {
                await this.uploadFile(files[f]);
            }
        }
    }

    async prepareAnnounceFiles(config: {
        announce?: string;
        annoDuration?: number | string;
        annoTimeout?: number | string;
        annoVolume?: number | string;
    }): Promise<void> {
        if (config.announce) {
            config.annoDuration = parseInt(config.annoDuration as string) || 0;
            config.annoTimeout = parseInt(config.annoTimeout as string) || 15;
            config.annoVolume = parseInt(config.annoVolume as string) || 70; // percent from actual volume

            // remove "tts.userfiles/" from file name
            const fileName = config.announce.split('/').pop();

            if (fileName && !existsSync(join(__dirname, fileName))) {
                try {
                    const data = await this.readFileAsync(this.namespace, `tts.userfiles/${fileName}`);
                    if (data?.file) {
                        try {
                            writeFileSync(join(__dirname, fileName), data.file as any);
                            config.announce = join(__dirname, fileName);
                        } catch (e) {
                            this.log.error(`Cannot write file: ${e.toString()}`);
                            config.announce = '';
                        }
                    }
                } catch (e) {
                    this.log.error(`Cannot read file: ${e.toString()}`);
                    config.announce = '';
                }
            } else if (fileName) {
                config.announce = join(__dirname, fileName);
            }
        }
    }

    async start(): Promise<void> {
        if (!this.config.convertedV1toV2) {
            const newConfig = JSON.parse(JSON.stringify(this.config));

            if (newConfig.type === 'system') {
                newConfig.systemCommand = newConfig.command;
                newConfig.systemPlayer = newConfig.player;
            } else if (newConfig.type === 'mp24ftp') {
                newConfig.mp24Server = newConfig.server;
                newConfig.ftpUser = newConfig.user;
                newConfig.ftpPort = newConfig.port;
                newConfig.ftpPassword = newConfig.pass;
            } else if (newConfig.type === 'mp24') {
                newConfig.mp24Server = newConfig.server;
            } else if (newConfig.type === 'chromecast') {
                newConfig.chromecastDevice = newConfig.cDevice;
            } else if (newConfig.type === 'googleHome') {
                newConfig.googleHomeServer = newConfig.server;
            } else if (newConfig.type === 'sonos') {
                newConfig.sonosDevice = newConfig.device;
            } else if (newConfig.type === 'browser') {
                newConfig.browserInstance = newConfig.instance;
            } else if (newConfig.type === 'mpd') {
                newConfig.mpdInstance = newConfig.mpd_device;
            } else if (newConfig.type === 'heos') {
                newConfig.heosDevice = newConfig.heos_device;
            }
            newConfig.webInstance = newConfig.web;

            delete newConfig.server;
            delete newConfig.mpd_device;
            delete newConfig.heos_device;
            delete newConfig.web;
            delete newConfig.command;
            delete newConfig.player;
            delete newConfig.user;
            delete newConfig.port;
            delete newConfig.pass;
            delete newConfig.cDevice;
            delete newConfig.instance;
            delete newConfig.sonos;
            delete newConfig.googleHome;
            delete newConfig.device;

            if (newConfig.engine === 'ru_YA_CLOUD') {
                newConfig.yandexKey = newConfig.key;
                newConfig.yandexCloudVoice = newConfig.voice;
                newConfig.yandexFolderID = newConfig.folderID;
                newConfig.yandexEmotion = newConfig.emotion;
            } else if (newConfig.engine === 'ru_YA') {
                newConfig.yandexKey = newConfig.key;
                newConfig.yandexVoice = newConfig.voice;
                newConfig.yandexEmotion = newConfig.emotion;
                newConfig.yandexDrunk = newConfig.drunk;
                newConfig.yandexIll = newConfig.ill;
                newConfig.yandexRobot = newConfig.robot;
            } else if (newConfig.engine.includes('_CLOUD_')) {
                newConfig.cloudInstance = newConfig.cloud;
            } else if (newConfig.engine.includes('_AP_')) {
                newConfig.awsAccessKey = newConfig.accessKey;
                newConfig.awsSecretKey = newConfig.secretKey;
                newConfig.awsRegion = newConfig.region;
            }
            delete newConfig.accessKey;
            delete newConfig.secretKey;
            delete newConfig.region;
            delete newConfig.robot;
            delete newConfig.ill;
            delete newConfig.drunk;
            delete newConfig.emotion;
            delete newConfig.voice;
            delete newConfig.key;
            delete newConfig.folderID;
            delete newConfig.cloud;

            newConfig.convertedV1toV2 = true;

            const configObj = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
            if (configObj) {
                configObj.native = newConfig;
                await this.setForeignObjectAsync(configObj._id, configObj);
                // wait for restart
                return;
            }
            throw new Error('Cannot get instance config object');
        }

        if (this.config.browserVis === undefined) {
            const configObj = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
            if (configObj) {
                configObj.native.browserVis = '';
                await this.setForeignObjectAsync(configObj._id, configObj);
                // wait for restart
                return;
            }
            throw new Error('Cannot get instance config object');
        }
        this.config.browserVis = this.config.browserVis.toString() as '' | '1' | '2';

        const systemConfig = await this.getForeignObjectAsync('system.config');
        this.lang = systemConfig?.common?.language || 'de';
        this.config.engine ||= (this.lang as EngineType) || 'de';

        if (this.config.engine === 'ru_YA_CLOUD') {
            this.fileExt = 'ogg';
        } else {
            this.fileExt = 'mp3';
        }

        this.MP3FILE = normalize(join(this.dataDir, `${this.namespace}.say.${this.fileExt}`));
        this.outFileExt = this.fileExt;

        await this.prepareAnnounceFiles(this.config);

        // If cache enabled
        if (this.config.cache) {
            if (this.config.cacheDir && (this.config.cacheDir[0] === '/' || this.config.cacheDir[0] === '\\')) {
                this.config.cacheDir = this.config.cacheDir.substring(1);
            }
            this.cacheDir = join(__dirname, this.config.cacheDir);
            if (this.cacheDir) {
                this.cacheDir = this.cacheDir.replace(/\\/g, '/');
                if (this.cacheDir[this.cacheDir.length - 1] === '/') {
                    this.cacheDir = this.cacheDir.substring(0, this.cacheDir.length - 1);
                }
            } else {
                this.cacheDir = '';
            }

            const parts = this.cacheDir.split('/');
            let i = 0;
            while (i < parts.length) {
                if (parts[i] === '..') {
                    parts.splice(i - 1, 2);
                    i--;
                } else {
                    i++;
                }
            }
            this.cacheDir = parts.join('/');
            // Create cache directory, if it does not exist
            if (!existsSync(this.cacheDir)) {
                try {
                    mkdirSync(this.cacheDir, { recursive: true });
                    this.log.info(`Cache directory "${this.cacheDir}" created`);
                } catch (e) {
                    this.log.error(`Cannot create "${this.cacheDir}": ${e.message}`);
                }
            } else {
                let engine = '';
                // Read the old engine
                if (existsSync(join(this.cacheDir, 'engine.txt'))) {
                    try {
                        engine = readFileSync(join(this.cacheDir, 'engine.txt')).toString();
                    } catch (e) {
                        this.log.error(`Cannot read file "${join(this.cacheDir, 'engine.txt')}: ${e.toString()}`);
                    }
                }
                // If engine changed
                if (engine !== this.config.engine) {
                    // Delete all files in this directory
                    const files = readdirSync(this.cacheDir);
                    for (let f = 0; f < files.length; f++) {
                        if (files[f] === 'engine.txt') {
                            continue;
                        }
                        try {
                            if (
                                existsSync(join(this.cacheDir, files[f])) &&
                                lstatSync(join(this.cacheDir, files[f])).isDirectory()
                            ) {
                                unlinkSync(join(this.cacheDir, files[f]));
                            }
                        } catch (e) {
                            this.log.error(
                                `Cannot remove cache file "${join(this.cacheDir, files[f])}: ${e.toString()}`,
                            );
                        }
                    }
                    try {
                        writeFileSync(join(this.cacheDir, 'engine.txt'), this.config.engine);
                    } catch (e) {
                        this.log.error(`Cannot write file "${join(this.cacheDir, 'engine.txt')}: ${e.toString()}`);
                    }
                }
            }
        }

        // initialize tts.text
        await this.setStateAsync('tts.playing', false, true);

        // calculate weblink for devices that require it
        if (
            this.config.type === 'sonos' ||
            this.config.type === 'heos' ||
            this.config.type === 'chromecast' ||
            this.config.type === 'mpd' ||
            this.config.type === 'googleHome'
        ) {
            const obj = await this.getForeignObjectAsync(`system.adapter.${this.config.webInstance}`);
            this.webLink = this.getWebLink(
                obj as ioBroker.InstanceObject,
                this.config.webServer,
                this.config.webInstance,
            );

            // update web link on changes
            await this.subscribeForeignObjectsAsync(`system.adapter.${this.config.webInstance}`);
        }

        // initialize tts.text
        let textState;
        try {
            textState = await this.getStateAsync('tts.text');
        } catch {
            // ignore
        }

        if (!textState) {
            await this.setStateAsync('tts.text', '', true);
        }

        // create Text2Speech and Speech2Device
        this.options = {
            outFileExt: this.outFileExt,
            addToQueue: this.addToQueue,
            getCachedFileName: this.getCachedFileName,
            isCached: this.isCached,
            MP3FILE: this.MP3FILE,
            sayLastVolume: 70,
            webLink: this.webLink,
            getWebLink: this.getWebLink,
        };
        try {
            this.text2speech = new Text2Speech(this, this.options);
            this.speech2device = new Speech2Device(this, this.options);
        } catch (e) {
            this.log.error(`Cannot initialize engines: ${e.toString()}`);
            return;
        }

        // initialize tts.volume
        let volumeState;
        try {
            volumeState = await this.getStateAsync('tts.volume');
        } catch {
            // ignore
        }

        if (!volumeState) {
            await this.setStateAsync('tts.volume', 70, true);
            if (this.config.type !== 'system') {
                this.options.sayLastVolume = 70;
            } else {
                await this.speech2device?.sayItSystemVolume(70);
            }
        } else {
            if (this.config.type !== 'system') {
                this.options.sayLastVolume = parseInt(volumeState.val as string, 10);
            } else {
                await this.speech2device?.sayItSystemVolume(parseInt(volumeState.val as string, 10));
            }
        }

        this.subscribeStates('*');
    }

    getWebLink = (obj: ioBroker.InstanceObject, webServer: string, webInstance: `${string}.${number}`): string => {
        let webLink = '';
        if (obj?.native) {
            webLink = 'http';
            if (obj.native.auth) {
                this.log.error(
                    `Cannot use server "${obj._id}" with authentication for sonos/heos/chromecast. Select other or create another one.`,
                );
            } else {
                if (obj.native.secure) {
                    webLink += 's';
                }
                webLink += '://';
                if (obj.native.bind === 'localhost' || obj.native.bind === '127.0.0.1') {
                    this.log.error(
                        `Selected web server "${obj._id}" is only on local device available. Select other or create another one.`,
                    );
                } else {
                    if (obj.native.bind === '0.0.0.0') {
                        webLink += webServer || this.config.webServer;
                    } else {
                        webLink += obj.native.bind;
                    }
                }

                webLink += `:${obj.native.port}`;
            }
        } else {
            this.log.error(
                `Cannot read information about "${webInstance || this.config.webInstance}". No web server is active`,
            );
        }

        return webLink;
    };

    async main(): Promise<void> {
        try {
            // create directory
            if (!existsSync(this.dataDir)) {
                mkdirSync(this.dataDir, { recursive: true });
            }
        } catch (err) {
            this.log.error(`Could not create Storage directory: ${err}`);
            this.dataDir = __dirname;
        }

        if (
            process.argv?.includes('--install') ||
            (!process.argv?.includes('--force') && // If no arguments or no --force
                !this.common?.enabled && // And adapter is not enabled
                !process.argv?.includes('--debug')) // and not debug
        ) {
            this.log.info('Install process. Upload files and stop.');
            // Check if files exists in data storage
            await this.uploadFiles();
            this.stopInstance();
        } else {
            // Check if files exists in data storage
            await this.uploadFiles();
            await this.start();
        }
    }
}

// If started as allInOne mode => return function to create instance
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<AdapterOptions> | undefined) => new SayItAdapter(options);
} else {
    // otherwise start the instance directly
    (() => new SayItAdapter())();
}
