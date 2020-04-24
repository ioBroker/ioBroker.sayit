/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';
const utils         = require('@iobroker/adapter-core'); // Get common adapter utils
const engines       = require('./admin/engines.js');
const Text2Speech   = require('./lib/text2speech');
const Speech2Device = require('./lib/speech2device');
const adapterName   = require('./package.json').name.split('.').pop();

const sayitOptions  = engines.sayitOptions;
const libs          = {};

process.on('SIGINT', stop);

let processMessageTimeout;
let sayFinishedTimeout;
let cacheTimeout;

let adapter;

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {name: adapterName, unload: stop});
    adapter = new utils.Adapter(options);

    adapter.on('stateChange', (id, state) => {
        if (state && !state.ack) {
            if (id === adapter.namespace + '.tts.clearQueue') {
                if (list.length > 1) {
                    list.splice(1);
                    adapter.setState('tts.clearQueue', false, true);
                }
            } else if (id === adapter.namespace + '.tts.volume') {
                if (adapter.config.type === 'system') {
                    speech2device.sayItSystemVolume(state.val);
                } else {
                    options.sayLastVolume = state.val;
                }
            } else if (id === adapter.namespace + '.tts.text') {
                if (typeof state.val !== 'string') {
                    if (state.val === null || state.val === undefined || state.val === '') {
                        adapter.log.warn('Cannot cache empty text');
                        return;
                    }
                    state.val = state.val.toString();
                }

                sayIt(state.val);
            } else if (id === adapter.namespace + '.tts.cachetext') {

                if (typeof state.val !== 'string') {
                    if (state.val === null || state.val === undefined || state.val === '') {
                        adapter.log.warn('Cannot cache empty text');
                        return;
                    }
                    state.val = state.val.toString();
                }

                cacheIt(state.val);
            }
        }
    });

    adapter.on('ready', main);

    adapter.on('message', obj => processMessage(obj));

    MP3FILE = __dirname + '/' + adapter.namespace + '.say.' + fileExt;

    return adapter;
}

function processMessage(obj) {
    if (obj) {
        if (obj.command === 'stopInstance') {
            stop(() =>
                obj.callback && adapter.sendTo(obj.from, obj.command, null, obj.callback));
        } else if (obj.command === 'browseChromecast') {
            try {
                const mdns = require('mdns');

                let browser = mdns.createBrowser(mdns.tcp('googlecast'));

                const result = [];
                browser.on('serviceUp', service => result.push({name: service.name, ip: service.addresses[0]}));
                processMessageTimeout = setTimeout(() => {
                    processMessageTimeout = null;
                    browser.stop();
                    browser = null;
                    obj.callback && adapter.sendTo(obj.from, obj.command, result, obj.callback);
                }, 2000);

                browser.start();
            } catch (e) {
                adapter.log.error(e);
                if (obj.callback) adapter.sendTo(obj.from, obj.command, null, obj.callback);
            }
        }
    }
}

function stop(callback) {
    processMessageTimeout && clearTimeout(processMessageTimeout);
    processMessageTimeout = null;

    sayFinishedTimeout && clearTimeout(sayFinishedTimeout);
    sayFinishedTimeout = null;

    cacheTimeout && clearTimeout(cacheTimeout);
    cacheTimeout = null;

    try {
        adapter && adapter.log && adapter.log.info && adapter.log.info('stopping...');

        setTimeout(() => {
            typeof callback === 'function' && callback();
            adapter.terminate ? adapter.terminate() : process.exit()
        }, 500);
    } catch (e) {
        adapter.terminate ? adapter.terminate() : process.exit();
    }
}

const options = {
    sayLastVolume: null,
    webLink: '',
    cacheDir: '',
    outFileExt: 'mp3'
};

let sayLastGeneratedText = '';
let list                 = [];
let lastSay              = null;
let fileExt              = 'mp3';
let text2speech          = null;
let speech2device        = null;
// const text2speech = new Text2Speech(adapter, libs, options, sayIt);
// const speech2device = new Speech2Device(adapter, libs, options);
let MP3FILE;

