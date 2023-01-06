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
    'en':                           {name: 'Google - English',                          engine: 'google'},
    'de':                           {name: 'Google - Deutsch',                          engine: 'google'},
    'pl':                           {name: 'Google - Polski',                           engine: 'google'},
    'uk':                           {name: 'Google - Ukrainian',                        engine: 'google'},
    'ru':                           {name: 'Google - Русский',                          engine: 'google'},
    'it':                           {name: 'Google - Italiano',                         engine: 'google'},
    'pt':                           {name: 'Google - Português',                        engine: 'google'},
    'es':                           {name: 'Google - Espaniol',                         engine: 'google'},
    'fr':                           {name: 'Google - Français',                         engine: 'google'},
    'nl':                           {name: 'Google - Nederlands',                       engine: 'google'},
    'zh-CN':                        {name: 'Google - 简体中文',                          engine: 'google'},

    'no':                           {name: 'Google - Norwegian',                        engine: 'google'},

    'ru_YA':                        {name: 'Yandex - Русский',                          engine: 'yandex'},
    'ru_YA_CLOUD':                  {name: 'Yandex Cloud - Русский',                    engine: 'yandexCloud'},

    'en-US':                        {name: 'PicoTTS - Englisch US',                     engine: 'PicoTTS'},
    'en-GB':                        {name: 'PicoTTS - Englisch GB',                     engine: 'PicoTTS'},
    'de-DE':                        {name: 'PicoTTS - Deutsch',                         engine: 'PicoTTS'},
    'it-IT':                        {name: 'PicoTTS - Italiano',                        engine: 'PicoTTS'},
    'es-ES':                        {name: 'PicoTTS - Espaniol',                        engine: 'PicoTTS'},
    'fr-FR':                        {name: 'PicoTTS - Français',                        engine: 'PicoTTS'},

    'ru-RU_CLOUD_Female':           {name: 'Cloud - Русский - Татьяна',                 engine: 'cloud',        gender: 'Female', language: 'ru-RU',      ename: 'Tatyana',    ssml: true},
    'ru-RU_CLOUD_Male':             {name: 'Cloud - Русский - Максим',                  engine: 'cloud',        gender: 'Male',   language: 'ru-RU',      ename: 'Maxim',      ssml: true},
    'de-DE_CLOUD_Female':           {name: 'Cloud - Deutsch - Marlene',                 engine: 'cloud',        gender: 'Female', language: 'de-DE',      ename: 'Marlene',    ssml: true},
    'de-DE_CLOUD_Male':             {name: 'Cloud - Deutsch - Hans',                    engine: 'cloud',        gender: 'Male',   language: 'de-DE',      ename: 'Hans',       ssml: true},
    'de-DE_CLOUD_Female_Vicki':     {name: 'Cloud - Deutsch - Vicki',                   engine: 'cloud',        gender: 'Female', language: 'de-DE',      ename: 'Vicki',      ssml: true},
    'en-US_CLOUD_Female':           {name: 'Cloud - en-US - Female - Salli',            engine: 'cloud',        gender: 'Female', language: 'en-US',      ename: 'Salli',      ssml: true},
    'en-US_CLOUD_Male':             {name: 'Cloud - en-US - Male - Joey',               engine: 'cloud',        gender: 'Male',   language: 'en-US',      ename: 'Joey',       ssml: true},
    'da-DK_CLOUD_Female':           {name: 'Cloud - da-DK - Female - Naja',             engine: 'cloud',        gender: 'Female', language: 'da-DK',      ename: 'Naja',       ssml: true},
    'da-DK_CLOUD_Male':             {name: 'Cloud - da-DK - Male - Mads',               engine: 'cloud',        gender: 'Male',   language: 'da-DK',      ename: 'Mads',       ssml: true},
    'en-AU_CLOUD_Female':           {name: 'Cloud - en-AU - Female - Nicole',           engine: 'cloud',        gender: 'Female', language: 'en-AU',      ename: 'Nicole',     ssml: true},
    'en-AU_CLOUD_Male':             {name: 'Cloud - en-AU - Male - Russell',            engine: 'cloud',        gender: 'Male',   language: 'en-AU',      ename: 'Russell',    ssml: true},
    'en-GB_CLOUD_Female_Amy':       {name: 'Cloud - en-GB - Female - Amy',              engine: 'cloud',        gender: 'Female', language: 'en-GB',      ename: 'Amy',        ssml: true},
    'en-GB_CLOUD_Male':             {name: 'Cloud - en-GB - Male - Brian',              engine: 'cloud',        gender: 'Male',   language: 'en-GB',      ename: 'Brian',      ssml: true},
    'en-GB_CLOUD_Female_Emma':      {name: 'Cloud - en-GB - Female - Emma',             engine: 'cloud',        gender: 'Female', language: 'en-GB',      ename: 'Emma',       ssml: true},
    'en-GB-WLS_CLOUD_Female':       {name: 'Cloud - en-GB-WLS - Female - Gwyneth',      engine: 'cloud',        gender: 'Female', language: 'en-GB-WLS',  ename: 'Gwyneth',    ssml: true},
    'en-GB-WLS_CLOUD_Male':         {name: 'Cloud - en-GB-WLS - Male - Geraint',        engine: 'cloud',        gender: 'Male',   language: 'en-GB-WLS',  ename: 'Geraint',    ssml: true},
    'cy-GB_CLOUD_Female':           {name: 'Cloud - cy-GB - Female - Gwyneth',          engine: 'cloud',        gender: 'Female', language: 'cy-GB',      ename: 'Gwyneth',    ssml: true},
    'cy-GB_CLOUD_Male':             {name: 'Cloud - cy-GB - Male - Geraint',            engine: 'cloud',        gender: 'Male',   language: 'cy-GB',      ename: 'Geraint',    ssml: true},
    'en-IN_CLOUD_Female':           {name: 'Cloud - en-IN - Female - Raveena',          engine: 'cloud',        gender: 'Female', language: 'en-IN',      ename: 'Raveena',    ssml: true},
    'en-US_CLOUD_Male_Chipmunk':    {name: 'Cloud - en-US - Male - Chipmunk',           engine: 'cloud',        gender: 'Male',   language: 'en-US',      ename: 'Chipmunk',   ssml: true},
    'en-US_CLOUD_Male_Eric':        {name: 'Cloud - en-US - Male - Eric',               engine: 'cloud',        gender: 'Male',   language: 'en-US',      ename: 'Eric',       ssml: true},
    'en-US_CLOUD_Female_Ivy':       {name: 'Cloud - en-US - Female - Ivy',              engine: 'cloud',        gender: 'Female', language: 'en-US',      ename: 'Ivy',        ssml: true},
    'en-US_CLOUD_Female_Jennifer':  {name: 'Cloud - en-US - Female - Jennifer',         engine: 'cloud',        gender: 'Female', language: 'en-US',      ename: 'Jennifer',   ssml: true},
    'en-US_CLOUD_Male_Justin':      {name: 'Cloud - en-US - Male - Justin',             engine: 'cloud',        gender: 'Male',   language: 'en-US',      ename: 'Justin',     ssml: true},
    'en-US_CLOUD_Female_Kendra':    {name: 'Cloud - en-US - Female - Kendra',           engine: 'cloud',        gender: 'Female', language: 'en-US',      ename: 'Kendra',     ssml: true},
    'en-US_CLOUD_Female_Kimberly':  {name: 'Cloud - en-US - Female - Kimberly',         engine: 'cloud',        gender: 'Female', language: 'en-US',      ename: 'Kimberly',   ssml: true},
    'es-ES_CLOUD_Female':           {name: 'Cloud - es-ES - Female - Conchita',         engine: 'cloud',        gender: 'Female', language: 'es-ES',      ename: 'Conchita',   ssml: true},
    'es-ES_CLOUD_Male':             {name: 'Cloud - es-ES - Male - Enrique',            engine: 'cloud',        gender: 'Male',   language: 'es-ES',      ename: 'Enrique',    ssml: true},
    'es-US_CLOUD_Female':           {name: 'Cloud - es-US - Female - Penelope',         engine: 'cloud',        gender: 'Female', language: 'es-US',      ename: 'Penelope',   ssml: true},
    'es-US_CLOUD_Male':             {name: 'Cloud - es-US - Male - Miguel',             engine: 'cloud',        gender: 'Male',   language: 'es-US',      ename: 'Miguel',     ssml: true},
    'fr-CA_CLOUD_Female':           {name: 'Cloud - fr-CA - Female - Chantal',          engine: 'cloud',        gender: 'Female', language: 'fr-CA',      ename: 'Chantal',    ssml: true},
    'fr-FR_CLOUD_Female':           {name: 'Cloud - fr-FR - Female - Celine',           engine: 'cloud',        gender: 'Female', language: 'fr-FR',      ename: 'Celine',     ssml: true},
    'fr-FR_CLOUD_Male':             {name: 'Cloud - fr-FR - Male - Mathieu',            engine: 'cloud',        gender: 'Male',   language: 'fr-FR',      ename: 'Mathieu',    ssml: true},
    'is-IS_CLOUD_Female':           {name: 'Cloud - is-IS - Female - Dora',             engine: 'cloud',        gender: 'Female', language: 'is-IS',      ename: 'Dora',       ssml: true},
    'is-IS_CLOUD_Male':             {name: 'Cloud - is-IS - Male - Karl',               engine: 'cloud',        gender: 'Male',   language: 'is-IS',      ename: 'Karl',       ssml: true},
    'it-IT_CLOUD_Female':           {name: 'Cloud - it-IT - Female - Carla',            engine: 'cloud',        gender: 'Female', language: 'it-IT',      ename: 'Carla',      ssml: true},
    'it-IT_CLOUD_Male':             {name: 'Cloud - it-IT - Male - Giorgio',            engine: 'cloud',        gender: 'Male',   language: 'it-IT',      ename: 'Giorgio',    ssml: true},
    'nb-NO_CLOUD_Female':           {name: 'Cloud - nb-NO - Female - Liv',              engine: 'cloud',        gender: 'Female', language: 'nb-NO',      ename: 'Liv',        ssml: true},
    'nl-NL_CLOUD_Female':           {name: 'Cloud - nl-NL - Female - Lotte',            engine: 'cloud',        gender: 'Female', language: 'nl-NL',      ename: 'Lotte',      ssml: true},
    'nl-NL_CLOUD_Male':             {name: 'Cloud - nl-NL - Male - Ruben',              engine: 'cloud',        gender: 'Male',   language: 'nl-NL',      ename: 'Ruben',      ssml: true},
    'pl-PL_CLOUD_Female_Agnieszka': {name: 'Cloud - pl-PL - Female - Agnieszka',        engine: 'cloud',        gender: 'Female', language: 'pl-PL',      ename: 'Agnieszka',  ssml: true},
    'pl-PL_CLOUD_Male_Jacek':       {name: 'Cloud - pl-PL - Male - Jacek',              engine: 'cloud',        gender: 'Male',   language: 'pl-PL',      ename: 'Jacek',      ssml: true},
    'pl-PL_CLOUD_Female_Ewa':       {name: 'Cloud - pl-PL - Female - Ewa',              engine: 'cloud',        gender: 'Female', language: 'pl-PL',      ename: 'Ewa',        ssml: true},
    'pl-PL_CLOUD_Male_Jan':         {name: 'Cloud - pl-PL - Male - Jan',                engine: 'cloud',        gender: 'Male',   language: 'pl-PL',      ename: 'Jan',        ssml: true},
    'pl-PL_CLOUD_Female':           {name: 'Cloud - pl-PL - Female - Maja',             engine: 'cloud',        gender: 'Female', language: 'pl-PL',      ename: 'Maja',       ssml: true},
    'pt-BR_CLOUD_Female':           {name: 'Cloud - pt-BR - Female - Vitoria',          engine: 'cloud',        gender: 'Female', language: 'pt-BR',      ename: 'Vitoria',    ssml: true},
    'pt-BR_CLOUD_Male':             {name: 'Cloud - pt-BR - Male - Ricardo',            engine: 'cloud',        gender: 'Male',   language: 'pt-BR',      ename: 'Ricardo',    ssml: true},
    'pt-BR_CLOUD_Female_Camila':    {name: 'Cloud - pt-BR - Female - Camila',           engine: 'cloud',        gender: 'Female', language: 'pt-BR',      ename: 'Camila',     ssml: true},
    'pt-PT_CLOUD_Male':             {name: 'Cloud - pt-PT - Male - Cristiano',          engine: 'cloud',        gender: 'Male',   language: 'pt-PT',      ename: 'Cristiano',  ssml: true},
    'pt-PT_CLOUD_Female':           {name: 'Cloud - pt-PT - Female - Ines',             engine: 'cloud',        gender: 'Female', language: 'pt-PT',      ename: 'Ines',       ssml: true},
    'ro-RO_CLOUD_Female':           {name: 'Cloud - ro-RO - Female - Carmen',           engine: 'cloud',        gender: 'Female', language: 'ro-RO',      ename: 'Carmen',     ssml: true},
    'sv-SE_CLOUD_Female':           {name: 'Cloud - sv-SE - Female - Astrid',           engine: 'cloud',        gender: 'Female', language: 'sv-SE',      ename: 'Astrid',     ssml: true},
    'tr-TR_CLOUD_Female':           {name: 'Cloud - tr-TR - Female - Filiz',            engine: 'cloud',        gender: 'Female', language: 'tr-TR',      ename: 'Filiz',      ssml: true},
    'ko-KR_CLOUD_Female':           {name: 'Cloud - ko-KR - Female - Seoyeon',          engine: 'cloud',        gender: 'Female', language: 'ko-KR',      ename: 'Seoyeon',    ssml: true},

    'ru-RU_AP_Female':              {name: 'AWS Polly - Русский - Татьяна',             engine: 'polly',        gender: 'Female', language: 'ru-RU',      ename: 'Tatyana',    ssml: true},
    'ru-RU_AP_Male':                {name: 'AWS Polly - Русский - Максим',              engine: 'polly',        gender: 'Male',   language: 'ru-RU',      ename: 'Maxim',      ssml: true},
    'de-DE_AP_Female':              {name: 'AWS Polly - Deutsch - Marlene',             engine: 'polly',        gender: 'Female', language: 'de-DE',      ename: 'Marlene',    ssml: true},
    'de-DE_AP_Female_Vicki':        {name: 'AWS Polly - Deutsch - Vicki',               engine: 'polly',        gender: 'Female', language: 'de-DE',      ename: 'Vicki',      ssml: true},
    'de-DE_AP_Male':                {name: 'AWS Polly - Deutsch - Hans',                engine: 'polly',        gender: 'Male',   language: 'de-DE',      ename: 'Hans',       ssml: true},
    'en-US_AP_Female':              {name: 'AWS Polly - en-US - Female - Salli',        engine: 'polly',        gender: 'Female', language: 'en-US',      ename: 'Salli',      ssml: true},
    'en-US_AP_Male':                {name: 'AWS Polly - en-US - Male - Joey',           engine: 'polly',        gender: 'Male',   language: 'en-US',      ename: 'Joey',       ssml: true},
    'da-DK_AP_Female':              {name: 'AWS Polly - da-DK - Female - Naja',         engine: 'polly',        gender: 'Female', language: 'da-DK',      ename: 'Naja',       ssml: true},
    'da-DK_AP_Male':                {name: 'AWS Polly - da-DK - Male - Mads',           engine: 'polly',        gender: 'Male',   language: 'da-DK',      ename: 'Mads',       ssml: true},
    'en-AU_AP_Female':              {name: 'AWS Polly - en-AU - Female - Nicole',       engine: 'polly',        gender: 'Female', language: 'en-AU',      ename: 'Nicole',     ssml: true},
    'en-AU_AP_Male':                {name: 'AWS Polly - en-AU - Male - Russell',        engine: 'polly',        gender: 'Male',   language: 'en-AU',      ename: 'Russell',    ssml: true},
    'en-GB_AP_Female_Amy':          {name: 'AWS Polly - en-GB - Female - Amy',          engine: 'polly',        gender: 'Female', language: 'en-GB',      ename: 'Amy',        ssml: true},
    'en-GB_AP_Male':                {name: 'AWS Polly - en-GB - Male - Brian',          engine: 'polly',        gender: 'Male',   language: 'en-GB',      ename: 'Brian',      ssml: true},
    'en-GB_AP_Female_Emma':         {name: 'AWS Polly - en-GB - Female - Emma',         engine: 'polly',        gender: 'Female', language: 'en-GB',      ename: 'Emma',       ssml: true},
    'en-GB-WLS_AP_Female':          {name: 'AWS Polly - en-GB-WLS - Female - Gwyneth',  engine: 'polly',        gender: 'Female', language: 'en-GB-WLS',  ename: 'Gwyneth',    ssml: true},
    'en-GB-WLS_AP_Male':            {name: 'AWS Polly - en-GB-WLS - Male - Geraint',    engine: 'polly',        gender: 'Male',   language: 'en-GB-WLS',  ename: 'Geraint',    ssml: true},
    'cy-GB_AP_Female':              {name: 'AWS Polly - cy-GB - Female - Gwyneth',      engine: 'polly',        gender: 'Female', language: 'cy-GB',      ename: 'Gwyneth',    ssml: true},
    'cy-GB_AP_Male':                {name: 'AWS Polly - cy-GB - Male - Geraint',        engine: 'polly',        gender: 'Male',   language: 'cy-GB',      ename: 'Geraint',    ssml: true},
    'en-IN_AP_Female':              {name: 'AWS Polly - en-IN - Female - Raveena',      engine: 'polly',        gender: 'Female', language: 'en-IN',      ename: 'Raveena',    ssml: true},
    'en-US_AP_Male_Chipmunk':       {name: 'AWS Polly - en-US - Male - Chipmunk',       engine: 'polly',        gender: 'Male',   language: 'en-US',      ename: 'Chipmunk',   ssml: true},
    'en-US_AP_Male_Eric':           {name: 'AWS Polly - en-US - Male - Eric',           engine: 'polly',        gender: 'Male',   language: 'en-US',      ename: 'Eric',       ssml: true},
    'en-US_AP_Female_Ivy':          {name: 'AWS Polly - en-US - Female - Ivy',          engine: 'polly',        gender: 'Female', language: 'en-US',      ename: 'Ivy',        ssml: true},
    'en-US_AP_Female_Jennifer':     {name: 'AWS Polly - en-US - Female - Jennifer',     engine: 'polly',        gender: 'Female', language: 'en-US',      ename: 'Jennifer',   ssml: true},
    'en-US_AP_Male_Justin':         {name: 'AWS Polly - en-US - Male - Justin',         engine: 'polly',        gender: 'Male',   language: 'en-US',      ename: 'Justin',     ssml: true},
    'en-US_AP_Female_Kendra':       {name: 'AWS Polly - en-US - Female - Kendra',       engine: 'polly',        gender: 'Female', language: 'en-US',      ename: 'Kendra',     ssml: true},
    'en-US_AP_Female_Kimberly':     {name: 'AWS Polly - en-US - Female - Kimberly',     engine: 'polly',        gender: 'Female', language: 'en-US',      ename: 'Kimberly',   ssml: true},
    'es-ES_AP_Female':              {name: 'AWS Polly - es-ES - Female - Conchita',     engine: 'polly',        gender: 'Female', language: 'es-ES',      ename: 'Conchita',   ssml: true},
    'es-ES_AP_Male':                {name: 'AWS Polly - es-ES - Male - Enrique',        engine: 'polly',        gender: 'Male',   language: 'es-ES',      ename: 'Enrique',    ssml: true},
    'es-US_AP_Female':              {name: 'AWS Polly - es-US - Female - Penelope',     engine: 'polly',        gender: 'Female', language: 'es-US',      ename: 'Penelope',   ssml: true},
    'es-US_AP_Male':                {name: 'AWS Polly - es-US - Male - Miguel',         engine: 'polly',        gender: 'Male',   language: 'es-US',      ename: 'Miguel',     ssml: true},
    'fr-CA_AP_Female':              {name: 'AWS Polly - fr-CA - Female - Chantal',      engine: 'polly',        gender: 'Female', language: 'fr-CA',      ename: 'Chantal',    ssml: true},
    'fr-FR_AP_Female':              {name: 'AWS Polly - fr-FR - Female - Celine',       engine: 'polly',        gender: 'Female', language: 'fr-FR',      ename: 'Celine',     ssml: true},
    'fr-FR_AP_Male':                {name: 'AWS Polly - fr-FR - Male - Mathieu',        engine: 'polly',        gender: 'Male',   language: 'fr-FR',      ename: 'Mathieu',    ssml: true},
    'is-IS_AP_Female':              {name: 'AWS Polly - is-IS - Female - Dora',         engine: 'polly',        gender: 'Female', language: 'is-IS',      ename: 'Dora',       ssml: true},
    'is-IS_AP_Male':                {name: 'AWS Polly - is-IS - Male - Karl',           engine: 'polly',        gender: 'Male',   language: 'is-IS',      ename: 'Karl',       ssml: true},
    'it-IT_AP_Female':              {name: 'AWS Polly - it-IT - Female - Carla',        engine: 'polly',        gender: 'Female', language: 'it-IT',      ename: 'Carla',      ssml: true},
    'it-IT_AP_Male':                {name: 'AWS Polly - it-IT - Male - Giorgio',        engine: 'polly',        gender: 'Male',   language: 'it-IT',      ename: 'Giorgio',    ssml: true},
    'nb-NO_AP_Female':              {name: 'AWS Polly - nb-NO - Female - Liv',          engine: 'polly',        gender: 'Female', language: 'nb-NO',      ename: 'Liv',        ssml: true},
    'nl-NL_AP_Female':              {name: 'AWS Polly - nl-NL - Female - Lotte',        engine: 'polly',        gender: 'Female', language: 'nl-NL',      ename: 'Lotte',      ssml: true},
    'nl-NL_AP_Male':                {name: 'AWS Polly - nl-NL - Male - Ruben',          engine: 'polly',        gender: 'Male',   language: 'nl-NL',      ename: 'Ruben',      ssml: true},
    'pl-PL_AP_Female_Agnieszka':    {name: 'AWS Polly - pl-PL - Female - Agnieszka',    engine: 'polly',        gender: 'Female', language: 'pl-PL',      ename: 'Agnieszka',  ssml: true},
    'pl-PL_AP_Male_Jacek':          {name: 'AWS Polly - pl-PL - Male - Jacek',          engine: 'polly',        gender: 'Male',   language: 'pl-PL',      ename: 'Jacek',      ssml: true},
    'pl-PL_AP_Female_Ewa':          {name: 'AWS Polly - pl-PL - Female - Ewa',          engine: 'polly',        gender: 'Female', language: 'pl-PL',      ename: 'Ewa',        ssml: true},
    'pl-PL_AP_Male_Jan':            {name: 'AWS Polly - pl-PL - Male - Jan',            engine: 'polly',        gender: 'Male',   language: 'pl-PL',      ename: 'Jan',        ssml: true},
    'pl-PL_AP_Female':              {name: 'AWS Polly - pl-PL - Female - Maja',         engine: 'polly',        gender: 'Female', language: 'pl-PL',      ename: 'Maja',       ssml: true},
    'pt-BR_AP_Female':              {name: 'AWS Polly - pt-BR - Female - Vitoria',      engine: 'polly',        gender: 'Female', language: 'pt-BR',      ename: 'Vitoria',    ssml: true},
    'pt-BR_AP_Male':                {name: 'AWS Polly - pt-BR - Male - Ricardo',        engine: 'polly',        gender: 'Male',   language: 'pt-BR',      ename: 'Ricardo',    ssml: true},
    'pt-PT_AP_Male':                {name: 'AWS Polly - pt-PT - Male - Cristiano',      engine: 'polly',        gender: 'Male',   language: 'pt-PT',      ename: 'Cristiano',  ssml: true},
    'pt-PT_AP_Female':              {name: 'AWS Polly - pt-PT - Female - Ines',         engine: 'polly',        gender: 'Female', language: 'pt-PT',      ename: 'Ines',       ssml: true},
    'ro-RO_AP_Female':              {name: 'AWS Polly - ro-RO - Female - Carmen',       engine: 'polly',        gender: 'Female', language: 'ro-RO',      ename: 'Carmen',     ssml: true},
    'sv-SE_AP_Female':              {name: 'AWS Polly - sv-SE - Female - Astrid',       engine: 'polly',        gender: 'Female', language: 'sv-SE',      ename: 'Astrid',     ssml: true},
    'tr-TR_AP_Female':              {name: 'AWS Polly - tr-TR - Female - Filiz',        engine: 'polly',        gender: 'Female', language: 'tr-TR',      ename: 'Filiz',      ssml: true},
    'ko-KR_AP_Female':              {name: 'AWS Polly - ko-KR - Female - Seoyeon',      engine: 'polly',        gender: 'Female', language: 'ko-KR',      ename: 'Seoyeon',    ssml: true}
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

        this.appendDummyInput('INSTANCE').appendField(Blockly.Translate('sayit')).appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

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
