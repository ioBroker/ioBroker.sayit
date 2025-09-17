'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Sendto');

    goog.require('Blockly.JavaScript');
}

Blockly.Translate = Blockly.Translate || function (word, lang) {
    lang = lang || systemLang;
    if (Blockly.Words && Blockly.Words[word]) {
        return Blockly.Words[word][lang] || Blockly.Words[word].en;
    } else {
        return word;
    }
};


// --- SayIt --------------------------------------------------
Blockly.Words['sayit']               = {'en': 'say text',                    'de': 'aussprechen',                        'ru': 'произнести'};
Blockly.Words['sayit_message']       = {'en': 'message',                     'de': 'Meldung',                            'ru': 'сообщение'};
Blockly.Words['sayit_volume']        = {'en': 'volume (optional)',           'de': 'Lautstärke (optional)',              'ru': 'громкость (не обяз.)'};
Blockly.Words['sayit_tooltip']       = {'en': 'Text to speech',              'de': 'Text zu Sprache',                    'ru': 'Произнести сообщение'};
Blockly.Words['sayit_help']          = {'en': 'https://github.com/ioBroker/ioBroker.sayit/blob/master/README.md', 'de': 'http://www.iobroker.net/?page_id=178&lang=de', 'ru': 'http://www.iobroker.net/?page_id=4262&lang=ru'};
Blockly.Words['sayit_configured']    = {'en': 'configured',                  'de': 'Standard',                           'ru': 'настроенный'};
Blockly.Words['sayit_anyInstance']   = {'en': 'all instances',               'de': 'Alle Instanzen',                     'ru': 'На все драйвера', 'pt': 'todas as instâncias',            'pl': 'wszystkie przypadki',                'nl': 'alle instanties',                'it': 'tutte le istanze',               'es': 'todas las instancias',           'fr': 'toutes les instances'};

Blockly.Words['sayit_log']           = {'en': 'log level',                   'de': 'Loglevel',                           'ru': 'Протокол'};
Blockly.Words['sayit_log_none']      = {'en': 'none',                        'de': 'keins',                              'ru': 'нет'};
Blockly.Words['sayit_log_info']      = {'en': 'info',                        'de': 'info',                               'ru': 'инфо'};
Blockly.Words['sayit_log_debug']     = {'en': 'debug',                       'de': 'debug',                              'ru': 'debug'};
Blockly.Words['sayit_log_warn']      = {'en': 'warning',                     'de': 'warning',                            'ru': 'warning'};
Blockly.Words['sayit_log_error']     = {'en': 'error',                       'de': 'error',                              'ru': 'ошибка'};

