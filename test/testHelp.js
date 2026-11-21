const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { COMMANDS, HELP } = require('../build/lib/help');
const {
    DEVICE_KINDS,
    deviceInRoom,
    engineFor,
    matchDevice,
    soundExtension,
    soundSource,
    speakRequest,
    volumeOf,
} = require('../build/lib/standard');

/** The commands that processMessage of src/main.ts answers */
function commandsOfMain() {
    const source = fs.readFileSync(path.join(__dirname, '../src/main.ts'), 'utf8');
    const start = source.indexOf('    processMessage(obj: ioBroker.Message): void {');
    const end = source.indexOf('    stopInstance = (');
    assert.ok(start > 0 && end > start, 'processMessage found');
    return [...source.slice(start, end).matchAll(/obj\.command === '([^']+)'/g)].map(m => m[1]);
}

/** Two-letter language of the engines used in the tests (like getEngineLanguage of main.ts) */
const languageOf = engine => engine.substring(0, 2);

describe('help', () => {
    it('lists exactly the commands processMessage answers', () => {
        assert.deepStrictEqual(COMMANDS.map(c => c.command).sort(), [...new Set(commandsOfMain())].sort());
    });

    it('marks the commands of the shared catalog', () => {
        const marked = Object.fromEntries(COMMANDS.filter(c => c.standard).map(c => [c.command, c]));
        assert.deepStrictEqual(Object.keys(marked).sort(), ['playSound', 'speak', 'synthesize']);
        assert.strictEqual(marked.speak.standard, 'speech.speak');
        assert.strictEqual(marked.speak.write, true);
        assert.strictEqual(marked.playSound.standard, 'speech.playSound');
        assert.strictEqual(marked.playSound.write, true);
        assert.strictEqual(marked.synthesize.standard, 'speech.synthesize');
        assert.strictEqual(marked.synthesize.write, false);
        for (const command of COMMANDS.filter(c => c.standard)) {
            assert.ok(HELP.includes(`standard ${command.standard}`), command.standard);
        }
    });

    it('names every command for an agent', () => {
        for (const command of COMMANDS.filter(c => c.command !== 'help')) {
            assert.ok(HELP.includes(command.command), command.command);
        }
    });

    it('keeps the lines short (except the first one with the declaration)', () => {
        for (const line of HELP.split('\n').slice(1)) {
            assert.ok(line.length <= 120, line);
        }
    });
});

describe('speech.speak parameters', () => {
    it('needs a text', () => {
        assert.deepStrictEqual(speakRequest({}), { error: 'No text', reason: 'BAD_REQUEST' });
        assert.strictEqual(speakRequest({ text: '  ' }).reason, 'BAD_REQUEST');
    });

    it('takes the volume and the priority', () => {
        assert.deepStrictEqual(speakRequest({ text: 'Hallo' }), { text: 'Hallo', volume: undefined });
        assert.deepStrictEqual(speakRequest({ text: 'Hallo', volume: 30, priority: true }), {
            text: '!Hallo',
            volume: 30,
        });
        assert.deepStrictEqual(speakRequest({ text: 'Hallo', volume: '0' }), { text: 'Hallo', volume: 0 });
        assert.strictEqual(speakRequest({ text: 'Hallo', volume: 'loud' }).reason, 'BAD_REQUEST');
        assert.strictEqual(volumeOf(150), 100);
        assert.strictEqual(volumeOf(-5), 0);
        assert.strictEqual(volumeOf(''), undefined);
    });
});

describe('voice of a language', () => {
    it('keeps the voice of the settings if it speaks the language', () => {
        assert.deepStrictEqual(engineFor('de-DE_AP_Female', languageOf), { engine: 'de-DE_AP_Female' });
        assert.deepStrictEqual(engineFor('de-DE_AP_Female', languageOf, 'de'), { engine: 'de-DE_AP_Female' });
        assert.deepStrictEqual(engineFor('de-DE_AP_Female', languageOf, 'de-AT'), { engine: 'de-DE_AP_Female' });
    });

    it('takes the Google voice of another language', () => {
        assert.deepStrictEqual(engineFor('de-DE_AP_Female', languageOf, 'en'), { engine: 'en' });
        assert.deepStrictEqual(engineFor('de', languageOf, 'RU'), { engine: 'ru' });
        assert.strictEqual(engineFor('de', languageOf, 'xx').reason, 'NOT_SUPPORTED');
    });

    it('takes an engine of sayit as language or voice', () => {
        assert.deepStrictEqual(engineFor('de', languageOf, 'zh-CN'), { engine: 'zh-CN' });
        assert.deepStrictEqual(engineFor('de', languageOf, undefined, 'de-DE_AP_Female'), {
            engine: 'de-DE_AP_Female',
        });
    });

    it('takes a voice of FreeTTS or Piper', () => {
        assert.deepStrictEqual(engineFor('piper', languageOf, 'de', 'de_DE-thorsten-high'), {
            engine: 'piper',
            voice: { piperVoice: 'de_DE-thorsten-high' },
        });
        assert.deepStrictEqual(engineFor('freeTTS', languageOf, undefined, 'de-DE-KatjaNeural'), {
            engine: 'freeTTS',
            voice: { freettsVoice: 'de-DE-KatjaNeural' },
        });
        assert.strictEqual(engineFor('de', languageOf, undefined, 'Katja').reason, 'NOT_FOUND');
    });
});

