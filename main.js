/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';
const utils         = require('@iobroker/adapter-core'); // Get common adapter utils
const engines       = require('./admin/engines.js');
const Text2Speech   = require('./lib/text2speech');
const Speech2Device = require('./lib/speech2device');
const adapterName   = require('./package.json').name.split('.').pop();
const fs            = require('fs');
const path          = require('path');

const sayitOptions  = engines.sayitOptions;

let dataDir = path.join(utils.getAbsoluteDefaultDataDir(), 'sayit');

process.on('SIGINT', stop);

let processMessageTimeout;
let timeoutRunning;
let crypto;
let adapter;
const options = {
    sayLastVolume: null,
    webLink: '',
    cacheDir: '',
    outFileExt: 'mp3',
};

let sayLastGeneratedText = '';
let lastSay              = null;
let fileExt              = 'mp3';
let text2speech          = null;
let speech2device        = null;
let MP3FILE;
const tasks = [];
let processing = false;

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {name: adapterName, unload: callback => stop(true, callback)});
    adapter = new utils.Adapter(options);

    adapter.on('stateChange', async (id, state) => {
        if (state && !state.ack) {
            if (id === `${adapter.namespace}.tts.clearQueue`) {
                if (tasks.length > 1) {
                    tasks.splice(1);
                    adapter.setState('tts.clearQueue', false, true);
                }
            } else if (id === `${adapter.namespace}.tts.volume`) {
                if (adapter.config.type === 'system') {
                    speech2device && speech2device.sayItSystemVolume(state.val);
                } else {
                    options.sayLastVolume = state.val;
                }
            } else if (id === `${adapter.namespace}.tts.text`) {
                if (typeof state.val !== 'string') {
                    if (state.val === null || state.val === undefined || state.val === '') {
                        return adapter.log.warn('Cannot cache empty text');
                    }
                    state.val = state.val.toString();
                }

                addToQueue(state.val);
            } else if (id === `${adapter.namespace}.tts.cachetext`) {
                if (typeof state.val !== 'string') {
                    if (state.val === null || state.val === undefined || state.val === '') {
                        return adapter.log.warn('Cannot cache empty text');
                    }
                    state.val = state.val.toString();
                }

                addToQueue(state.val, null, null, true);
            }
        }
    });

    adapter.on('objectChange', (id, obj) => {
        if (id === `system.adapter.${adapter.config.web}`) {
            applyWebSettings(obj);
        }
    });

    adapter.on('ready', async () => await main());

    adapter.on('message', obj => processMessage(obj));

    try {
        // create directory
        !fs.existsSync(dataDir) && fs.mkdirSync(dataDir);
    } catch (err) {
        adapter.log.error(`Could not create Storage directory: ${err}`);
        dataDir = __dirname;
    }

    return adapter;
}

function processMessage(obj) {
    if (obj) {
        if (obj.command === 'stopInstance') {
            stop(false, () =>
                obj.callback && adapter.sendTo(obj.from, obj.command, null, obj.callback));
        } else if (obj.callback && obj.command === 'browseChromecast' || obj.command === 'browseGoogleHome') {
            // look for chromecast devices
            try {
                const mdns = require('mdns');

                let browser = mdns.createBrowser(mdns.tcp('googlecast'));

                const result = [];
                browser.on('serviceUp', service => result.push({name: service.name, ip: service.addresses[0]}));
                browser.on('error', err => adapter.log.error(`Error on MDNS discovery: ${err}`));
                processMessageTimeout = setTimeout(() => {
                    processMessageTimeout = null;
                    browser.stop();
                    browser = null;
                    if (obj.command === 'browseGoogleHome') {
                        adapter.sendTo(obj.from, obj.command, result.map(s => ({label: `${s.name}[${s.ip}]`, value: s.ip})), obj.callback);
                    } else {
                        adapter.sendTo(obj.from, obj.command, result, obj.callback);
                    }
                }, 2000);

                browser.start();
            } catch (e) {
                adapter.log.error(e);
                adapter.sendTo(obj.from, obj.command, null, obj.callback);
            }
        }else if (obj.callback && obj.command === 'getChromecastSendTo') {
            adapter.getObjectView('system', 'device', {startkey: 'chromecast.', endkey: 'chromecast.\u9999'}, (err, res) => {
                const list = [];
                if (!err && res) {
                    for (let i = 0; i < res.rows.length; i++) {
                        list.push({value: res.rows[i].id, label: res.rows[i].id});
                    }
                }
                adapter.sendTo(obj.from, obj.command, list, obj.callback);
            });
        }
    }
}

