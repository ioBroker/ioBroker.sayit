const languages = [
    {
        "label": "Brasiliansk",
        "value": "pt-BR",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "Dansk",
        "value": "da-DK",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "Deutsch",
        "value": "de-DE",
        "engines": ["cloud", "polly", "coquiTTS", "PicoTTS", "google"]
    },
    {
        "label": "English",
        "value": "en-EN",
        "engines": ["coquiTTS", "google"]
    },
    {
        "label": "English AU",
        "value": "en-AU",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "English GB",
        "value": "en-GB",
        "engines": ["cloud", "polly", "PicoTTS"]
    },
    {
        "label": "English GB-WLS",
        "value": "en-GB-WLS",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "English IN",
        "value": "en-IN",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "English US",
        "value": "en-US",
        "engines": ["cloud", "polly", "PicoTTS"]
    },
    {
        "label": "Español",
        "value": "es-ES",
        "engines": ["cloud", "polly", "coquiTTS", "PicoTTS", "google"]
    },
    {
        "label": "Español US",
        "value": "es-US",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "Français",
        "value": "fr-FR",
        "engines": ["cloud", "polly", "coquiTTS", "PicoTTS", "google"]
    },
    {
        "label": "Français CA",
        "value": "fr-CA",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "Italiano",
        "value": "it-IT",
        "engines": ["cloud", "polly", "PicoTTS", "google"]
    },
    {
        "label": "Nederlands",
        "value": "nl-NL",
        "engines": ["cloud", "polly", "coquiTTS", "google"]
    },
    {
        "label": "Norsk Bokmal",
        "value": "nb-NO",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "Polskie",
        "value": "pl-PL",
        "engines": ["cloud", "polly", "google"]
    },
    {
        "label": "Português",
        "value": "pt-PT",
        "engines": ["cloud", "polly", "google"]
    },
    {
        "label": "Română",
        "value": "ro-RO",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "Svenska",
        "value": "sv-SE",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "Türk",
        "value": "tr-TR",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "Ukrainian",
        "value": "uk-UK",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "Walŵn",
        "value": "cy-GB",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "Íslensku",
        "value": "is-IS",
        "engines": ["cloud", "polly"]
    },
    {
        "label": "Русский",
        "value": "ru-RU",
        "engines": ["cloud", "polly", "yandexCloud", "google"]
    },
    {
        "label": "日本",
        "value": "ja-JA",
        "engines": ["coquiTTS"]
    },
    {
        "label": "简体中文",
        "value": "zh-CN",
        "engines": ["coquiTTS", "google"]
    },
    {
        "label": "한국어",
        "value": "ko-KR",
        "engines": ["cloud", "polly"]
    }
];
const engines = [
    {
        "label": "Google",
        "value": "google",
        "ssml": false
    },
    {
        "label": "Coqui TTS",
        "value": "coquiTTS",
        "ssml": false
    },
    {
        "label": "PicoTTS",
        "value": "PicoTTS",
        "ssml": false
    },
    {
        "label": "Polly",
        "value": "polly",
        "ssml": true
    },
    {
        "label": "Polly via Cloud",
        "value": "cloud",
        "ssml": true
    },
    {
        "label": "Yandex Cloud",
        "value": "yandexCloud",
        "ssml": false
    }
];
const voices = [
    {
        "label": "Agnieszka",
        "value": "Agnieszka",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "pl-PL"
        ]
    },
    {
        "label": "Amy",
        "value": "Amy",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-GB"
        ]
    },
    {
        "label": "Astrid",
        "value": "Astrid",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "sv-SE"
        ]
    },
    {
        "label": "Brian",
        "value": "Brian",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-GB"
        ]
    },
    {
        "label": "Camila",
        "value": "Camila",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "pt-BR"
        ]
    },
    {
        "label": "Carla",
        "value": "Carla",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "it-IT"
        ]
    },
    {
        "label": "Carmen",
        "value": "Carmen",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "ro-RO"
        ]
    },
    {
        "label": "Celine",
        "value": "Celine",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "fr-FR"
        ]
    },
    {
        "label": "Chantal",
        "value": "Chantal",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "fr-CA"
        ]
    },
    {
        "label": "Chipmunk",
        "value": "Chipmunk",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-US"
        ]
    },
    {
        "label": "Conchita",
        "value": "Conchita",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "es-ES"
        ]
    },
    {
        "label": "Cristiano",
        "value": "Cristiano",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "pt-PT"
        ]
    },
    {
        "label": "Dora",
        "value": "Dora",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "is-IS"
        ]
    },
    {
        "label": "Emma",
        "value": "Emma",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-GB"
        ]
    },
    {
        "label": "Emma",
        "value": "Emma",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-GB"
        ]
    },
    {
        "label": "Enrique",
        "value": "Enrique",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "es-ES"
        ]
    },
    {
        "label": "Eric",
        "value": "Eric",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-US"
        ]
    },
    {
        "label": "Ewa",
        "value": "Ewa",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "pl-PL"
        ]
    },
    {
        "label": "Filiz",
        "value": "Filiz",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "tr-TR"
        ]
    },
    {
        "label": "Geraint",
        "value": "Geraint",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-GB-WLS"
        ]
    },
    {
        "label": "Geraint",
        "value": "Geraint",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "cy-GB"
        ]
    },
    {
        "label": "Giorgio",
        "value": "Giorgio",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "it-IT"
        ]
    },
    {
        "label": "Gwyneth",
        "value": "Gwyneth",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-GB-WLS"
        ]
    },
    {
        "label": "Gwyneth",
        "value": "Gwyneth",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "cy-GB"
        ]
    },
    {
        "label": "Hans",
        "value": "Hans",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "de-DE"
        ]
    },
    {
        "label": "Ines",
        "value": "Ines",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "pt-PT"
        ]
    },
    {
        "label": "Ivy",
        "value": "Ivy",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-US"
        ]
    },
    {
        "label": "Jacek",
        "value": "Jacek",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "pl-PL"
        ]
    },
    {
        "label": "Jan",
        "value": "Jan",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "pl-PL"
        ]
    },
    {
        "label": "Jennifer",
        "value": "Jennifer",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-US"
        ]
    },
    {
        "label": "Joey",
        "value": "Joey",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-US"
        ]
    },
    {
        "label": "Justin",
        "value": "Justin",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-US"
        ]
    },
    {
        "label": "Karl",
        "value": "Karl",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "is-IS"
        ]
    },
    {
        "label": "Kendra",
        "value": "Kendra",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-US"
        ]
    },
    {
        "label": "Kimberly",
        "value": "Kimberly",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-US"
        ]
    },
    {
        "label": "Liv",
        "value": "Liv",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "nb-NO"
        ]
    },
    {
        "label": "Lotte",
        "value": "Lotte",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "nl-NL"
        ]
    },
    {
        "label": "Mads",
        "value": "Mads",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "da-DK"
        ]
    },
    {
        "label": "Maja",
        "value": "Maja",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "pl-PL"
        ]
    },
    {
        "label": "Marlene",
        "value": "Marlene",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "de-DE"
        ]
    },
    {
        "label": "Mathieu",
        "value": "Mathieu",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "fr-FR"
        ]
    },
    {
        "label": "Максим",
        "value": "Maxim",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "ru-RU"
        ]
    },
    {
        "label": "Miguel",
        "value": "Miguel",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "es-US"
        ]
    },
    {
        "label": "Naja",
        "value": "Naja",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "da-DK"
        ]
    },
    {
        "label": "Nicole",
        "value": "Nicole",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-AU"
        ]
    },
    {
        "label": "Penelope",
        "value": "Penelope",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "es-US"
        ]
    },
    {
        "label": "Raveena",
        "value": "Raveena",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-IN"
        ]
    },
    {
        "label": "Ricardo",
        "value": "Ricardo",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "pt-BR"
        ]
    },
    {
        "label": "Ruben",
        "value": "Ruben",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "nl-NL"
        ]
    },
    {
        "label": "Russell",
        "value": "Russell",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-AU"
        ]
    },
    {
        "label": "Salli",
        "value": "Salli",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "en-US"
        ]
    },
    {
        "label": "Seoyeon",
        "value": "Seoyeon",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "ko-KR"
        ]
    },
    {
        "label": "Татьяна",
        "value": "Tatyana",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "ru-RU"
        ]
    },
    {
        "label": "Vicki",
        "value": "Vicki",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "de-DE"
        ]
    },
    {
        "label": "Vitoria",
        "value": "Vitoria",
        "engines": [
            "cloud",
            "polly"
        ],
        "languages": [
            "pt-BR"
        ]
    },
    {
        "label": "Alena",
        "value": "alena",
        "engines": [
            "yandexCloud"
        ],
        "languages": [
            "ru-RU"
        ]
    },
    {
        "label": "Alyss",
        "value": "alyss",
        "engines": [
            "yandexCloud"
        ],
        "languages": [
            "ru-RU"
        ]
    },
    {
        "label": "baker tacotron2-DDC-GST",
        "value": "baker tacotron2-DDC-GST",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "zh-CN"
        ]
    },
    {
        "label": "ek1 tacotron2",
        "value": "ek1 tacotron2",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "en-EN"
        ]
    },
    {
        "label": "Ermil",
        "value": "ermil",
        "engines": [
            "yandexCloud"
        ],
        "languages": [
            "ru-RU"
        ]
    },
    {
        "label": "Filipp",
        "value": "filipp",
        "engines": [
            "yandexCloud"
        ],
        "languages": [
            "ru-RU"
        ]
    },
    {
        "label": "Jane",
        "value": "jane",
        "engines": [
            "yandexCloud"
        ],
        "languages": [
            "ru-RU"
        ]
    },
    {
        "label": "kokoro tacotron2-DDC",
        "value": "kokoro tacotron2-DDC",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "ja-JA"
        ]
    },
    {
        "label": "ljspeech glow-tts",
        "value": "ljspeech glow-tts",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "en-EN"
        ]
    },
    {
        "label": "ljspeech speedy-speech-wn",
        "value": "ljspeech speedy-speech-wn",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "en-EN"
        ]
    },
    {
        "label": "ljspeech tacotron-DCA",
        "value": "ljspeech tacotron-DCA",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "en-EN"
        ]
    },
    {
        "label": "ljspeech tacotron2-DDC",
        "value": "ljspeech tacotron2-DDC",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "en-EN"
        ]
    },
    {
        "label": "ljspeech tacotron2-DDC-ph",
        "value": "ljspeech tacotron2-DDC-ph",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "en-EN"
        ]
    },
    {
        "label": "ljspeech vits",
        "value": "ljspeech vits",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "en-EN"
        ]
    },
    {
        "label": "mai tacotron2-DDC",
        "value": "mai tacotron2-DDC",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "es-ES"
        ]
    },
    {
        "label": "mai tacotron2-DDC",
        "value": "mai tacotron2-DDC",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "nl-NL"
        ]
    },
    {
        "label": "mai tacotron2-DDC",
        "value": "mai tacotronic2-DDC",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "fr-FR"
        ]
    },
    {
        "label": "Nick",
        "value": "nick",
        "engines": [
            "yandexCloud"
        ],
        "languages": [
            "ru-RU"
        ]
    },
    {
        "label": "Oksana",
        "value": "oksana",
        "engines": [
            "yandexCloud"
        ],
        "languages": [
            "ru-RU"
        ]
    },
    {
        "label": "sam tacotron-DDC",
        "value": "sam tacotron-DDC",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "en-EN"
        ]
    },
    {
        "label": "thorsten tacotron2-DCA",
        "value": "thorsten tacotron2-DCA",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "de-DE"
        ]
    },
    {
        "label": "vctk sc-glow-tts",
        "value": "vctk sc-glow-tts",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "en-EN"
        ]
    },
    {
        "label": "vctk vits",
        "value": "vctk vits",
        "engines": [
            "coquiTTS"
        ],
        "languages": [
            "en-EN"
        ]
    },
    {
        "label": "Zahar",
        "value": "zahar",
        "engines": [
            "yandexCloud"
        ]
    }
];
const coquiTTSvocoders = [
    {
        "label": "default",
        "value": "default"
    },
    {
        "label": "ek1 wavegrad",
        "value": "ek1 wavegrad"
    },
    {
        "label": "kokoro hifigan_v1",
        "value": "kokoro hifigan_v1"
    },
    {
        "label": "libri-tts fullband-melgan",
        "value": "libri-tts fullband-melgan"
    },
    {
        "label": "libri-tts wavegrad",
        "value": "libri-tts wavegrad"
    },
    {
        "label": "ljspeech hifigan_v2",
        "value": "ljspeech hifigan_v2"
    },
    {
        "label": "ljspeech multiband-melgan",
        "value": "ljspeech multiband-melgan"
    },
    {
        "label": "ljspeech univnet",
        "value": "ljspeech univnet"
    },
    {
        "label": "mai parallel-wavegan",
        "value": "mai parallel-wavegan"
    },
    {
        "label": "sam hifigan_v2",
        "value": "sam hifigan_v2"
    },
    {
        "label": "thorsten fullband-melgan",
        "value": "thorsten fullband-melgan"
    },
    {
        "label": "thorsten wavegrad",
        "value": "thorsten wavegrad"
    },
    {
        "label": "vctk hifigan_v2",
        "value": "vctk hifigan_v2"
    }
];
const outputs = [
    {
        "label": "Browser",
        "value": "browser",
        "options": {
            "mp3Required": true,
            "checkLength": true,
            "server": true,
            "libs":  ['fs', 'crypto', 'http']
        }
    },
    {
        "label": "Chromecast",
        "value": "chromecast",
        "options": {
            "mp3Required": true,
            "checkLength": true,
            "server": true,
            "libs":  ['fs', 'crypto', 'http']
        }
    },
    {
        "label": "Google Home",
        "value": "googleHome",
        "options": {
            "mp3Required": true,
            "checkLength": true,
            "server": true,
            "libs":  ['fs', 'crypto', 'http', 'castv2-client']
        }
    },
    {
        "label": "HEOS",
        "value": "heos",
        "options": {
            "mp3Required": true,
            "checkLength": true,
            "server": true,
            "libs":  ['fs', 'crypto', 'http']
        }
    },
    {
        "label": "MediaPlayer24",
        "value": "mp24",
        "options": {
            "mp3Required": false,
            "checkLength": true,
            "server": false,
            "libs":  ['fs', 'crypto', 'http']
        }
    },
    {
        "label": "MediaPlayer24+FTP",
        "value": "mp24ftp",
        "options": {
            "mp3Required": true,
            "checkLength": true,
            "server": false,
            "libs":  ['fs', 'crypto', 'http', 'jsftp']
        }
    },
    {
        "label": "MPD",
        "value": "mpd",
        "options": {
            "mp3Required": true,
            "checkLength": true,
            "server": true,
            "libs":  ['fs', 'crypto', 'http']
        }
    },
    {
        "label": "Sonos",
        "value": "sonos",
        "options": {
            "mp3Required": true,
            "checkLength": true,
            "server": true,
            "libs":  ['fs', 'crypto', 'http']
        }
    },
    {
        "label": "System",
        "value": "system",
        "options": {
            "mp3Required": true,
            "checkLength": false,
            "server": false,
            "libs":  ['fs', 'crypto', 'http', 'child_process', 'os']
        }
    },
    {
        "label": "Windows default",
        "value": "windows",
        "options": {
            "mp3Required": false,
            "checkLength": true,
            "server": false,
            "libs":  ['fs', 'child_process']
        }
    }
]

module.exports = {
    languages: languages,
    engines: engines,
    voices: voices,
    coquiTTSvocoders: coquiTTSvocoders,
    outputs: outputs
}
