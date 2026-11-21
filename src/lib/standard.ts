/**
 * The commands of the shared catalog of adapter commands (ioBroker.assistant HELP.md, family "speech"):
 * speak (speech.speak), playSound (speech.playSound) and synthesize (speech.synthesize).
 * They take the parameters of the catalog and use the logic of "say" (main.ts). The functions here need no
 * adapter, so the tests can check the mapping of the parameters.
 */
import { sayitEngines } from './engines';
import type { EngineType, SayItAdapterConfig, TestOptions } from '../types';

/** Failure of a catalog command: a text for a human and a code of the catalog */
export interface StandardError {
    error: string;
    reason: 'BAD_REQUEST' | 'NOT_FOUND' | 'AMBIGUOUS' | 'NOT_SUPPORTED' | 'NOT_READY' | 'TIMEOUT';
    candidates?: string[];
}

/** A device that the output of the settings can play on */
export interface OutputDevice {
    /** ID that the option of "say" takes, like "sonos.0.root.192_168_1_10" */
    id: string;
    /** Name for the user */
    name: string;
}

/** How the devices of one output type are found, and which option of "say" selects one */
export interface DeviceKind {
    /** Option of "say", like "sonosDevice" */
    option: keyof TestOptions;
    /** Adapter that owns the devices */
    adapter: string;
    /** Types of the objects that are the devices ("instance" = the instance itself, like "mpd.0") */
    objects: ('device' | 'channel' | 'instance')[];
    /** IDs of the devices (instances without "system.adapter.") */
    pattern: RegExp;
}

/** The output types that can play on another device than the one of the settings (as the browse commands list them) */
export const DEVICE_KINDS: Partial<Record<SayItAdapterConfig['type'], DeviceKind>> = {
    sonos: {
        option: 'sonosDevice',
        adapter: 'sonos',
        objects: ['channel', 'device'],
        pattern: /^sonos\.\d+\.root\.[^.]+$/,
    },
    heos: {
        option: 'heosDevice',
        adapter: 'heos',
        objects: ['channel', 'device'],
        pattern: /^heos\.\d+\.players\.[^.]+$/,
    },
    squeezebox: {
        option: 'squeezeboxDevice',
        adapter: 'squeezeboxrpc',
        objects: ['device'],
        pattern: /^squeezeboxrpc\.\d+\.Players\.[^.]+$/,
    },
    wiim: { option: 'wiimDevice', adapter: 'wiim', objects: ['device'], pattern: /^wiim\.\d+\.[^.]+$/ },
    assistant: {
        option: 'assistantDevice',
        adapter: 'assistant',
        objects: ['instance', 'device'],
        pattern: /^assistant\.\d+(\.satellites\.[^.]+)?$/,
    },
    alexa: {
        option: 'alexaDevice',
        adapter: 'alexa2',
        objects: ['device'],
        pattern: /^alexa2\.\d+\.Echo-Devices\.[^.]+$/,
    },
    fully: {
        option: 'fullyDevice',
        adapter: 'fullybrowser',
        objects: ['device'],
        pattern: /^fullybrowser\.\d+\.[^.]+$/,
    },
    chromecast: {
        option: 'chromecastDevice',
        adapter: 'chromecast',
        objects: ['device'],
        pattern: /^chromecast\.\d+\.[^.]+$/,
    },
    mpd: { option: 'mpdInstance', adapter: 'mpd', objects: ['instance'], pattern: /^mpd\.\d+$/ },
    kodi: { option: 'kodiInstance', adapter: 'kodi', objects: ['instance'], pattern: /^kodi\.\d+$/ },
    bose: {
        option: 'boseInstance',
        adapter: 'bosesoundtouch',
        objects: ['instance'],
        pattern: /^bosesoundtouch\.\d+$/,
    },
};

/** Sound files that sayit can play */
const SOUND_TYPES: { [contentType: string]: string } = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
};

/**
 * Text of a name of an object in the given language
 *
 * @param name common.name of an object
 * @param lang Language of the system
 * @returns The name or an empty string
 */
export function objectName(name: ioBroker.StringOrTranslated | undefined, lang: ioBroker.Languages): string {
    if (name && typeof name === 'object') {
        return name[lang] || name.en || '';
    }
    return name || '';
}

