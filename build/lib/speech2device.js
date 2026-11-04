"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const jsftp_1 = __importDefault(require("jsftp"));
const axios_1 = __importDefault(require("axios"));
// @ts-expect-error no types
const castv2_client_1 = require("castv2-client");
class Speech2Device {
    adapter;
    options;
    MP3FILE;
    /** True if the vis.0 objects exist. Null if it was not checked yet */
    vis1exist = null;
    /** True if the vis-2.0 objects exist. Null if it was not checked yet */
    vis2exist = null;
    /** ID of the Aura state that was found, or null if not checked yet or not found */
    auraExist = null;
    /** ID of the Aura state that was not found and already reported, to log the error only once */
    auraMissing = null;
    config;
    constructor(adapter, options) {
        this.adapter = adapter;
        this.options = options;
        this.MP3FILE = options.MP3FILE;
        this.config = adapter.config;
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
                data = await this.adapter.readFileAsync(id, file);
                return data?.file;
            }
            catch (e) {
                this.adapter.log.warn(`Cannot read length of file ${fileName}: ${e}`);
            }
        }
        return null;
    }
    /**
     * Execute a command in the shell and wait till it is finished.
     * A shell is required here, because the user could configure his own play command.
     *
     * @param cmd Command to execute
     * @param args Optional arguments, which will be appended to the command
     * @param cwd Working directory for the command
     */
    async #exec(cmd, args, cwd) {
        return new Promise((resolve, reject) => {
            try {
                const _cmd = `${cmd}${args?.length ? ` ${args.join(' ')}` : ''}`;
                this.adapter.log.debug(`Execute ${_cmd}`);
                const ls = (0, node_child_process_1.exec)(_cmd, { cwd }, error => {
                    if (!error) {
                        resolve?.();
                    }
                    else {
                        reject?.(new Error(`Exit code ${error.code}: ${error.message}`));
                    }
                    reject = null;
                    resolve = null;
                });
                ls.on('error', e => {
                    this.adapter.log.error(`sayIt.play: there was an error while playing the file: ${e.toString()}`);
                    reject?.(e);
                    reject = null;
                    resolve = null;
                });
                ls.stdout?.on('data', data => this.adapter.log.debug(`stdout: ${data}`));
                ls.stderr?.on('data', data => this.adapter.log.debug(`stderr: ${data}`));
            }
            catch (e) {
                reject?.(e);
                reject = null;
                resolve = null;
            }
        });
    }
    /**
     * Execute an external program without a shell and wait till it is finished
     *
     * @param cmd Name of the executable
     * @param args Arguments of the executable
     * @param ignoreErrorCode If true, a non-zero exit code will not be treated as an error
     */
    async #spawn(cmd, args, ignoreErrorCode) {
        return new Promise((resolve, reject) => {
            try {
                this.adapter.log.debug(`Execute ${cmd} ${args.join(' ')}`);
                const ls = (0, node_child_process_1.spawn)(cmd, args);
                ls.on('error', e => {
                    this.adapter.log.debug(`Cannot execute "${cmd}": ${e.toString()}`);
                    reject?.(new Error(`Cannot execute "${cmd}": ${e.toString()}`));
                    reject = null;
                    resolve = null;
                });
                ls.stdout.on('data', data => this.adapter.log.debug(`stdout: ${data}`));
                ls.stderr.on('data', data => this.adapter.log.debug(`stderr: ${data}`));
                ls.on('close', code => {
                    if (!code || ignoreErrorCode) {
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
     * Store the file to say in the "tts.mp3" (or "tts.ogg") file of this instance,
     * so it could be played by a browser or by an external device over the web server.
     * Sound files (like the announcement gong) are stored in the "tts.sound.<ext>" file instead,
     * so the following text cannot overwrite the sound before the device has downloaded it.
     *
     * @param props Text and options of the task
     * @param saveToDisk If true, the file will be stored on the disk too (required for FTP and system player)
     * @returns Link to the file in the ioBroker file storage and the name of the file on the disk
     */
    async #uploadToStates(props, saveToDisk) {
        const text = this.#speechSource(props);
        let fileData;
        let fileName;
        const data = await this.#getFileInStates(text);
        if (data) {
            if (saveToDisk) {
                try {
                    (0, node_fs_1.writeFileSync)(this.MP3FILE, typeof data === 'string' ? Buffer.from(data, 'binary') : data);
                }
                catch (e) {
                    throw new Error(`Cannot save file "${this.MP3FILE}" to disk: ${e.toString()}`);
                }
            }
            return {
                fileInDB: `${text.startsWith('/') ? text : `/${text}`}?ts=${Date.now()}`,
                fileOnDisk: saveToDisk ? this.MP3FILE : null,
            };
        }
        else if (_a.isPlayFile(text)) {
            fileName = (0, node_path_1.normalize)(text);
        }
        else {
            fileName = this.MP3FILE;
        }
        try {
            fileData = (0, node_fs_1.readFileSync)(fileName);
        }
        catch (e) {
            throw new Error(`Cannot upload file "${fileName}" to state: ${e.toString()}`);
        }
        // "props.text" is the name of the sound file, if a sound file must be played and not a generated text
        const file = _a.isPlayFile(props.text)
            ? `tts.sound${(0, node_path_1.extname)(fileName).toLowerCase()}`
            : `tts.${this.options.outFileExt}`;
        await this.adapter.writeFileAsync(this.adapter.namespace, file, fileData);
        return {
            fileInDB: `/${this.adapter.namespace}/${file}?ts=${Date.now()}`,
            fileOnDisk: fileName,
        };
    }
    /**
     * Check if the given text is a name of a sound file and must be played instead of being spoken
     *
     * @param text Text to say or the name of the file to play
     * @returns True if the text is a name of a mp3, wav or ogg file
     */
    static isPlayFile(text) {
        if (text.length > 4) {
            const ext = text.substring(text.length - 4).toLowerCase();
            if (ext === '.mp3' || ext === '.wav' || ext === '.ogg') {
                return true;
            }
        }
        return false;
    }
    /**
     * Get the source to play: the generated or cached file for a text, or the sound file itself
     *
     * @param props Text, type and options of the task
     * @returns Name of the file on the disk or the text/sound file name
     */
    #speechSource(props) {
        return props.fileName && !_a.isPlayFile(props.text) ? props.fileName : props.text;
    }
    /**
     * Play the file in all browsers, where vis or vis-2 is opened
     *
     * @param props Text, type and options of the task
     * @returns True if the file was sent to at least one vis version
     */
    async #sayItBrowser(props) {
        const result = await this.#uploadToStates(props);
        const browserInstance = props.testOptions?.browserInstance || this.config.browserInstance;
        const browserVis = props.testOptions?.browserVis === undefined ? this.config.browserVis : props.testOptions.browserVis;
        if (browserVis === 'aura') {
            return this.#sayItAura(props, result.fileInDB, browserInstance);
        }
        // check if vis.0.control.command exists
        if (!browserVis || browserVis === '1') {
            try {
                if (this.vis1exist === null) {
                    this.vis1exist = !!(await this.adapter.getForeignObjectAsync('vis.0.control.command'));
                    if (!this.vis1exist) {
                        this.adapter.log.error('Cannot control browser via vis(1), because no vis.0.* objects found');
                    }
                }
                if (this.vis1exist) {
                    await this.adapter.setForeignStateAsync('vis.0.control.instance', browserInstance || '*');
                    await this.adapter.setForeignStateAsync('vis.0.control.data', result.fileInDB);
                    await this.adapter.setForeignStateAsync('vis.0.control.command', 'playSound');
                }
            }
            catch (e) {
                this.adapter.log.error(`Cannot control vis(1): ${e}`);
                this.vis1exist = false;
            }
        }
        if (!browserVis || browserVis === '2') {
            try {
                if (this.vis2exist === null) {
                    this.vis2exist = !!(await this.adapter.getForeignObjectAsync('vis-2.0.control.command'));
                    if (!this.vis2exist) {
                        this.adapter.log.error('Cannot control browser via vis(2), because no vis-2.0.* objects found');
                    }
                }
                if (this.vis2exist) {
                    await this.adapter.setForeignStateAsync('vis-2.0.control.command', JSON.stringify({
                        command: 'playSound',
                        data: result.fileInDB,
                        instance: browserInstance || '*',
                    }));
                }
            }
            catch (e) {
                this.adapter.log.error(`Cannot control vis(2): ${e}`);
                this.vis2exist = false;
            }
        }
        return !!this.vis1exist || !!this.vis2exist;
    }
    /**
     * Play the file in the Aura dashboards (ioBroker.aura): Aura plays whatever is written to
     * `aura.N.speech.say` on every open dashboard, or only on some of them.
     *
     * @param props Text, type and options of the task
     * @param fileInDB Path of the uploaded file, like "/sayit.0/tts.mp3?ts=..."
     * @param browserInstance Comma-separated Aura client IDs, or empty / "FFFFFFFF" / "*" for all dashboards
     * @returns True if the Aura instance was found
     */
    async #sayItAura(props, fileInDB, browserInstance) {
        const auraInstance = props.testOptions?.browserAuraInstance || this.config.browserAuraInstance || 'aura.0';
        const id = `${auraInstance}.speech.say`;
        try {
            if (this.auraExist !== id) {
                if (!(await this.adapter.getForeignObjectAsync(id))) {
                    if (this.auraMissing !== id) {
                        this.adapter.log.error(`Cannot play in Aura, because ${id} was not found`);
                        this.auraMissing = id;
                    }
                    this.auraExist = null;
                    return false;
                }
                this.auraExist = id;
                this.auraMissing = null;
            }
            const clients = (browserInstance || '')
                .split(',')
                .map(c => c.trim())
                .filter(c => c && c !== '*' && c.toUpperCase() !== 'FFFFFFFF');
            const payload = { file: fileInDB };
            if (typeof props.volume === 'number' && !isNaN(props.volume)) {
                payload.volume = props.volume;
            }
            if (clients.length) {
                payload.clients = clients;
            }
            await this.adapter.setForeignStateAsync(id, JSON.stringify(payload));
            return true;
        }
        catch (e) {
            this.adapter.log.error(`Cannot control Aura: ${e}`);
            this.auraExist = null;
            return false;
        }
    }
    /**
     * Get the link to the web server. If test options are used, the link will be built for the given web instance.
     *
     * @param testOptions Options provided by the admin test dialog or by a "say" message
     * @returns Link like "http://192.168.1.1:8082" or an empty string if no web server is available
     */
    async #getWebLink(testOptions) {
        if (testOptions) {
            const webServer = testOptions.webServer || this.config.webServer;
            const webInstance = testOptions.webInstance || this.config.webInstance;
            if (!this.options.webLink ||
                webServer !== this.config.webServer ||
                webInstance !== this.config.webInstance) {
                const obj = await this.adapter.getForeignObjectAsync(`system.adapter.${webInstance}`);
                return this.options.getWebLink(obj, webServer, webInstance);
            }
        }
        return this.options.webLink;
    }
    /**
     * Play the file on a sonos device
     *
     * @param props Text, volume and options of the task
     * @returns True if the file was sent to the sonos adapter
     */
    async #sayItSonos(props) {
        props.volume ||= props.testOptions?.volume
            ? parseInt(props.testOptions.volume, 10)
            : this.options.sayLastVolume;
        const result = await this.#uploadToStates(props);
        const webLink = await this.#getWebLink(props.testOptions);
        const fileName = `${props.volume ? `${props.volume};` : ''}${webLink}${result.fileInDB}`;
        const sonosDevice = props.testOptions?.sonosDevice || this.config.sonosDevice;
        if (sonosDevice && webLink) {
            this.adapter.log.info(`Set "${sonosDevice}.tts: ${fileName}`);
            await this.adapter.setForeignStateAsync(`${sonosDevice}.tts`, fileName);
        }
        else if (webLink) {
            this.adapter.log.info(`Send to sonos ${fileName}`);
            this.adapter.sendTo('sonos', 'send', fileName);
        }
        else {
            this.adapter.log.warn('Web server is unavailable!');
            return false;
        }
        return true;
    }
    /**
     * Play the file on a HEOS device
     *
     * @param props Text, volume and options of the task
     * @returns True if the file was sent to the heos adapter
     */
    async #sayItHeos(props) {
        props.volume ||= props.testOptions?.volume
            ? parseInt(props.testOptions.volume, 10)
            : this.options.sayLastVolume;
        const result = await this.#uploadToStates(props);
        const webLink = await this.#getWebLink(props.testOptions);
        const fileName = `${props.volume ? `${props.volume};` : ''}${webLink}${result.fileInDB}`;
        const heosDevice = props.testOptions?.heosDevice || this.config.heosDevice;
        if (heosDevice && webLink) {
            this.adapter.log.info(`Set "${heosDevice}.tts: ${fileName}`);
            await this.adapter.setForeignStateAsync(`${heosDevice}.tts`, fileName);
        }
        else if (webLink) {
            this.adapter.log.info(`Send to heos ${fileName}`);
            this.adapter.sendTo('heos', 'send', fileName);
        }
        else {
            this.adapter.log.warn('Web server is unavailable!');
            return false;
        }
        return true;
    }
    /**
     * Play the file on a player of the Logitech Media Server with the squeezeboxrpc adapter.
     * The adapter stops the current playback, plays the file and restores the playback and the volume.
     *
     * @param props Text and options of the task
     * @returns True if the file was sent to the squeezeboxrpc adapter
     */
    async #sayItSqueezebox(props) {
        const squeezeboxDevice = props.testOptions?.squeezeboxDevice || this.config.squeezeboxDevice;
        if (!squeezeboxDevice) {
            this.adapter.log.warn('No squeezebox player defined');
            return false;
        }
        // The state "Announce" exists since squeezeboxrpc 2.0.0
        const announceId = `${squeezeboxDevice}.Announce`;
        const obj = await this.adapter.getForeignObjectAsync(announceId);
        if (!obj) {
            this.adapter.log.warn(`State "${announceId}" not found. Please update the squeezeboxrpc adapter to 2.0.0 or newer`);
            return false;
        }
        const result = await this.#uploadToStates(props);
        const webLink = await this.#getWebLink(props.testOptions);
        if (!webLink) {
            this.adapter.log.warn('Web server is unavailable!');
            return false;
        }
        // The volume of the announcement is defined in the configuration of the squeezeboxrpc adapter
        const url = `${webLink}${result.fileInDB}`;
        this.adapter.log.info(`Set "${announceId}" to ${url}`);
        await this.adapter.setForeignStateAsync(announceId, url);
        return true;
    }
    /**
     * Play the file on a WiiM, Arylic or other LinkPlay based streamer with the wiim adapter.
     * The state "playPromptUrl" plays the file as a notification: the current playback is lowered and resumed afterward.
     *
     * @param props Text and options of the task
     * @returns True if the file was sent to the wiim adapter
     */
    async #sayItWiim(props) {
        const wiimDevice = props.testOptions?.wiimDevice || this.config.wiimDevice;
        if (!wiimDevice) {
            this.adapter.log.warn('No WiiM streamer defined');
            return false;
        }
        const promptId = `${wiimDevice}.playPromptUrl`;
        const obj = await this.adapter.getForeignObjectAsync(promptId);
        if (!obj) {
            this.adapter.log.warn(`State "${promptId}" not found. Please update the wiim adapter`);
            return false;
        }
        const result = await this.#uploadToStates(props);
        const webLink = await this.#getWebLink(props.testOptions);
        if (!webLink) {
            this.adapter.log.warn('Web server is unavailable!');
            return false;
        }
        // The prompt is played with the actual volume of the streamer
        const url = `${webLink}${result.fileInDB}`;
        this.adapter.log.info(`Set "${promptId}" to ${url}`);
        await this.adapter.setForeignStateAsync(promptId, url);
        return true;
    }
    /**
     * Play the file on the voice satellites of the assistant adapter.
     * "assistant.0" plays on all satellites (state "tts.text"),
     * "assistant.0.satellites.<id>" plays on one satellite (state "tts" of the satellite).
     *
     * @param props Text and options of the task
     * @returns True if the file was sent to the assistant adapter
     */
    async #sayItAssistant(props) {
        const assistantDevice = props.testOptions?.assistantDevice || this.config.assistantDevice;
        if (!assistantDevice) {
            this.adapter.log.warn('No assistant instance or satellite defined');
            return false;
        }
        const ttsId = /^assistant\.\d+$/.test(assistantDevice)
            ? `${assistantDevice}.tts.text`
            : `${assistantDevice}.tts`;
        const obj = await this.adapter.getForeignObjectAsync(ttsId);
        if (!obj) {
            this.adapter.log.warn(`State "${ttsId}" not found. Please check the assistant adapter`);
            return false;
        }
        const result = await this.#uploadToStates(props);
        const webLink = await this.#getWebLink(props.testOptions);
        if (!webLink) {
            this.adapter.log.warn('Web server is unavailable!');
            return false;
        }
        // The assistant adapter downloads the file with ffmpeg and plays it with the volume of the satellite
        const url = `${webLink}${result.fileInDB}`;
        this.adapter.log.info(`Set "${ttsId}" to ${url}`);
        await this.adapter.setForeignStateAsync(ttsId, url);
        return true;
    }
    /**
     * Split the text into blocks of at most 250 characters, as the alexa2 adapter can speak only 250 characters at once.
     * The blocks are separated by ";", so the alexa2 adapter speaks them one after another.
     * The text is split preferably at the end of a sentence, otherwise between words.
     *
     * @param text Text to speak
     * @param maxLength Maximal length of one block
     * @returns Blocks separated by ";"
     */
    static splitAlexaText(text, maxLength = 250) {
        // ";" separates the blocks and the volume for the alexa2 adapter, so it must not be in the text itself
        const sentences = text
            .replace(/;/g, ',')
            .replace(/\s+/g, ' ')
            .trim()
            .split(/(?<=[.!?])\s+/);
        const blocks = [];
        let block = '';
        const add = (part) => {
            if (!block) {
                block = part;
            }
            else if (block.length + 1 + part.length <= maxLength) {
                block = `${block} ${part}`;
            }
            else {
                blocks.push(block);
                block = part;
            }
        };
        for (const sentence of sentences) {
            if (sentence.length <= maxLength) {
                add(sentence);
                continue;
            }
            // The sentence is too long: split it between the words
            for (let word of sentence.split(' ')) {
                // A word longer than the block (like a link) must be cut
                while (word.length > maxLength) {
                    if (block) {
                        blocks.push(block);
                        block = '';
                    }
                    blocks.push(word.substring(0, maxLength));
                    word = word.substring(maxLength);
                }
                if (word) {
                    add(word);
                }
            }
        }
        if (block) {
            blocks.push(block);
        }
        return blocks.join(';');
    }
    /**
     * Say the text on an echo device with the alexa2 adapter.
     * Alexa speaks the text with its own voice, so the voice of sayit is not used, and sound files cannot be played.
     * The command "announcement" plays the chime of Alexa before the text.
     *
     * @param props Text, volume and options of the task
     * @returns True if the text was sent to the alexa2 adapter
     */
    async #sayItAlexa(props) {
        const alexaDevice = props.testOptions?.alexaDevice || this.config.alexaDevice;
        if (!alexaDevice) {
            this.adapter.log.warn('No Alexa device defined');
            return false;
        }
        if (_a.isPlayFile(props.text)) {
            this.adapter.log.warn(`Alexa cannot play the file "${props.text}"`);
            return false;
        }
        const command = (props.testOptions?.alexaCommand || this.config.alexaCommand) === 'announcement' ? 'announcement' : 'speak';
        const commandId = `${alexaDevice}.Commands.${command}`;
        const obj = await this.adapter.getForeignObjectAsync(commandId);
        if (!obj) {
            this.adapter.log.warn(`State "${commandId}" not found. Does the device support commands of the alexa2 adapter?`);
            return false;
        }
        const text = _a.splitAlexaText(props.text);
        if (!text) {
            return false;
        }
        // The alexa2 adapter sets this volume before the text and restores the volume afterward. 0 is ignored by alexa2.
        const volume = Math.round(Number(props.volume));
        const value = volume > 0 && volume <= 100 ? `${volume};${text}` : text;
        this.adapter.log.info(`Set "${commandId}" to ${value}`);
        await this.adapter.setForeignStateAsync(commandId, value);
        // Alexa speaks the text in the cloud, so the duration can only be estimated:
        // about 80 ms per character and 2 seconds of delay by the cloud
        props.duration = Math.ceil(props.text.length * 0.08) + 2;
        return true;
    }
    /**
     * Play the file on Kodi with the kodi adapter (one instance per Kodi).
     * The state "open" clears the music playlist of Kodi, plays the file and switches to the fullscreen player,
     * so the current playback is stopped and not restored afterward.
     *
     * @param props Text and options of the task
     * @returns True if the file was sent to the kodi adapter
     */
    async #sayItKodi(props) {
        const kodiInstance = props.testOptions?.kodiInstance || this.config.kodiInstance;
        if (!kodiInstance) {
            this.adapter.log.warn('No Kodi instance defined');
            return false;
        }
        const openId = `${kodiInstance}.open`;
        const obj = await this.adapter.getForeignObjectAsync(openId);
        if (!obj) {
            this.adapter.log.warn(`State "${openId}" not found. Please check the kodi adapter`);
            return false;
        }
        const result = await this.#uploadToStates(props);
        const webLink = await this.#getWebLink(props.testOptions);
        if (!webLink) {
            this.adapter.log.warn('Web server is unavailable!');
            return false;
        }
        // The file is played with the actual volume of Kodi
        const url = `${webLink}${result.fileInDB}`;
        this.adapter.log.info(`Set "${openId}" to ${url}`);
        await this.adapter.setForeignStateAsync(openId, url);
        return true;
    }
    /**
     * Call a telephone number with the asterisk adapter and play the file in the call.
     * The asterisk adapter reads the mp3 file from the disk, converts it to gsm and sends it to the asterisk server,
     * so sayit and the asterisk adapter must run on the same host. Every text is a separate call.
     *
     * @param props Text and options of the task
     * @returns True if the asterisk adapter started the call
     */
    async #sayItAsterisk(props) {
        const asteriskInstance = props.testOptions?.asteriskInstance || this.config.asteriskInstance;
        const telnr = props.testOptions?.asteriskTelnr || this.config.asteriskTelnr;
        if (!asteriskInstance) {
            this.adapter.log.warn('No asterisk instance defined');
            return false;
        }
        if (!telnr) {
            this.adapter.log.warn('No telephone number defined for the call with the asterisk adapter');
            return false;
        }
        const instanceObj = (await this.adapter.getForeignObjectAsync(`system.adapter.${asteriskInstance}`));
        if (!instanceObj) {
            this.adapter.log.warn(`Instance "${asteriskInstance}" not found`);
            return false;
        }
        if (instanceObj.common?.host && this.adapter.host && instanceObj.common.host !== this.adapter.host) {
            this.adapter.log.warn(`"${asteriskInstance}" runs on the host "${instanceObj.common.host}" and sayit on "${this.adapter.host}". ` +
                'Both must run on the same host, because the asterisk adapter reads the generated file from the disk');
            return false;
        }
        // The file must be on the disk, as the asterisk adapter cannot download it
        const result = await this.#uploadToStates(props, true);
        const audiofile = result.fileOnDisk;
        if (!audiofile || !/\.(mp3|gsm)$/i.test(audiofile)) {
            this.adapter.log.warn(`The asterisk adapter can play only mp3 or gsm files and not "${audiofile}"`);
            return false;
        }
        const callerid = props.testOptions?.asteriskCallerId || this.config.asteriskCallerId;
        const repeat = parseInt((props.testOptions?.asteriskRepeat !== undefined
            ? props.testOptions.asteriskRepeat
            : this.config.asteriskRepeat), 10);
        const message = { telnr, audiofile };
        if (callerid) {
            message.callerid = callerid;
        }
        if (repeat > 0) {
            message.repeat = repeat;
        }
        this.adapter.log.info(`Call ${telnr} with "${asteriskInstance}" and play ${audiofile}`);
        // The asterisk adapter answers after the file was converted and the call was started.
        // It waits up to 60 seconds for the connection, so sayit waits 90 seconds for the answer.
        const response = await new Promise(resolve => {
            const timer = this.adapter.setTimeout(() => resolve(null), 90_000);
            this.adapter.sendTo(asteriskInstance, 'dial', message, (res) => {
                if (timer) {
                    this.adapter.clearTimeout(timer);
                }
                resolve(res);
            });
        });
        if (!response) {
            this.adapter.log.warn(`No answer from "${asteriskInstance}" in 90 seconds`);
            return false;
        }
        if (response.error) {
            this.adapter.log.warn(`"${asteriskInstance}" cannot call ${telnr}: ${response.error}`);
            return false;
        }
        return true;
    }
    /**
     * Replace the characters, which are not allowed in the text of an XML element
     *
     * @param text Text to escape
     * @returns Escaped text
     */
    static escapeXml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
    /**
     * Find the IP address of the speaker of a bosesoundtouch instance (one instance controls one speaker)
     *
     * @param boseInstance Instance of the bosesoundtouch adapter, like "bosesoundtouch.0"
     * @returns IP address or host name of the speaker or an empty string
     */
    async #getBoseAddress(boseInstance) {
        // The adapter reports the IP address of the speaker in "deviceInfo.ipAddress"
        const state = await this.adapter.getForeignStateAsync(`${boseInstance}.deviceInfo.ipAddress`);
        if (state?.val) {
            return String(state.val);
        }
        // Otherwise the address from the configuration of the instance
        const obj = await this.adapter.getForeignObjectAsync(`system.adapter.${boseInstance}`);
        return obj?.native?.address || '';
    }
    /**
     * Play the file on a Bose SoundTouch speaker over the notification interface "/speaker" of the speaker (port 8090).
     * The speaker pauses the current playback, plays the file and resumes the playback afterward.
     * Only some models support it (e.g. SoundTouch 10, 20 and 30 Series III).
     *
     * @param props Text, volume and options of the task
     * @returns True if the speaker accepted the notification
     */
    async #sayItBose(props) {
        const boseInstance = props.testOptions?.boseInstance || this.config.boseInstance;
        if (!boseInstance) {
            this.adapter.log.warn('No Bose SoundTouch instance defined');
            return false;
        }
        const address = await this.#getBoseAddress(boseInstance);
        if (!address) {
            this.adapter.log.warn(`Cannot find the IP address of the Bose speaker of "${boseInstance}"`);
            return false;
        }
        const result = await this.#uploadToStates(props);
        const webLink = await this.#getWebLink(props.testOptions);
        if (!webLink) {
            this.adapter.log.warn('Web server is unavailable!');
            return false;
        }
        const url = `${webLink}${result.fileInDB}`;
        // The speaker validates the app key. Any non-empty key is accepted by the replacements of the Bose cloud.
        const appKey = props.testOptions?.boseAppKey || this.config.boseAppKey || 'ioBroker.sayit';
        // 0 or no volume: the notification is played with the actual volume of the speaker
        const volume = Math.round(Number(props.volume));
        // "service", "reason" and "message" are shown as artist, track and album in "now playing" of the speaker
        const message = _a.isPlayFile(props.text) ? props.text.split(/[/\\]/).pop() || '' : props.text;
        const body = `<play_info>` +
            `<app_key>${_a.escapeXml(appKey)}</app_key>` +
            `<url>${_a.escapeXml(url)}</url>` +
            `<service>ioBroker</service>` +
            `<reason>${_a.escapeXml(this.adapter.namespace)}</reason>` +
            `<message>${_a.escapeXml(message.substring(0, 100))}</message>${volume > 0 && volume <= 100 ? `<volume>${volume}</volume>` : ''}</play_info>`;
        this.adapter.log.info(`Send to Bose speaker ${address}: ${url}`);
        try {
            const response = await axios_1.default.post(`http://${address}:8090/speaker`, body, {
                headers: { 'Content-Type': 'text/xml' },
                timeout: 5000,
                responseType: 'text',
                validateStatus: () => true,
            });
            const answer = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            // The speaker answers "<status>/speaker</status>" if the notification was accepted
            if (response.status !== 200 || !answer.includes('<status>')) {
                this.adapter.log.warn(`Bose speaker ${address} rejected the notification (HTTP ${response.status}): ${answer}. ` +
                    'Only some models support it (e.g. SoundTouch 10, 20 and 30 Series III), ' +
                    'and the speaker checks the app key at the Bose cloud');
                return false;
            }
        }
        catch (e) {
            this.adapter.log.error(`Cannot send the notification to the Bose speaker ${address}: ${e}`);
            return false;
        }
        // The speaker needs a moment to pause the playback, and a new notification during a notification is rejected
        props.duration += 1;
        return true;
    }
    /**
     * Play the file on an Android tablet with the Fully Kiosk Browser via the fullybrowser adapter.
     * The REST command "playSound" is sent over the state "Commands.setRAW" (fullybrowser 3.0.5 or newer).
     *
     * @param props Text, volume and options of the task
     * @returns True if the file was sent to the fullybrowser adapter
     */
    async #sayItFully(props) {
        const fullyDevice = props.testOptions?.fullyDevice || this.config.fullyDevice;
        if (!fullyDevice) {
            this.adapter.log.warn('No Fully Kiosk Browser device defined');
            return false;
        }
        const rawId = `${fullyDevice}.Commands.setRAW`;
        const obj = await this.adapter.getForeignObjectAsync(rawId);
        if (!obj) {
            this.adapter.log.warn(`State "${rawId}" not found. Please update the fullybrowser adapter to 3.0.5 or newer`);
            return false;
        }
        props.volume ||= props.testOptions?.volume
            ? parseInt(props.testOptions.volume, 10)
            : this.options.sayLastVolume;
        const result = await this.#uploadToStates(props);
        const webLink = await this.#getWebLink(props.testOptions);
        if (!webLink) {
            this.adapter.log.warn('Web server is unavailable!');
            return false;
        }
        if (props.volume) {
            // playSound uses the stream 3 (music) too
            await this.adapter.setForeignStateAsync(`${fullyDevice}.Commands.setAudioVolume`, props.volume);
        }
        // setRAW sends "cmd=<value>" without encoding, so the URL must be encoded here
        const url = `${webLink}${result.fileInDB}`;
        this.adapter.log.info(`Set "${rawId}" to playSound ${url}`);
        await this.adapter.setForeignStateAsync(rawId, `playSound&url=${encodeURIComponent(url)}&loop=false&stream=3`);
        return true;
    }
    /**
     * Play the file on a MPD (music player daemon) device
     *
     * @param props Text, volume and options of the task
     * @returns True if the file was sent to the mpd adapter
     */
    async #sayItMpd(props) {
        props.volume ||= props.testOptions?.volume
            ? parseInt(props.testOptions.volume, 10)
            : this.options.sayLastVolume;
        const result = await this.#uploadToStates(props);
        const webLink = await this.#getWebLink(props.testOptions);
        const mpdInstance = props.testOptions?.mpdInstance || this.config.mpdInstance;
        const fileName = `${props.volume ? `${props.volume};` : ''}${webLink}${result.fileInDB}`;
        if (mpdInstance && webLink) {
            this.adapter.log.info(`Set "${mpdInstance}.say: ${fileName}`);
            await this.adapter.setForeignStateAsync(`${mpdInstance}.say`, fileName);
        }
        else if (webLink) {
            this.adapter.log.info(`Send to MPD ${fileName}`);
            this.adapter.sendTo('mpd', 'say', fileName);
        }
        else {
            this.adapter.log.warn('Web server is unavailable!');
            return false;
        }
        return true;
    }
    /**
     * Play the file on a chromecast device and wait till the playback is finished
     *
     * @param props Text, volume, duration and options of the task
     * @returns True if the announcement was played
     */
    async #sayItChromecast(props) {
        props.volume ||= props.testOptions?.volume
            ? parseInt(props.testOptions.volume, 10)
            : this.options.sayLastVolume;
        const result = await this.#uploadToStates(props);
        const webLink = await this.#getWebLink(props.testOptions);
        const chromecastDevice = props.testOptions?.chromecastDevice || this.config.chromecastDevice;
        // Create announcement JSON
        const announcement = {
            url: `${webLink}${result.fileInDB}`,
        };
        if (props.volume) {
            announcement.volume = props.volume;
        }
        const announcementJSON = JSON.stringify(announcement);
        if (chromecastDevice && webLink) {
            const chromecastAnnouncementDev = `${chromecastDevice}.player.announcement`;
            this.adapter.log.info(`Set "${chromecastAnnouncementDev} to ${announcementJSON}`);
            await this.adapter.setForeignStateAsync(chromecastAnnouncementDev, announcementJSON);
            // Check every 500 ms if the announcement has finished playing
            return await new Promise((resolve, reject) => {
                let count = 0;
                let checking = false;
                let intervalHandler = this.adapter.setInterval(async () => {
                    // Do not start the next check if the previous one is not finished yet
                    if (checking || !intervalHandler) {
                        return;
                    }
                    checking = true;
                    count++;
                    /** Stop the interval, so no further checks will be done */
                    const stop = () => {
                        if (intervalHandler) {
                            this.adapter.clearInterval(intervalHandler);
                            intervalHandler = null;
                        }
                    };
                    // We are checking every 500 ms, expected length of playback is defined in variable duration in seconds
                    // Thus, we have to count to duration*2 to be able to wait long enough for the expected playback duration.
                    // We add two additional seconds, to cover delays before the playback starts.
                    if (count > (props.duration + 2) * 2) {
                        stop();
                        this.adapter.log.error(`Error while checking if ${chromecastAnnouncementDev} finished playing announcement: ${announcementJSON}: TIMEOUT`);
                        reject(new Error('Timeout by checking of announcement finished playing'));
                        return;
                    }
                    try {
                        const state = await this.adapter.getForeignStateAsync(chromecastAnnouncementDev);
                        if (state?.ack) {
                            this.adapter.log.debug(`${chromecastAnnouncementDev} finished playing announcement: ${announcementJSON}`);
                            stop();
                            resolve(true);
                        }
                    }
                    catch (err) {
                        this.adapter.log.error(`Error while checking if ${chromecastAnnouncementDev} finished playing announcement: ${announcementJSON}: ${err}`);
                        stop();
                        reject(new Error(`Error by checking of announcement finished playing: ${err}`));
                    }
                    finally {
                        checking = false;
                    }
                }, 500);
            });
        }
        this.adapter.log.warn('Web server is unavailable!');
        return false;
    }
    /**
     * Start the default media receiver on the google home device and play the given URL
     *
     * @param client Connected castv2 client
     * @param url URL of the mp3 file
     */
    #launchGoogleHome(client, url) {
        return new Promise((resolve, reject) => client.launch(castv2_client_1.DefaultMediaReceiver, (launchError, player) => {
            if (!player) {
                return reject(new Error(`Player not available: ${launchError?.toString() || 'unknown error'}`));
            }
            const media = {
                contentId: url,
                contentType: 'audio/mp3',
                streamType: 'BUFFERED', // or LIVE
            };
            player.load(media, { autoplay: true }, (err) => {
                // , status
                client.close();
                if (err) {
                    reject(new Error(err.toString()));
                }
                else {
                    resolve();
                }
            });
        }));
    }
    /**
     * Connect to a google home device, set the volume and play the given URL
     *
     * @param host IP address or host name of the google home device
     * @param url URL of the mp3 file
     * @param volume Volume in percent (0..100)
     */
    async #sendToGoogleHome(host, url, volume) {
        const client = new castv2_client_1.Client();
        return new Promise((resolve, reject) => {
            client.connect(host, async () => {
                try {
                    if (volume !== undefined) {
                        try {
                            await new Promise((_resolve, _reject) => client.setVolume({ level: volume / 100 }, (err) => err ? _reject(new Error(err.toString())) : _resolve()));
                        }
                        catch (err) {
                            this.adapter.log.error(`there was an error setting the volume: ${err}`);
                        }
                    }
                    await this.#launchGoogleHome(client, url);
                    resolve?.();
                }
                catch (err) {
                    reject?.(err);
                }
                finally {
                    reject = null;
                    resolve = null;
                    try {
                        client.close();
                    }
                    catch (err) {
                        this.adapter.log.error(`there was an error closing the client: ${err}`);
                    }
                }
            });
            client.on('error', (err) => {
                client.close();
                reject?.(new Error(err.toString()));
                reject = null;
                resolve = null;
            });
        });
    }
    /**
     * Play the file on a google home device
     *
     * @param props Text, volume and options of the task
     * @returns True if the file was played
     */
    async #sayItGoogleHome(props) {
        props.volume ||= this.options.sayLastVolume;
        const result = await this.#uploadToStates(props);
        const webLink = await this.#getWebLink(props.testOptions);
        const googleHomeServer = props.testOptions?.googleHomeServer || this.config.googleHomeServer;
        if (googleHomeServer && webLink) {
            const url = `${webLink}${result.fileInDB}`;
            this.adapter.log.debug(`Send to google home "${googleHomeServer}": ${url}`);
            await this.#sendToGoogleHome(googleHomeServer, url, props.volume);
        }
        else {
            throw new Error('Web server is unavailable!');
        }
        return true;
    }
    /**
     * Let the android app "MediaPlayer24" say the text or play a file, which is stored on the android device
     *
     * @param props Text and options of the task
     * @returns True if the request was sent
     */
    async #sayItMP24(props) {
        const mp24Server = props.testOptions?.mp24Server || this.config.mp24Server;
        if (mp24Server) {
            // "tts=" says the text, "track=" plays a file, which is stored on the android device.
            // The file name must stay unencoded, because it is a path on the android device
            const url = _a.isPlayFile(props.text)
                ? `http://${mp24Server}:50000/track=${props.text}`
                : `http://${mp24Server}:50000/tts=${encodeURIComponent(props.text)}`;
            this.adapter.log.debug(`Request MediaPlayer24 "${url}"`);
            try {
                const response = await axios_1.default.get(url);
                this.adapter.log.debug(`Response from MediaPlayer24 "${mp24Server}": ${response.data}`);
            }
            catch (e) {
                // MediaPlayer24 answers with an invalid HTTP response, so this error means success
                if (e.message === 'Parse Error') {
                    this.adapter.log.debug('Played successfully');
                }
                else {
                    this.adapter.log.error(`Cannot say text on MediaPlayer24 "${mp24Server}": ${e.message}`);
                    throw e;
                }
            }
        }
        else {
            this.adapter.log.warn('No MediaPlayer24 server defined');
            return false;
        }
        props.duration += 2;
        return true;
    }
    /**
     * Upload the mp3 file per FTP to an android device and let the app "MediaPlayer24" play it
     *
     * @param props Text and options of the task
     * @returns True if the file was uploaded and played
     */
    async #sayItMP24ftp(props) {
        const result = await this.#uploadToStates(props, true);
        const mp24Server = props.testOptions?.mp24Server || this.config.mp24Server;
        const ftpPort = props.testOptions?.ftpPort || this.config.ftpPort;
        const ftpUser = props.testOptions?.ftpUser || this.config.ftpUser;
        const ftpPassword = props.testOptions?.ftpPassword || this.config.ftpPassword;
        // Copy mp3 file to an android device to play it later with MediaPlayer
        if (ftpPort && mp24Server && result.fileOnDisk) {
            const ftp = new jsftp_1.default({
                host: mp24Server,
                port: parseInt(ftpPort, 10), // defaults to 21
                user: ftpUser || 'anonymous', // defaults to 'anonymous'
                pass: ftpPassword || 'anonymous', // defaults to 'anonymous'
            });
            const fileOnDisk = result.fileOnDisk;
            await new Promise((resolve, reject) => {
                try {
                    // Copy file to FTP server
                    const fileNameOnFTP = `${this.adapter.namespace}.say.${this.options.outFileExt}`;
                    ftp.put(fileOnDisk, fileNameOnFTP, hadError => {
                        // send quit command
                        ftp.raw('quit', async (err) => {
                            // , data
                            if (err) {
                                this.adapter.log.error(err.toString());
                            }
                            ftp.destroy();
                            if (!hadError) {
                                try {
                                    const response = await axios_1.default.get(`http://${mp24Server}:50000/track=${fileNameOnFTP}`);
                                    this.adapter.log.debug(`Response from MediaPlayer24 "${mp24Server}": ${response.data}`);
                                    resolve();
                                }
                                catch (e) {
                                    if (e.message === 'Parse Error') {
                                        this.adapter.log.debug('Played successfully');
                                        resolve();
                                    }
                                    else {
                                        this.adapter.log.error(`Cannot say text on MediaPlayer24 "${mp24Server}": ${e.message}`);
                                        reject(new Error(e.toString()));
                                    }
                                }
                            }
                            else {
                                reject(new Error(`FTP error: ${hadError}`));
                            }
                        });
                    });
                }
                catch (e) {
                    reject(new Error(`Cannot upload file to ${mp24Server}:${ftpPort}: ${e.toString()}`));
                }
            });
        }
        else {
            this.adapter.log.warn('No FTP server or port defined');
            return false;
        }
        props.duration += 2;
        return true;
    }
    /**
     * Play the file with the system player of the host, where the adapter is running
     *
     * @param props Text, volume and options of the task
     * @returns True if the file was played
     */
    async #sayItSystem(props) {
        const result = await this.#uploadToStates(props, true);
        const systemCommand = props.testOptions?.systemCommand || this.config.systemCommand;
        const systemPlayer = props.testOptions?.systemPlayer || this.config.systemPlayer;
        const p = (0, node_os_1.platform)();
        let cmd;
        if (props.volume !== undefined) {
            await this.sayItSystemVolume(props.volume, props.testOptions);
        }
        if (result.fileOnDisk) {
            if (systemCommand) {
                // custom command
                if (systemCommand.includes('%s')) {
                    cmd = systemCommand.replace('%s', result.fileOnDisk);
                }
                else {
                    if (p.match(/^win/)) {
                        cmd = `${systemCommand} "${result.fileOnDisk}"`;
                    }
                    else {
                        cmd = `${systemCommand} ${result.fileOnDisk}`;
                    }
                }
                try {
                    await this.#exec(cmd);
                }
                catch (e) {
                    this.adapter.log.error(`Cannot play: ${e}`);
                    return false;
                }
            }
            else if (p === 'linux') {
                // linux
                if (systemPlayer === 'omxplayer') {
                    cmd = `omxplayer -o local "${result.fileOnDisk}"`;
                }
                else if (systemPlayer === 'mpg321') {
                    cmd = `mpg321 -g ${this.options.sayLastVolume} "${result.fileOnDisk}"`;
                }
                else {
                    cmd = `mplayer "${result.fileOnDisk}" -volume ${this.options.sayLastVolume}`;
                }
                try {
                    await this.#exec(cmd);
                }
                catch (e) {
                    this.adapter.log.error(`Cannot play: ${e}`);
                    return false;
                }
            }
            else if (p.match(/^win/)) {
                // windows
                try {
                    await this.#spawn((0, node_path_1.normalize)((0, node_path_1.join)(__dirname, '..', 'cmdmp3', 'cmdmp3.exe')), [result.fileOnDisk]);
                }
                catch (e) {
                    this.adapter.log.error(`Cannot play: ${e}`);
                    return false;
                }
            }
            else if (p === 'darwin') {
                // mac osx
                try {
                    await this.#spawn('/usr/bin/afplay', [result.fileOnDisk]);
                }
                catch (e) {
                    this.adapter.log.error(`Cannot play: ${e}`);
                    return false;
                }
            }
            else {
                this.adapter.log.error(`Unsupported platform: ${p}`);
                return false;
            }
        }
        if (props.text !== this.config.announce) {
            props.duration += 2;
        }
        return true;
    }
    /**
     * Say the text with the windows own text to speech engine
     *
     * @param props Text, volume and options of the task
     * @returns True if the text was said
     */
    async #sayItWindows(props) {
        // If mp3 file
        if (_a.isPlayFile(props.text)) {
            return this.#sayItSystem(props);
        }
        // Call windows own text 2 speech
        const p = (0, node_os_1.platform)();
        if (props.volume !== undefined) {
            await this.sayItSystemVolume(props.volume, props.testOptions);
        }
        if (p.match(/^win/)) {
            // windows
            try {
                await this.#spawn((0, node_path_1.normalize)((0, node_path_1.join)(__dirname, '..', 'say', 'SayStatic.exe')), [props.text]);
            }
            catch (error) {
                this.adapter.log.error(`sayItWindows: ${error}`);
                return false;
            }
        }
        else {
            this.adapter.log.error('sayItWindows: only windows OS is supported for Windows default mode');
            return false;
        }
        props.duration += 2;
        return true;
    }
    /**
     * Set the volume of the host, where the adapter is running
     *
     * @param level Volume in percent (0..100)
     * @param testOptions Options provided by the admin test dialog or by a "say" message
     */
    async sayItSystemVolume(level, testOptions) {
        if (level === undefined || level === null || level === '') {
            return;
        }
        level = parseInt(level, 10);
        if (Number.isNaN(level)) {
            return;
        }
        if (level < 0) {
            level = 0;
        }
        if (level > 100) {
            level = 100;
        }
        if (level === this.options.sayLastVolume) {
            return;
        }
        await this.adapter.setStateAsync('tts.volume', level, true);
        this.options.sayLastVolume = level;
        const p = (0, node_os_1.platform)();
        const systemPlayer = testOptions?.systemPlayer || this.config.systemPlayer;
        if (p === 'linux' && systemPlayer !== 'mpg321') {
            // linux. The arguments are given without quotes, because no shell is involved
            try {
                await this.#spawn('amixer', ['cset', 'name=Master Playback Volume', '--', `${level}%`]);
            }
            catch {
                this.adapter.log.error('amixer is not available, so you may hear no audio. Install manually!');
            }
        }
        else if (p.match(/^win/)) {
            // windows
            // windows volume is from 0 to 65535
            level = Math.round((65535 * level) / 100); // because this level is from 0 to 100
            try {
                await this.#spawn((0, node_path_1.normalize)((0, node_path_1.join)(__dirname, '..', 'nircmd', 'nircmdc.exe')), ['setsysvolume', level.toString()], true);
            }
            catch {
                this.adapter.log.error('nircmd is not available, so you may hear no audio.');
            }
        }
        else if (p === 'darwin') {
            // mac osx
            try {
                await this.#spawn('sudo', ['osascript', '-e', `set Volume ${Math.round(level / 10)}`]);
            }
            catch {
                this.adapter.log.error('osascript is not available, so you may hear no audio.');
            }
        }
    }
    /**
     * Play the generated file or say the text on the configured device
     *
     * @param props Text, type, volume, duration and options of the task
     * @returns True if the file was played
     */
    async playFile(props) {
        const type = props.testOptions?.type || props.type;
        if (type === 'browser') {
            return await this.#sayItBrowser(props);
        }
        if (type === 'mp24ftp') {
            return await this.#sayItMP24ftp(props);
        }
        if (type === 'mp24') {
            return await this.#sayItMP24(props);
        }
        if (type === 'system') {
            return await this.#sayItSystem(props);
        }
        if (type === 'windows') {
            return await this.#sayItWindows(props);
        }
        if (type === 'sonos') {
            return await this.#sayItSonos(props);
        }
        if (type === 'heos') {
            return await this.#sayItHeos(props);
        }
        if (type === 'squeezebox') {
            return await this.#sayItSqueezebox(props);
        }
        if (type === 'wiim') {
            return await this.#sayItWiim(props);
        }
        if (type === 'assistant') {
            return await this.#sayItAssistant(props);
        }
        if (type === 'alexa') {
            return await this.#sayItAlexa(props);
        }
        if (type === 'bose') {
            return await this.#sayItBose(props);
        }
        if (type === 'kodi') {
            return await this.#sayItKodi(props);
        }
        if (type === 'asterisk') {
            return await this.#sayItAsterisk(props);
        }
        if (type === 'fully') {
            return await this.#sayItFully(props);
        }
        if (type === 'chromecast') {
            return await this.#sayItChromecast(props);
        }
        if (type === 'mpd') {
            return await this.#sayItMpd(props);
        }
        if (type === 'googleHome') {
            return await this.#sayItGoogleHome(props);
        }
        this.adapter.log.error(`Unknown play type: ${type}`);
        return false;
    }
}
_a = Speech2Device;
exports.default = Speech2Device;
//# sourceMappingURL=speech2device.js.map