// this is copy of lib/engines.js
const sayitEngines = {
    en: { name: 'Google - English', engine: 'google' },
    de: { name: 'Google - Deutsch', engine: 'google' },
    pl: { name: 'Google - Polski', engine: 'google' },
    uk: { name: 'Google - Ukrainian', engine: 'google' },
    ru: { name: 'Google - Русский', engine: 'google' },
    it: { name: 'Google - Italiano', engine: 'google' },
    pt: { name: 'Google - Português', engine: 'google' },
    es: { name: 'Google - Espaniol', engine: 'google' },
    fr: { name: 'Google - Français', engine: 'google' },
    nl: { name: 'Google - Nederlands', engine: 'google' },
    'zh-CN': { name: 'Google - 简体中文', engine: 'google' },

    ru_YA: {
        name: 'Yandex - Русский',
        engine: 'yandex',
        voice: ['jane', 'zahar'],
        emotion: ['none', 'good', 'neutral', 'evil', 'mixed'],
    },
    ru_YA_CLOUD: {
        name: 'Yandex Cloud - Русский',
        engine: 'yandexCloud',
        voice: ['alyss', 'oksana', 'jane', 'zahar', 'nick', 'ermil', 'alena Premium', 'filipp Premium'],
        emotion: ['good', 'neutral', 'evil'],
    },

    'ru-RU_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'ru-RU',
        ename: 'Tatyana',
        ssml: true,
        name: 'Cloud - Русский - Татьяна',
    },
    'ru-RU_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'ru-RU',
        ename: 'Maxim',
        ssml: true,
        name: 'Cloud - Русский - Максим',
    },

    'de-DE_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'de-DE',
        ename: 'Marlene',
        ssml: true,
        name: 'Cloud - Deutsch - Marlene',
    },
    'de-DE_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'de-DE',
        ename: 'Hans',
        ssml: true,
        name: 'Cloud - Deutsch - Hans',
    },
    'de-DE_CLOUD_Female_Vicki': {
        gender: 'Female',
        engine: 'cloud',
        language: 'de-DE',
        ename: 'Vicki',
        ssml: true,
        name: 'Cloud - Deutsch - Vicki',
        neural: true,
    },
    'de-DE_CLOUD_Male_Daniel': {
        gender: 'Male',
        engine: 'cloud',
        language: 'de-DE',
        ename: 'Daniel',
        ssml: true,
        name: 'Cloud - Deutsch - Daniel',
        neural: true,
    },

    'de-AT_CLOUD_Female_Hannah': {
        gender: 'Female',
        engine: 'cloud',
        language: 'de-AT',
        ename: 'Hannah',
        ssml: true,
        name: 'Cloud - Österreich - Hannah',
        neural: true,
    },

    'en-US_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'en-US',
        ename: 'Salli',
        ssml: true,
        name: 'Cloud - en-US - Female - Salli',
    },
    'en-US_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'en-US',
        ename: 'Joey',
        ssml: true,
        name: 'Cloud - en-US - Male - Joey',
    },

    'da-DK_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'da-DK',
        ename: 'Naja',
        ssml: true,
        name: 'Cloud - da-DK - Female - Naja',
    },
    'da-DK_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'da-DK',
        ename: 'Mads',
        ssml: true,
        name: 'Cloud - da-DK - Male - Mads',
    },

    'en-AU_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'en-AU',
        ename: 'Nicole',
        ssml: true,
        name: 'Cloud - en-AU - Female - Nicole',
    },
    'en-AU_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'en-AU',
        ename: 'Russell',
        ssml: true,
        name: 'Cloud - en-AU - Male - Russell',
    },

    'en-GB_CLOUD_Female_Amy': {
        gender: 'Female',
        engine: 'cloud',
        language: 'en-GB',
        ename: 'Amy',
        ssml: true,
        name: 'Cloud - en-GB - Female - Amy',
        neural: true,
    },
    'en-GB_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'en-GB',
        ename: 'Brian',
        ssml: true,
        name: 'Cloud - en-GB - Male - Brian',
        neural: true,
    },
    'en-GB_CLOUD_Female_Emma': {
        gender: 'Female',
        engine: 'cloud',
        language: 'en-GB',
        ename: 'Emma',
        ssml: true,
        name: 'Cloud - en-GB - Female - Emma',
        neural: true,
    },
    'en-GB_CLOUD_Male_Arthur': {
        gender: 'Male',
        engine: 'cloud',
        language: 'en-GB',
        ename: 'Arthur',
        ssml: true,
        name: 'Cloud - en-GB - Male - Arthur',
        neural: true,
    },

    'en-GB-WLS_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'en-GB-WLS',
        ename: 'Gwyneth',
        ssml: true,
        name: 'Cloud - en-GB-WLS - Female - Gwyneth',
    },
    'en-GB-WLS_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'en-GB-WLS',
        ename: 'Geraint',
        ssml: true,
        name: 'Cloud - en-GB-WLS - Male - Geraint',
    },

    'cy-GB_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'cy-GB',
        ename: 'Gwyneth',
        ssml: true,
        name: 'Cloud - cy-GB - Female - Gwyneth',
    },
    'cy-GB_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'cy-GB',
        ename: 'Geraint',
        ssml: true,
        name: 'Cloud - cy-GB - Male - Geraint',
    },

    'en-IN_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'en-IN',
        ename: 'Raveena',
        ssml: true,
        name: 'Cloud - en-IN - Female - Raveena',
    },

    'en-US_CLOUD_Female_Ivy': {
        gender: 'Female',
        engine: 'cloud',
        language: 'en-US',
        ename: 'Ivy',
        ssml: true,
        name: 'Cloud - en-US - Female - Ivy',
    },
    'en-US_CLOUD_Male_Justin': {
        gender: 'Male',
        engine: 'cloud',
        language: 'en-US',
        ename: 'Justin',
        ssml: true,
        name: 'Cloud - en-US - Male - Justin',
    },
    'en-US_CLOUD_Female_Kendra': {
        gender: 'Female',
        engine: 'cloud',
        language: 'en-US',
        ename: 'Kendra',
        ssml: true,
        name: 'Cloud - en-US - Female - Kendra',
    },
    'en-US_CLOUD_Female_Kimberly': {
        gender: 'Female',
        engine: 'cloud',
        language: 'en-US',
        ename: 'Kimberly',
        ssml: true,
        name: 'Cloud - en-US - Female - Kimberly',
    },

    'es-ES_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'es-ES',
        ename: 'Conchita',
        ssml: true,
        name: 'Cloud - es-ES - Female - Conchita',
    },
    'es-ES_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'es-ES',
        ename: 'Enrique',
        ssml: true,
        name: 'Cloud - es-ES - Male - Enrique',
    },

    'es-US_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'es-US',
        ename: 'Penelope',
        ssml: true,
        name: 'Cloud - es-US - Female - Penelope',
    },
    'es-US_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'es-US',
        ename: 'Miguel',
        ssml: true,
        name: 'Cloud - es-US - Male - Miguel',
    },

    'fr-CA_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'fr-CA',
        ename: 'Chantal',
        ssml: true,
        name: 'Cloud - fr-CA - Female - Chantal',
    },
    'fr-FR_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'fr-FR',
        ename: 'Celine',
        ssml: true,
        name: 'Cloud - fr-FR - Female - Celine',
    },
    'fr-FR_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'fr-FR',
        ename: 'Mathieu',
        ssml: true,
        name: 'Cloud - fr-FR - Male - Mathieu',
    },

    'is-IS_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'is-IS',
        ename: 'Dora',
        ssml: true,
        name: 'Cloud - is-IS - Female - Dora',
    },
    'is-IS_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'is-IS',
        ename: 'Karl',
        ssml: true,
        name: 'Cloud - is-IS - Male - Karl',
    },

    'it-IT_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'it-IT',
        ename: 'Carla',
        ssml: true,
        name: 'Cloud - it-IT - Female - Carla',
    },
    'it-IT_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'it-IT',
        ename: 'Giorgio',
        ssml: true,
        name: 'Cloud - it-IT - Male - Giorgio',
    },

    'no-NO_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'nb-NO',
        ename: 'Liv',
        ssml: true,
        name: 'Cloud - nb-NO - Female - Liv',
    },
    'no-NO_CLOUD_Female_Ida': {
        gender: 'Female',
        engine: 'cloud',
        language: 'no-NO',
        ename: 'Ida',
        ssml: true,
        name: 'Cloud - no-NO - Female - Ida',
        neural: true,
    },

    'nl-NL_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'nl-NL',
        ename: 'Lotte',
        ssml: true,
        name: 'Cloud - nl-NL - Female - Lotte',
    },
    'nl-NL_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'nl-NL',
        ename: 'Ruben',
        ssml: true,
        name: 'Cloud - nl-NL - Male - Ruben',
    },

    'pl-PL_CLOUD_Male_Jacek': {
        gender: 'Male',
        engine: 'cloud',
        language: 'pl-PL',
        ename: 'Jacek',
        ssml: true,
        name: 'Cloud - pl-PL - Male - Jacek',
    },
    'pl-PL_CLOUD_Female_Ewa': {
        gender: 'Female',
        engine: 'cloud',
        language: 'pl-PL',
        ename: 'Ewa',
        ssml: true,
        name: 'Cloud - pl-PL - Female - Ewa',
    },
    'pl-PL_CLOUD_Male_Jan': {
        gender: 'Male',
        engine: 'cloud',
        language: 'pl-PL',
        ename: 'Jan',
        ssml: true,
        name: 'Cloud - pl-PL - Male - Jan',
    },
    'pl-PL_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'pl-PL',
        ename: 'Maja',
        ssml: true,
        name: 'Cloud - pl-PL - Female - Maja',
    },

    'pt-BR_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'pt-BR',
        ename: 'Vitoria',
        ssml: true,
        name: 'Cloud - pt-BR - Female - Vitoria',
    },
    'pt-BR_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'pt-BR',
        ename: 'Ricardo',
        ssml: true,
        name: 'Cloud - pt-BR - Male - Ricardo',
    },
    'pt-BR_CLOUD_Female_Camila': {
        gender: 'Female',
        engine: 'cloud',
        language: 'pt-BR',
        ename: 'Camila',
        ssml: true,
        name: 'Cloud - pt-BR - Female - Camila',
    },
    'pt-PT_CLOUD_Male': {
        gender: 'Male',
        engine: 'cloud',
        language: 'pt-PT',
        ename: 'Cristiano',
        ssml: true,
        name: 'Cloud - pt-PT - Male - Cristiano',
    },
    'pt-PT_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'pt-PT',
        ename: 'Ines',
        ssml: true,
        name: 'Cloud - pt-PT - Female - Ines',
    },

    'ro-RO_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'ro-RO',
        ename: 'Carmen',
        ssml: true,
        name: 'Cloud - ro-RO - Female - Carmen',
    },
    'sv-SE_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'sv-SE',
        ename: 'Astrid',
        ssml: true,
        name: 'Cloud - sv-SE - Female - Astrid',
    },
    'tr-TR_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'tr-TR',
        ename: 'Filiz',
        ssml: true,
        name: 'Cloud - tr-TR - Female - Filiz',
    },
    'ko-KR_CLOUD_Female': {
        gender: 'Female',
        engine: 'cloud',
        language: 'ko-KR',
        ename: 'Seoyeon',
        ssml: true,
        name: 'Cloud - ko-KR - Female - Seoyeon',
    },

    'en-US': { name: 'PicoTTS - Englisch US', engine: 'PicoTTS' },
    'en-GB': { name: 'PicoTTS - Englisch GB', engine: 'PicoTTS' },
    'de-DE': { name: 'PicoTTS - Deutsch', engine: 'PicoTTS' },
    'it-IT': { name: 'PicoTTS - Italiano', engine: 'PicoTTS' },
    'es-ES': { name: 'PicoTTS - Espaniol', engine: 'PicoTTS' },
    'fr-FR': { name: 'PicoTTS - Français', engine: 'PicoTTS' },

    en_CoquiTTS: { name: 'CoquiTTS - English', engine: 'CoquiTTS' },
    es_CoquiTTS: { name: 'CoquiTTS - Espaniol', engine: 'CoquiTTS' },
    fr_CoquiTTS: { name: 'CoquiTTS - Français', engine: 'CoquiTTS' },
    de_CoquiTTS: { name: 'CoquiTTS - Deutsch', engine: 'CoquiTTS' },
    nl_CoquiTTS: { name: 'CoquiTTS - Dutch', engine: 'CoquiTTS' },
    ja_CoquiTTS: { name: 'CoquiTTS - Japan', engine: 'CoquiTTS' },

    'ru-RU_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'ru-RU',
        ename: 'Tatyana',
        ssml: true,
        name: 'AWS Polly - Русский - Татьяна',
    },
    'ru-RU_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'ru-RU',
        ename: 'Maxim',
        ssml: true,
        name: 'AWS Polly - Русский - Максим',
    },

    'de-DE_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'de-DE',
        ename: 'Marlene',
        ssml: true,
        name: 'AWS Polly - Deutsch - Marlene',
    },
    'de-DE_AP_Female_Vicki': {
        gender: 'Female',
        engine: 'polly',
        language: 'de-DE',
        ename: 'Vicki',
        ssml: true,
        name: 'AWS Polly - Deutsch - Vicki',
        neural: true,
    },
    'de-DE_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'de-DE',
        ename: 'Hans',
        ssml: true,
        name: 'AWS Polly - Deutsch - Hans',
    },
    'de-DE_AP_Male_Daniel': {
        gender: 'Male',
        engine: 'polly',
        language: 'de-DE',
        ename: 'Daniel',
        ssml: true,
        name: 'AWS Polly - Deutsch - Daniel',
        neural: true,
    },

    'de-AT_AP_Female_Hannah': {
        gender: 'Female',
        engine: 'polly',
        language: 'de-AT',
        ename: 'Hannah',
        ssml: true,
        name: 'AWS Polly - Österreich - Hannah',
        neural: true,
    },

    'en-US_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-US',
        ename: 'Salli',
        ssml: true,
        name: 'AWS Polly - en-US - Female - Salli',
    },
    'en-US_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'en-US',
        ename: 'Joey',
        ssml: true,
        name: 'AWS Polly - en-US - Male - Joey',
    },

    'da-DK_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'da-DK',
        ename: 'Naja',
        ssml: true,
        name: 'AWS Polly - da-DK - Female - Naja',
    },
    'da-DK_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'da-DK',
        ename: 'Mads',
        ssml: true,
        name: 'AWS Polly - da-DK - Male - Mads',
    },

    'en-AU_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-AU',
        ename: 'Nicole',
        ssml: true,
        name: 'AWS Polly - en-AU - Female - Nicole',
    },
    'en-AU_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'en-AU',
        ename: 'Russell',
        ssml: true,
        name: 'AWS Polly - en-AU - Male - Russell',
    },

    'en-GB_AP_Female_Amy': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-GB',
        ename: 'Amy',
        ssml: true,
        name: 'AWS Polly - en-GB - Female - Amy',
        neural: true,
    },
    'en-GB_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'en-GB',
        ename: 'Brian',
        ssml: true,
        name: 'AWS Polly - en-GB - Male - Brian',
        neural: true,
    },
    'en-GB_AP_Female_Emma': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-GB',
        ename: 'Emma',
        ssml: true,
        name: 'AWS Polly - en-GB - Female - Emma',
        neural: true,
    },
    'en-GB_AP_Male_Arthur': {
        gender: 'Male',
        engine: 'polly',
        language: 'en-GB',
        ename: 'Arthur',
        ssml: true,
        name: 'AWS Polly - en-GB - Male - Arthur',
        neural: true,
    },

    'en-GB-WLS_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-GB-WLS',
        ename: 'Gwyneth',
        ssml: true,
        name: 'AWS Polly - en-GB-WLS - Female - Gwyneth',
    },
    'en-GB-WLS_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'en-GB-WLS',
        ename: 'Geraint',
        ssml: true,
        name: 'AWS Polly - en-GB-WLS - Male - Geraint',
    },

    'cy-GB_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'cy-GB',
        ename: 'Gwyneth',
        ssml: true,
        name: 'AWS Polly - cy-GB - Female - Gwyneth',
    },
    'cy-GB_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'cy-GB',
        ename: 'Geraint',
        ssml: true,
        name: 'AWS Polly - cy-GB - Male - Geraint',
    },

    'en-IN_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-IN',
        ename: 'Raveena',
        ssml: true,
        name: 'AWS Polly - en-IN - Female - Raveena',
    },

    'en-US_AP_Female_Ivy': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-US',
        ename: 'Ivy',
        ssml: true,
        name: 'AWS Polly - en-US - Female - Ivy',
    },
    'en-US_AP_Male_Justin': {
        gender: 'Male',
        engine: 'polly',
        language: 'en-US',
        ename: 'Justin',
        ssml: true,
        name: 'AWS Polly - en-US - Male - Justin',
    },
    'en-US_AP_Female_Kendra': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-US',
        ename: 'Kendra',
        ssml: true,
        name: 'AWS Polly - en-US - Female - Kendra',
    },
    'en-US_AP_Female_Kimberly': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-US',
        ename: 'Kimberly',
        ssml: true,
        name: 'AWS Polly - en-US - Female - Kimberly',
    },

    'es-ES_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'es-ES',
        ename: 'Conchita',
        ssml: true,
        name: 'AWS Polly - es-ES - Female - Conchita',
    },
    'es-ES_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'es-ES',
        ename: 'Enrique',
        ssml: true,
        name: 'AWS Polly - es-ES - Male - Enrique',
    },
    'es-US_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'es-US',
        ename: 'Penelope',
        ssml: true,
        name: 'AWS Polly - es-US - Female - Penelope',
    },
    'es-US_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'es-US',
        ename: 'Miguel',
        ssml: true,
        name: 'AWS Polly - es-US - Male - Miguel',
    },
    'fr-CA_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'fr-CA',
        ename: 'Chantal',
        ssml: true,
        name: 'AWS Polly - fr-CA - Female - Chantal',
    },
    'fr-FR_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'fr-FR',
        ename: 'Celine',
        ssml: true,
        name: 'AWS Polly - fr-FR - Female - Celine',
    },
    'fr-FR_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'fr-FR',
        ename: 'Mathieu',
        ssml: true,
        name: 'AWS Polly - fr-FR - Male - Mathieu',
    },
    'is-IS_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'is-IS',
        ename: 'Dora',
        ssml: true,
        name: 'AWS Polly - is-IS - Female - Dora',
    },
    'is-IS_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'is-IS',
        ename: 'Karl',
        ssml: true,
        name: 'AWS Polly - is-IS - Male - Karl',
    },
    'it-IT_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'it-IT',
        ename: 'Carla',
        ssml: true,
        name: 'AWS Polly - it-IT - Female - Carla',
    },
    'it-IT_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'it-IT',
        ename: 'Giorgio',
        ssml: true,
        name: 'AWS Polly - it-IT - Male - Giorgio',
    },
    'no-NO_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'no-NO',
        ename: 'Liv',
        ssml: true,
        name: 'AWS Polly - no-NO - Female - Liv',
    },
    'no-NO_AP_Female_Ida': {
        gender: 'Female',
        engine: 'polly',
        language: 'no-NO',
        ename: 'Ida',
        ssml: true,
        name: 'AWS Polly - no-NO - Female - Ida',
        neural: true,
    },
    'nl-NL_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'nl-NL',
        ename: 'Lotte',
        ssml: true,
        name: 'AWS Polly - nl-NL - Female - Lotte',
    },
    'nl-NL_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'nl-NL',
        ename: 'Ruben',
        ssml: true,
        name: 'AWS Polly - nl-NL - Male - Ruben',
    },
    'pl-PL_AP_Male_Jacek': {
        gender: 'Male',
        engine: 'polly',
        language: 'pl-PL',
        ename: 'Jacek',
        ssml: true,
        name: 'AWS Polly - pl-PL - Male - Jacek',
    },
    'pl-PL_AP_Female_Ewa': {
        gender: 'Female',
        engine: 'polly',
        language: 'pl-PL',
        ename: 'Ewa',
        ssml: true,
        name: 'AWS Polly - pl-PL - Female - Ewa',
    },
    'pl-PL_AP_Male_Jan': {
        gender: 'Male',
        engine: 'polly',
        language: 'pl-PL',
        ename: 'Jan',
        ssml: true,
        name: 'AWS Polly - pl-PL - Male - Jan',
    },
    'pl-PL_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'pl-PL',
        ename: 'Maja',
        ssml: true,
        name: 'AWS Polly - pl-PL - Female - Maja',
    },
    'pt-BR_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'pt-BR',
        ename: 'Vitoria',
        ssml: true,
        name: 'AWS Polly - pt-BR - Female - Vitoria',
    },
    'pt-BR_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'pt-BR',
        ename: 'Ricardo',
        ssml: true,
        name: 'AWS Polly - pt-BR - Male - Ricardo',
    },
    'pt-PT_AP_Male': {
        gender: 'Male',
        engine: 'polly',
        language: 'pt-PT',
        ename: 'Cristiano',
        ssml: true,
        name: 'AWS Polly - pt-PT - Male - Cristiano',
    },
    'pt-PT_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'pt-PT',
        ename: 'Ines',
        ssml: true,
        name: 'AWS Polly - pt-PT - Female - Ines',
    },
    'ro-RO_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'ro-RO',
        ename: 'Carmen',
        ssml: true,
        name: 'AWS Polly - ro-RO - Female - Carmen',
    },
    'sv-SE_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'sv-SE',
        ename: 'Astrid',
        ssml: true,
        name: 'AWS Polly - sv-SE - Female - Astrid',
    },
    'tr-TR_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'tr-TR',
        ename: 'Filiz',
        ssml: true,
        name: 'AWS Polly - tr-TR - Female - Filiz',
    },
    'ko-KR_AP_Female': {
        gender: 'Female',
        engine: 'polly',
        language: 'ko-KR',
        ename: 'Seoyeon',
        ssml: true,
        name: 'AWS Polly - ko-KR - Female - Seoyeon',
    },

    // Additional neural voices for English (US)
    'en-US_AP_Female_Joanna': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-US',
        ename: 'Joanna',
        ssml: true,
        name: 'AWS Polly - en-US - Female - Joanna',
        neural: true,
    },
    'en-US_AP_Male_Kevin': {
        gender: 'Male',
        engine: 'polly',
        language: 'en-US',
        ename: 'Kevin',
        ssml: true,
        name: 'AWS Polly - en-US - Male - Kevin',
        neural: true,
    },
    'en-US_AP_Male_Matthew': {
        gender: 'Male',
        engine: 'polly',
        language: 'en-US',
        ename: 'Matthew',
        ssml: true,
        name: 'AWS Polly - en-US - Male - Matthew',
        neural: true,
    },
    'en-US_AP_Female_Ruth': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-US',
        ename: 'Ruth',
        ssml: true,
        name: 'AWS Polly - en-US - Female - Ruth',
        neural: true,
    },
    'en-US_AP_Male_Stephen': {
        gender: 'Male',
        engine: 'polly',
        language: 'en-US',
        ename: 'Stephen',
        ssml: true,
        name: 'AWS Polly - en-US - Male - Stephen',
        neural: true,
    },

    // English regional variants
    'en-AU_AP_Female_Olivia': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-AU',
        ename: 'Olivia',
        ssml: true,
        name: 'AWS Polly - en-AU - Female - Olivia',
        neural: true,
    },
    'en-IE_AP_Female_Niamh': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-IE',
        ename: 'Niamh',
        ssml: true,
        name: 'AWS Polly - en-IE - Female - Niamh',
        neural: true,
    },
    'en-NZ_AP_Female_Aria': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-NZ',
        ename: 'Aria',
        ssml: true,
        name: 'AWS Polly - en-NZ - Female - Aria',
        neural: true,
    },
    'en-ZA_AP_Female_Ayanda': {
        gender: 'Female',
        engine: 'polly',
        language: 'en-ZA',
        ename: 'Ayanda',
        ssml: true,
        name: 'AWS Polly - en-ZA - Female - Ayanda',
        neural: true,
    },

    // French neural voices
    'fr-FR_AP_Female_Lea': {
        gender: 'Female',
        engine: 'polly',
        language: 'fr-FR',
        ename: 'Lea',
        ssml: true,
        name: 'AWS Polly - fr-FR - Female - Lea',
        neural: true,
    },
    'fr-FR_AP_Male_Remi': {
        gender: 'Male',
        engine: 'polly',
        language: 'fr-FR',
        ename: 'Remi',
        ssml: true,
        name: 'AWS Polly - fr-FR - Male - Remi',
        neural: true,
    },
    'fr-CA_AP_Female_Gabrielle': {
        gender: 'Female',
        engine: 'polly',
        language: 'fr-CA',
        ename: 'Gabrielle',
        ssml: true,
        name: 'AWS Polly - fr-CA - Female - Gabrielle',
        neural: true,
    },
    'fr-CA_AP_Male_Liam': {
        gender: 'Male',
        engine: 'polly',
        language: 'fr-CA',
        ename: 'Liam',
        ssml: true,
        name: 'AWS Polly - fr-CA - Male - Liam',
        neural: true,
    },
    'fr-BE_AP_Female_Isabelle': {
        gender: 'Female',
        engine: 'polly',
        language: 'fr-BE',
        ename: 'Isabelle',
        ssml: true,
        name: 'AWS Polly - fr-BE - Female - Isabelle',
        neural: true,
    },

    // Spanish neural voices
    'es-ES_AP_Female_Lucia': {
        gender: 'Female',
        engine: 'polly',
        language: 'es-ES',
        ename: 'Lucia',
        ssml: true,
        name: 'AWS Polly - es-ES - Female - Lucia',
        neural: true,
    },
    'es-ES_AP_Male_Sergio': {
        gender: 'Male',
        engine: 'polly',
        language: 'es-ES',
        ename: 'Sergio',
        ssml: true,
        name: 'AWS Polly - es-ES - Male - Sergio',
        neural: true,
    },
    'es-US_AP_Female_Lupe': {
        gender: 'Female',
        engine: 'polly',
        language: 'es-US',
        ename: 'Lupe',
        ssml: true,
        name: 'AWS Polly - es-US - Female - Lupe',
        neural: true,
    },
    'es-MX_AP_Male_Andres': {
        gender: 'Male',
        engine: 'polly',
        language: 'es-MX',
        ename: 'Andres',
        ssml: true,
        name: 'AWS Polly - es-MX - Male - Andres',
        neural: true,
    },
    'es-MX_AP_Female_Mia': {
        gender: 'Female',
        engine: 'polly',
        language: 'es-MX',
        ename: 'Mia',
        ssml: true,
        name: 'AWS Polly - es-MX - Female - Mia',
        neural: true,
    },

    // Italian voices
    'it-IT_AP_Female_Bianca': {
        gender: 'Female',
        engine: 'polly',
        language: 'it-IT',
        ename: 'Bianca',
        ssml: true,
        name: 'AWS Polly - it-IT - Female - Bianca',
    },
    'it-IT_AP_Male_Adriano': {
        gender: 'Male',
        engine: 'polly',
        language: 'it-IT',
        ename: 'Adriano',
        ssml: true,
        name: 'AWS Polly - it-IT - Male - Adriano',
        neural: true,
    },

    // Portuguese neural voices
    'pt-BR_AP_Female_Camila': {
        gender: 'Female',
        engine: 'polly',
        language: 'pt-BR',
        ename: 'Camila',
        ssml: true,
        name: 'AWS Polly - pt-BR - Female - Camila',
        neural: true,
    },
    'pt-BR_AP_Male_Thiago': {
        gender: 'Male',
        engine: 'polly',
        language: 'pt-BR',
        ename: 'Thiago',
        ssml: true,
        name: 'AWS Polly - pt-BR - Male - Thiago',
        neural: true,
    },

    // Dutch Belgian voice
    'nl-BE_AP_Female_Lisa': {
        gender: 'Female',
        engine: 'polly',
        language: 'nl-BE',
        ename: 'Lisa',
        ssml: true,
        name: 'AWS Polly - nl-BE - Female - Lisa',
        neural: true,
    },

    // Polish neural voice
    'pl-PL_AP_Female_Ola': {
        gender: 'Female',
        engine: 'polly',
        language: 'pl-PL',
        ename: 'Ola',
        ssml: true,
        name: 'AWS Polly - pl-PL - Female - Ola',
        neural: true,
    },

    // Danish neural voice
    'da-DK_AP_Female_Sofie': {
        gender: 'Female',
        engine: 'polly',
        language: 'da-DK',
        ename: 'Sofie',
        ssml: true,
        name: 'AWS Polly - da-DK - Female - Sofie',
        neural: true,
    },

    // Swedish neural voice
    'sv-SE_AP_Female_Elin': {
        gender: 'Female',
        engine: 'polly',
        language: 'sv-SE',
        ename: 'Elin',
        ssml: true,
        name: 'AWS Polly - sv-SE - Female - Elin',
        neural: true,
    },

    // Asian language voices
    'ja-JP_AP_Female_Mizuki': {
        gender: 'Female',
        engine: 'polly',
        language: 'ja-JP',
        ename: 'Mizuki',
        ssml: true,
        name: 'AWS Polly - ja-JP - Female - Mizuki',
    },
    'ja-JP_AP_Male_Takumi': {
        gender: 'Male',
        engine: 'polly',
        language: 'ja-JP',
        ename: 'Takumi',
        ssml: true,
        name: 'AWS Polly - ja-JP - Male - Takumi',
    },
    'ja-JP_AP_Female_Tomoko': {
        gender: 'Female',
        engine: 'polly',
        language: 'ja-JP',
        ename: 'Tomoko',
        ssml: true,
        name: 'AWS Polly - ja-JP - Female - Tomoko',
        neural: true,
    },
    'ja-JP_AP_Female_Kazuha': {
        gender: 'Female',
        engine: 'polly',
        language: 'ja-JP',
        ename: 'Kazuha',
        ssml: true,
        name: 'AWS Polly - ja-JP - Female - Kazuha',
        neural: true,
    },
    'zh-CN_AP_Female_Zhiyu': {
        gender: 'Female',
        engine: 'polly',
        language: 'zh-CN',
        ename: 'Zhiyu',
        ssml: true,
        name: 'AWS Polly - zh-CN - Female - Zhiyu',
    },
    'hi-IN_AP_Female_Aditi': {
        gender: 'Female',
        engine: 'polly',
        language: 'hi-IN',
        ename: 'Aditi',
        ssml: true,
        name: 'AWS Polly - hi-IN - Female - Aditi',
    },
    'hi-IN_AP_Female_Kajal': {
        gender: 'Female',
        engine: 'polly',
        language: 'hi-IN',
        ename: 'Kajal',
        ssml: true,
        name: 'AWS Polly - hi-IN - Female - Kajal',
        neural: true,
    },

    // Arabic voices
    'ar-XL_AP_Male_Zayd': {
        gender: 'Male',
        engine: 'polly',
        language: 'ar-XL',
        ename: 'Zayd',
        ssml: true,
        name: 'AWS Polly - ar-XL - Male - Zayd',
        neural: true,
    },
    'ar-XL_AP_Female_Hala': {
        gender: 'Female',
        engine: 'polly',
        language: 'ar-XL',
        ename: 'Hala',
        ssml: true,
        name: 'AWS Polly - ar-XL - Female - Hala',
        neural: true,
    },

    // Additional European language voices
    'ca-ES_AP_Female_Arlet': {
        gender: 'Female',
        engine: 'polly',
        language: 'ca-ES',
        ename: 'Arlet',
        ssml: true,
        name: 'AWS Polly - ca-ES - Female - Arlet',
        neural: true,
    },
    'sk-SK_AP_Female_Laura': {
        gender: 'Female',
        engine: 'polly',
        language: 'sk-SK',
        ename: 'Laura',
        ssml: true,
        name: 'AWS Polly - sk-SK - Female - Laura',
        neural: true,
    },
    'fi-FI_AP_Female_Suvi': {
        gender: 'Female',
        engine: 'polly',
        language: 'fi-FI',
        ename: 'Suvi',
        ssml: true,
        name: 'AWS Polly - fi-FI - Female - Suvi',
        neural: true,
    },
};

