const assert = require('node:assert/strict');

const {
    openRouterFormat,
    openRouterSystemCredential,
    parseOpenRouterModels,
    resolveOpenRouterKey,
} = require('../build/lib/openrouter');

/**
 * An adapter with the given system-wide AI settings
 *
 * @param {object | null} native the native of system.ai
 */
function fakeAdapter(native) {
    const warnings = [];
    return {
        warnings,
        log: { warn: text => warnings.push(text), debug: () => {}, info: () => {}, error: () => {} },
        getForeignObjectAsync: async id => (id === 'system.ai' && native ? { _id: id, type: 'config', native } : null),
    };
}

// Shortened answer of GET https://openrouter.ai/api/v1/audio/speech/models
const ANSWER = {
    data: [
        {
            id: 'google/gemini-2.5-flash-tts',
            name: 'Google: Gemini 2.5 Flash TTS',
            output_modalities: [
                {
                    type: 'speech',
                    supported_parameters: {
                        instructions: { type: 'unknown' },
                        response_format: { type: 'enum', values: ['pcm', 'wav'] },
                        voice: { type: 'enum', values: ['Puck', 'Kore', 'Charon'] },
                    },
                },
            ],
        },
        {
            id: 'elevenlabs/eleven-v3',
            name: 'ElevenLabs: Eleven v3',
            output_modalities: [
                {
                    type: 'speech',
                    supported_parameters: {
                        response_format: { type: 'enum', values: ['mp3', 'pcm'] },
                        speed: { type: 'range', min: 0.7, max: 1.2 },
                        voice: { type: 'enum', values: ['sarah', 'george'] },
                    },
                },
            ],
        },
        {
            id: 'heygen/heygen-voice-1',
            name: 'HeyGen: HeyGen Voice',
            output_modalities: [
                {
                    type: 'speech',
                    supported_parameters: {
                        response_format: { type: 'enum', values: ['pcm'] },
                        voice: { type: 'enum', values: ['nadine'] },
                    },
                },
            ],
        },
        {
            id: 'fish-audio/s2-pro',
            name: 'Fish Audio: S2 Pro',
            output_modalities: [
                {
                    type: 'speech',
                    supported_parameters: {
                        instructions: { type: 'unknown' },
                        response_format: { type: 'enum', values: ['mp3', 'pcm'] },
                        voice: { type: 'unknown' },
                    },
                },
            ],
        },
        { name: 'without id' },
    ],
};

describe('OpenRouter TTS models', () => {
    const models = parseOpenRouterModels(ANSWER);
    const byId = id => models.find(m => m.id === id);

    it('reads the models sorted by the name and skips entries without id', () => {
        assert.deepEqual(
            models.map(m => m.id),
            ['elevenlabs/eleven-v3', 'fish-audio/s2-pro', 'google/gemini-2.5-flash-tts', 'heygen/heygen-voice-1'],
        );
    });

    it('reads the voices, the speed and the instructions', () => {
        assert.deepEqual(byId('google/gemini-2.5-flash-tts').voices, ['Charon', 'Kore', 'Puck']);
        assert.equal(byId('google/gemini-2.5-flash-tts').instructions, true);
        assert.equal(byId('google/gemini-2.5-flash-tts').speed, null);
        assert.deepEqual(byId('elevenlabs/eleven-v3').speed, { min: 0.7, max: 1.2 });
        assert.equal(byId('elevenlabs/eleven-v3').instructions, false);
        // no published voices: a voice can be entered or left empty
        assert.deepEqual(byId('fish-audio/s2-pro').voices, []);
    });

    it('requests mp3, wav (converted to mp3) or nothing', () => {
        assert.equal(openRouterFormat(byId('elevenlabs/eleven-v3')), 'mp3');
        assert.equal(openRouterFormat(byId('google/gemini-2.5-flash-tts')), 'wav');
        assert.equal(openRouterFormat(byId('heygen/heygen-voice-1')), null);
        // a model that is not in the list is tried with mp3
        assert.equal(openRouterFormat(undefined), 'mp3');
    });

    it('rejects an unexpected answer', () => {
        assert.throws(() => parseOpenRouterModels({ error: { message: 'x' } }), /Unexpected answer/);
    });
});

describe('OpenRouter API key', () => {
    it('takes the key of the settings in the mode "manual"', async () => {
        const adapter = fakeAdapter(null);
        assert.equal(await resolveOpenRouterKey(adapter, { credentialType: 'manual', apiKey: ' sk-or-1 ' }), 'sk-or-1');
        await assert.rejects(resolveOpenRouterKey(adapter, { credentialType: 'manual', apiKey: '' }), /No OpenRouter/);
    });

    it('needs a selected credential in the mode "manager"', async () => {
        await assert.rejects(
            resolveOpenRouterKey(fakeAdapter(null), { credentialType: 'manager', credentialId: '' }),
            /No credential/,
        );
    });

    it('takes the system-wide AI settings by default, only if they use OpenRouter', async () => {
        const custom = fakeAdapter({ provider: 'custom', credentialId: 'system.credentials.local' });
        // the key of the settings does not count in the mode "system"
        await assert.rejects(resolveOpenRouterKey(custom, { apiKey: 'sk-or-1' }), /use the provider "custom"/);
        await assert.rejects(resolveOpenRouterKey(fakeAdapter(null), {}), /No provider/);
        await assert.rejects(
            resolveOpenRouterKey(fakeAdapter({ provider: 'openrouter' }), { credentialType: 'system' }),
            /name no credential/,
        );
    });

    it('reads the credential of the system-wide AI settings', async () => {
        assert.deepEqual(
            await openRouterSystemCredential(
                fakeAdapter({ provider: 'openrouter', credentialId: 'system.credentials.openrouter', model: 'x' }),
            ),
            { provider: 'openrouter', credentialId: 'system.credentials.openrouter' },
        );
        // the credential of another provider is not offered for OpenRouter
        assert.deepEqual(
            await openRouterSystemCredential(
                fakeAdapter({ provider: 'anthropic', credentialId: 'system.credentials.a' }),
            ),
            { provider: 'anthropic', credentialId: '' },
        );
    });
});
