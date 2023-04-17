'use strict';
const path = require('path');
const fs   = require('fs');
let jsftp;
let os;
let cp;
let axios;

class Speech2Device {
    constructor(adapter, options) {
        this.adapter = adapter;
        this.options = options;
        this.MP3FILE = options.MP3FILE;
        // Google home
        this.GHClient = null;
        this.GHDefaultMediaReceiver = null;
    }

    async exec(cmd, args, cwd) {
        cp = cp || require('child_process');
        return new Promise((resolve, reject) => {
            try {
                const _cmd = `${cmd}${args && args.length ? ` ${args.join(' ')}` : ''}`;
                this.adapter.log.debug(`Execute ${cmd} ${args && args.length ? args.join(' ') : ''}`);
                const ls = cp.exec(_cmd, {cwd}, code => {
                    if (!code) {
                        resolve && resolve();
                    } else {
                        reject && reject(`Exit code: ${code}`);
                    }
                    reject = null;
                    resolve = null;
                });

                ls.on('error', e =>
                    this.adapter.log.error(`sayIt.play: there was an error while playing the file: ${e.toString()}`));

                ls.stdout.on('data', data => this.adapter.log.debug(`stdout: ${data}`));
                ls.stderr.on('data', data => this.adapter.log.error(`stderr: ${data}`));
            } catch (e) {
                reject && reject(e.toString());
                reject = null;
                resolve = null;
            }
        });
    }

    async spawn(cmd, args, ignoreErrorCode) {
        cp = cp || require('child_process');
        return new Promise((resolve, reject) => {
            try {
                this.adapter.log.debug(`Execute ${cmd} ${args.join(' ')}`);
                const ls = cp.spawn(cmd, args);

                ls.on('error', e =>
                    this.adapter.log.error(`sayIt.play: there was an error while playing the file: ${e.toString()}`));

                ls.stdout.on('data', data => this.adapter.log.debug(`stdout: ${data}`));
                ls.stderr.on('data', data => this.adapter.log.error(`stderr: ${data}`));
                ls.on('close', code => {
                    if (!code || ignoreErrorCode) {
                        resolve && resolve();
                    } else {
                        reject && reject(`Exit code: ${code}`);
                    }
                    reject = null;
                    resolve = null;
                });
            } catch (e) {
                reject && reject(e.toString());
                reject = null;
                resolve = null;
            }
        });
    }

    // Function to fill the .tts.mp3 state
    async uploadToStates(text) {
        let fileData;
        let fileName;
        if (Speech2Device.isPlayFile(text)) {
            fileName = path.normalize(text);
        } else {
            fileName = this.MP3FILE;
        }

        try {
            fileData = fs.readFileSync(fileName);
        } catch (e) {
            throw new Error(`Cannot upload file "${fileName}" to state: ${e.toString()}`);
        }

        const file = `tts.${this.options.outFileExt}`;

        await this.adapter.writeFileAsync(this.adapter.namespace, `tts.${this.options.outFileExt}`, fileData);
        return {fileInDB: `/${this.adapter.namespace}/${file}`, fileOnDisk: fileName};
    }

    static isPlayFile(text) {
        if (text.length > 4) {
            const ext = text.substring(text.length - 4).toLowerCase();
            if (ext === '.mp3' || ext === '.wav' || ext === '.ogg') {
                return true;
            }
        }
        return false;
    }

    async sayItBrowser(text, language, volume, duration, testOptions) {
        const result = await this.uploadToStates(text);

        const browserInstance = (testOptions && testOptions.browserInstance) || this.adapter.config.browserInstance;

        await this.adapter.setForeignStateAsync('vis.0.control.instance', browserInstance);
        await this.adapter.setForeignStateAsync('vis.0.control.data', result.fileInDB);
        await this.adapter.setForeignStateAsync('vis.0.control.command', 'playSound');

        return duration;
    }

    async getWebLink(testOptions) {
        if (testOptions) {
            const webServer = (testOptions && testOptions.webServer) || this.adapter.config.webServer;
            const webInstance = (testOptions && testOptions.webInstance) || this.adapter.config.webInstance;

            if (!this.options.webLink || webServer !== this.adapter.config.webServer || webInstance !== this.adapter.config.webInstance) {
                const obj = await this.adapter.getForeignObjectAsync(`system.adapter.${testOptions.webInstance}`);
                return this.options.getWebLink(obj, webServer, webInstance);
            }
        }

        return this.options.webLink;
    }