// Blockly.Sendto is global variable and defined in javascript/admin/google-blockly/own/blocks_sendto.js

Blockly.Sendto.blocks['sayit'] =
    '<block type="sayit">'
    + '     <value name="INSTANCE">'
    + '     </value>'
    + '     <value name="LANGUAGE">'
    + '     </value>'
    + '     <value name="VOLUME">'
    + '     </value>'
    + '     <value name="MESSAGE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">text</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="LOG">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['sayit'] = {
    init: function() {
        const options = [];
        if (typeof main !== 'undefined' && main.instances) {
            for (let i = 0; i < main.instances.length; i++) {
                const m = main.instances[i].match(/^system.adapter.sayit.(\d+)$/);
                if (m) {
                    const n = parseInt(m[1], 10);
                    options.push(['sayit.' + n, '.' + n]);
                }
            }
        }

        if (!options.length) {
            for (let k = 0; k <= 4; k++) {
                options.push(['sayit.' + k, '.' + k]);
            }
        }
        options.unshift([Blockly.Translate('sayit_anyInstance'), '']);

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('sayit'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        const languages = [[Blockly.Translate('sayit_configured'), '']];
        for (const l in sayitEngines) {
            if (sayitEngines.hasOwnProperty(l)) languages.push([sayitEngines[l].name, l]);
        }

        this.appendDummyInput('LANGUAGE')
            .appendField(new Blockly.FieldDropdown(languages), 'LANGUAGE');

        const input = this.appendValueInput('VOLUME')
            .setCheck('Number')
            .appendField(Blockly.Translate('sayit_volume'));
        if (input.connection) input.connection._optional = true;

        this.appendValueInput('MESSAGE')
            .appendField(Blockly.Translate('sayit_message'));

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('sayit_log'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('sayit_log_none'),  ''],
                [Blockly.Translate('sayit_log_info'),  'log'],
                [Blockly.Translate('sayit_log_debug'), 'debug'],
                [Blockly.Translate('sayit_log_warn'),  'warn'],
                [Blockly.Translate('sayit_log_error'), 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('sayit_tooltip'));
        this.setHelpUrl(Blockly.Translate('sayit_help'));
    }
};

Blockly.JavaScript['sayit'] = function(block) {
    const language = block.getFieldValue('LANGUAGE');
    const text = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    const volume = Blockly.JavaScript.valueToCode(block, 'VOLUME', Blockly.JavaScript.ORDER_ATOMIC);
    const logLevel = block.getFieldValue('LOG');

    let logText = '';
    if (logLevel) {
        logText = '\nconsole.' + logLevel + '("Executed sayit' + block.getFieldValue('INSTANCE') + ': ' + (volume ? '[Volume - ' + volume + ']' : '') + ': " + ' + text + ');\n';
    }

    const objText = [];
    language && objText.push('language: "' + language + '"');
    text && objText.push('text: ' + text);
    volume && objText.push('volume: ' + volume);

    return 'sendTo("sayit' + block.getFieldValue('INSTANCE') + '", "say", { ' + objText.join(', ') + ' });' + logText;
};