/**
 * Find a device by its ID or name (without case): an exact ID or name wins over a partial one
 *
 * @param devices The devices of the output type
 * @param wanted ID or name, as the caller gives it
 * @returns The device or the error NOT_FOUND / AMBIGUOUS with the names of the candidates
 */
export function matchDevice(devices: OutputDevice[], wanted: string): OutputDevice | StandardError {
    const name = wanted.trim().toLowerCase();
    const byId = devices.find(device => device.id.toLowerCase() === name);
    if (byId) {
        return byId;
    }
    const exact = devices.filter(
        device => device.name.toLowerCase() === name || device.id.split('.').pop()?.toLowerCase() === name,
    );
    const found = exact.length
        ? exact
        : devices.filter(device => device.name.toLowerCase().includes(name) || device.id.toLowerCase().includes(name));
    if (found.length === 1) {
        return found[0];
    }
    if (found.length > 1) {
        return {
            error: `"${wanted}" fits several devices: ${found.map(device => device.name).join(', ')}`,
            reason: 'AMBIGUOUS',
            candidates: found.map(device => device.name),
        };
    }
    return {
        error: `Unknown device "${wanted}"`,
        reason: 'NOT_FOUND',
        candidates: devices.map(device => device.name),
    };
}

/**
 * Find the device of the output type in a room
 *
 * @param devices The devices of the output type
 * @param rooms The room enums
 * @param wanted ID ("enum.rooms.kitchen" or "kitchen") or name of the room
 * @param lang Language of the system
 * @returns The only device in the room or the error NOT_FOUND / AMBIGUOUS
 */
export function deviceInRoom(
    devices: OutputDevice[],
    rooms: ioBroker.EnumObject[],
    wanted: string,
    lang: ioBroker.Languages,
): OutputDevice | StandardError {
    const name = wanted.trim().toLowerCase();
    const room =
        rooms.find(room => room._id.toLowerCase() === name || room._id.toLowerCase() === `enum.rooms.${name}`) ||
        rooms.find(
            room =>
                objectName(room.common?.name, lang).toLowerCase() === name ||
                (typeof room.common?.name === 'object' &&
                    Object.values(room.common.name).some(text => text?.toLowerCase() === name)),
        );
    if (!room) {
        return { error: `Unknown room "${wanted}"`, reason: 'NOT_FOUND' };
    }
    const members = room.common?.members || [];
    const found = devices.filter(device =>
        members.some(
            member => member === device.id || member.startsWith(`${device.id}.`) || device.id.startsWith(`${member}.`),
        ),
    );
    if (found.length === 1) {
        return found[0];
    }
    if (found.length > 1) {
        return {
            error: `Several devices are in the room "${wanted}": ${found.map(device => device.name).join(', ')}`,
            reason: 'AMBIGUOUS',
            candidates: found.map(device => device.name),
        };
    }
    return { error: `No device of sayit is in the room "${wanted}"`, reason: 'NOT_FOUND' };
}

/**
 * The engine (voice) for a text: the one of the settings, unless another language or voice is wanted
 *
 * @param configured Engine of the settings
 * @param languageOf Two-letter language of an engine
 * @param language Language of the text (ISO 639-1, like "de"), or an engine of sayit (like "de-DE_AP_Female")
 * @param voice An engine of sayit, or a voice of FreeTTS / Piper if that is the engine of the settings
 * @returns The engine and the voice options of "say", or the error NOT_FOUND / NOT_SUPPORTED
 */
export function engineFor(
    configured: EngineType,
    languageOf: (engine: EngineType) => string,
    language?: unknown,
    voice?: unknown,
): { engine: EngineType; voice?: Pick<TestOptions, 'freettsVoice' | 'piperVoice'> } | StandardError {
    if (voice && typeof voice === 'string') {
        if (sayitEngines[voice]) {
            return { engine: voice as EngineType };
        }
        if (configured === 'freeTTS') {
            return { engine: configured, voice: { freettsVoice: voice } };
        }
        if (configured === 'piper') {
            return { engine: configured, voice: { piperVoice: voice } };
        }
        return {
            error: `Unknown voice "${voice}": a voice is an engine of sayit (see its README), or a voice of FreeTTS or Piper if that is the engine of the settings`,
            reason: 'NOT_FOUND',
        };
    }
    if (!language || typeof language !== 'string') {
        return { engine: configured };
    }
    // An engine of sayit, like "de-DE_AP_Female" or "zh-CN" (not a plain language, which keeps the voice of the settings)
    if (language.length > 2 && sayitEngines[language]) {
        return { engine: language as EngineType };
    }
    const lang = language.substring(0, 2).toLowerCase();
    if (languageOf(configured) === lang) {
        return { engine: configured };
    }
    if (sayitEngines[lang]) {
        return { engine: lang as EngineType };
    }
    return { error: `sayit has no voice for the language "${language}"`, reason: 'NOT_SUPPORTED' };
}

