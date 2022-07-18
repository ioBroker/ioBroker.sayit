'use strict';

const utils = require('@iobroker/adapter-core');
const Text2Speech = require('./lib/text2speech');
const Speech2Device = require('./lib/speech2device');
const libs = {
    fs: require('fs'),
    path: require('path'),
};
const engines = require('./admin/engines.js');
const sayitOptions = engines.sayitOptions;

const options = {
    sayLastVolume: null,
    webLink: '',
    cacheDir: '',
    outFileExt: 'mp3'
};

let sayLastGeneratedText = '';
let list = [];
let lastSay = null;
let fileExt = 'mp3';
let text2speech = null;
let speech2device = null;
let MP3FILE;
let cacheRunning = false;
let cacheFiles = [];

class Sayit extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'sayit',
        });

        this.processMessageTimeout = null;
        this.sayFinishedTimeout = null;
        this.cacheTimeout = null;

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        let dataDir = libs.path.normalize(`${utils.getAbsoluteDefaultDataDir()}/sayit`);

        try {
            // create directory
            if (!libs.fs.existsSync(dataDir)) {
                this.log.debug(`[onReady] Creating storage directory: ${dataDir}`);
                libs.fs.mkdirSync(dataDir);
            }
        } catch (err) {
            this.log.error(`[onReady] Could not create storage directory: ${err}`);
            dataDir = __dirname;
        }

        MP3FILE = `${dataDir}/${this.namespace}.say.${fileExt}`;

        await this.uploadFiles();

        if (!this.config.engine) {
            const systemConfig = await this.getForeignObjectAsync('system.config');
            this.config.engine = (systemConfig && systemConfig.common && systemConfig.common.language) || 'de';
        }

        if (this.config.engine === 'ru_YA_CLOUD') {
            fileExt = 'ogg';
        } else {
            fileExt = 'mp3';
        }

        this.config.dataDir = dataDir;

        MP3FILE = this.config.dataDir + '/' + this.namespace + '.say.' + fileExt;
        options.outFileExt = fileExt;

        if (this.config.announce) {
            this.config.annoDuration = parseInt(this.config.annoDuration) || 0;
            this.config.annoTimeout  = parseInt(this.config.annoTimeout)  || 15;
            this.config.annoVolume   = parseInt(this.config.annoVolume)   || 70; // percent from actual volume

            if (!libs.fs.existsSync(libs.path.join(__dirname, this.config.announce))) {
                this.readFile(this.namespace, this.config.announce, (err, data) => {
                    if (!err && data) {
                        const targetPath = String(this.config.announce).replace('/tts.userfiles/', '');

                        try {
                            libs.fs.writeFileSync(libs.path.join(__dirname, targetPath), data);
                            this.config.announce = libs.path.join(__dirname, targetPath);

                            this.log.debug(`[onReady] Set announce to ${this.config.announce}`);
                        } catch (e) {
                            this.log.error(`[onReady] Cannot write file: ${e.toString()}`);
                            this.config.announce = '';
                        }
                    } else {
                        this.log.error(`[onReady] Cannot read announcement file: ${this.config.announce}`);
                    }
                });
            } else {
                this.config.announce = __dirname + '/' + this.config.announce;

                this.log.debug(`[onReady] Set announce to ${this.config.announce}`);
            }
        }

        // If cache enabled
        if (this.config.cache) {
            if (this.config.cacheDir && (this.config.cacheDir[0] === '/' || this.config.cacheDir[0] === '\\')) {
                this.config.cacheDir = this.config.cacheDir.substring(1);
            }

            options.cacheDir = libs.path.join(__dirname, this.config.cacheDir);

            if (options.cacheDir) {
                options.cacheDir = options.cacheDir.replace(/\\/g, '/');
                if (options.cacheDir[options.cacheDir.length - 1] === '/') {
                    options.cacheDir = options.cacheDir.substring(0, options.cacheDir.length - 1);
                }
            } else {
                options.cacheDir = '';
            }

            const parts = options.cacheDir.split('/');
            let i = 0;
            while (i < parts.length) {
                if (parts[i] === '..') {
                    parts.splice(i - 1, 2);
                    i--;
                } else {
                    i++;
                }
            }
            options.cacheDir = parts.join('/');
            // Create cache dir if does not exist
            if (!libs.fs.existsSync(options.cacheDir)) {
                try {
                    this.mkpathSync(__dirname + '/', this.config.cacheDir);
                } catch (e) {
                    this.log.error(`[onReady] Cannot create "${options.cacheDir}": ${e.message}`);
                }
            } else {
                let engine = '';
                // Read the old engine
                if (libs.fs.existsSync(libs.path.join(options.cacheDir, 'engine.txt'))) {
                    try {
                        engine = libs.fs.readFileSync(libs.path.join(options.cacheDir, 'engine.txt')).toString();
                    } catch (e) {
                        this.log.error(`[onReady] Cannot read file "${libs.path.join(options.cacheDir, 'engine.txt')}: ${e.toString()}`);
                    }
                }
                // If engine changed
                if (engine !== this.config.engine) {
                    // Delete all files in this directory
                    const files = libs.fs.readdirSync(options.cacheDir);
                    for (let f = 0; f < files.length; f++) {
                        if (files[f] === 'engine.txt') continue;
                        try {
                            if (libs.fs.existsSync(libs.path.join(options.cacheDir, files[f])) && libs.fs.lstatSync(libs.path.join(options.cacheDir, files[f])).isDirectory()) {
                                libs.fs.unlinkSync(libs.path.join(options.cacheDir, files[f]));
                            }
                        } catch (e) {
                            this.log.error(`[onReady] Cannot remove cache file "${libs.path.join(options.cacheDir, files[f])}: ${e.toString()}`);
                        }
                    }
                    try {
                        libs.fs.writeFileSync(libs.path.join(options.cacheDir, 'engine.txt'), this.config.engine);
                    } catch (e) {
                        this.log.error(`[onReady] Cannot write file "${libs.path.join(options.cacheDir, 'engine.txt')}: ${e.toString()}`);
                    }
                }
            }
        }

        // Load libs
        for (let j = 0; j < sayitOptions[this.config.type].libs.length; j++) {
            libs[sayitOptions[this.config.type].libs[j]] = require(sayitOptions[this.config.type].libs[j]);
        }

        this.getState('tts.text', (err, state) => {
            if (err || !state) {
                this.setState('tts.text', '', true);
            }
        });

        this.getState('tts.volume', (err, state) => {
            if (err || !state) {
                this.setState('tts.volume', 70, true);
                if (this.config.type !== 'system') {
                    options.sayLastVolume = 70;
                }
            } else {
                if (this.config.type !== 'system') {
                    options.sayLastVolume = state.val;
                }
            }
        });

        this.getState('tts.playing', (err, state) =>
            (err || !state) && this.setState('tts.playing', false, true));

        if (this.config.type === 'system') {
            // Read volume
            this.getState('tts.volume', (err, state) => {
                if (!err && state) {
                    speech2device && speech2device.sayItSystemVolume(state.val);
                } else {
                    speech2device && speech2device.sayItSystemVolume(70);
                }
            });
        }

        // calculate weblink for devices that require it
        if ((this.config.type === 'sonos') ||
            (this.config.type === 'heos') ||
            (this.config.type === 'chromecast') ||
            (this.config.type === 'mpd') ||
            (this.config.type === 'googleHome')) {

            const webInstance = `system.adapter.${this.config.webInstance}`;

            this.log.debug(`[onReady] Applying web settings on object ${webInstance}`);

            this.getForeignObject(webInstance, this.applyWebSettings.bind(this));

            // update web link on changes
            this.subscribeForeignObjects(webInstance, (id, obj) =>
                id === webInstance && this.applyWebSettings(null, obj));
        }

        try {
            text2speech   = new Text2Speech(this, libs, options, this.sayIt.bind(this));
            speech2device = new Speech2Device(this, libs, options);
        } catch (e) {
            this.log.error('[onReady] Cannot initialize engines: ' + e.toString());
            return;
        }

        this.subscribeStates('*');
    }

    mkpathSync(rootpath, dirpath) {
        // Remove filename
        dirpath = dirpath.split('/');
        dirpath.pop();
        if (!dirpath.length) {
            return;
        }

        for (let i = 0; i < dirpath.length; i++) {
            rootpath += dirpath[i] + '/';
            if (!libs.fs.existsSync(rootpath)) {
                if (dirpath[i] !== '..') {
                    libs.fs.mkdirSync(rootpath);
                } else {
                    throw 'Cannot create ' + rootpath + dirpath.join('/');
                }
            }
        }
    }

    async uploadFiles() {
        const folderPath = libs.path.join(__dirname, '/mp3/');

        if (libs.fs.existsSync(folderPath)) {
            this.log.info('[uploadFiles] Uploading announce mp3 files');

            const files = libs.fs.readdirSync(folderPath);
            for (let f = 0; f < files.length; f++) {
                await this.uploadFile(files[f], folderPath);
            }
        }
    }

    async uploadFile(file, folder) {
        const filePath = libs.path.join(folder, file);

        try {
            const stat = libs.fs.statSync(filePath);

            if (!stat.isFile()) {
                // ignore not a file
                return;
            }
        } catch (e) {
            // ignore not a file
            return;
        }

        let data;
        try {
            data = await this.readFileAsync(this.namespace, `tts.userfiles/${file}`);
        } catch (error) {
            // ignore error
        }

        if (!data) {
            try {
                await this.writeFileAsync(this.namespace, `tts.userfiles/${file}`, libs.fs.readFileSync(filePath));
                this.log.info(`[uploadFile] Uploaded "${filePath}"`);
            } catch (e) {
                this.log.error(`[uploadFile] Cannot write file "${filePath}": ${e.toString()}`);
            }
        }
    }

    /**
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state && !state.ack) {
            this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

            if (id === this.namespace + '.tts.clearQueue') {
                if (list.length > 1) {
                    list.splice(1);
                    this.setState('tts.clearQueue', { val: false, ack: true });
                }
            } else if (id === this.namespace + '.tts.volume') {
                if (this.config.type === 'system') {
                    speech2device && speech2device.sayItSystemVolume(state.val);
                } else {
                    options.sayLastVolume = state.val;
                }
            } else if (id === this.namespace + '.tts.text') {
                if (typeof state.val !== 'string') {
                    if (state.val === null || state.val === undefined || state.val === '') {
                        return this.log.warn('Cannot say empty text');
                    }
                    state.val = state.val.toString();
                }

                this.sayIt(state.val);

                this.setState('tts.text', { val: state.val, ack: true });
            } else if (id === this.namespace + '.tts.cachetext') {
                if (typeof state.val !== 'string') {
                    if (state.val === null || state.val === undefined || state.val === '') {
                        return this.log.warn('Cannot cache empty text');
                    }
                    state.val = state.val.toString();
                }

                this.cacheIt(state.val);
            }
        }
    }

    /**
	 * @param {ioBroker.Message} obj
	 */
    onMessage(obj) {
        if (obj) {
            if (obj.command === 'stopInstance') {
                this.stop(() => obj.callback && this.sendTo(obj.from, obj.command, null, obj.callback));
            } else if (obj.command === 'getTypes') {
                const options = Object.keys(engines.sayitOptions).map(type => ({value: type, label: engines.sayitOptions[type].name}));

                obj.callback && this.sendTo(obj.from, obj.command, options, obj.callback);
            } else if (obj.command === 'getEngines') {
                const options = Object.keys(engines.sayitEngines).map(engine => ({value: engine, label: engines.sayitEngines[engine].name}));

                obj.callback && this.sendTo(obj.from, obj.command, options, obj.callback);
            } else if (obj.command === 'getSonosDevices') {
                this.getObjectView('system', 'channel', {
                    startkey: 'sonos.',
                    endkey: 'sonos.\u9999'
                }, (err, res) => {
                    const options = [];

                    if (!err && res) {
                        for (let i = 0; i < res.rows.length; i++) {
                            let name = res.rows[i].value && res.rows[i].value.common && res.rows[i].value.common.name;
                            if (typeof name === 'object') {
                                name = name.en;
                            }

                            options.push({ value: res.rows[i].id, label: res.rows[i].id.replace(/^sonos\.\d+\.root\./, '') + ' [' + name + ']' });
                        }
                    }

                    obj.callback && this.sendTo(obj.from, obj.command, options, obj.callback);
                });
            } else if (obj.command === 'getHeosDevices') {
                this.getObjectView('system', 'channel', {
                    startkey: 'heos.',
                    endkey: 'heos.\u9999'
                }, (err, res) => {
                    const options = [];

                    if (!err && res) {
                        for (let i = 0; i < res.rows.length; i++) {
                            let name = res.rows[i].value && res.rows[i].value.common && res.rows[i].value.common.name;
                            if (typeof name === 'object') {
                                name = name.en;
                            }

                            options.push({ value: res.rows[i].id, label: res.rows[i].id.replace(/^heos\.\d+\.players\./, '') + ' [' + name + ']' });
                        }
                    }

                    obj.callback && this.sendTo(obj.from, obj.command, options, obj.callback);
                });
            } else if (obj.command === 'getMpdDevices') {
                this.getObjectView('system', 'instance', {
                    startkey: 'system.adapter.mpd.',
                    endkey: 'system.adapter.mpd.\u9999'
                }, (err, res) => {
                    const options = [];

                    if (!err && res) {
                        for (let i = 0; i < res.rows.length; i++) {
                            const instanceId = res.rows[i].id.replace('system.adapter.', '');

                            options.push({ value: instanceId, label: instanceId });
                        }
                    }

                    obj.callback && this.sendTo(obj.from, obj.command, options, obj.callback);
                });
            } else if (obj.command === 'getChromecastDevices') {
                try {
                    const mdns = require('mdns');

                    let browser = mdns.createBrowser(mdns.tcp('googlecast'));

                    const result = [];
                    browser.on('serviceUp', service => result.push({name: service.name, ip: service.addresses[0]}));
                    browser.on('error', err => this.log.error('Error on MDNS discovery: ' + err));

                    this.processMessageTimeout = this.setTimeout(() => {
                        this.processMessageTimeout = null;
                        browser.stop();
                        browser = null;

                        const options = result.map(device => ({value: device.ip, label: `${device.name} [${device.ip}]`}));

                        obj.callback && this.sendTo(obj.from, obj.command, options, obj.callback);
                    }, 2000);

                    browser.start();
                } catch (e) {
                    this.log.error(e);
                    obj.callback && this.sendTo(obj.from, obj.command, null, obj.callback);
                }
            }
        }
    }

    cacheIt(text, language) {
        // process queue
        if (text === true) {
            if (!cacheFiles.length) {
                cacheRunning = false;
                return;
            }
            // get next queued text
            const toCache = cacheFiles.shift();

            text = toCache.text;
            language = toCache.language;
        } else {
            // new text to cache
            if (!this.config.cache) {
                return this.log.warn('[cacheIt] Cache is not enabled. Unable to cache: ' + text);
            }

            // Extract language from "en;volume;Text to say"
            if (text.includes(';')) {
                const arr = text.split(';', 3);
                // If language;text or volume;text
                if (arr.length === 2) {
                    // If number
                    if (parseInt(arr[0]).toString() !== arr[0]) {
                        language = arr[0];
                    }
                    text = arr[1];
                } else if (arr.length === 3) {
                    // If language;volume;text or volume;language;text
                    // If number
                    if (parseInt(arr[0]).toString() === arr[0]) {
                        language = arr[1];
                    } else {
                        language = arr[0];
                    }
                    text = arr[2];
                }
            }
            // if no text => do not process
            if (!text.length) {
                return;
            }

            // Check: may be it is file from DB filesystem, like /vis.0/main/img/door-bell.mp3
            if (text[0] === '/') {
                return this.log.warn('[cacheIt] mp3 file must not be cached: ' + text);
            }

            let isGenerate = false;
            language = language || this.config.engine;

            // find out if say.mp3 must be generated
            if (!speech2device || !speech2device.sayItIsPlayFile(text)) {
                isGenerate = sayitOptions[this.config.type].mp3Required;
            }

            if (!isGenerate) {
                if (speech2device && speech2device.sayItIsPlayFile(text)) {
                    this.log.warn('[cacheIt] mp3 file must not be cached: ' + text);
                } else {
                    this.log.warn('[cacheIt] Cache does not required for this engine: ' + this.config.engine);
                }
                return;
            }

            const md5filename = libs.path.join(options.cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.' + fileExt);

            if (libs.fs.existsSync(md5filename)) {
                return this.log.debug('[cacheIt] Text is yet cached: ' + text);
            }

            if (cacheRunning) {
                return cacheFiles.push({text, language});
            }
        }

        cacheRunning = true;

        text2speech && text2speech.sayItGetSpeech(text, language, false, (error, md5filename, _language, volume, seconds) => {
            if (error) {
                this.log.error('[cacheIt] Cannot cache text: "' + error);
            } else {
                this.log.debug('[cacheIt] Text is cached: "' + text + '" under ' + md5filename);
            }

            this.cacheTimeout = this.setTimeout(() => {
                this.cacheTimeout = null;
                this.cacheIt(true);
            }, 2000);
        });
    }

    sayIt(text, language, volume, processing) {
        let md5filename;

        // Extract language from "en;volume;Text to say"
        if (text.includes(';')) {
            const arr = text.split(';', 3);
            // If language;text or volume;text
            if (arr.length === 2) {
                // If number
                if (parseInt(arr[0]).toString() === arr[0].toString()) {
                    volume = arr[0].trim();
                } else {
                    language = arr[0].trim();
                }
                text = arr[1].trim();
            } else if (arr.length === 3) {
                // If language;volume;text or volume;language;text
                // If number
                if (parseInt(arr[0]).toString() === arr[0].toString()) {
                    volume   = arr[0].trim();
                    language = arr[1].trim();
                } else {
                    volume   = arr[1].trim();
                    language = arr[0].trim();
                }
                text = arr[2].trim();
            }
        }

        const sayFirst = text[0] === '!';
        if (sayFirst) {
            text = text.substring(1);
        }

        // if no text => do not process
        if (!text.length) {
            return this.sayFinished(0);
        }

        // Check: may be it is file from DB filesystem, like /vis.0/main/img/door-bell.mp3
        if (text[0] === '/') {
            let cached = false;
            if (this.config.cache) {
                md5filename = libs.path.join(options.cacheDir, libs.crypto.createHash('md5').update(text).digest('hex') + '.' + fileExt);

                if (libs.fs.existsSync(md5filename)) {
                    cached = true;
                    text = md5filename;
                }
            }
            if (!cached) {
                const parts = text.split('/');
                const adap = parts[0];
                parts.splice(0, 1);
                const _path = parts.join('/');

                this.readFile(adap, _path, (err, data) => {
                    if (data) {
                        try {
                            // Cache the file
                            if (md5filename) libs.fs.writeFileSync(md5filename, data);
                            libs.fs.writeFileSync(MP3FILE, data);
                            this.sayIt((sayFirst ? '!' : '') + MP3FILE, language, volume, processing);
                        } catch (e) {
                            this.log.error(`[sayIt] Cannot write file "${MP3FILE}": ${e.toString()}`);
                            this.sayFinished(0);
                        }
                    } else {
                        // may be file from real FS
                        if (libs.fs.existsSync(text)) {
                            try {
                                data = libs.fs.readFileSync(text);
                            } catch (e) {
                                this.log.error(`[sayIt] Cannot read file "${text}": ${e.toString()}`);
                                this.sayFinished(0);
                            }

                            // Cache the file
                            md5filename && libs.fs.writeFileSync(md5filename, data);
                            libs.fs.writeFileSync(MP3FILE, data);
                            this.sayIt((sayFirst ? '!' : '') + MP3FILE, language, volume, processing);
                        } else {
                            this.log.warn(`[sayIt] File "${text}" not found`);
                            this.sayFinished(0);
                        }
                    }
                });
                return;
            }
        }

        if (!processing) {
            const time = Date.now();

            // Workaround for double text
            if (list.length > 1 && (list[list.length - 1].text === text) && (time - list[list.length - 1].time < 500)) {
                return this.log.warn('[sayIt] Same text in less than half a second.. Strange. Ignore it.');
            }
            // If more time than 15 seconds
            if (this.config.announce && !list.length && (!lastSay || (time - lastSay > this.config.annoTimeout * 1000))) {
                if (sayFirst && list.length > 1) {
                    list.splice(1, 0,
                        // place as first the announce mp3
                        {text: this.config.announce, language: language, volume: (volume || this.config.volume) / 2, time: time},
                        // and then text
                        {text: text, language: language, volume: (volume || this.config.volume), time: time});
                } else {
                    // place as first the announce mp3
                    list.push({text: this.config.announce, language: language, volume: (volume || this.config.volume) / 2, time: time});
                    // and then text
                    list.push({text: text, language: language, volume: (volume || this.config.volume), time: time});
                }

                text = this.config.announce;
                volume = Math.round((volume || this.config.volume) / 100 * this.config.annoVolume);
            } else {
                // if high priority text
                if (sayFirst && list.length > 1) {
                    list.splice(1, 0, {text: text, language: language, volume: (volume || this.config.volume), time: time });
                } else {
                    list.push({text: text, language: language, volume: (volume || this.config.volume), time: time });
                }

                if (list.length > 1) {
                    return;
                }
            }
        }

        this.log.info(`[sayIt] Saying: "${text}"`);

        let isGenerate = false;

        if (!language) {
            language = this.config.engine;
        }

        if (!volume && this.config.volume) {
            volume = this.config.volume;
        }

        // find out if say.mp3 must be generated
        if (!speech2device || !speech2device.sayItIsPlayFile(text)) {
            isGenerate = sayitOptions[this.config.type].mp3Required;
        }

        const speechFunction = speech2device && speech2device.getFunction(this.config.type);

        // If text first must be generated
        if (isGenerate && sayLastGeneratedText !== `[${language}]${text}`) {
            sayLastGeneratedText = `[${language}]${text}`;
            text2speech && text2speech.sayItGetSpeech(text, language, volume, (error, text, language, volume, duration) =>
                speechFunction(error, text, language, volume, duration, this.sayFinished.bind(this)));
        } else {
            if (speech2device && speech2device.sayItIsPlayFile(text)) {
                text2speech && text2speech.getLength(text, (error, duration) =>
                    speechFunction(error, text, language, volume, duration, this.sayFinished.bind(this)));
            } else {
                if (!isGenerate) {
                    speechFunction(null, text, language, volume, 0, this.sayFinished.bind(this));
                } else if (this.config.cache) {
                    md5filename = libs.path.join(options.cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.' + fileExt);
                    if (libs.fs.existsSync(md5filename)) {
                        text2speech && text2speech.getLength(md5filename, (error, duration) =>
                            speechFunction(error, md5filename, language, volume, duration, this.sayFinished.bind(this)));
                    } else {
                        sayLastGeneratedText = '[' + language + ']' + text;
                        text2speech && text2speech.sayItGetSpeech(text, language, volume, (error, text, language, volume, duration) =>
                            speechFunction(error, text, language, volume, duration, this.sayFinished.bind(this)));
                    }
                } else {
                    text2speech && text2speech.getLength(MP3FILE, (error, duration) =>
                        speechFunction(error, text, language, volume, duration, this.sayFinished.bind(this)));
                }
            }
        }
    }

    sayFinished(error, duration) {
        error && this.log.error(error);

        duration = duration || 0;
        if (list.length) {
            this.log.debug(`[sayFinished] Duration "${list[0].text}": ${duration}`);
        }

        this.sayFinishedTimeout = this.setTimeout(() => {
            this.sayFinishedTimeout = null;
            // Remember when last text finished
            lastSay = Date.now();
            list.length && list.shift();

            if (list.length) {
                this.sayIt(list[0].text, list[0].language, list[0].volume, true);
            }
        }, duration * 1000);
    }

    applyWebSettings(err, obj) {
        if (!err && obj && obj.native) {
            options.webLink = 'http';
            if (obj.native.auth) {
                this.log.error(`[applyWebSettings] Cannot use server "${this.config.webInstance}" with authentication for sonos/heos/chromecast/mpd/googleHome. Select other or create another one.`);
            } else {
                if (obj.native.secure) {
                    options.webLink += 's';
                }
                options.webLink += '://';
                if (obj.native.bind === 'localhost' || obj.native.bind === '127.0.0.1') {
                    this.log.error(`[applyWebSettings] Selected web server "${this.config.webInstance}" is only on local device available. Select other or create another one.`);
                } else {
                    if (obj.native.bind === '0.0.0.0') {
                        options.webLink += ''; //this.config.webServer;
                    } else {
                        options.webLink += obj.native.bind;
                    }
                }

                options.webLink += ':' + obj.native.port;

                this.log.info(`[applyWebSettings] Using "${options.webLink}" as options.webLink`);
            }
        } else {
            this.log.error(`[applyWebSettings] Cannot read information about "${this.config.webInstance}". No web server is active`);
        }
    }

    /**
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.log.info('stopping...');

            this.processMessageTimeout && this.clearTimeout(this.processMessageTimeout);
            this.processMessageTimeout = null;

            this.sayFinishedTimeout && this.clearTimeout(this.sayFinishedTimeout);
            this.sayFinishedTimeout = null;

            this.cacheTimeout && this.clearTimeout(this.cacheTimeout);
            this.cacheTimeout = null;

            callback();
        } catch (e) {
            callback();
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Sayit(options);
} else {
    // otherwise start the instance directly
    new Sayit();
}