function stop(unload, callback) {
    processMessageTimeout && clearTimeout(processMessageTimeout);
    processMessageTimeout = null;

    timeoutRunning && clearTimeout(timeoutRunning);
    timeoutRunning = null;

    try {
        adapter && adapter.log && adapter.log.info && adapter.log.info('stopping...');
    } catch (e) {
        // ignore
    }

    typeof callback === 'function' && callback();

    if (!unload) {
        setTimeout(() => adapter.terminate ? adapter.terminate() : process.exit(), 500);
    }
}

function mkpathSync(rootpath, dirpath) {
    // Remove filename
    dirpath = dirpath.split('/');
    dirpath.pop();
    if (!dirpath.length) {
        return;
    }

    for (let i = 0; i < dirpath.length; i++) {
        rootpath += `${dirpath[i]}/`;
        if (!fs.existsSync(rootpath)) {
            if (dirpath[i] !== '..') {
                fs.mkdirSync(rootpath);
            } else {
                throw `Cannot create ${rootpath}${dirpath.join('/')}`;
            }
        }
    }
}

function addToQueue(text, language, volume, onlyCache) {
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

    // Workaround for double text
    // find all similar texts with interval less han 500 ms
    const combined = [text, language, volume].filter(t => t).join(';');
    if (tasks.find(task => task.combined === combined && Date.now() - task.ts < 500)) {
        // ignore it
        return;
    }

    const highPriority = text.startsWith('!');

    volume = parseInt(volume || adapter.config.volume, 10);
    if (Number.isNaN(volume)) {
        volume = undefined;
    }

    const task = {text, language, volume, onlyCache, ts: Date.now(), combined};

    // If more time than 15 seconds till last text, add announcement
    if (!onlyCache && adapter.config.announce && !tasks.length && (!lastSay || (Date.now() - lastSay > adapter.config.annoTimeout * 1000))) {
        // place as first the announcement mp3
        tasks.push({
            text: adapter.config.announce,
            language,
            volume: Math.round((volume || 70) / 100 * (parseInt(adapter.config.annoVolume, 10) || 50)),
            ts: task.ts
        });
        // and then text
        tasks.push(task);
    } else if (!onlyCache && highPriority) {
        tasks.unshift(task);
    } else {
        tasks.push(task);
    }

    processTasks()
        .catch(() => {});
}

function getCachedFileName(dir, text, fileExt) {
    crypto = crypto || require('crypto');
    return path.normalize(path.join(dir, `${crypto.createHash('md5').update(text).digest('hex')}.${fileExt}`));
}

function isCached(cacheDir, text, fileExt, cacheExpiryDays) {
    const md5filename = getCachedFileName(options.cacheDir, text, fileExt);

    if (fs.existsSync(md5filename)) {
        if (cacheExpiryDays) {
            const fileStat = fs.statSync(md5filename);
            if (fileStat.ctime && (Date.now() - new Date(fileStat.ctime).getTime() > cacheExpiryDays * 1000 * 60 * 60 * 24)) {
                this.adapter.log.info('Cached File expired, remove and re-generate');
                fs.unlinkSync(md5filename);
                return false;
            }
        }
        return md5filename;
    }

    return false;
}