    async sayItSonos(text, language, volume, duration, testOptions) {
        volume = volume || this.options.sayLastVolume;
        const result = await this.uploadToStates(text);
        if (volume === 'null') {
            volume = 0;
        }

        const webLink = await this.getWebLink(testOptions);

        const fileName = `${volume ? `${volume};` : ''}${webLink}${result.fileInDB}`;

        const sonosDevice = (testOptions && testOptions.sonosDevice) || this.adapter.config.sonosDevice;

        if (sonosDevice && webLink) {
            this.adapter.log.info(`Set "${sonosDevice}.tts: ${fileName}`);
            await this.adapter.setForeignStateAsync(`${sonosDevice}.tts`, fileName);
        } else if (webLink) {
            this.adapter.log.info(`Send to sonos ${fileName}`);
            this.adapter.sendTo('sonos', 'send', fileName);
        } else {
            this.adapter.log.warn('Web server is unavailable!');
        }

        return duration;
    }

    async sayItHeos(text, language, volume, duration, testOptions) {
        volume = volume || this.options.sayLastVolume;

        const result = await this.uploadToStates(text);

        if (volume === 'null') {
            volume = 0;
        }
        const webLink = await this.getWebLink(testOptions);

        const fileName = `${volume ? `${volume};` : ''}${webLink}${result.fileInDB}`;
        const heosDevice = (testOptions && testOptions.heosDevice) || this.adapter.config.heosDevice;

        if (heosDevice && webLink) {
            this.adapter.log.info(`Set "${heosDevice}.tts: ${fileName}`);
            await this.adapter.setForeignStateAsync(`${heosDevice}.tts`, fileName);
        } else if (webLink) {
            this.adapter.log.info(`Send to heos ${fileName}`);
            this.adapter.sendTo('heos', 'send', fileName);
        } else {
            this.adapter.log.warn('Web server is unavailable!');
        }

        return  duration;
    }

    async sayItMpd(text, language, volume, duration, testOptions) {
        volume = volume || this.options.sayLastVolume;

        const result = await this.uploadToStates(text);
        if (volume === 'null' || volume === 'undefined') {
            volume = 0;
        }
        const webLink = await this.getWebLink(testOptions);
        const mpdInstance = (testOptions && testOptions.mpdInstance) || this.adapter.config.mpdInstance;

        const fileName = `${volume ? `${volume};` : ''}${webLink}${result.fileInDB}`;

        if (mpdInstance && webLink) {
            this.adapter.log.info(`Set "${mpdInstance}.say: ${fileName}`);
            await this.adapter.setForeignStateAsync(`${mpdInstance}.say`, fileName);
        } else if (webLink) {
            this.adapter.log.info(`Send to MPD ${fileName}`);
            this.adapter.sendTo('mpd', 'say', fileName);
        } else {
            this.adapter.log.warn('Web server is unavailable!');
        }

        return duration;
    }

    async sayItChromecast(text, language, volume, duration, testOptions) {
        volume = volume || this.options.sayLastVolume;

        const result = await this.uploadToStates(text);

        if (volume === 'null') {
            volume = 0;
        }
        const webLink = await this.getWebLink(testOptions);
        const chromecastDevice = (testOptions && testOptions.chromecastDevice) || this.adapter.config.chromecastDevice;

        //Create announcement JSON
        const announcement = {
            url: `${webLink}${result.fileInDB}`,
        };
        if (volume) {
            announcement.volume = volume;
        }
        const announcementJSON = JSON.stringify(announcement);

        if (chromecastDevice && webLink) {
            const chromecastAnnouncementDev = `${chromecastDevice}.player.announcement`;
            this.adapter.log.info(`Set "${chromecastAnnouncementDev} to ${announcementJSON}`);
            await this.adapter.setForeignStateAsync(chromecastAnnouncementDev, announcementJSON);
            // Check every 500 ms if the announcement has finished playing
            await new Promise((resolve, reject) => {
                let count = 0;
                let intervalHandler = setInterval(async () => {
                    count++;
                    if (count > 20) {
                        clearInterval(intervalHandler);
                        intervalHandler = null;
                        this.adapter.log.error(`Error while checking if ${chromecastAnnouncementDev} finished playing announcement: ${announcementJSON}: TIMEOUT`);
                        reject();
                        return;
                    }
                    try {
                        const state = await this.adapter.getForeignStateAsync(chromecastAnnouncementDev);
                        if (state && state.ack) {
                            this.adapter.log.debug(`${chromecastAnnouncementDev} finished playing announcement: ${announcementJSON}`);
                            clearInterval(intervalHandler);
                            intervalHandler = null;
                            resolve();
                        }
                    } catch (err) {
                        this.adapter.log.error(`Error while checking if ${chromecastAnnouncementDev} finished playing announcement: ${announcementJSON}: ${err}`);
                        reject();
                    }
                }, 500);
            });
        } else {
            this.adapter.log.warn('Web server is unavailable!');
        }

        return duration;
    }

