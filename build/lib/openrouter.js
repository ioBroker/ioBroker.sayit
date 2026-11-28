"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openRouterSystemCredential = openRouterSystemCredential;
exports.resolveOpenRouterKey = resolveOpenRouterKey;
exports.parseOpenRouterModels = parseOpenRouterModels;
exports.getOpenRouterModels = getOpenRouterModels;
exports.openRouterFormat = openRouterFormat;
exports.openRouterModelOptions = openRouterModelOptions;
exports.openRouterVoiceOptions = openRouterVoiceOptions;
exports.generateOpenRouterSpeech = generateOpenRouterSpeech;
/**
 * Text to speech with OpenRouter (https://openrouter.ai): one API key for the TTS models of many providers
 * (ElevenLabs, Google Gemini, Mistral, Microsoft, Deepgram, ...). The API is compatible with the OpenAI audio speech API.
 * The list of the models with their voices is public, the generation needs an API key and costs credits.
 *
 * The key comes, as in the other adapters with AI (admin, javascript, vis-2), from the system-wide AI settings
 * (`system.ai`), from the central credential store (`system.credentials.*`) or from the settings of sayit.
 */
const ai_core_1 = require("@iobroker/ai-core");
const API = 'https://openrouter.ai/api/v1';
/** The model list is read again after this time (ms) */
const MODELS_MAX_AGE_MS = 10 * 60_000;
const MODELS_TIMEOUT_MS = 15_000;
const SPEECH_TIMEOUT_MS = 90_000;
/**
 * Reads the system-wide AI settings (`system.ai`).
 *
 * @param adapter the adapter
 * @returns the provider and the credential of OpenRouter
 */
async function openRouterSystemCredential(adapter) {
    const settings = await (0, ai_core_1.readSystemAiSettings)(adapter);
    const provider = settings.defaultProvider || '';
    return { provider, credentialId: provider === 'openrouter' ? settings.credentialIds.openrouter || '' : '' };
}
/**
 * The API key of OpenRouter. It is read anew every time, so a changed key counts at once.
 *
 * @param adapter the adapter
 * @param options where the key comes from
 * @returns the key
 */
async function resolveOpenRouterKey(adapter, options) {
    const source = options.credentialType || 'system';
    if (source === 'manual') {
        const key = (options.apiKey || '').trim();
        if (!key) {
            throw new Error('No OpenRouter API key defined');
        }
        return key;
    }
    let credentialId;
    if (source === 'manager') {
        credentialId = (options.credentialId || '').trim();
        if (!credentialId) {
            throw new Error('No credential with the OpenRouter key selected');
        }
    }
    else {
        const system = await openRouterSystemCredential(adapter);
        if (system.provider !== 'openrouter') {
            throw new Error(system.provider
                ? `The system-wide AI settings use the provider "${system.provider}", not OpenRouter. Select a credential or enter the key in the settings of sayit`
                : 'No provider is set up in the system-wide AI settings (admin: system settings → AI)');
        }
        credentialId = system.credentialId;
        if (!credentialId) {
            throw new Error('The system-wide AI settings name no credential for OpenRouter');
        }
    }
    // An unreadable credential gives an empty key and a warning in the log with the reason
    const key = await new ai_core_1.AiCredentialStore(adapter).getKey(credentialId);
    if (!key) {
        throw new Error(`Cannot read the OpenRouter key of the credential "${credentialId}"`);
    }
    return key;
}
let modelCache = null;
function strings(parameter) {
    return Array.isArray(parameter?.values) ? parameter.values.filter((v) => typeof v === 'string') : [];
}
function toModel(entry) {
    if (!entry?.id) {
        return null;
    }
    const speech = entry.output_modalities?.find(o => o?.type === 'speech') || entry.output_modalities?.[0];
    const parameters = speech?.supported_parameters || {};
    const speed = parameters.speed;
    return {
        id: entry.id,
        name: entry.name || entry.id,
        voices: strings(parameters.voice).sort((a, b) => a.localeCompare(b)),
        formats: strings(parameters.response_format),
        instructions: !!parameters.instructions,
        speed: speed?.type === 'range' && typeof speed.min === 'number' && typeof speed.max === 'number'
            ? { min: speed.min, max: speed.max }
            : null,
    };
}
/**
 * The text of an error answer of OpenRouter, like `{"error": {"code": 402, "message": "..."}}`
 *
 * @param response the answer
 * @returns the message, with a hint for the usual errors
 */