async function processTasks() {
    if (processing) {
        return;
    }
    processing = true;
    let {text, language, volume, onlyCache} = tasks[0];

    if (text[0] === '!') {
        text = text.substring(1);
    }
    volume = parseInt(volume || adapter.config.volume, 10);
    if (Number.isNaN(volume)) {
        volume = undefined;
    }

    let fileName;

    // find out if say.mp3 must be generated
    const isGenerate = !Speech2Device.isPlayFile(text) && sayitOptions[adapter.config.type].mp3Required;

    language = language || adapter.config.engine;

    // if no text => do not process
    if (isGenerate && text.length && text2speech && speech2device) {
        // Check: may be it is a file from DB filesystem, like /vis.0/main/img/door-bell.mp3
        if (text[0] === '/') {
            if (adapter.config.cache || onlyCache) {
                fileName = isCached(options.cacheDir, text, fileExt, adapter.config.cacheExpiryDays);
            }

            if (!fileName) {
                const parts = text.split('/');
                const _adapter = parts[0];
                parts.shift();
                const _path = parts.join('/');

                let data;

                try {
                    data = await adapter.readFileAsync(_adapter, _path);
                } catch (e) {
                    // adapter.log.error(`Cache file does not exist "${text}": ${e.toString()}`);
                }

                if (!data) {
                    // may be the file is from real FS
                    if (fs.existsSync(text)) {
                        try {
                            data = fs.readFileSync(text);
                        } catch (e) {
                            adapter.log.error(`Cannot read file "${text}": ${e.toString()}`);
                        }
                    } else {
                        adapter.log.warn(`File "${text}" not found`);
                    }
                }

                if (data) {
                    try {
                        // Cache the file
                        if (adapter.config.cache || onlyCache) {
                            // get file name for cache
                            fileName = getCachedFileName(options.cacheDir, text, fileExt);
                        } else {
                            fileName = MP3FILE;
                        }
                        fs.writeFileSync(fileName, data);
                    } catch (e) {
                        adapter.log.error(`Cannot write file "${MP3FILE}": ${e.toString()}`);
                    }
                }
            }
        }

        adapter.log.info(`saying: ${text}`);

        // If text first must be generated, and it is not the same as last one
        if (!fileName && isGenerate) {
            if (sayLastGeneratedText !== `[${language}]${text}`) {
                if (adapter.config.cache) {
                    let md5filename = isCached(options.cacheDir, `${language};${text}`, fileExt, adapter.config.cacheExpiryDays);
                    if (md5filename) {
                        fileName = md5filename;
                    } else {
                        try {
                            fileName = await text2speech.sayItGetSpeech(text, language, volume);
                            sayLastGeneratedText = `[${language}]${text}`;
                        } catch (e) {
                            fileName = null;
                            adapter.log.error(`Cannot generate speech file: ${e}`);
                        }
                    }
                }
            } else {
                fileName = MP3FILE;
            }
        }
    }

    let duration = 0;

    if (!onlyCache && text.length) {
        try {
            // play file
            if (fileName) {
                duration = await text2speech.getDuration(fileName);
                duration = await speech2device.playFile(adapter.config.type, fileName, language, volume, duration);
            } else if (!isGenerate) {
                if (Speech2Device.isPlayFile(text)) {
                    duration = await text2speech.getDuration(text);
                }

                duration = await speech2device.playFile(adapter.config.type, text, language, volume, duration);
            }
            lastSay = Date.now();
        } catch (e) {
            adapter.log.error(`Cannot play file: ${e}`);
        }
    }

    tasks.shift();

    if (tasks.length) {
        timeoutRunning = setTimeout(() => {
            timeoutRunning = null;
            processing = false;
            processTasks();
        }, 100 + duration * 1000);
    } else {
        processing = false;
    }
}

async function uploadFile(file) {
    try {
        const stat = fs.statSync(path.join(`${__dirname}/mp3/`, file));

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
        data = await adapter.readFileAsync(adapter.namespace, `tts.userfiles/${file}`);
    } catch (error) {
        // ignore error
    }

    if (!data) {
        try {
            await adapter.writeFileAsync(adapter.namespace, `tts.userfiles/${file}`, fs.readFileSync(path.join(`${__dirname}/mp3/`, file)));
        } catch (e) {
            adapter.log.error(`Cannot write file "${__dirname}/mp3/${file}": ${e.toString()}`);
        }
    }
}

