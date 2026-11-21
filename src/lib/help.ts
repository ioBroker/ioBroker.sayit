/**
 * The answer of the message "help": what the instance answers, written for an AI agent (e.g. ioBroker.pi-agent,
 * or the MCP server with `send_to`) and for script authors. Keep it in sync with `processMessage` in main.ts.
 */

/**
 * The commands `processMessage` answers. write: true if the command has an effect (plays, writes, stops).
 * standard: the command of the shared catalog of ioBroker commands (ioBroker.assistant HELP.md) it follows.
 */
export const COMMANDS: { command: string; write: boolean; standard?: string }[] = [
    { command: 'help', write: false },
    { command: 'say', write: true },
    { command: 'speak', write: true, standard: 'speech.speak' },
    { command: 'playSound', write: true, standard: 'speech.playSound' },
    { command: 'synthesize', write: false, standard: 'speech.synthesize' },
    { command: 'stopInstance', write: true },
    { command: 'browseGoogleHome', write: false },
    { command: 'browseChromecast', write: false },
    { command: 'browseHeos', write: false },
    { command: 'browseSqueezebox', write: false },
    { command: 'browseWiim', write: false },
    { command: 'browseAssistant', write: false },
    { command: 'browseAlexa', write: false },
    { command: 'browseFully', write: false },
    { command: 'browseSonos', write: false },
    { command: 'getFreeTtsVoices', write: false },
    { command: 'getPiperVoices', write: false },
    { command: 'test', write: true },
    { command: 'testGenerate', write: true },
];

export const HELP = `ioBroker.sayit: text to speech. It turns a text into speech with the voice (engine) of its settings and plays
it on the output of its settings: a speaker (Sonos, HEOS, Squeezebox, WiiM, Bose, Chromecast, Google Home, MPD,
Kodi), an Echo of alexa2, the satellites of assistant, a Fully Kiosk tablet, the browsers with vis or Aura, the
ioBroker host, or a phone call (asterisk). Each instance has one output. An agent can say a text or play a sound file.

Commands (sendTo sayit.0):
- say {text, language?, volume?, <device>?, alexaCommand?, type?, engine?}: says the text; answer {result: "Ok"} or
  {error} as soon as it was handed to the output (texts queue up, so the answer may take a while). The same text
  twice within 0.5 s is said once, the second message gets no answer.
  text: the text. The prefixes "de;", "80;", "de;80;" or "80;de;" set language and volume; a leading "!" puts it at
  the front of the queue; a name ending in .mp3, .wav or .ogg plays that file (e.g. /vis.0/main/door-bell.mp3 from
  the ioBroker files; not with output alexa). No text: {error: "No text"}.
  language: an engine: Google en, de, pl, uk, ru, it, pt, es, fr, nl, zh-CN, or another engine key of the README
  (e.g. de-DE_AP_Female). It replaces the voice of the settings (also a FreeTTS or Piper voice): leave it out unless
  the user wants another language. volume: 0-100 % (default: the settings, else the state tts.volume).
  <device>: another device of the output type of the settings (default: the device of the settings):
  sonosDevice (sonos.0.root.<ip>), heosDevice (heos.0.players.<pid>), squeezeboxDevice (squeezeboxrpc.0.Players.
  <name>), wiimDevice (wiim.0.<name>), assistantDevice (assistant.0 = all satellites, assistant.0.satellites.<id> =
  one), alexaDevice (alexa2.0.Echo-Devices.<serial>), fullyDevice (fullybrowser.0.<name>), chromecastDevice
  (chromecast.0.<name>), mpdInstance (mpd.0), kodiInstance (kodi.0), boseInstance (bosesoundtouch.0),
  browserInstance (FFFFFFFF = all browsers), browserVis ("" both, "1" vis, "2" vis-2, "aura"), asteriskInstance,
  asteriskTelnr (the number to call), asteriskCallerId. alexaCommand: speak or announcement (with the chime).
  Only when an answer is expected (a callback) also count: type (the output: system, windows, browser, sonos, heos,
  squeezebox, wiim, assistant, alexa, bose, kodi, asterisk, fully, chromecast, googleHome, mpd, mp24, mp24ftp),
  engine (= language) and every other option of the settings (e.g. googleHomeServer, piperVoice, freettsVoice).
  Without a callback the output type of the settings is used.
- speak {text, device?, room?, volume?, language?, priority?}: standard speech.speak, the first choice for agents.
  Says the text on the output of the settings; answer {ok: true, devices: [name]} when it was handed to the output,
  or {error, reason}. device: a device of the output type of the settings by ID or name (an exact name wins over a
  part of it; the browse command of the output lists them); room: the device of that type in this ioBroker room
  (enum.rooms.<id> or its name). Several fit: reason AMBIGUOUS with candidates; none: NOT_FOUND; an output without
  devices to choose (system, windows, browser, googleHome, mp24, mp24ftp, asterisk): NOT_SUPPORTED. volume: 0-100 %.
  language: ISO 639-1 (de, en ...): the voice of the settings if it speaks it, else the Google voice of the language
  (NOT_SUPPORTED if there is none); an engine key of sayit works too. priority: true = before the queued texts.
  No text: BAD_REQUEST.
- playSound {url | file, device?, room?, volume?}: standard speech.playSound. Plays an mp3, wav or ogg file, without
  the announcement gong; answer {ok: true, devices: [name]} when it was handed to the output. url: http(s), loaded
  first (at most 10 MB); file: a path of the ioBroker files (/vis.0/main/bell.mp3 or iobfile://vis.0/main/bell.mp3),
  a path on the host, a data URL, or base64 with contentType. device, room, volume as for speak. Output alexa cannot
  play files: NOT_SUPPORTED.
- synthesize {text, language?, voice?}: standard speech.synthesize. Generates the speech without playing it; answer
  {data: <base64>, contentType: "audio/mpeg"} ("audio/ogg" for the engine ru_YA_CLOUD). language as for speak;
  voice: an engine key of sayit, or a voice of FreeTTS or Piper if that is the engine of the settings (else
  NOT_FOUND). It waits up to 30 s until the queue is played (else TIMEOUT).
  speak, playSound and synthesize follow the shared catalog of ioBroker commands (family speech).
- browseAlexa, browseAssistant, browseChromecast, browseFully, browseHeos, browseSonos, browseSqueezebox, browseWiim:
  the devices of that kind, made for the settings: [{value, label}]; value is the ID for the <device> of say.
- test, testGenerate, browseGoogleHome, getFreeTtsVoices, getPiperVoices, stopInstance: for the settings, not for
  agents. Unknown commands answer {error, reason: "NOT_SUPPORTED"}.

States (sayit.0.tts.*):
- text: writing a text says it on the output of the settings (same prefixes as say).
- cachetext: generates the file of a text into the cache without playing it.
- clearQueue: true throws away the queued texts (not the one playing).
- volume: 0-100 %, used when neither the settings nor the text give a volume; with output system it sets the volume
  of the host.
- playing: true while a text is played (read-only).

How to talk to the user:
- Say something only on the user's request, short, in the language of the voice.
- Which output: sayit.0 plays where its settings say. If there are several sayit instances, or the user means one of
  several devices (Echo devices, satellites, speakers) and names none, ask which one; do not guess. The browse
  commands list the devices.
- At night (about 22:00 to 07:00) speak only on the user's explicit request, and loud (volume above about 50) only
  when the user asks for it.
- With output asterisk every text and sound (say, speak, playSound) is a phone call: only on the user's explicit
  request and to a number the user confirmed.
- Tell the user an error of the answer. "Ok" does not prove that it was heard: a missing device is only logged.`;