describe('device and room', () => {
    const devices = [
        { id: 'sonos.0.root.192_168_1_10', name: 'Kitchen' },
        { id: 'sonos.0.root.192_168_1_11', name: 'Kitchen bar' },
        { id: 'sonos.0.root.192_168_1_12', name: 'Living room' },
    ];

    it('finds a device by ID or name, an exact name before a part of it', () => {
        assert.strictEqual(matchDevice(devices, 'sonos.0.root.192_168_1_12').name, 'Living room');
        assert.strictEqual(matchDevice(devices, '192_168_1_11').name, 'Kitchen bar');
        assert.strictEqual(matchDevice(devices, 'kitchen').name, 'Kitchen');
        assert.strictEqual(matchDevice(devices, 'LIVING').name, 'Living room');
    });

    it('answers AMBIGUOUS and NOT_FOUND with candidates', () => {
        const ambiguous = matchDevice(devices, 'kit');
        assert.strictEqual(ambiguous.reason, 'AMBIGUOUS');
        assert.deepStrictEqual(ambiguous.candidates, ['Kitchen', 'Kitchen bar']);
        const unknown = matchDevice(devices, 'Bath');
        assert.strictEqual(unknown.reason, 'NOT_FOUND');
        assert.strictEqual(unknown.candidates.length, 3);
    });

    it('finds the device of a room', () => {
        const rooms = [
            {
                _id: 'enum.rooms.kitchen',
                common: { name: { en: 'Kitchen', de: 'Küche' }, members: ['sonos.0.root.192_168_1_10.volume'] },
            },
            {
                _id: 'enum.rooms.living',
                common: { name: 'Living room', members: ['sonos.0.root.192_168_1_11', 'sonos.0.root.192_168_1_12'] },
            },
            { _id: 'enum.rooms.bath', common: { name: 'Bath', members: [] } },
        ];
        assert.strictEqual(deviceInRoom(devices, rooms, 'enum.rooms.kitchen', 'en').name, 'Kitchen');
        assert.strictEqual(deviceInRoom(devices, rooms, 'kitchen', 'en').name, 'Kitchen');
        assert.strictEqual(deviceInRoom(devices, rooms, 'küche', 'en').name, 'Kitchen');
        assert.strictEqual(deviceInRoom(devices, rooms, 'living room', 'en').reason, 'AMBIGUOUS');
        assert.strictEqual(deviceInRoom(devices, rooms, 'Bath', 'en').reason, 'NOT_FOUND');
        assert.strictEqual(deviceInRoom(devices, rooms, 'Garage', 'en').reason, 'NOT_FOUND');
    });

    it('knows the option of "say" for the outputs with devices', () => {
        assert.strictEqual(DEVICE_KINDS.sonos.option, 'sonosDevice');
        assert.strictEqual(DEVICE_KINDS.alexa.option, 'alexaDevice');
        assert.ok(DEVICE_KINDS.assistant.pattern.test('assistant.0'));
        assert.ok(DEVICE_KINDS.assistant.pattern.test('assistant.0.satellites.kitchen'));
        assert.ok(DEVICE_KINDS.mpd.pattern.test('mpd.1'));
        assert.strictEqual(DEVICE_KINDS.system, undefined);
    });

    it('finds the SONOS speakers as channels (sonos 4.8, like browseSonos) and as devices (older versions)', () => {
        assert.ok(DEVICE_KINDS.sonos.objects.includes('channel'));
        assert.ok(DEVICE_KINDS.sonos.objects.includes('device'));
        assert.ok(DEVICE_KINDS.sonos.pattern.test('sonos.0.root.192_168_1_10'));
        assert.ok(!DEVICE_KINDS.sonos.pattern.test('sonos.0.root.192_168_1_10.volume'));
    });
});

describe('speech.playSound parameters', () => {
    it('takes files of ioBroker and of the host', () => {
        assert.deepStrictEqual(soundSource({ file: '/vis.0/main/bell.mp3' }), { path: '/vis.0/main/bell.mp3' });
        assert.deepStrictEqual(soundSource({ file: 'iobfile://vis.0/main/bell.wav' }), {
            path: '/vis.0/main/bell.wav',
        });
        assert.deepStrictEqual(soundSource({ file: 'C:\\sounds\\gong.OGG' }), { path: 'C:\\sounds\\gong.OGG' });
        assert.strictEqual(soundSource({ file: '/vis.0/main/bell.flac' }).reason, 'NOT_SUPPORTED');
    });

    it('takes URLs, data URLs and base64', () => {
        assert.deepStrictEqual(soundSource({ url: 'https://example.com/bell' }), { url: 'https://example.com/bell' });
        const data = Buffer.from('ID3 sound').toString('base64');
        assert.deepStrictEqual(soundSource({ file: `data:audio/mpeg;base64,${data}` }), {
            data: Buffer.from('ID3 sound'),
            ext: 'mp3',
        });
        assert.deepStrictEqual(soundSource({ file: data, contentType: 'audio/wav' }), {
            data: Buffer.from('ID3 sound'),
            ext: 'wav',
        });
        assert.strictEqual(soundSource({ file: `data:image/png;base64,${data}` }).reason, 'NOT_SUPPORTED');
        assert.strictEqual(soundSource({}).reason, 'BAD_REQUEST');
    });

    it('finds the type of a downloaded file', () => {
        assert.strictEqual(soundExtension('https://example.com/bell.mp3?x=1'), 'mp3');
        assert.strictEqual(soundExtension('https://example.com/bell', 'audio/x-wav'), 'wav');
        assert.strictEqual(soundExtension('https://example.com/bell', 'audio/ogg; codecs=opus'), 'ogg');
        assert.strictEqual(soundExtension('https://example.com/bell', 'text/html'), '');
    });
});
