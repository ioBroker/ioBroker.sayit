import { platform } from 'node:os';
import { normalize } from 'node:path';
import { exec, spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import jsftp from 'jsftp';
import axios from 'axios';
// @ts-expect-error no types
import { Client as GHClient, DefaultMediaReceiver } from 'castv2-client';

import type { SayItAdapterConfig, SayItDeviceProps } from '../types';

interface Speech2DeviceOptions {
    MP3FILE: string;
    outFileExt: string;
    webLink: string;
    sayLastVolume: number;
    getWebLink: (instance: ioBroker.InstanceObject, webServer: string, webInstance: `${string}.${number}`) => string;
}

export default class Speech2Device {
    private adapter: ioBroker.Adapter;
    private options: Speech2DeviceOptions;
    private readonly MP3FILE: string;
    private vis1exist: boolean | null = null;
    private vis2exist: boolean | null = null;
    private config: SayItAdapterConfig;

    constructor(adapter: ioBroker.Adapter, options: Speech2DeviceOptions) {
        this.adapter = adapter;
        this.options = options;
        this.MP3FILE = options.MP3FILE;
        this.config = adapter.config as SayItAdapterConfig;
    }

    async #getFileInStates(fileName: string): Promise<null | Buffer | string> {
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
            } catch (e) {
                this.adapter.log.warn(`Cannot read length of file ${fileName}: ${e}`);
            }
        }
        return null;
    }

    async #exec(cmd: string, args?: string[], cwd?: string): Promise<void> {
        return new Promise<void>((resolve: null | (() => void), reject: null | ((error: Error) => void)) => {
            try {
                const _cmd = `${cmd}${args?.length ? ` ${args.join(' ')}` : ''}`;
                this.adapter.log.debug(`Execute ${cmd} ${args?.length ? args.join(' ') : ''}`);
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
                    this.adapter.log.error(`sayIt.play: there was an error while playing the file: ${e.toString()}`),
                );

                ls.stdout?.on('data', data => this.adapter.log.debug(`stdout: ${data}`));
                ls.stderr?.on('data', data => this.adapter.log.error(`stderr: ${data}`));
            } catch (e) {
                reject?.(e as Error);
                reject = null;
                resolve = null;
            }
        });
    }

    async #spawn(cmd: string, args: string[], ignoreErrorCode?: boolean): Promise<void> {
        return new Promise<void>((resolve: null | (() => void), reject: null | ((error: Error) => void)) => {
            try {
                this.adapter.log.debug(`Execute ${cmd} ${args.join(' ')}`);
                const ls = spawn(cmd, args);

                ls.on('error', e =>
                    this.adapter.log.error(`sayIt.play: there was an error while playing the file: ${e.toString()}`),
                );

                ls.stdout.on('data', data => this.adapter.log.debug(`stdout: ${data}`));
                ls.stderr.on('data', data => this.adapter.log.error(`stderr: ${data}`));
                ls.on('close', code => {
                    if (!code || ignoreErrorCode) {
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

    // Function to fill the .tts.mp3 state
    async #uploadToStates(
        text: string,
        saveToDisk?: boolean,
    ): Promise<{ fileInDB: string; fileOnDisk: string | null }> {
        let fileData;
        let fileName;
        const data = await this.#getFileInStates(text);
        if (data) {
            if (saveToDisk) {
                try {
                    writeFileSync(this.MP3FILE, data as string);
                } catch (e) {
                    throw new Error(`Cannot save file "${this.MP3FILE}" to disk: ${e.toString()}`);
                }
            }

            return {
                fileInDB: `${text.startsWith('/') ? text : `/${text}`}?ts=${Date.now()}`,
                fileOnDisk: saveToDisk ? this.MP3FILE : null,
            };
        } else if (Speech2Device.isPlayFile(text)) {
            fileName = normalize(text);
        } else {
            fileName = this.MP3FILE;
        }

        try {
            fileData = readFileSync(fileName);
        } catch (e) {
            throw new Error(`Cannot upload file "${fileName}" to state: ${e.toString()}`);
        }

        const file = `tts.${this.options.outFileExt}`;

        await this.adapter.writeFileAsync(this.adapter.namespace, `tts.${this.options.outFileExt}`, fileData);
        return {
            fileInDB: `/${this.adapter.namespace}/${file}?ts=${Date.now()}`,
            fileOnDisk: fileName,
        };
    }

    static isPlayFile(text: string): boolean {
        if (text.length > 4) {
            const ext = text.substring(text.length - 4).toLowerCase();
            if (ext === '.mp3' || ext === '.wav' || ext === '.ogg') {
                return true;
            }
        }
        return false;
    }

    async #sayItBrowser(props: SayItDeviceProps): Promise<boolean> {
        const result = await this.#uploadToStates(props.text);

        const browserInstance = props.testOptions?.browserInstance || this.config.browserInstance;
        const browserVis =
            props.testOptions?.browserVis === undefined ? this.config.browserVis : props.testOptions.browserVis;

        // check if vis.0.control.command exists
        if (!browserVis || browserVis === '1') {
            try {
                if (this.vis1exist === null) {
                    this.vis1exist = !!(await this.adapter.getForeignObjectAsync('vis.0.control.command'));
                    if (!this.vis1exist) {
                        this.adapter.log.error('Cannot control browser via vis1, because vis.0.* objects found');
                    }
                }
                if (this.vis1exist) {
                    await this.adapter.setForeignStateAsync('vis.0.control.instance', browserInstance || '*');
                    await this.adapter.setForeignStateAsync('vis.0.control.data', result.fileInDB);
                    await this.adapter.setForeignStateAsync('vis.0.control.command', 'playSound');
                }
            } catch (e) {
                this.adapter.log.error(`Cannot control vis(1): ${e}`);
                this.vis1exist = false;
            }
        }

        if (!browserVis || browserVis === '2') {
            try {
                if (this.vis2exist === null) {
                    this.vis2exist = !!(await this.adapter.getForeignObjectAsync('vis-2.0.control.command'));
                    if (!this.vis2exist) {
                        this.adapter.log.error('Cannot control browser via vis1, because vis-2.0.* objects found');
                        return false;
                    }
                }
                if (this.vis2exist) {
                    await this.adapter.setForeignStateAsync(
                        'vis-2.0.control.command',
                        JSON.stringify({
                            command: 'playSound',
                            data: result.fileInDB,
                            instance: browserInstance || '*',
                        }),
                    );
                }
            } catch (e) {
                this.adapter.log.error(`Cannot control vis(1): ${e}`);
                this.vis2exist = false;
            }
        }

        return !(!this.vis1exist && !this.vis2exist);
    }

    async #getWebLink(testOptions?: SayItDeviceProps['testOptions']): Promise<string> {
        if (testOptions) {
            const webServer = testOptions?.webServer || this.config.webServer;
            const webInstance = testOptions?.webInstance || this.config.webInstance;

            if (
                !this.options.webLink ||
                webServer !== this.config.webServer ||
                webInstance !== this.config.webInstance
            ) {
                const obj = await this.adapter.getForeignObjectAsync(`system.adapter.${testOptions.webInstance}`);
                return this.options.getWebLink(obj as ioBroker.InstanceObject, webServer, webInstance);
            }
        }

        return this.options.webLink;
    }

    async #sayItSonos(props: SayItDeviceProps): Promise<boolean> {
        props.volume ||= this.options.sayLastVolume;
        const result = await this.#uploadToStates(props.text);

        const webLink = await this.#getWebLink(props.testOptions);

        const fileName = `${props.volume ? `${props.volume};` : ''}${webLink}${result.fileInDB}`;

        const sonosDevice = props.testOptions?.sonosDevice || this.config.sonosDevice;

        if (sonosDevice && webLink) {
            this.adapter.log.info(`Set "${sonosDevice}.tts: ${fileName}`);
            await this.adapter.setForeignStateAsync(`${sonosDevice}.tts`, fileName);
        } else if (webLink) {
            this.adapter.log.info(`Send to sonos ${fileName}`);
            this.adapter.sendTo('sonos', 'send', fileName);
        } else {
            this.adapter.log.warn('Web server is unavailable!');
            return false;
        }

        return true;
    }

    async #sayItHeos(props: SayItDeviceProps): Promise<boolean> {
        props.volume ||= this.options.sayLastVolume;

        const result = await this.#uploadToStates(props.text);

        const webLink = await this.#getWebLink(props.testOptions);

        const fileName = `${props.volume ? `${props.volume};` : ''}${webLink}${result.fileInDB}`;
        const heosDevice = props.testOptions?.heosDevice || this.config.heosDevice;

        if (heosDevice && webLink) {
            this.adapter.log.info(`Set "${heosDevice}.tts: ${fileName}`);
            await this.adapter.setForeignStateAsync(`${heosDevice}.tts`, fileName);
        } else if (webLink) {
            this.adapter.log.info(`Send to heos ${fileName}`);
            this.adapter.sendTo('heos', 'send', fileName);
        } else {
            this.adapter.log.warn('Web server is unavailable!');
            return false;
        }

        return true;
    }

    async #sayItMpd(props: SayItDeviceProps): Promise<boolean> {
        props.volume ||= this.options.sayLastVolume;

        const result = await this.#uploadToStates(props.text);
        const webLink = await this.#getWebLink(props.testOptions);
        const mpdInstance = props.testOptions?.mpdInstance || this.config.mpdInstance;

        const fileName = `${props.volume ? `${props.volume};` : ''}${webLink}${result.fileInDB}`;

        if (mpdInstance && webLink) {
            this.adapter.log.info(`Set "${mpdInstance}.say: ${fileName}`);
            await this.adapter.setForeignStateAsync(`${mpdInstance}.say`, fileName);
        } else if (webLink) {
            this.adapter.log.info(`Send to MPD ${fileName}`);
            this.adapter.sendTo('mpd', 'say', fileName);
        } else {
            this.adapter.log.warn('Web server is unavailable!');
            return false;
        }

        return true;
    }

    async #sayItChromecast(props: SayItDeviceProps): Promise<boolean> {
        props.volume ||= this.options.sayLastVolume;

        const result = await this.#uploadToStates(props.text);

        const webLink = await this.#getWebLink(props.testOptions);
        const chromecastDevice = props.testOptions?.chromecastDevice || this.config.chromecastDevice;

        // Create announcement JSON
        const announcement: {
            url: string;
            volume?: number;
        } = {
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
            return await new Promise<boolean>((resolve, reject) => {
                let count = 0;
                let intervalHandler: NodeJS.Timeout | null = setInterval(async () => {
                    count++;
                    // We are checking every 500 ms, expected length of playback is defined in variable duration in seconds
                    // Thus, we have to count to duration*2 to be able to wait long enough for the expected playback duration.
                    // We add two additional seconds, to cover delays before the playback starts.
                    if (count > (props.duration + 2) * 2) {
                        if (intervalHandler) {
                            clearInterval(intervalHandler);
                            intervalHandler = null;
                        }
                        this.adapter.log.error(
                            `Error while checking if ${chromecastAnnouncementDev} finished playing announcement: ${announcementJSON}: TIMEOUT`,
                        );
                        reject(new Error('Timeout by checking of announcement finished playing'));
                        return;
                    }
                    try {
                        const state = await this.adapter.getForeignStateAsync(chromecastAnnouncementDev);
                        if (state && state.ack) {
                            this.adapter.log.debug(
                                `${chromecastAnnouncementDev} finished playing announcement: ${announcementJSON}`,
                            );
                            if (intervalHandler) {
                                clearInterval(intervalHandler);
                                intervalHandler = null;
                            }
                            resolve(true);
                        }
                    } catch (err) {
                        this.adapter.log.error(
                            `Error while checking if ${chromecastAnnouncementDev} finished playing announcement: ${announcementJSON}: ${err}`,
                        );
                        reject(new Error(`Error by checking of announcement finished playing: ${err}`));
                    }
                }, 500);
            });
        }

        this.adapter.log.warn('Web server is unavailable!');
        return false;
    }

    #launchGoogleHome(client: any, url: string): Promise<void> {
        return new Promise<void>((resolve, reject) =>
            client.launch(DefaultMediaReceiver, (err: Error | null, player: any): void => {
                if (!player) {
                    return reject(new Error('Player not available.'));
                }
                const media = {
                    contentId: url,
                    contentType: 'audio/mp3',
                    streamType: 'BUFFERED', // or LIVE
                };

                player.load(media, { autoplay: true }, (err: Error): void => {
                    // , status
                    client.close();
                    if (err) {
                        reject(new Error(err.toString()));
                    } else {
                        resolve();
                    }
                });
            }),
        );
    }

    async #sendToGoogleHome(host: string, url: string, volume?: number): Promise<void> {
        const client = new GHClient();

        return new Promise<void>((resolve, reject) => {
            client.connect(host, async () => {
                if (volume !== undefined) {
                    try {
                        await new Promise<void>((_resolve, _reject) =>
                            client.setVolume({ level: volume / 100 }, (err: Error | null) =>
                                err ? _reject(new Error(err.toString())) : _resolve(),
                            ),
                        );
                    } catch (err) {
                        this.adapter.log.error(`there was an error setting the volume: ${err}`);
                    }
                }

                await this.#launchGoogleHome(client, url);

                try {
                    client.close();
                } catch (err) {
                    this.adapter.log.error(`there was an error closing the client: ${err}`);
                }

                resolve();
            });

            client.on('error', (err: any): void => {
                client.close();
                reject(new Error(err.toString()));
            });
        });
    }

    async #sayItGoogleHome(props: SayItDeviceProps): Promise<boolean> {
        props.volume ||= this.options.sayLastVolume;
        const result = await this.#uploadToStates(props.text);
        const webLink = await this.#getWebLink(props.testOptions);
        const googleHomeServer = props.testOptions?.googleHomeServer || this.config.googleHomeServer;

        if (googleHomeServer && webLink) {
            const url = `${webLink}${result.fileInDB}`;
            this.adapter.log.debug(`Send to google home "${googleHomeServer}": ${url}`);

            await this.#sendToGoogleHome(googleHomeServer, url, props.volume);
        } else {
            throw new Error('Web server is unavailable!');
        }

        return true;
    }

    async #sayItMP24(props: SayItDeviceProps): Promise<boolean> {
        const mp24Server = props.testOptions?.mp24Server || this.config.mp24Server;

        if (mp24Server) {
            if (!Speech2Device.isPlayFile(props.text)) {
                // say
                this.adapter.log.debug(
                    `Request MediaPlayer24 "http://${mp24Server}:50000/tts=${encodeURI(props.text)}"`,
                );
                try {
                    const response = await axios.get(`http://${mp24Server}:50000/tts=${encodeURI(props.text)}`);
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
                    const response = await axios.get(`http://${mp24Server}:50000/track=${props.text}`);
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
        props.duration += 2;

        return true;
    }

    async #sayItMP24ftp(props: SayItDeviceProps): Promise<boolean> {
        const result = await this.#uploadToStates(props.text, true);
        const mp24Server = props.testOptions?.mp24Server || this.config.mp24Server;
        const ftpPort = props.testOptions?.ftpPort || this.config.ftpPort;
        const ftpUser = props.testOptions?.ftpUser || this.config.ftpUser;
        const ftpPassword = props.testOptions?.ftpPassword || this.config.ftpPassword;

        // Copy mp3 file to an android device to play it later with MediaPlayer
        if (ftpPort && mp24Server && result.fileOnDisk) {
            const ftp = new jsftp({
                host: mp24Server,
                port: parseInt(ftpPort as string, 10), // defaults to 21
                user: ftpUser || 'anonymous', // defaults to 'anonymous'
                pass: ftpPassword || 'anonymous', // defaults to 'anonymous'
            });

            await new Promise<void>((resolve, reject) => {
                try {
                    // Copy file to FTP server
                    const fileNameOnFTP = `${this.adapter.namespace}.say.${this.options.outFileExt}`;
                    ftp.put(result.fileOnDisk!, fileNameOnFTP, hadError => {
                        // send quit command
                        ftp.raw('quit', async err => {
                            // , data
                            if (err) {
                                this.adapter.log.error(err.toString());
                            }
                            ftp.destroy();

                            if (!hadError) {
                                try {
                                    const response = await axios.get(
                                        `http://${mp24Server}:50000/track=${fileNameOnFTP}`,
                                    );
                                    this.adapter.log.debug(
                                        `Response from MediaPlayer24 "${mp24Server}": ${response.data}`,
                                    );
                                    resolve();
                                } catch (e) {
                                    if (e.message === 'Parse Error') {
                                        this.adapter.log.debug('Played successfully');
                                        resolve();
                                    } else {
                                        this.adapter.log.error(
                                            `Cannot say text on MediaPlayer24 "${mp24Server}": ${e.message}`,
                                        );
                                        reject(new Error(e.toString()));
                                    }
                                }
                            } else {
                                reject(new Error(`FTP error: ${hadError}`));
                            }
                        });
                    });
                } catch {
                    throw new Error(`Cannot upload file to ${mp24Server}:${ftpPort}`);
                }
            });
        }

        props.duration += 2;

        return true;
    }

    async #sayItSystem(props: SayItDeviceProps): Promise<boolean> {
        const result = await this.#uploadToStates(props.text, true);
        const systemCommand = props.testOptions?.systemCommand || this.config.systemCommand;
        const systemPlayer = props.testOptions?.systemPlayer || this.config.systemPlayer;

        const p = platform();
        let cmd;

        if (props.volume !== undefined) {
            await this.sayItSystemVolume(props.volume, props.testOptions);
        }

        if (result.fileOnDisk) {
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
                    await this.#exec(cmd);
                } catch (e) {
                    this.adapter.log.error(`Cannot play: ${e}`);
                    return false;
                }
            } else if (p === 'linux') {
                // linux
                if (systemPlayer === 'omxplayer') {
                    cmd = `omxplayer -o local ${result.fileOnDisk}`;
                } else if (systemPlayer === 'mpg321') {
                    cmd = `mpg321 -g ${this.options.sayLastVolume} ${result.fileOnDisk}`;
                } else {
                    cmd = `mplayer ${result.fileOnDisk} -volume ${this.options.sayLastVolume}`;
                }
                try {
                    await this.#exec(cmd);
                } catch (e) {
                    this.adapter.log.error(`Cannot play: ${e}`);
                    return false;
                }
            } else if (p.match(/^win/)) {
                // windows
                try {
                    await this.#exec('cmdmp3.exe', [`"${result.fileOnDisk}"`], normalize(`${__dirname}/../cmdmp3/`));
                } catch (e) {
                    this.adapter.log.error(`Cannot play:${e}`);
                    return false;
                }
            } else if (p === 'darwin') {
                // mac osx
                try {
                    await this.#exec('/usr/bin/afplay', [result.fileOnDisk]);
                } catch (e) {
                    this.adapter.log.error(`Cannot play:${e}`);
                    return false;
                }
            }
        }

        if (props.text !== this.config.announce) {
            props.duration += 2;
        }
        return true;
    }

    async #sayItWindows(props: SayItDeviceProps): Promise<boolean> {
        // If mp3 file
        if (Speech2Device.isPlayFile(props.text)) {
            return this.#sayItSystem(props);
        }

        // Call windows own text 2 speech
        const p = platform();

        if (props.volume || props.volume === 0) {
            await this.sayItSystemVolume(props.volume, props.testOptions);
        }

        if (p.match(/^win/)) {
            // windows
            try {
                await this.#exec(normalize(`${__dirname}/../say/SayStatic.exe`), [`"${props.text}"`]);
            } catch (error) {
                this.adapter.log.error(`sayItWindows: ${error}`);
                return false;
            }
        } else {
            this.adapter.log.error('sayItWindows: only windows OS is supported for Windows default mode');
            return false;
        }

        props.duration += 2;

        return true;
    }

    async sayItSystemVolume(level: number | string, testOptions?: SayItDeviceProps['testOptions']): Promise<void> {
        if (!level && level !== 0) {
            return;
        }

        level = parseInt(level as string, 10);
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

        const p = platform();
        const systemPlayer = testOptions?.systemPlayer || this.config.systemPlayer;

        if (p === 'linux' && systemPlayer !== 'mpg321') {
            // linux
            try {
                await this.#spawn('amixer', ['cset', 'name="Master Playback Volume"', '--', `${level}%`]);
            } catch {
                this.adapter.log.error('amixer is not available, so you may hear no audio. Install manually!');
            }
        } else if (p.match(/^win/)) {
            // windows
            // windows volume is from 0 to 65535
            level = Math.round((65535 * level) / 100); // because this level is from 0 to 100
            try {
                await this.#spawn(
                    normalize(`${__dirname}/../nircmd/nircmdc.exe`),
                    ['setsysvolume', level.toString()],
                    true,
                );
            } catch {
                this.adapter.log.error('nircmd is not available, so you may hear no audio.');
            }
        } else if (p === 'darwin') {
            // mac osx
            try {
                await this.#spawn('sudo', ['osascript', '-e', `"set Volume ${Math.round(level / 10)}"`]);
            } catch {
                this.adapter.log.error('osascript is not available, so you may hear no audio.');
            }
        }
    }

    async playFile(props: SayItDeviceProps): Promise<boolean> {
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
        if (type === 'chromecast') {
            return await this.#sayItChromecast(props);
        }
        if (type === 'mpd') {
            return await this.#sayItMpd(props);
        }
        if (type === 'googleHome') {
            return await this.#sayItGoogleHome(props);
        }

        this.adapter.log.error(`Unknown play type: ${type as string}`);
        return false;
    }
}
