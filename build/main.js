"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SayItAdapter = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const engines_1 = require("./lib/engines");
const text2speech_1 = __importDefault(require("./lib/text2speech"));
const speech2device_1 = __importDefault(require("./lib/speech2device"));
const adapter_core_1 = require("@iobroker/adapter-core");
class SayItAdapter extends adapter_core_1.Adapter {
    dataDir = (0, node_path_1.join)((0, adapter_core_1.getAbsoluteDefaultDataDir)(), 'sayit');
    /** Timer of the mDNS discovery */
    processMessageTimeout = null;
    /** Timer that starts the processing of the next task in the queue */
    timeoutRunning = null;
    /** System language. Used to show the device names in the configuration dialog */
    lang;
    /** Last text that was generated into MP3FILE, like "[de]Hallo" */
    sayLastGeneratedText = '';
    /** Timestamp of the last played text. Used to decide if the announcement must be played */
    lastSay = null;
    /** Extension of the generated files. "ogg" only for the Yandex cloud engine */
    fileExt = 'mp3';
    text2speech = null;
    speech2device = null;
    /** Absolute name of the file, where the generated speech is stored */
    MP3FILE;
    /** Queue of the texts to say */
    tasks = [];
    /** True while a task of the queue is processed */
    processing = false;
    /** Counter for the "Hello 1", "Hello 2", ... texts of the test button */
    helloCounter = 1;
    cacheDir = '';
    outFileExt = 'mp3';
    webLink = '';
    /** Values and functions shared with Text2Speech and Speech2Device */
    options;
    constructor(options = {}) {
        super({
            ...options,
            name: 'sayit',
            ready: () => this.main(),
            message: (obj) => obj && this.processMessage(obj),
            stateChange: (id, state) => {
                if (state && !state.ack) {
                    if (id === `${this.namespace}.tts.clearQueue`) {
                        // The currently playing task (index 0) cannot be canceled anymore
                        if (this.tasks.length > 1) {
                            this.tasks.splice(1);
                        }
                        // Confirm the button in any case, so the state does not stay "true"
                        void this.setState('tts.clearQueue', false, true);
                    }
                    else if (id === `${this.namespace}.tts.volume`) {
                        const volume = parseInt(state.val, 10);
                        if (Number.isNaN(volume)) {
                            return this.log.warn(`Invalid volume value: ${JSON.stringify(state.val)}`);
                        }
                        if (this.config.type === 'system') {
                            void this.speech2device
                                ?.sayItSystemVolume(volume)
                                .catch((err) => this.log.error(`Cannot set volume: ${err}`));
                        }
                        else if (this.options) {
                            this.options.sayLastVolume = volume;
                            void this.setState('tts.volume', volume, true);
                        }
                    }
                    else if (id === `${this.namespace}.tts.text`) {
                        if (typeof state.val !== 'string') {
                            if (state.val === null || state.val === undefined) {
                                return this.log.warn('Cannot cache empty text');
                            }
                            state.val = state.val.toString();
                        }
                        this.addToQueue({ text: state.val }).catch(e => this.log.error(`Cannot add to queue ${e.toString()}`));
                    }
                    else if (id === `${this.namespace}.tts.cachetext`) {
                        if (typeof state.val !== 'string') {
                            if (state.val === null || state.val === undefined) {
                                return this.log.warn('Cannot cache empty text');
                            }
                            state.val = state.val.toString();
                        }
                        this.addToQueue({ text: state.val }, true).catch(e => this.log.error(`Cannot add to queue ${e.toString()}`));
                    }
                }
            },
            objectChange: (id, obj) => {
                if (id === `system.adapter.${this.config.webInstance}`) {
                    this.webLink = this.getWebLink(obj, this.config.webServer, this.config.webInstance);
                    // Speech2Device reads the link from the shared options object
                    if (this.options) {
                        this.options.webLink = this.webLink;
                    }
                }
            },
            unload: (callback) => this.stopInstance(true, callback),
        });
        // Node calls signal handlers with the signal name as the first argument,
        // so the call must be wrapped to not interpret it as "unload"
        process.on('SIGINT', () => this.stopInstance());
    }
    /**
     * Root directory of the adapter installation.
     * The compiled code is located in "build/", so all packaged resources (mp3, say, nircmd, cmdmp3)
     * are stored one level above __dirname.
     */
    get rootDir() {
        return this.adapterDir || (0, node_path_1.normalize)((0, node_path_1.join)(__dirname, '..'));
    }
    /**
     * Search for google cast devices (chromecast, google home) in the local network via mDNS
     * and answer the message with the found devices.
     *
     * @param obj Message object with the command "browseGoogleHome" or "browseChromecast"
     */
    async browseMdns(obj) {
        try {
            const mdns = await import('mdns');
            let browser = mdns.default.createBrowser(mdns.tcp('googlecast'));
            const result = [];
            browser.on('serviceUp', service => result.push({ name: service.name || service.fullname, ip: service.addresses[0] }));
            browser.on('error', (err) => this.log.error(`Error on MDNS discovery: ${err}`));
            this.processMessageTimeout = setTimeout(() => {
                this.processMessageTimeout = null;
                if (browser) {
                    browser.stop();
                    browser = null;
                }
                if (obj.command === 'browseGoogleHome') {
                    this.sendTo(obj.from, obj.command, result.map(s => ({ label: `${s.name}[${s.ip}]`, value: s.ip })), obj.callback);
                }
                else {
                    this.sendTo(obj.from, obj.command, result, obj.callback);
                }
            }, 2000);
            browser.start();
        }
        catch (e) {
            this.log.debug(`Cannot browse mdns: ${e}`);
            this.sendTo(obj.from, obj.command, null, obj.callback);
        }
    }
    /**
     * Process a message sent by another adapter or by the admin configuration dialog
     *
     * @param obj Message object
     */
    processMessage(obj) {
        if (obj.command === 'say') {
            const text = obj.message?.text;
            const language = obj.message?.language;
            const volume = obj.message?.volume ? parseInt(obj.message.volume, 10) : undefined;
            const browserVis = obj.message?.browserVis;
            const browserInstance = obj.message?.browserInstance;
            const sonosDevice = obj.message?.sonosDevice;
            const heosDevice = obj.message?.heosDevice;
            const mpdInstance = obj.message?.mpdInstance;
            const chromecastDevice = obj.message?.chromecastDevice;
            if (text) {
                if (obj.callback) {
                    const testOptions = { ...obj.message };
                    testOptions.callback = (error) => {
                        this.sendTo(obj.from, obj.command, { error, result: error ? undefined : 'Ok' }, obj.callback);
                    };
                    this.addToQueue({ text, language, volume, testOptions }).catch(e => this.log.error(`Cannot add to queue ${e}`));
                }
                else {
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
            }
            else {
                this.sendTo(obj.from, obj.command, { error: 'No text' }, obj.callback);
            }
        }
        else if (obj.command === 'stopInstance') {
            this.stopInstance(false, () => {
                if (obj.callback) {
                    this.sendTo(obj.from, obj.command, null, obj.callback);
                }
            });
        }
        else if (obj.callback && obj.command === 'browseGoogleHome') {
            this.browseMdns(obj).catch(e => {
                this.log.debug(`Cannot browse mdns: ${e}`);
                if (obj.callback) {
                    this.sendTo(obj.from, obj.command, null, obj.callback);
                }
            });
        }
        else if (obj.callback && obj.command === 'browseChromecast') {
            this.getObjectView('system', 'device', { startkey: 'chromecast.', endkey: 'chromecast.\u9999' }, (err, res) => {
                const list = [];
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
            });
        }
        else if (obj.callback && obj.command === 'browseHeos') {
            this.getObjectView('system', 'device', { startkey: 'heos.', endkey: 'heos.\u9999' }, (err, res) => {
                const list = [];
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
        }
        else if (obj.callback && obj.command === 'browseSonos') {
            this.getObjectView('system', 'device', { startkey: 'sonos.', endkey: 'sonos.\u9999' }, (err, res) => {
                const list = [];
                res?.rows.forEach(row => {
                    let name = row.value?.common?.name;
                    if (typeof name === 'object') {
                        name = name[this.lang] || name.en;
                    }
                    if (row.id.includes('.root.')) {
                        list.push({
                            value: row.id,
                            label: `${row.id.replace(/^sonos\.\d+\.root\./, '')} [${name}]`,
                        });
                    }
                });
                this.sendTo(obj.from, obj.command, list, obj.callback);
            });
        }
        else if (obj.callback && obj.command === 'test') {
            const language = (obj.message?.engine || this.config.engine || 'en').substring(0, 2);
            let text = 'Hello';
            if (language === 'de') {
                text = 'Hallo';
            }
            else if (language === 'pl') {
                text = 'Cześć';
            }
            else if (language === 'uk') {
                text = 'Привіт';
            }
            else if (language === 'ru') {
                text = 'Привет';
            }
            else if (language === 'it') {
                text = 'Ciao';
            }
            else if (language === 'pt') {
                text = 'Olá';
            }
            else if (language === 'es') {
                text = 'Hola';
            }
            else if (language === 'fr') {
                text = 'Bonjour';
            }
            else if (language === 'nl') {
                text = 'Hallo';
            }
            else if (language === 'zh') {
                text = '你好';
            }
            text += ` ${this.helloCounter++}`;
            const testOptions = { ...obj.message };
            if (obj.callback) {
                testOptions.callback = (error) => {
                    this.sendTo(obj.from, obj.command, { error, result: error ? undefined : 'Ok' }, obj.callback);
                };
            }
            this.addToQueue({ text, testOptions }).catch(e => this.log.error(`Cannot add to queue ${e}`));
        }
    }
    /**
     * Stop all running timers and terminate the instance
     *
     * @param unload True if the adapter is unloaded by the js-controller. In this case, the process must not be killed.
     * @param callback Called as soon as all timers are stopped
     */
    stopInstance = (unload, callback) => {
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
        }
        catch {
            // ignore
        }
        if (typeof callback === 'function') {
            callback();
        }
        if (!unload) {
            setTimeout(() => (this.terminate ? this.terminate() : process.exit()), 500);
        }
    };
    /**
     * Split a text into at most `maxParts` parts by the given separator.
     * In opposite to String.prototype.split with a limit, the rest of the string is not thrown away,
     * but returned as the last part.
     *
     * @param text Text to split
     * @param separator Separator character
     * @param maxParts Maximal number of parts
     * @returns Array with at most maxParts entries
     */
    static splitWithRest(text, separator, maxParts) {
        const parts = text.split(separator);
        if (parts.length <= maxParts) {
            return parts;
        }
        return [...parts.slice(0, maxParts - 1), parts.slice(maxParts - 1).join(separator)];
    }
    /**
     * Add a text to the say queue and start the processing of the queue.
     * The text could have the prefixes "language;", "volume;", "language;volume;" or "volume;language;",
     * e.g. "de;80;Hallo". A text starting with "!" will be placed at the beginning of the queue.
     *
     * @param props Text to say and optional language, volume and test options
     * @param onlyCache If true, the mp3 file will only be generated and cached, but not played
     */
    addToQueue = async (props, onlyCache) => {
        // Extract language and volume from "en;volume;Text to say"
        if (props.text.includes(';')) {
            /** Returns true if the given part is a pure number, like "80" */
            const isVolume = (part) => {
                const trimmed = part.trim();
                return !!trimmed && parseInt(trimmed, 10).toString() === trimmed;
            };
            /** Returns true if the given part looks like an engine name, like "de", "zh-CN" or "ru_YA_CLOUD" */
            const isEngine = (part) => /^[a-z]{2}([-_][\w-]+)*$/i.test(part.trim());
            const arr3 = SayItAdapter.splitWithRest(props.text, ';', 3);
            const arr2 = SayItAdapter.splitWithRest(props.text, ';', 2);
            if (arr3.length === 3 && isVolume(arr3[0]) && isEngine(arr3[1])) {
                // "volume;language;text"
                props.volume = parseInt(arr3[0].trim(), 10);
                props.language = arr3[1].trim();
                props.text = arr3[2].trim();
            }
            else if (arr3.length === 3 && isEngine(arr3[0]) && isVolume(arr3[1])) {
                // "language;volume;text"
                props.language = arr3[0].trim();
                props.volume = parseInt(arr3[1].trim(), 10);
                props.text = arr3[2].trim();
            }
            else if (arr2.length === 2 && isVolume(arr2[0])) {
                // "volume;text"
                props.volume = parseInt(arr2[0].trim(), 10);
                props.text = arr2[1].trim();
            }
            else if (arr2.length === 2 && isEngine(arr2[0])) {
                // "language;text"
                props.language = arr2[0].trim();
                props.text = arr2[1].trim();
            }
            // Otherwise, the semicolons belong to the text and it stays unchanged
        }
        // Workaround for double text
        // find all similar texts with interval less than 500 ms
        const combined = [props.text, props.language || '', props.volume || ''].filter(t => t).join(';');
        if (this.tasks.find(task => task.combined === combined && Date.now() - task.ts < 500)) {
            // ignore it
            return;
        }
        const highPriority = props.text.startsWith('!');
        // Volume 0 is a valid value, so only take over the configured volume if nothing was given
        if (props.volume === undefined || Number.isNaN(props.volume)) {
            props.volume = parseInt(this.config.volume, 10);
        }
        if (Number.isNaN(props.volume)) {
            props.volume = undefined;
        }
        if (props.volume === undefined) {
            try {
                const state = await this.getStateAsync('tts.volume');
                if (state?.val !== undefined && state?.val !== null) {
                    const volume = parseInt(state.val, 10);
                    props.volume = Number.isNaN(volume) ? undefined : volume;
                }
            }
            catch {
                // ignore
            }
        }
        let announce = props.testOptions?.announce !== undefined ? props.testOptions.announce : this.config.announce;
        const annoTimeout = parseInt(props.testOptions?.annoTimeout !== undefined
            ? props.testOptions.annoTimeout
            : this.config.annoTimeout, 10) || 15;
        const task = {
            text: props.text,
            language: props.language || (props.testOptions && props.testOptions.engine) || this.config.engine,
            volume: props.volume,
            onlyCache,
            ts: Date.now(),
            combined,
            testOptions: props.testOptions,
        };
        // If more time than annoTimeout seconds till last text, add announcement
        if (!onlyCache &&
            announce &&
            !this.tasks.length &&
            (!this.lastSay || Date.now() - this.lastSay > annoTimeout * 1000)) {
            if (props.testOptions) {
                // The announcement file must be extracted to the disk first. This changes testOptions.announce
                await this.prepareAnnounceFiles(props.testOptions);
                announce = props.testOptions.announce !== undefined ? props.testOptions.announce : this.config.announce;
            }
            const annoVolumeInPercent = parseInt(props.testOptions?.annoVolume !== undefined
                ? props.testOptions.annoVolume
                : this.config.annoVolume, 10);
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
        }
        else if (!onlyCache && highPriority) {
            this.tasks.unshift(task);
        }
        else {
            this.tasks.push(task);
        }
        this.processTasks().catch(() => { });
    };
    /**
     * Build the name of the cache file for the given text
     *
     * @param text Text with the language prefix, like "de;Hallo"
     * @returns Absolute file name of the cached file
     */
    getCachedFileName = (text) => {
        return (0, node_path_1.normalize)((0, node_path_1.join)(this.cacheDir, `${(0, node_crypto_1.createHash)('md5').update(text).digest('hex')}.${this.fileExt}`));
    };
    /**
     * Check if the given text was already generated and is still valid.
     * Expired files will be deleted.
     *
     * @param text Text with the language prefix, like "de;Hallo"
     * @returns Absolute file name of the cached file or false if not cached
     */
    isCached = (text) => {
        const md5filename = this.getCachedFileName(text);
        if ((0, node_fs_1.existsSync)(md5filename)) {
            const cacheExpiryDays = parseInt(this.config.cacheExpiryDays, 10);
            if (cacheExpiryDays) {
                try {
                    const fileStat = (0, node_fs_1.statSync)(md5filename);
                    if (fileStat.ctime &&
                        Date.now() - new Date(fileStat.ctime).getTime() > cacheExpiryDays * 1000 * 60 * 60 * 24) {
                        this.log.info('Cached File expired, remove and re-generate');
                        (0, node_fs_1.unlinkSync)(md5filename);
                        return false;
                    }
                }
                catch (e) {
                    this.log.warn(`Cannot check cache file "${md5filename}": ${e.toString()}`);
                    return false;
                }
            }
            return md5filename;
        }
        return false;
    };
    /**
     * Process the first task of the queue: generate the mp3 file if required and play it on the configured device.
     * As soon as the task is done, the next task will be scheduled.
     */
    async processTasks() {
        if (this.processing || !this.tasks.length) {
            return;
        }
        this.processing = true;
        let error;
        let duration = 0;
        try {
            const { onlyCache, testOptions } = this.tasks[0];
            let { text, language, volume } = this.tasks[0];
            if (text[0] === '!') {
                text = text.substring(1);
            }
            const type = testOptions?.type || this.config.type;
            if (!engines_1.sayitOptions[type]) {
                throw new Error(`Unknown play type: ${type}`);
            }
            if (volume === undefined || volume === null) {
                try {
                    const state = await this.getStateAsync('tts.volume');
                    if (state?.val !== undefined && state?.val !== null) {
                        volume = parseInt(state.val, 10);
                    }
                }
                catch {
                    // ignore
                }
            }
            if (volume === undefined || Number.isNaN(volume)) {
                volume = parseInt(testOptions?.volume || this.config.volume, 10);
            }
            if (Number.isNaN(volume)) {
                volume = undefined;
            }
            let fileName;
            // find out if say.mp3 must be generated
            const isGenerate = !speech2device_1.default.isPlayFile(text) && engines_1.sayitOptions[type].mp3Required;
            language ||= (testOptions && testOptions.engine) || this.config.engine;
            // if no text => does not process
            if (isGenerate && text.length && this.text2speech && this.speech2device) {
                // Check: may be it is a file from DB filesystem, like /vis.0/main/img/door-bell.mp3
                if (text[0] === '/') {
                    let fileNameTemp;
                    if (!testOptions && (this.config.cache || onlyCache)) {
                        fileNameTemp = this.isCached(text);
                    }
                    if (!fileNameTemp) {
                        // The name looks like "/vis.0/main/img/door-bell.mp3",
                        // so the leading slash must be removed to get the adapter name
                        const parts = text.replace(/^\//, '').split('/');
                        const _adapter = parts.shift();
                        const _path = parts.join('/');
                        let data;
                        try {
                            data = await this.readFileAsync(_adapter, _path);
                        }
                        catch {
                            // this.log.error(`Cache file does not exist "${text}": ${e.toString()}`);
                        }
                        if (!data) {
                            // maybe the file is from real FS
                            if ((0, node_fs_1.existsSync)(text)) {
                                try {
                                    data = { file: (0, node_fs_1.readFileSync)(text) };
                                }
                                catch (e) {
                                    this.log.error(`Cannot read file "${text}": ${e.toString()}`);
                                }
                            }
                            else {
                                this.log.warn(`File "${text}" not found`);
                            }
                        }
                        if (data?.file) {
                            // Cache the file
                            const targetFile = this.config.cache || onlyCache ? this.getCachedFileName(text) : this.MP3FILE;
                            try {
                                (0, node_fs_1.writeFileSync)(targetFile, data.file);
                                fileName = targetFile;
                            }
                            catch (e) {
                                this.log.error(`Cannot write file "${targetFile}": ${e.toString()}`);
                            }
                        }
                    }
                    else {
                        fileName = fileNameTemp;
                    }
                }
                this.log.info(`saying: ${text}`);
                // If a text first must be generated, and it is different from the last one
                if (!fileName) {
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
                                // Only the content of MP3FILE could be reused for the next identical text
                                this.sayLastGeneratedText = fileName === this.MP3FILE ? `[${language}]${text}` : '';
                            }
                            catch (e) {
                                fileName = '';
                                error = `Cannot generate speech file: ${e}`;
                                this.log.error(error);
                            }
                        }
                    }
                    else {
                        fileName = this.MP3FILE;
                    }
                }
            }
            const props = { type, text, language, volume, testOptions, duration: 0 };
            if (!onlyCache && text.length) {
                await this.setStateAsync('tts.playing', true, true);
                try {
                    // play file
                    if (fileName && this.text2speech && this.speech2device) {
                        props.duration = (await this.text2speech.getDuration(fileName)) || 0;
                        props.fileName = fileName;
                        await this.speech2device.playFile(props);
                    }
                    else if (!isGenerate) {
                        if (speech2device_1.default.isPlayFile(text) && this.text2speech) {
                            props.duration = (await this.text2speech.getDuration(text)) || 0;
                        }
                        await this.speech2device?.playFile(props);
                    }
                    this.lastSay = Date.now();
                }
                catch (e) {
                    error = `Cannot play file: ${e}`;
                    this.log.error(error);
                }
                finally {
                    await this.setStateAsync('tts.playing', false, true);
                }
            }
            duration = props.duration;
        }
        catch (e) {
            error = `Cannot process task: ${e}`;
            this.log.error(error);
        }
        // Remove the processed task from the queue and inform the caller
        const task = this.tasks.shift();
        if (task?.testOptions?.callback) {
            task.testOptions.callback(error);
            task.testOptions.callback = undefined;
        }
        if (this.tasks.length) {
            this.timeoutRunning = setTimeout(() => {
                this.timeoutRunning = null;
                this.processing = false;
                this.processTasks().catch(e => this.log.error(`Cannot process tasks: ${e.toString()}`));
            }, 100 + duration * 1000);
        }
        else {
            this.processing = false;
        }
    }
    /**
     * Copy one of the delivered announcement mp3 files into the "tts.userfiles" meta object,
     * so it could be selected in the configuration dialog. Existing files will not be overwritten.
     *
     * @param file Name of the file in the "mp3" directory of the adapter
     */
    async uploadFile(file) {
        const sourceFile = (0, node_path_1.join)(this.rootDir, 'mp3', file);
        try {
            const stat = (0, node_fs_1.statSync)(sourceFile);
            if (!stat.isFile()) {
                // ignore not a file
                return;
            }
        }
        catch {
            // ignore not a file
            return;
        }
        let data;
        try {
            data = await this.readFileAsync(this.namespace, `tts.userfiles/${file}`);
        }
        catch {
            // ignore error
        }
        if (!data) {
            try {
                const fileData = (0, node_fs_1.readFileSync)(sourceFile);
                this.log.debug(`Upload file: ${sourceFile} (${fileData.length} bytes)`);
                await this.writeFileAsync(this.namespace, `tts.userfiles/${file}`, fileData);
            }
            catch (e) {
                this.log.error(`Cannot write file "${sourceFile}": ${e.toString()}`);
            }
        }
    }
    /** Copy all delivered announcement mp3 files into the "tts.userfiles" meta object */
    async uploadFiles() {
        const mp3Dir = (0, node_path_1.join)(this.rootDir, 'mp3');
        if ((0, node_fs_1.existsSync)(mp3Dir)) {
            this.log.info('Upload announce mp3 files');
            let obj;
            try {
                obj = await this.getForeignObjectAsync(this.namespace);
            }
            catch {
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
            const files = (0, node_fs_1.readdirSync)(mp3Dir);
            for (let f = 0; f < files.length; f++) {
                await this.uploadFile(files[f]);
            }
        }
        else {
            this.log.warn(`Directory with announce files not found: ${mp3Dir}`);
        }
    }
    /**
     * Extract the configured announcement file from the ioBroker files' storage to the disk,
     * because it must be played like a normal file. The given config will be modified:
     * "announce" will contain the absolute path of the extracted file.
     *
     * @param config Adapter configuration or test options with the announcement settings
     * @param config.announce Name of the announcement file in the "tts.userfiles" storage
     * @param config.annoDuration Duration of the announcement in seconds
     * @param config.annoTimeout Time in seconds after the last text, when the announcement must be played again
     * @param config.annoVolume Volume of the announcement in percent of the actual volume
     */
    async prepareAnnounceFiles(config) {
        if (config.announce) {
            config.annoDuration = parseInt(config.annoDuration, 10) || 0;
            config.annoTimeout = parseInt(config.annoTimeout, 10) || 15;
            config.annoVolume = parseInt(config.annoVolume, 10) || 70; // percent from actual volume
            // remove "tts.userfiles/" from file name
            const fileName = config.announce.split('/').pop();
            if (!fileName) {
                config.announce = '';
                return;
            }
            // The announcement is stored in the data directory, because the adapter directory
            // will be deleted by every update and could be write-protected
            const localFileName = (0, node_path_1.join)(this.dataDir, fileName);
            if (!(0, node_fs_1.existsSync)(localFileName)) {
                try {
                    const data = await this.readFileAsync(this.namespace, `tts.userfiles/${fileName}`);
                    if (data?.file) {
                        try {
                            (0, node_fs_1.writeFileSync)(localFileName, data.file);
                            config.announce = localFileName;
                        }
                        catch (e) {
                            this.log.error(`Cannot write file "${localFileName}": ${e.toString()}`);
                            config.announce = '';
                        }
                    }
                    else {
                        this.log.error(`Announcement file "${fileName}" is empty`);
                        config.announce = '';
                    }
                }
                catch (e) {
                    this.log.error(`Cannot read file "tts.userfiles/${fileName}": ${e.toString()}`);
                    config.announce = '';
                }
            }
            else {
                config.announce = localFileName;
            }
        }
    }
    /**
     * Convert the configuration of version 1 to version 2 (if not done yet), prepare the cache directory,
     * create the engines and subscribe to the states.
     */
    async start() {
        if (!this.config.convertedV1toV2) {
            // Rename the configuration attributes of version 1 to the new names.
            // The adapter will be restarted by js-controller after the configuration is written.
            const newConfig = JSON.parse(JSON.stringify(this.config));
            newConfig.engine ||= '';
            if (newConfig.type === 'system') {
                newConfig.systemCommand = newConfig.command;
                newConfig.systemPlayer = newConfig.player;
            }
            else if (newConfig.type === 'mp24ftp') {
                newConfig.mp24Server = newConfig.server;
                newConfig.ftpUser = newConfig.user;
                newConfig.ftpPort = newConfig.port;
                newConfig.ftpPassword = newConfig.pass;
            }
            else if (newConfig.type === 'mp24') {
                newConfig.mp24Server = newConfig.server;
            }
            else if (newConfig.type === 'chromecast') {
                newConfig.chromecastDevice = newConfig.cDevice;
            }
            else if (newConfig.type === 'googleHome') {
                newConfig.googleHomeServer = newConfig.server;
            }
            else if (newConfig.type === 'sonos') {
                newConfig.sonosDevice = newConfig.device;
            }
            else if (newConfig.type === 'browser') {
                newConfig.browserInstance = newConfig.instance;
            }
            else if (newConfig.type === 'mpd') {
                newConfig.mpdInstance = newConfig.mpd_device;
            }
            else if (newConfig.type === 'heos') {
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
            }
            else if (newConfig.engine === 'ru_YA') {
                newConfig.yandexKey = newConfig.key;
                newConfig.yandexVoice = newConfig.voice;
                newConfig.yandexEmotion = newConfig.emotion;
                newConfig.yandexDrunk = newConfig.drunk;
                newConfig.yandexIll = newConfig.ill;
                newConfig.yandexRobot = newConfig.robot;
            }
            else if (newConfig.engine.includes('_CLOUD_')) {
                newConfig.cloudInstance = newConfig.cloud;
            }
            else if (newConfig.engine.includes('_AP_')) {
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
        this.config.browserVis = this.config.browserVis.toString();
        const systemConfig = await this.getForeignObjectAsync('system.config');
        this.lang = systemConfig?.common?.language || 'de';
        this.config.engine ||= this.lang || 'de';
        if (this.config.engine === 'ru_YA_CLOUD') {
            this.fileExt = 'ogg';
        }
        else {
            this.fileExt = 'mp3';
        }
        this.MP3FILE = (0, node_path_1.normalize)((0, node_path_1.join)(this.dataDir, `${this.namespace}.say.${this.fileExt}`));
        this.outFileExt = this.fileExt;
        await this.prepareAnnounceFiles(this.config);
        // If cache enabled
        if (this.config.cache) {
            if (this.config.cacheDir && (this.config.cacheDir[0] === '/' || this.config.cacheDir[0] === '\\')) {
                this.config.cacheDir = this.config.cacheDir.substring(1);
            }
            // Relative directories are relative to the adapter directory (not to "build") and "join" resolves ".."
            this.cacheDir = (0, node_path_1.normalize)((0, node_path_1.join)(this.rootDir, this.config.cacheDir || 'cache')).replace(/[/\\]$/, '');
            // Create cache directory, if it does not exist
            if (!(0, node_fs_1.existsSync)(this.cacheDir)) {
                try {
                    (0, node_fs_1.mkdirSync)(this.cacheDir, { recursive: true });
                    this.log.info(`Cache directory "${this.cacheDir}" created`);
                }
                catch (e) {
                    this.log.error(`Cannot create "${this.cacheDir}": ${e.message}`);
                    this.config.cache = false;
                }
            }
            else {
                let engine = '';
                // Read the old engine
                if ((0, node_fs_1.existsSync)((0, node_path_1.join)(this.cacheDir, 'engine.txt'))) {
                    try {
                        engine = (0, node_fs_1.readFileSync)((0, node_path_1.join)(this.cacheDir, 'engine.txt')).toString();
                    }
                    catch (e) {
                        this.log.error(`Cannot read file "${(0, node_path_1.join)(this.cacheDir, 'engine.txt')}": ${e.toString()}`);
                    }
                }
                // If engine changed, all cached files are invalid
                if (engine !== this.config.engine) {
                    // Delete all files in this directory
                    const files = (0, node_fs_1.readdirSync)(this.cacheDir);
                    for (let f = 0; f < files.length; f++) {
                        if (files[f] === 'engine.txt') {
                            continue;
                        }
                        const fileName = (0, node_path_1.join)(this.cacheDir, files[f]);
                        try {
                            if ((0, node_fs_1.existsSync)(fileName) && !(0, node_fs_1.lstatSync)(fileName).isDirectory()) {
                                (0, node_fs_1.unlinkSync)(fileName);
                            }
                        }
                        catch (e) {
                            this.log.error(`Cannot remove cache file "${fileName}": ${e.toString()}`);
                        }
                    }
                    try {
                        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(this.cacheDir, 'engine.txt'), this.config.engine);
                    }
                    catch (e) {
                        this.log.error(`Cannot write file "${(0, node_path_1.join)(this.cacheDir, 'engine.txt')}": ${e.toString()}`);
                    }
                }
            }
        }
        // initialize tts.text
        await this.setStateAsync('tts.playing', false, true);
        // calculate weblink for devices that require it
        if (this.config.type === 'sonos' ||
            this.config.type === 'heos' ||
            this.config.type === 'chromecast' ||
            this.config.type === 'mpd' ||
            this.config.type === 'googleHome') {
            const obj = await this.getForeignObjectAsync(`system.adapter.${this.config.webInstance}`);
            this.webLink = this.getWebLink(obj, this.config.webServer, this.config.webInstance);
            // update web link on changes
            await this.subscribeForeignObjectsAsync(`system.adapter.${this.config.webInstance}`);
        }
        // initialize tts.text
        let textState;
        try {
            textState = await this.getStateAsync('tts.text');
        }
        catch {
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
            this.text2speech = new text2speech_1.default(this, this.options);
            this.speech2device = new speech2device_1.default(this, this.options);
        }
        catch (e) {
            this.log.error(`Cannot initialize engines: ${e.toString()}`);
            return;
        }
        // initialize tts.volume
        let volumeState;
        try {
            volumeState = await this.getStateAsync('tts.volume');
        }
        catch {
            // ignore
        }
        let volume = volumeState ? parseInt(volumeState.val, 10) : 70;
        if (Number.isNaN(volume)) {
            volume = 70;
        }
        if (!volumeState) {
            await this.setStateAsync('tts.volume', volume, true);
        }
        if (this.config.type !== 'system') {
            this.options.sayLastVolume = volume;
        }
        else {
            await this.speech2device?.sayItSystemVolume(volume);
        }
        await this.subscribeStatesAsync('*');
    }
    /**
     * Build the URL of the web server, over which the generated mp3 file could be played by an external device
     *
     * @param obj Instance object of the web adapter
     * @param webServer IP address of the web server (used if the web adapter is bound to 0.0.0.0)
     * @param webInstance Name of the web instance, like "web.0"
     * @returns Link like "http://192.168.1.1:8082" or an empty string if the web server cannot be used
     */
    getWebLink = (obj, webServer, webInstance) => {
        if (!obj?.native) {
            this.log.error(`Cannot read information about "${webInstance || this.config.webInstance}". No web server is active`);
            return '';
        }
        if (obj.native.auth) {
            this.log.error(`Cannot use server "${obj._id}" with authentication for sonos/heos/chromecast. Select other or create another one.`);
            return '';
        }
        let host;
        if (obj.native.bind === 'localhost' || obj.native.bind === '127.0.0.1') {
            this.log.error(`Selected web server "${obj._id}" is only on local device available. Select other or create another one.`);
            return '';
        }
        else if (obj.native.bind === '0.0.0.0') {
            host = webServer || this.config.webServer;
            if (!host) {
                this.log.error(`Web server "${obj._id}" is bound to all interfaces. Please define the IP address of the server in the configuration.`);
                return '';
            }
        }
        else {
            host = obj.native.bind;
        }
        return `http${obj.native.secure ? 's' : ''}://${host}:${obj.native.port}`;
    };
    /** Prepare the data directory, upload the announcement files and start the adapter */
    async main() {
        try {
            // create directory
            if (!(0, node_fs_1.existsSync)(this.dataDir)) {
                (0, node_fs_1.mkdirSync)(this.dataDir, { recursive: true });
            }
        }
        catch (err) {
            this.log.error(`Could not create Storage directory: ${err}`);
            this.dataDir = __dirname;
        }
        if (process.argv?.includes('--install') ||
            (!process.argv?.includes('--force') && // If no arguments or no --force
                !this.common?.enabled && // And adapter is not enabled
                !process.argv?.includes('--debug')) // and not debug
        ) {
            this.log.info('Install process. Upload files and stop.');
            // Check if files exists in data storage
            await this.uploadFiles();
            this.stopInstance();
        }
        else {
            // Check if files exists in data storage
            await this.uploadFiles();
            await this.start();
        }
    }
}
exports.SayItAdapter = SayItAdapter;
// If started as allInOne mode => return function to create instance
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new SayItAdapter(options);
}
else {
    // otherwise start the instance directly
    (() => new SayItAdapter())();
}
//# sourceMappingURL=main.js.map