async function uploadFiles() {
    if (fs.existsSync(`${__dirname}/mp3`)) {
        adapter.log.info('Upload announce mp3 files');
        let obj;
        try {
            obj = await adapter.getForeignObjectAsync(adapter.namespace);
        } catch (e) {
            // ignore
        }

        if (!obj) {
            await adapter.setForeignObjectAsync(adapter.namespace, {
                type: 'meta',
                common: {
                    name: 'User files for SayIt',
                    type: 'meta.user'
                },
                native: {}
            });
        }

        const files = fs.readdirSync(`${__dirname}/mp3`);
        for (let f = 0; f < files.length; f++) {
            await uploadFile(files[f]);
        }
    }
}

async function start() {
    if (!adapter.config.engine) {
        const systemConfig = await adapter.getForeignObjectAsync('system.config');
        adapter.config.engine = (systemConfig && systemConfig.common && systemConfig.common.language) || 'de';
    }

    if (adapter.config.engine === 'ru_YA_CLOUD') {
        fileExt = 'ogg';
    } else {
        fileExt = 'mp3';
    }

    adapter.config.dataDir = dataDir;

    MP3FILE = path.normalize(path.join(adapter.config.dataDir, `${adapter.namespace}.say.${fileExt}`));
    options.outFileExt = fileExt;

    if (adapter.config.announce) {
        adapter.config.annoDuration = parseInt(adapter.config.annoDuration) || 0;
        adapter.config.annoTimeout  = parseInt(adapter.config.annoTimeout)  || 15;
        adapter.config.annoVolume   = parseInt(adapter.config.annoVolume)   || 70; // percent from actual volume

        // remove "tts.userfiles/" from file name
        const fileName = adapter.config.announce.split('/').pop();

        if (!fs.existsSync(path.join(__dirname, fileName))) {
            try {
                const data = await adapter.readFileAsync(adapter.namespace, `tts.userfiles/${fileName}`);
                if (data) {
                    try {
                        fs.writeFileSync(path.join(__dirname, fileName), data);
                        adapter.config.announce = path.join(__dirname, fileName);
                    } catch (e) {
                        adapter.log.error(`Cannot write file: ${e.toString()}`);
                        adapter.config.announce = '';
                    }
                }
            } catch (e) {
                adapter.log.error(`Cannot read file: ${e.toString()}`);
                adapter.config.announce = '';
            }
        } else {
            adapter.config.announce = path.join(__dirname, fileName);
        }
    }

    // If cache enabled
    if (adapter.config.cache) {
        if (adapter.config.cacheDir && (adapter.config.cacheDir[0] === '/' || adapter.config.cacheDir[0] === '\\')) {
            adapter.config.cacheDir = adapter.config.cacheDir.substring(1);
        }
        options.cacheDir = path.join(__dirname, adapter.config.cacheDir);
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
        // Create cache directory, if does not exist
        if (!fs.existsSync(options.cacheDir)) {
            try {
                mkpathSync(`${__dirname}/`, adapter.config.cacheDir);
            } catch (e) {
                adapter.log.error(`Cannot create "${options.cacheDir}": ${e.message}`);
            }
        } else {
            let engine = '';
            // Read the old engine
            if (fs.existsSync(path.join(options.cacheDir, 'engine.txt'))) {
                try {
                    engine = fs.readFileSync(path.join(options.cacheDir, 'engine.txt')).toString();
                } catch (e) {
                    adapter.log.error(`Cannot read file "${path.join(options.cacheDir, 'engine.txt')}: ${e.toString()}`);
                }
            }
            // If engine changed
            if (engine !== adapter.config.engine) {
                // Delete all files in this directory
                const files = fs.readdirSync(options.cacheDir);
                for (let f = 0; f < files.length; f++) {
                    if (files[f] === 'engine.txt') continue;
                    try {
                        if (fs.existsSync(path.join(options.cacheDir, files[f])) && fs.lstatSync(path.join(options.cacheDir, files[f])).isDirectory()) {
                            fs.unlinkSync(path.join(options.cacheDir, files[f]));
                        }
                    } catch (e) {
                        adapter.log.error(`Cannot remove cache file "${path.join(options.cacheDir, files[f])}: ${e.toString()}`);
                    }
                }
                try {
                    fs.writeFileSync(path.join(options.cacheDir, 'engine.txt'), adapter.config.engine);
                } catch (e) {
                    adapter.log.error(`Cannot write file "${path.join(options.cacheDir, 'engine.txt')}: ${e.toString()}`);
                }
            }
        }
    }

    // initialize tts.text
    await adapter.setStateAsync('tts.playing', false, true);

    // calculate weblink for devices that require it
    if ((adapter.config.type === 'sonos') ||
        (adapter.config.type === 'heos') ||
        (adapter.config.type === 'chromecast') ||
        (adapter.config.type === 'mpd') ||
        (adapter.config.type === 'googleHome')
    ) {
        const settings = await adapter.getForeignObjectAsync(`system.adapter.${adapter.config.web}`);
        applyWebSettings(null, settings);

        // update web link on changes
        await adapter.subscribeForeignObjectsAsync(`system.adapter.${adapter.config.web}`);
    }

    // initialize tts.text
    let textState;
    try {
        textState = await adapter.getStateAsync('tts.text');
    } catch (e) {
        // ignore
    }

    if (!textState) {
        await adapter.setStateAsync('tts.text', '', true);
    }

    // create Text2Speech and Speech2Device
    try {
        options.addToQueue = addToQueue;
        options.getCachedFileName = getCachedFileName;
        options.isCached = isCached;
        text2speech   = new Text2Speech(adapter, options);
        speech2device = new Speech2Device(adapter, options);
    } catch (e) {
        adapter.log.error(`Cannot initialize engines: ${e.toString()}`);
        return;
    }

    // initialize tts.volume
    let volumeState;
    try {
        volumeState = await adapter.getStateAsync('tts.volume');
    } catch (e) {
        // ignore
    }

    if (!volumeState) {
        await adapter.setStateAsync('tts.volume', 70, true);
        if (adapter.config.type !== 'system') {
            options.sayLastVolume = 70;
        } else {
            await speech2device.sayItSystemVolume(70);
        }
    } else {
        if (adapter.config.type !== 'system') {
            options.sayLastVolume = volumeState.val;
        } else {
            await speech2device.sayItSystemVolume(volumeState.val);
        }
    }

    adapter.subscribeStates('*');
}