function mkpathSync(rootpath, dirpath) {
    libs.fs = libs.fs || require('fs');
    // Remove filename
    dirpath = dirpath.split('/');
    dirpath.pop();
    if (!dirpath.length) return;

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

function sayFinished(error, duration) {
    if (error) {
        adapter.log.error(error);
    }
    duration = duration || 0;
    if (list.length) {
        adapter.log.debug('Duration "' + list[0].text + '": ' + duration);
    }
    sayFinishedTimeout = setTimeout(() => {
        sayFinishedTimeout = null;
        // Remember when last text finished
        lastSay = Date.now();
        if (list.length) list.shift();
        if (list.length) {
            sayIt(list[0].text, list[0].language, list[0].volume, true);
        }
    }, duration * 1000);
}

let cacheRunning = false;
let cacheFiles   = [];

function cacheIt(text, language) {
    // process queue
    if (text === true) {
        if (!cacheFiles.length) {
            cacheRunning = false;
            return;
        }
        // get next queued text
        const toCache = cacheFiles.shift();

        text     = toCache.text;
        language = toCache.language;
    } else {
        // new text to cache
        if (!adapter.config.cache) {
            adapter.log.warn('Cache is not enabled. Unable to cache: ' + text);
            return;
        }

        // Extract language from "en;volume;Text to say"
        if (text.indexOf(';') !== -1) {
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
            adapter.log.warn('mp3 file must not be cached: ' + text);
            return;
        }

        let isGenerate = false;
        if (!language) language = adapter.config.engine;

        // find out if say.mp3 must be generated
        if (!speech2device.sayItIsPlayFile(text)) isGenerate = sayitOptions[adapter.config.type].mp3Required;

        if (!isGenerate) {
            if (speech2device.sayItIsPlayFile(text)) {
                adapter.log.warn('mp3 file must not be cached: ' + text);
            } else {
                adapter.log.warn('Cache does not required for this engine: ' + adapter.config.engine);
            }
            return;
        }

        const md5filename = libs.path.join(options.cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.' + fileExt);
        libs.fs = libs.fs || require('fs');

        if (libs.fs.existsSync(md5filename)) {
            adapter.log.debug('Text is yet cached: ' + text);
            return;
        }

        if (cacheRunning) {
            cacheFiles.push({text, language});
            return;
        }
    }

    cacheRunning = true;

    text2speech.sayItGetSpeech(text, language, false, (error, md5filename, _language, volume, seconds) => {
        if (error) {
            adapter.log.error('Cannot cache text: "' + error);
        } else {
            adapter.log.debug('Text is cached: "' + text + '" under ' + md5filename);
        }
        cacheTimeout = setTimeout(() => {
            cacheTimeout = null;
            cacheIt(true);
        }, 2000);
    });
}

function sayIt(text, language, volume, processing) {
    let md5filename;

    // Extract language from "en;volume;Text to say"
    if (text.indexOf(';') !== -1) {
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
        return sayFinished(0);
    }

    // Check: may be it is file from DB filesystem, like /vis.0/main/img/door-bell.mp3
    if (text[0] === '/') {
        let cached = false;
        if (adapter.config.cache) {
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

            adapter.readFile(adap, _path, (err, data) => {
                if (data) {
                    try {
                        // Cache the file
                        if (md5filename) libs.fs.writeFileSync(md5filename, data);
                        libs.fs.writeFileSync(MP3FILE, data);
                        sayIt((sayFirst ? '!' : '') + MP3FILE, language, volume, processing);
                    } catch (e) {
                        adapter.log.error('Cannot write file "' + MP3FILE + '": ' + e.toString());
                        sayFinished(0);
                    }
                } else {
                    // may be file from real FS
                    if (libs.fs.existsSync(text)) {
                        try {
                            data = libs.fs.readFileSync(text);
                        } catch (e) {
                            adapter.log.error('Cannot read file "' + text + '": ' + e.toString());
                            sayFinished(0);
                        }
                        // Cache the file
                        if (md5filename) libs.fs.writeFileSync(md5filename, data);
                        libs.fs.writeFileSync(MP3FILE, data);
                        sayIt((sayFirst ? '!' : '') + MP3FILE, language, volume, processing);
                    } else {
                        adapter.log.warn('File "' + text + '" not found');
                        sayFinished(0);
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
            adapter.log.warn('Same text in less than half a second.. Strange. Ignore it.');
            return;
        }
        // If more time than 15 seconds
        if (adapter.config.announce && !list.length && (!lastSay || (time - lastSay > adapter.config.annoTimeout * 1000))) {
            if (sayFirst && list.length > 1) {
                list.splice(1, 0,
                    // place as first the announce mp3
                    {text: adapter.config.announce, language: language, volume: (volume || adapter.config.volume) / 2, time: time},
                    // and then text
                    {text: text, language: language, volume: (volume || adapter.config.volume), time: time});
            } else {
                // place as first the announce mp3
                list.push({text: adapter.config.announce, language: language, volume: (volume || adapter.config.volume) / 2, time: time});
                // and then text
                list.push({text: text, language: language, volume: (volume || adapter.config.volume), time: time});
            }
            text = adapter.config.announce;
            volume = Math.round((volume || adapter.config.volume) / 100 * adapter.config.annoVolume);
        } else {
            // if high priority text
            if (sayFirst && list.length > 1) {
                list.splice(1, 0, {text: text, language: language, volume: (volume || adapter.config.volume), time: time });
            } else {
                list.push({text: text, language: language, volume: (volume || adapter.config.volume), time: time });
            }
            if (list.length > 1) return;
        }
    }

    adapter.log.info('saying: ' + text);

    let isGenerate = false;
    if (!language) {
        language = adapter.config.engine;
    }
    if (!volume && adapter.config.volume) {
		volume = adapter.config.volume;
	}

    // find out if say.mp3 must be generated
    if (!speech2device.sayItIsPlayFile(text)) {
        isGenerate = sayitOptions[adapter.config.type].mp3Required;
    }

    const speechFunction = speech2device.getFunction(adapter.config.type);

    // If text first must be generated
    if (isGenerate && sayLastGeneratedText !== '[' + language + ']' + text) {
        sayLastGeneratedText = '[' + language + ']' + text;
        text2speech.sayItGetSpeech(text, language, volume, (error, text, language, volume, duration) =>
            speechFunction(error, text, language, volume, duration, sayFinished));
    } else {
        if (speech2device.sayItIsPlayFile(text)) {
            text2speech.getLength(text, (error, duration) =>
                speechFunction(error, text, language, volume, duration, sayFinished));
        } else {
            if (!isGenerate) {
                speechFunction(null, text, language, volume, 0, sayFinished);
            } else if (adapter.config.cache) {
                md5filename = libs.path.join(options.cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.' + fileExt);
                if (libs.fs.existsSync(md5filename)) {
                    text2speech.getLength(md5filename, (error, duration) =>
                        speechFunction(error, md5filename, language, volume, duration, sayFinished));
                } else {
                    sayLastGeneratedText = '[' + language + ']' + text;
                    text2speech.sayItGetSpeech(text, language, volume, (error, text, language, volume, duration) =>
                        speechFunction(error, text, language, volume, duration, sayFinished));
                }
            } else {
                text2speech.getLength(MP3FILE, (error, duration) =>
                    speechFunction(error, text, language, volume, duration, sayFinished));
            }
        }
    }
}

function uploadFile(file, callback) {
    try {
        const stat = libs.fs.statSync(libs.path.join(__dirname + '/mp3/', file));

        if (!stat.isFile()) {
            // ignore not a file
            return callback && callback();
        }
    } catch (e) {
        // ignore not a file
        return callback && callback();
    }

    adapter.readFile(adapter.namespace, 'tts.userfiles/' + file, (err, data) => {
        if (err || !data) {
            try {
                adapter.writeFile(adapter.namespace, 'tts.userfiles/' + file, libs.fs.readFileSync(libs.path.join(__dirname + '/mp3/', file)), () =>
                    callback && callback());
            } catch (e) {
                adapter.log.error('Cannot read file "' + __dirname + '/mp3/' + file + '": ' + e.toString());
                callback && callback();
            }
        } else {
            callback && callback();
        }
    });
}

function _uploadFiles(files, callback) {
    if (!files || !files.length) {
        adapter.log.info('All files uploaded');
        return callback && callback();
    }

    uploadFile(files.pop(), () => setImmediate(_uploadFiles, files, callback));
}
function uploadFiles(callback) {
    if (libs.fs.existsSync(__dirname + '/mp3')) {
        adapter.log.info('Upload announce mp3 files');
        _uploadFiles(libs.fs.readdirSync(__dirname + '/mp3'), callback);
    } else if (callback) {
        callback();
    }
}

function start() {
    if (adapter.config.engine === 'ru_YA_CLOUD') {
        fileExt = 'ogg';
    } else {
        fileExt = 'mp3';
    }

    MP3FILE = __dirname + '/' + adapter.namespace + '.say.' + fileExt;
    options.outFileExt = fileExt;

    if (adapter.config.announce) {
        adapter.config.annoDuration = parseInt(adapter.config.annoDuration) || 0;
        adapter.config.annoTimeout  = parseInt(adapter.config.annoTimeout)  || 15;
        adapter.config.annoVolume   = parseInt(adapter.config.annoVolume)   || 70; // percent from actual volume

        if (!libs.fs.existsSync(libs.path.join(__dirname, adapter.config.announce))) {
            adapter.readFile(adapter.namespace, 'tts.userfiles/' + adapter.config.announce, (err, data) => {
                if (data) {
                    try {
                        libs.fs.writeFileSync(libs.path.join(__dirname, adapter.config.announce), data);
                        adapter.config.announce = libs.path.join(__dirname, adapter.config.announce);
                    } catch (e) {
                        adapter.log.error('Cannot write file: ' + e.toString());
                        adapter.config.announce = '';
                    }
                }
            });
        } else {
            adapter.config.announce = __dirname + '/' + adapter.config.announce;
        }
    }

    // If cache enabled
    if (adapter.config.cache) {
        if (adapter.config.cacheDir && (adapter.config.cacheDir[0] === '/' || adapter.config.cacheDir[0] === '\\')) {
            adapter.config.cacheDir = adapter.config.cacheDir.substring(1);
        }
        options.cacheDir = libs.path.join(__dirname, adapter.config.cacheDir);
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
                mkpathSync(__dirname + '/', adapter.config.cacheDir);
            } catch (e) {
                adapter.log.error('Cannot create "' + options.cacheDir + '": ' + e.message);
            }
        } else {
            let engine = '';
            // Read the old engine
            if (libs.fs.existsSync(libs.path.join(options.cacheDir, 'engine.txt'))) {
                try {
                    engine = libs.fs.readFileSync(libs.path.join(options.cacheDir, 'engine.txt')).toString();
                } catch (e) {
                    adapter.log.error('Cannot read file "' + libs.path.join(options.cacheDir, 'engine.txt') + ': ' + e.toString());
                }
            }
            // If engine changed
            if (engine !== adapter.config.engine) {
                // Delete all files in this directory
                const files = libs.fs.readdirSync(options.cacheDir);
                for (let f = 0; f < files.length; f++) {
                    if (files[f] === 'engine.txt') continue;
                    if (libs.fs.existsSync(libs.path.join(options.cacheDir, files[f])) && libs.fs.lstatSync(libs.path.join(options.cacheDir, files[f])).isDirectory()) {
                        libs.fs.unlinkSync(libs.path.join(options.cacheDir, files[f]));
                    }
                }
                try {
                    libs.fs.writeFileSync(libs.path.join(options.cacheDir, 'engine.txt'), adapter.config.engine);
                } catch (e) {
                    adapter.log.error('Cannot write file "' + libs.path.join(options.cacheDir, 'engine.txt') + ': ' + e.toString());
                }
            }
        }
    }

    // Load libs
    for (let j = 0; j < sayitOptions[adapter.config.type].libs.length; j++) {
        libs[sayitOptions[adapter.config.type].libs[j]] = require(sayitOptions[adapter.config.type].libs[j]);
    }

    adapter.getState('tts.text', (err, state) => {
        if (err || !state) {
            adapter.setState('tts.text', '', true);
        }
    });

    adapter.getState('tts.volume', (err, state) => {
        if (err || !state) {
            adapter.setState('tts.volume', 70, true);
            if (adapter.config.type !== 'system') options.sayLastVolume = 70;
        } else {
            if (adapter.config.type !== 'system') options.sayLastVolume = state.val;
        }
    });

    adapter.getState('tts.playing', (err, state) => {
        if (err || !state) {
            adapter.setState('tts.playing', false, true);
        }
    });

    if (adapter.config.type === 'system') {
        // Read volume
        adapter.getState('tts.volume', (err, state) => {
            if (!err && state) {
                speech2device.sayItSystemVolume(state.val);
            } else {
                speech2device.sayItSystemVolume(70);
            }
        });
    }

    // calculate weblink for devices that require it
    if ((adapter.config.type === 'sonos') ||
        (adapter.config.type === 'chromecast') ||
        (adapter.config.type === 'mpd') ||
        (adapter.config.type === 'googleHome')) {

        adapter.getForeignObject('system.adapter.' + adapter.config.web, applyWebSettings);
        // update web link on changes
        adapter.subscribeForeignObjects('system.adapter.' + adapter.config.web, (id, obj) =>
            id === 'system.adapter.' + adapter.config.web && applyWebSettings(null, obj));
    }

    try {
        text2speech   = new Text2Speech(adapter, libs, options, sayIt);
        speech2device = new Speech2Device(adapter, libs, options);
    } catch (e) {
        adapter.log.error('Cannot initialize engines: ' + e.toString);
    }

    adapter.subscribeStates('*');
}

function applyWebSettings(err, obj) {
    if (!err && obj && obj.native) {
        options.webLink = 'http';
        if (obj.native.auth) {
            adapter.log.error('Cannot use server "' + adapter.config.web + '" with authentication for sonos/chromecast. Select other or create another one.');
        } else {
            if (obj.native.secure) {
                options.webLink += 's';
            }
            options.webLink += '://';
            if (obj.native.bind === 'localhost' || obj.native.bind === '127.0.0.1') {
                adapter.log.error('Selected web server "' + adapter.config.web + '" is only on local device available. Select other or create another one.');
            } else {
                if (obj.native.bind === '0.0.0.0') {
                    options.webLink += adapter.config.webServer;
                } else {
                    options.webLink += obj.native.bind;
                }
            }

            options.webLink += ':' + obj.native.port;
        }
    } else {
        adapter.log.error('Cannot read information about "' + adapter.config.web + '". No web server is active');
    }
}

function main() {
    libs.fs   = require('fs');
    libs.path = require('path');

    if ((process.argv && process.argv.indexOf('--install') !== -1) ||
        ((!process.argv || process.argv.indexOf('--force') === -1) && (!adapter.common || !adapter.common.enabled))) {
        adapter.log.info('Install process. Upload files and stop.');
        // Check if files exists in datastorage
        uploadFiles(() => adapter.stop ? adapter.stop() : process.exit());
    } else {
        // Check if files exists in datastorage
        uploadFiles(start);
    }
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