async function errorText(response) {
    const text = await response.text().catch(() => '');
    let message = text.substring(0, 200) || response.statusText;
    try {
        const json = JSON.parse(text);
        if (json?.error?.message) {
            const raw = json.error.metadata?.raw;
            // the error of the provider behind OpenRouter, if any
            message =
                typeof raw === 'string' && raw ? `${json.error.message}: ${raw.substring(0, 200)}` : json.error.message;
        }
    }
    catch {
        // no JSON
    }
    const hint = response.status === 401
        ? ' - check the API key'
        : response.status === 402
            ? ' - the OpenRouter account has no credits left'
            : '';
    return `${response.status} ${message}${hint}`;
}
/**
 * Reads the answer of GET /audio/speech/models.
 *
 * @param json the answer, like { data: [{ id, name, output_modalities: [{ supported_parameters: { voice, ... } }] }] }
 * @returns the models, sorted by the name
 */
function parseOpenRouterModels(json) {
    const data = json?.data;
    if (!Array.isArray(data)) {
        throw new Error('Unexpected answer from OpenRouter');
    }
    return data
        .map(toModel)
        .filter((m) => !!m)
        .sort((a, b) => a.name.localeCompare(b.name));
}
/**
 * Reads the TTS models of OpenRouter. No API key is needed. The list is kept for 10 minutes.
 *
 * @returns the models, sorted by the name
 */
async function getOpenRouterModels() {
    if (modelCache && Date.now() - modelCache.ts < MODELS_MAX_AGE_MS) {
        return modelCache.models;
    }
    const response = await fetch(`${API}/audio/speech/models`, { signal: AbortSignal.timeout(MODELS_TIMEOUT_MS) });
    if (!response.ok) {
        throw new Error(`Cannot read the TTS models of OpenRouter: ${await errorText(response)}`);
    }
    const models = parseOpenRouterModels(await response.json());
    modelCache = { ts: Date.now(), models };
    return models;
}
/**
 * The format to request: sayit needs mp3, so mp3, or wav, which is converted to mp3 (Google Gemini delivers no mp3).
 *
 * @param model the model, or undefined if it is not in the list (then mp3 is tried)
 * @returns "mp3", "wav", or null if the model delivers neither
 */
function openRouterFormat(model) {
    if (!model?.formats.length || model.formats.includes('mp3')) {
        return 'mp3';
    }
    return model.formats.includes('wav') ? 'wav' : null;
}
/**
 * The models for the configuration dialog: only the ones that deliver mp3 or wav.
 *
 * @returns list of the models, like { value: "elevenlabs/eleven-v3", label: "ElevenLabs: Eleven v3" }
 */
async function openRouterModelOptions() {
    return (await getOpenRouterModels())
        .filter(model => openRouterFormat(model))
        .map(model => ({ value: model.id, label: model.name }));
}
/**
 * The voices of a model for the configuration dialog.
 *
 * @param modelId like "elevenlabs/eleven-v3"
 * @returns list of the voices; empty if the provider publishes none
 */
async function openRouterVoiceOptions(modelId) {
    if (!modelId) {
        return [];
    }
    const model = (await getOpenRouterModels()).find(m => m.id === modelId);
    return (model?.voices || []).map(voice => ({ value: voice, label: voice }));
}
/**
 * Generates the speech.
 *
 * @param options model, voice, text and the other options
 * @returns the audio and its format
 */
async function generateOpenRouterSpeech(options) {
    // What the model delivers and which options it takes. Without the list, mp3 is tried and every option is sent
    const model = await getOpenRouterModels()
        .then(models => models.find(m => m.id === options.model))
        .catch(() => undefined);
    const format = openRouterFormat(model);
    if (!format) {
        throw new Error(`The OpenRouter model "${options.model}" delivers neither mp3 nor wav (only ${model?.formats.join(', ')})`);
    }
    const body = {
        model: options.model,
        input: options.text,
        response_format: format,
    };
    if (options.voice) {
        body.voice = options.voice;
    }
    if (options.instructions && (!model || model.instructions)) {
        body.instructions = options.instructions;
    }
    if (options.speed && options.speed !== 1 && (!model || model.speed)) {
        body.speed = model?.speed ? Math.max(model.speed.min, Math.min(model.speed.max, options.speed)) : options.speed;
    }
    const response = await fetch(`${API}/audio/speech`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json',
            // the app attribution of OpenRouter
            'HTTP-Referer': 'https://github.com/ioBroker/ioBroker.sayit',
            'X-Title': 'ioBroker.sayit',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(SPEECH_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`Cannot generate speech with OpenRouter: ${await errorText(response)}`);
    }
    const audio = Buffer.from(await response.arrayBuffer());
    if ((response.headers.get('content-type') || '').includes('json')) {
        throw new Error(`Unexpected answer from OpenRouter: ${audio.toString('utf8', 0, 200)}`);
    }
    if (!audio.length) {
        throw new Error('OpenRouter delivered no audio');
    }
    // the content counts: a WAV file starts with "RIFF"
    return { audio, format: audio.toString('ascii', 0, 4) === 'RIFF' ? 'wav' : 'mp3' };
}
//# sourceMappingURL=openrouter.js.map