function applyWebSettings(obj) {
    if (obj && obj.native) {
        options.webLink = 'http';
        if (obj.native.auth) {
            adapter.log.error(`Cannot use server "${adapter.config.web}" with authentication for sonos/heos/chromecast. Select other or create another one.`);
        } else {
            if (obj.native.secure) {
                options.webLink += 's';
            }
            options.webLink += '://';
            if (obj.native.bind === 'localhost' || obj.native.bind === '127.0.0.1') {
                adapter.log.error(`Selected web server "${adapter.config.web}" is only on local device available. Select other or create another one.`);
            } else {
                if (obj.native.bind === '0.0.0.0') {
                    options.webLink += adapter.config.webServer;
                } else {
                    options.webLink += obj.native.bind;
                }
            }

            options.webLink += `:${obj.native.port}`;
        }
    } else {
        adapter.log.error(`Cannot read information about "${adapter.config.web}". No web server is active`);
    }
}

async function main() {
    if (
        (process.argv && process.argv.includes('--install')) ||
        (
            (!process.argv || !process.argv.includes('--force')) && // If no arguments or no --force
            (!adapter.common || !adapter.common.enabled) && // And adapter is not enabled
            !process.argv.includes('--debug') // and not debug
        )
    ) {
        adapter.log.info('Install process. Upload files and stop.');
        // Check if files exists in data storage
        await uploadFiles();
        if (adapter.stop) {
            adapter.stop()
        } else {
            process.exit();
        }
    } else {
        // Check if files exists in data storage
        await uploadFiles();
        await start();
    }
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