/**
 * Read the parameters of speech.speak
 *
 * @param message Message of the command "speak"
 * @returns Text (with "!" in front if it has priority) and volume, or the error BAD_REQUEST
 */
export function speakRequest(message: Record<string, unknown>): { text: string; volume?: number } | StandardError {
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    if (!text) {
        return { error: 'No text', reason: 'BAD_REQUEST' };
    }
    const volume = volumeOf(message.volume);
    if (volume === null) {
        return {
            error: `The volume must be a number from 0 to 100, not "${String(message.volume)}"`,
            reason: 'BAD_REQUEST',
        };
    }
    const priority = message.priority === true || message.priority === 'true';
    return { text: priority && !text.startsWith('!') ? `!${text}` : text, volume };
}

/**
 * Volume of a catalog command
 *
 * @param value Volume in percent
 * @returns The volume 0-100, undefined if not given, null if it is not a number
 */
export function volumeOf(value: unknown): number | undefined | null {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    const volume = typeof value === 'number' ? value : parseFloat(value as string);
    if (Number.isNaN(volume)) {
        return null;
    }
    return Math.min(100, Math.max(0, Math.round(volume)));
}

/**
 * Extension of a sound file that sayit can play
 *
 * @param name File name or URL
 * @param contentType Content type, if known
 * @returns "mp3", "wav", "ogg" or an empty string
 */
export function soundExtension(name: string, contentType?: unknown): string {
    const m = name
        .replace(/[?#].*$/, '')
        .toLowerCase()
        .match(/\.(mp3|wav|ogg)$/);
    if (m) {
        return m[1];
    }
    return (typeof contentType === 'string' && SOUND_TYPES[contentType.split(';')[0].trim().toLowerCase()]) || '';
}

/**
 * Where the sound of speech.playSound comes from
 *
 * @param message Message of the command "playSound": url or file (a path of the ioBroker files, "iobfile://…",
 *   a path on the disk of the host, a data URL, or base64 with contentType)
 * @returns A path that "say" plays, a URL to download, the data of the file, or the error BAD_REQUEST / NOT_SUPPORTED
 */
export function soundSource(
    message: Record<string, unknown>,
): { path: string } | { url: string } | { data: Buffer; ext: string } | StandardError {
    const value =
        (typeof message.url === 'string' && message.url.trim()) ||
        (typeof message.file === 'string' && message.file.trim()) ||
        '';
    if (!value) {
        return { error: 'Give url or file', reason: 'BAD_REQUEST' };
    }
    const dataUrl = value.match(/^data:([^;,]+)[^,]*;base64,(.*)$/s);
    if (dataUrl) {
        const ext = soundExtension('', dataUrl[1]);
        return ext
            ? { data: Buffer.from(dataUrl[2], 'base64'), ext }
            : { error: `sayit plays only mp3, wav and ogg, not "${dataUrl[1]}"`, reason: 'NOT_SUPPORTED' };
    }
    if (/^https?:\/\//i.test(value)) {
        return { url: value };
    }
    if (message.contentType && /^[A-Za-z0-9+/=\s]+$/.test(value)) {
        // base64 without a prefix (a path has a dot before its extension)
        const ext = soundExtension('', message.contentType);
        return ext
            ? { data: Buffer.from(value, 'base64'), ext }
            : {
                  error: `sayit plays only mp3, wav and ogg, not "${JSON.stringify(message.contentType)}"`,
                  reason: 'NOT_SUPPORTED',
              };
    }
    // "iobfile://vis.0/main/bell.mp3" is the file "/vis.0/main/bell.mp3" of the ioBroker files
    const path = value.replace(/^iobfile:\/\//i, '/');
    if (!soundExtension(path)) {
        return { error: `sayit plays only mp3, wav and ogg files, not "${value}"`, reason: 'NOT_SUPPORTED' };
    }
    return { path };
}