    launchGoogleHome(client, url) {
        return new Promise((resolve, reject) =>
            client.launch(this.GHDefaultMediaReceiver, (err, player) => {
                if (!player) {
                    return reject('Player not available.');
                }
                const media = {
                    contentId: url,
                    contentType: 'audio/mp3',
                    streamType: 'BUFFERED', // or LIVE
                };

                player.load(media, { autoplay: true }, err => { // , status
                    client.close();
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }));
    }

    async sendToGoogleHome(host, url, volume) {
        const Client = this.GHClient;
        const client = new Client();

        return new Promise((resolve, reject) => {
            client.connect(host, async () => {
                if (volume !== undefined) {
                    try {
                        await new Promise((_resolve, _reject) =>
                            client.setVolume({ level: volume / 100 }, err => err ? _reject(err) : _resolve()));
                    } catch (err) {
                        this.adapter.log.error(`there was an error setting the volume: ${err}`);
                    }
                }

                await this.launchGoogleHome(client, url);

                try {
                    client.close();
                } catch (err) {
                    this.adapter.log.error(`there was an error closing the client: ${err}`);
                }

                resolve();
            });

            client.on('error', err => {
                client.close();
                reject(err);
            });
        });
    }

    async sayItGoogleHome(text, language, volume, duration, testOptions) {
        if (!this.GHClient) {
            const {Client, DefaultMediaReceiver} = require('castv2-client');
            this.GHClient = Client;
            this.GHDefaultMediaReceiver = DefaultMediaReceiver;
        }

        volume = volume || this.options.sayLastVolume;
        const result = await this.uploadToStates(text);
        if (volume === 'null' || volume === null) {
            volume = 0;
        }
        const webLink = await this.getWebLink(testOptions);
        const googleHomeServer = (testOptions && testOptions.googleHomeServer) || this.adapter.config.googleHomeServer;

        if (googleHomeServer && webLink) {
            const url = `${webLink}${result.fileInDB}`;
            this.adapter.log.debug(`Send to google home "${googleHomeServer}": ${url}`);

            await this.sendToGoogleHome(googleHomeServer, url, volume);
        } else {
            throw new Error('Web server is unavailable!');
        }

        return duration;
    }

    async sayItMP24(text, language, volume, duration, testOptions) {
        axios = axios || require('axios');
        const mp24Server = (testOptions && testOptions.mp24Server) || this.adapter.config.mp24Server;

        if (mp24Server) {
			if (!Speech2Device.isPlayFile(text)) {
				// say
				this.adapter.log.debug(`Request MediaPlayer24 "http://${mp24Server}:50000/tts=${encodeURI(text)}"`);
                try {
                    const response = await axios.get(`http://${mp24Server}:50000/tts=${encodeURI(text)}`);
                    this.adapter.log.debug(`Response from MediaPlayer24 "${mp24Server}": ${response.data}`);
                } catch (e) {
                    if (e.message === 'Parse Error') {
                        this.adapter.log.debug('Played successfully');
                    } else {
                        this.adapter.log.error(`Cannot say text on MediaPlayer24 "${mp24Server}": ${e.message}`);
                        throw e;
                    }
                }
			} else {
				// play local file
                try {
                    const response = await axios.get(`http://${mp24Server}:50000/track=${text}`);
                    this.adapter.log.debug(`Response from MediaPlayer24 "${mp24Server}": ${response.data}`);
                } catch (e) {
                    if (e.message === 'Parse Error') {
                        this.adapter.log.debug('Played successfully');
                    } else {
                        this.adapter.log.error(`Cannot say text on MediaPlayer24 "${mp24Server}": ${e.message}`);
                        throw e;
                    }
                }
			}
        }

        return duration + 2;
    }

    async sayItMP24ftp(text, language, volume, duration, testOptions) {
        const result = await this.uploadToStates(text);
        const mp24Server  = (testOptions && testOptions.mp24Server)  || this.adapter.config.mp24Server;
        const ftpPort     = (testOptions && testOptions.ftpPort)     || this.adapter.config.ftpPort;
        const ftpUser     = (testOptions && testOptions.ftpUser)     || this.adapter.config.ftpUser;
        const ftpPassword = (testOptions && testOptions.ftpPassword) || this.adapter.config.ftpPassword;

        // Copy mp3 file to android device to play it later with MediaPlayer
        if (ftpPort && mp24Server) {
            jsftp = jsftp || require('jsftp');
            axios = axios || require('axios');

            const ftp = new jsftp({
                host: mp24Server,
                port: parseInt(ftpPort, 10), // defaults to 21
                user: ftpUser || 'anonymous', // defaults to 'anonymous'
                pass: ftpPassword || 'anonymous',  // defaults to 'anonymous'
            });

            await new Promise((resolve, reject) => {
                try {
                    // Copy file to FTP server
                    const fileNameOnFTP = `${this.adapter.namespace}.say.${this.options.outFileExt}`;
                    ftp.put(result.fileOnDisk, fileNameOnFTP, hadError => {
                        // send quit command
                        ftp.raw('quit', async err => { // , data
                            err && this.adapter.log.error(err);
                            ftp.destroy();

                            if (!hadError) {
                                try {
                                    const response = await axios.get(`http://${mp24Server}:50000/track=${fileNameOnFTP}`);
                                    this.adapter.log.debug(`Response from MediaPlayer24 "${mp24Server}": ${response.data}`);
                                    resolve();
                                } catch (e) {
                                    if (e.message === 'Parse Error') {
                                        this.adapter.log.debug('Played successfully');
                                        resolve();
                                    } else {
                                        this.adapter.log.error(`Cannot say text on MediaPlayer24 "${mp24Server}": ${e.message}`);
                                        reject(e);
                                    }
                                }
                            } else {
                                reject(`FTP error:${hadError}`);
                            }
                        });
                    });
                } catch (e) {
                    throw new Error(`Cannot upload file to ${mp24Server}:${ftpPort}`);
                }
            });
        }

        return duration + 2;
    }

    async sayItSystem(text, language, volume, duration, testOptions) {
        os = os || require('os');
        cp = cp || require('child_process');

        const result = await this.uploadToStates(text);
        const systemCommand = (testOptions && testOptions.systemCommand) || this.adapter.config.systemCommand;
        const systemPlayer = (testOptions && testOptions.systemPlayer) || this.adapter.config.systemPlayer;

        const p = os.platform();
        let cmd;

        if (volume !== undefined) {
            await this.sayItSystemVolume(volume, testOptions);
        }

        if (systemCommand) {
            // custom command
            if (systemCommand.includes('%s')) {
                cmd = systemCommand.replace('%s', result.fileOnDisk);
            } else {
                if (p.match(/^win/)) {
                    cmd = `${systemCommand} "${result.fileOnDisk}"`;
                } else {
                    cmd = `${systemCommand} ${result.fileOnDisk}`;
                }
            }
            try {
                await this.exec(cmd);
            } catch (e) {
                this.adapter.log.error(`Cannot play: ${e}`);
            }
        } else {
            if (p === 'linux') {
                // linux
                if (systemPlayer === 'omxplayer') {
                    cmd = `omxplayer -o local ${result.fileOnDisk}`;
                } else if (systemPlayer === 'mpg321') {
                    cmd = `mpg321 -g ${this.options.sayLastVolume} ${result.fileOnDisk}`;
                } else {
                    cmd = `mplayer ${result.fileOnDisk} -volume ${this.options.sayLastVolume}`;
                }
                try {
                    await this.exec(cmd);
                } catch (e) {
                    this.adapter.log.error(`Cannot play: ${e}`);
                }
            } else if (p.match(/^win/)) {
                // windows
                try {
                    await this.exec('cmdmp3.exe', [`"${result.fileOnDisk}"`], path.normalize(`${__dirname}/../cmdmp3/`));
                } catch (e) {
                    this.adapter.log.error(`Cannot play:${e}`);
                }
            } else if (p === 'darwin') {
                // mac osx
                try {
                    await this.exec('/usr/bin/afplay', [result.fileOnDisk]);
                } catch (e) {
                    this.adapter.log.error(`Cannot play:${e}`);
                }
            }
        }

        if (text === this.adapter.config.announce) {
           return duration;
        } else {
            return duration + 2;
        }
    }

    async sayItWindows(text, language, volume, duration, testOptions) {
        // If mp3 file
        if (Speech2Device.isPlayFile(text)) {
            return this.sayItSystem(text, language, volume, duration, testOptions);
        }

        os = os || require('os');

        // Call windows own text 2 speech
        const p = os.platform();

        if (volume || volume === 0) {
            await this.sayItSystemVolume(volume, testOptions);
        }

        if (p.match(/^win/)) {
            // windows
            try {
                await this.exec(path.normalize(`${__dirname}/../say/SayStatic.exe`), [`"${text}"`]);
            } catch (error) {
                this.adapter.log.error(`sayItWindows: ${error}`);
            }
        } else {
            this.adapter.log.error('sayItWindows: only windows OS is supported for Windows default mode');
        }

        return duration + 2;
    }

    async sayItSystemVolume(level, testOptions) {
        if ((!level && level !== 0) || level === 'null') {
            return;
        }

        level = parseInt(level);
        if (level < 0) {
            level = 0;
        }
        if (level > 100) {
            level = 100;
        }

        if (level === this.options.sayLastVolume) {
            return;
        }
        os = os || require('os');
        cp = cp || require('child_process');

        await this.adapter.setStateAsync('tts.volume', level, true);

        this.options.sayLastVolume = level;

        const p = os.platform();
        const systemPlayer = (testOptions && testOptions.systemPlayer) || this.adapter.config.systemPlayer;

        if (p === 'linux' && systemPlayer !== 'mpg321') {
            // linux
            try {
                await this.spawn('amixer', ['cset', 'name="Master Playback Volume"', '--', `${level}%`]);
            } catch (err) {
                this.adapter.log.error('amixer is not available, so you may hear no audio. Install manually!');
            }
        } else if (p.match(/^win/)) {
            // windows
            // windows volume is from 0 to 65535
            level = Math.round((65535 * level) / 100); // because this level is from 0 to 100
            try {
                await this.spawn(path.normalize(`${__dirname}/../nircmd/nircmdc.exe`), ['setsysvolume', level], true);
            } catch (err) {
                this.adapter.log.error('nircmd is not available, so you may hear no audio.');
            }
        } else if (p === 'darwin') {
            // mac osx
            try {
                await this.spawn('sudo', ['osascript', '-e', `"set Volume ${Math.round(level / 10)}"`]);
            } catch (err) {
                this.adapter.log.error('osascript is not available, so you may hear no audio.');
            }
        }
    };

    async playFile(type, text, language, volume, duration, testOptions) {
        type = testOptions ? testOptions.type || type : type;
        if (type === 'browser') {
            return await this.sayItBrowser(text, language, volume, duration, testOptions);
        } else if (type === 'mp24ftp') {
            return await this.sayItMP24ftp(text, language, volume, duration, testOptions);
        } else if (type === 'mp24') {
            return await this.sayItMP24(text, language, volume, duration, testOptions);
        } else if (type === 'system') {
            return await this.sayItSystem(text, language, volume, duration, testOptions);
        } else if (type === 'windows') {
            return await this.sayItWindows(text, language, volume, duration, testOptions);
        } else if (type === 'sonos') {
            return await this.sayItSonos(text, language, volume, duration, testOptions);
        } else if (type === 'heos') {
            return await this.sayItHeos(text, language, volume, duration, testOptions);
        } else if (type === 'chromecast') {
            return await this.sayItChromecast(text, language, volume, duration, testOptions);
        } else if (type === 'mpd') {
            return await this.sayItMpd(text, language, volume, duration, testOptions);
        } else if (type === 'googleHome') {
            return await this.sayItGoogleHome(text, language, volume, duration, testOptions);
        } else {
            this.adapter.log.error(`Unknown play type: ${type}`);
        }
    }

    static sayItIsPlayFile = Speech2Device.isPlayFile;
}

module.exports = Speech2Device;
