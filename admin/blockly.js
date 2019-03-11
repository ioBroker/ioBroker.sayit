'use strict';

goog.provide('Blockly.JavaScript.Sendto');

goog.require('Blockly.JavaScript');

// --- SayIt --------------------------------------------------
Blockly.Words['sayit']               = {'en': 'say text',                    'de': 'aussprechen',                        'ru': 'произнести'};
Blockly.Words['sayit_message']       = {'en': 'message',                     'de': 'Meldung',                            'ru': 'сообщение'};
Blockly.Words['sayit_volume']        = {'en': 'volume (optional)',           'de': 'Lautstärke (optional)',              'ru': 'громкость (не обяз.)'};
Blockly.Words['sayit_tooltip']       = {'en': 'Text to speech',              'de': 'Text zu Sprache',                    'ru': 'Произнести сообщение'};
Blockly.Words['sayit_help']          = {'en': 'https://github.com/ioBroker/ioBroker.sayit/blob/master/README.md', 'de': 'http://www.iobroker.net/?page_id=178&lang=de', 'ru': 'http://www.iobroker.net/?page_id=4262&lang=ru'};
Blockly.Words['sayit_configured']    = {'en': 'configured',                  'de': 'Standard',                           'ru': 'настроенный'};
Blockly.Words['sayit_everyInstance']   = {'en': 'every instance',               'pt': 'todas as instâncias',            'pl': 'wszystkie przypadki',                'nl': 'alle instanties',                'it': 'tutte le istanze',               'es': 'todas las instancias',           'fr': 'toutes les instances',               'de': 'Alle Instanzen',                     'ru': 'На все драйвера'};

Blockly.Words['sayit_log']           = {'en': 'log level',                   'de': 'Loglevel',                           'ru': 'Протокол'};
Blockly.Words['sayit_log_none']      = {'en': 'none',                        'de': 'keins',                              'ru': 'нет'};
Blockly.Words['sayit_log_info']      = {'en': 'info',                        'de': 'info',                               'ru': 'инфо'};
Blockly.Words['sayit_log_debug']     = {'en': 'debug',                       'de': 'debug',                              'ru': 'debug'};
Blockly.Words['sayit_log_warn']      = {'en': 'warning',                     'de': 'warning',                            'ru': 'warning'};
Blockly.Words['sayit_log_error']     = {'en': 'error',                       'de': 'error',                              'ru': 'ошибка'};


// this is copy of engines.js
var sayitEngines = {
    "en":       {name: "Google - English",         engine: "google",  params: []},
    "de":       {name: "Google - Deutsch",         engine: "google",  params: []},
    "ru":       {name: "Google - Русский",         engine: "google",  params: []},
    "it":       {name: "Google - Italiano",        engine: "google",  params: []},
    "es":       {name: "Google - Espaniol",        engine: "google",  params: []},
    "fr":       {name: "Google - Français",        engine: "google",  params: []},
    "ru_YA":    {name: "Yandex - Русский",         engine: "yandex",  params: ['key', 'voice', 'emotion', 'ill', 'drunk', 'robot'], voice: ['jane', 'zahar'], emotion: ['none', 'good', 'neutral', 'evil', 'mixed']},
    "ru_YA_CLOUD":   {name: "Yandex Cloud - Русский",   engine: "yandexCloud",  params: ['key', 'folderID', 'voice', 'emotion'], voice: ['alyss', 'oksana', 'jane', 'zahar'], emotion: [ 'good', 'neutral', 'evil']},

    "en-US":    {name: "PicoTTS - Englisch US",    engine: "PicoTTS", params: []},
    "en-GB":    {name: "PicoTTS - Englisch GB",    engine: "PicoTTS", params: []},
    "de-DE":    {name: "PicoTTS - Deutsch",        engine: "PicoTTS", params: []},
    "it-IT":    {name: "PicoTTS - Italiano",       engine: "PicoTTS", params: []},
    "es-ES":    {name: "PicoTTS - Espaniol",       engine: "PicoTTS", params: []},
    "fr-FR":    {name: "PicoTTS - Français",       engine: "PicoTTS", params: []},

    "ru-RU_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "ru-RU",      ename: "Tatyana",    ssml: true, name: "Cloud - Русский - Татьяна"},
    "ru-RU_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "ru-RU",      ename: "Maxim",      ssml: true, name: "Cloud - Русский - Максим"},
    "de-DE_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "de-DE",      ename: "Marlene",    ssml: true, name: "Cloud - Deutsch - Marlene"},
    "de-DE_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "de-DE",      ename: "Hans",       ssml: true, name: "Cloud - Deutsch - Hans"},
    "en-US_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-US",      ename: "Salli",      ssml: true, name: "Cloud - en-US - Female - Salli"},
    "en-US_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-US",      ename: "Joey",       ssml: true, name: "Cloud - en-US - Male - Joey"},
    "da-DK_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "da-DK",      ename: "Naja",       ssml: true, name: "Cloud - da-DK - Female - Naja"},
    "da-DK_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "da-DK",      ename: "Mads",       ssml: true, name: "Cloud - da-DK - Male - Mads"},
    "en-AU_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-AU",      ename: "Nicole",     ssml: true, name: "Cloud - en-AU - Female - Nicole"},
    "en-AU_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-AU",      ename: "Russell",    ssml: true, name: "Cloud - en-AU - Male - Russell"},
    "en-GB_CLOUD_Female_Amy":   {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-GB",      ename: "Amy",        ssml: true, name: "Cloud - en-GB - Female - Amy"},
    "en-GB_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-GB",      ename: "Brian",      ssml: true, name: "Cloud - en-GB - Male - Brian"},
    "en-GB_CLOUD_Female_Emma":  {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-GB",      ename: "Emma",       ssml: true, name: "Cloud - en-GB - Female - Emma"},
    "en-GB-WLS_CLOUD_Female":   {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-GB-WLS",  ename: "Gwyneth",    ssml: true, name: "Cloud - en-GB-WLS - Female - Gwyneth"},
    "en-GB-WLS_CLOUD_Male":     {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-GB-WLS",  ename: "Geraint",    ssml: true, name: "Cloud - en-GB-WLS - Male - Geraint"},
    "cy-GB_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "cy-GB",      ename: "Gwyneth",    ssml: true, name: "Cloud - cy-GB - Female - Gwyneth"},
    "cy-GB_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "cy-GB",      ename: "Geraint",    ssml: true, name: "Cloud - cy-GB - Male - Geraint"},
    "en-IN_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-IN",      ename: "Raveena",    ssml: true, name: "Cloud - en-IN - Female - Raveena"},
    "en-US_CLOUD_Male_Chipmunk":{gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-US",      ename: "Chipmunk",   ssml: true, name: "Cloud - en-US - Male - Chipmunk"},
    "en-US_CLOUD_Male_Eric":    {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-US",      ename: "Eric",       ssml: true, name: "Cloud - en-US - Male - Eric"},
    "en-US_CLOUD_Female_Ivy":   {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-US",      ename: "Ivy",        ssml: true, name: "Cloud - en-US - Female - Ivy"},
    "en-US_CLOUD_Female_Jennifer": {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-US",   ename: "Jennifer",   ssml: true, name: "Cloud - en-US - Female - Jennifer"},
    "en-US_CLOUD_Male_Justin":  {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-US",      ename: "Justin",     ssml: true, name: "Cloud - en-US - Male - Justin"},
    "en-US_CLOUD_Female_Kendra": {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-US",     ename: "Kendra",     ssml: true, name: "Cloud - en-US - Female - Kendra"},
    "en-US_CLOUD_Female_Kimberly": {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-US",   ename: "Kimberly",   ssml: true, name: "Cloud - en-US - Female - Kimberly"},
    "es-ES_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "es-ES",      ename: "Conchita",   ssml: true, name: "Cloud - es-ES - Female - Conchita"},
    "es-ES_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "es-ES",      ename: "Enrique",    ssml: true, name: "Cloud - es-ES - Male - Enrique"},
    "es-US_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "es-US",      ename: "Penelope",   ssml: true, name: "Cloud - es-US - Female - Penelope"},
    "es-US_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "es-US",      ename: "Miguel",     ssml: true, name: "Cloud - es-US - Male - Miguel"},
    "fr-CA_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "fr-CA",      ename: "Chantal",    ssml: true, name: "Cloud - fr-CA - Female - Chantal"},
    "fr-FR_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "fr-FR",      ename: "Celine",     ssml: true, name: "Cloud - fr-FR - Female - Celine"},
    "fr-FR_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "fr-FR",      ename: "Mathieu",    ssml: true, name: "Cloud - fr-FR - Male - Mathieu"},
    "is-IS_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "is-IS",      ename: "Dora",       ssml: true, name: "Cloud - is-IS - Female - Dora"},
    "is-IS_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "is-IS",      ename: "Karl",       ssml: true, name: "Cloud - is-IS - Male - Karl"},
    "it-IT_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "it-IT",      ename: "Carla",      ssml: true, name: "Cloud - it-IT - Female - Carla"},
    "it-IT_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "it-IT",      ename: "Giorgio",    ssml: true, name: "Cloud - it-IT - Male - Giorgio"},
    "nb-NO_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "nb-NO",      ename: "Liv",        ssml: true, name: "Cloud - nb-NO - Female - Liv"},
    "nl-NL_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "nl-NL",      ename: "Lotte",      ssml: true, name: "Cloud - nl-NL - Female - Lotte"},
    "nl-NL_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "nl-NL",      ename: "Ruben",      ssml: true, name: "Cloud - nl-NL - Male - Ruben"},
    "pl-PL_CLOUD_Female_Agnieszka":{gender: "Female", engine: "cloud",params: ['cloud'], language: "pl-PL",      ename: "Agnieszka",  ssml: true, name: "Cloud - pl-PL - Female - Agnieszka"},
    "pl-PL_CLOUD_Male_Jacek":   {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "pl-PL",      ename: "Jacek",      ssml: true, name: "Cloud - pl-PL - Male - Jacek"},
    "pl-PL_CLOUD_Female_Ewa":   {gender: "Female", engine: "cloud",   params: ['cloud'], language: "pl-PL",      ename: "Ewa",        ssml: true, name: "Cloud - pl-PL - Female - Ewa"},
    "pl-PL_CLOUD_Male_Jan":     {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "pl-PL",      ename: "Jan",        ssml: true, name: "Cloud - pl-PL - Male - Jan"},
    "pl-PL_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "pl-PL",      ename: "Maja",       ssml: true, name: "Cloud - pl-PL - Female - Maja"},
    "pt-BR_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "pt-BR",      ename: "Vitoria",    ssml: true, name: "Cloud - pt-BR - Female - Vitoria"},
    "pt-BR_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "pt-BR",      ename: "Ricardo",    ssml: true, name: "Cloud - pt-BR - Male - Ricardo"},
    "pt-PT_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "pt-PT",      ename: "Cristiano",  ssml: true, name: "Cloud - pt-PT - Male - Cristiano"},
    "pt-PT_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "pt-PT",      ename: "Ines",       ssml: true, name: "Cloud - pt-PT - Female - Ines"},
    "ro-RO_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "ro-RO",      ename: "Carmen",     ssml: true, name: "Cloud - ro-RO - Female - Carmen"},
    "sv-SE_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "sv-SE",      ename: "Astrid",     ssml: true, name: "Cloud - sv-SE - Female - Astrid"},
    "tr-TR_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "tr-TR",      ename: "Filiz",      ssml: true, name: "Cloud - tr-TR - Female - Filiz"},

    "ru-RU_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "ru-RU",      ename: "Tatyana",    ssml: true, name: "AWS Polly - Русский - Татьяна"},
    "ru-RU_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "ru-RU",      ename: "Maxim",      ssml: true, name: "AWS Polly - Русский - Максим"},
    "de-DE_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "de-DE",      ename: "Marlene",    ssml: true, name: "AWS Polly - Deutsch - Marlene"},
    "de-DE_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "de-DE",      ename: "Hans",       ssml: true, name: "AWS Polly - Deutsch - Hans"},
    "en-US_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Salli",      ssml: true, name: "AWS Polly - en-US - Female - Salli"},
    "en-US_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Joey",       ssml: true, name: "AWS Polly - en-US - Male - Joey"},
    "da-DK_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "da-DK",      ename: "Naja",       ssml: true, name: "AWS Polly - da-DK - Female - Naja"},
    "da-DK_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "da-DK",      ename: "Mads",       ssml: true, name: "AWS Polly - da-DK - Male - Mads"},
    "en-AU_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-AU",      ename: "Nicole",     ssml: true, name: "AWS Polly - en-AU - Female - Nicole"},
    "en-AU_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-AU",      ename: "Russell",    ssml: true, name: "AWS Polly - en-AU - Male - Russell"},
    "en-GB_AP_Female_Amy":      {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-GB",      ename: "Amy",        ssml: true, name: "AWS Polly - en-GB - Female - Amy"},
    "en-GB_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-GB",      ename: "Brian",      ssml: true, name: "AWS Polly - en-GB - Male - Brian"},
    "en-GB_AP_Female_Emma":     {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-GB",      ename: "Emma",       ssml: true, name: "AWS Polly - en-GB - Female - Emma"},
    "en-GB-WLS_AP_Female":      {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-GB-WLS",  ename: "Gwyneth",    ssml: true, name: "AWS Polly - en-GB-WLS - Female - Gwyneth"},
    "en-GB-WLS_AP_Male":        {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-GB-WLS",  ename: "Geraint",    ssml: true, name: "AWS Polly - en-GB-WLS - Male - Geraint"},
    "cy-GB_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "cy-GB",      ename: "Gwyneth",    ssml: true, name: "AWS Polly - cy-GB - Female - Gwyneth"},
    "cy-GB_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "cy-GB",      ename: "Geraint",    ssml: true, name: "AWS Polly - cy-GB - Male - Geraint"},
    "en-IN_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-IN",      ename: "Raveena",    ssml: true, name: "AWS Polly - en-IN - Female - Raveena"},
    "en-US_AP_Male_Chipmunk":   {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Chipmunk",   ssml: true, name: "AWS Polly - en-US - Male - Chipmunk"},
    "en-US_AP_Male_Eric":       {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Eric",       ssml: true, name: "AWS Polly - en-US - Male - Eric"},
    "en-US_AP_Female_Ivy":      {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Ivy",        ssml: true, name: "AWS Polly - en-US - Female - Ivy"},
    "en-US_AP_Female_Jennifer": {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Jennifer",   ssml: true, name: "AWS Polly - en-US - Female - Jennifer"},
    "en-US_AP_Male_Justin":     {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Justin",     ssml: true, name: "AWS Polly - en-US - Male - Justin"},
    "en-US_AP_Female_Kendra":   {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Kendra",     ssml: true, name: "AWS Polly - en-US - Female - Kendra"},
    "en-US_AP_Female_Kimberly": {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Kimberly",   ssml: true, name: "AWS Polly - en-US - Female - Kimberly"},
    "es-ES_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "es-ES",      ename: "Conchita",   ssml: true, name: "AWS Polly - es-ES - Female - Conchita"},
    "es-ES_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "es-ES",      ename: "Enrique",    ssml: true, name: "AWS Polly - es-ES - Male - Enrique"},
    "es-US_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "es-US",      ename: "Penelope",   ssml: true, name: "AWS Polly - es-US - Female - Penelope"},
    "es-US_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "es-US",      ename: "Miguel",     ssml: true, name: "AWS Polly - es-US - Male - Miguel"},
    "fr-CA_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "fr-CA",      ename: "Chantal",    ssml: true, name: "AWS Polly - fr-CA - Female - Chantal"},
    "fr-FR_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "fr-FR",      ename: "Celine",     ssml: true, name: "AWS Polly - fr-FR - Female - Celine"},
    "fr-FR_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "fr-FR",      ename: "Mathieu",    ssml: true, name: "AWS Polly - fr-FR - Male - Mathieu"},
    "is-IS_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "is-IS",      ename: "Dora",       ssml: true, name: "AWS Polly - is-IS - Female - Dora"},
    "is-IS_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "is-IS",      ename: "Karl",       ssml: true, name: "AWS Polly - is-IS - Male - Karl"},
    "it-IT_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "it-IT",      ename: "Carla",      ssml: true, name: "AWS Polly - it-IT - Female - Carla"},
    "it-IT_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "it-IT",      ename: "Giorgio",    ssml: true, name: "AWS Polly - it-IT - Male - Giorgio"},
    "nb-NO_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "nb-NO",      ename: "Liv",        ssml: true, name: "AWS Polly - nb-NO - Female - Liv"},
    "nl-NL_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "nl-NL",      ename: "Lotte",      ssml: true, name: "AWS Polly - nl-NL - Female - Lotte"},
    "nl-NL_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "nl-NL",      ename: "Ruben",      ssml: true, name: "AWS Polly - nl-NL - Male - Ruben"},
    "pl-PL_AP_Female_Agnieszka":{gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pl-PL",      ename: "Agnieszka",  ssml: true, name: "AWS Polly - pl-PL - Female - Agnieszka"},
    "pl-PL_AP_Male_Jacek":      {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pl-PL",      ename: "Jacek",      ssml: true, name: "AWS Polly - pl-PL - Male - Jacek"},
    "pl-PL_AP_Female_Ewa":      {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pl-PL",      ename: "Ewa",        ssml: true, name: "AWS Polly - pl-PL - Female - Ewa"},
    "pl-PL_AP_Male_Jan":        {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pl-PL",      ename: "Jan",        ssml: true, name: "AWS Polly - pl-PL - Male - Jan"},
    "pl-PL_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pl-PL",      ename: "Maja",       ssml: true, name: "AWS Polly - pl-PL - Female - Maja"},
    "pt-BR_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pt-BR",      ename: "Vitoria",    ssml: true, name: "AWS Polly - pt-BR - Female - Vitoria"},
    "pt-BR_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pt-BR",      ename: "Ricardo",    ssml: true, name: "AWS Polly - pt-BR - Male - Ricardo"},
    "pt-PT_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pt-PT",      ename: "Cristiano",  ssml: true, name: "AWS Polly - pt-PT - Male - Cristiano"},
    "pt-PT_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pt-PT",      ename: "Ines",       ssml: true, name: "AWS Polly - pt-PT - Female - Ines"},
    "ro-RO_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "ro-RO",      ename: "Carmen",     ssml: true, name: "AWS Polly - ro-RO - Female - Carmen"},
    "sv-SE_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "sv-SE",      ename: "Astrid",     ssml: true, name: "AWS Polly - sv-SE - Female - Astrid"},
    "tr-TR_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "tr-TR",      ename: "Filiz",      ssml: true, name: "AWS Polly - tr-TR - Female - Filiz"}
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
        var options = [[Blockly.Words['sayit_everyInstance'][systemLang], 'all']];
        if (typeof main !== 'undefined' && main.instances) {
            for (var i = 0; i < main.instances.length; i++) {
                var m = main.instances[i].match(/^system.adapter.sayit.(\d+)$/);
                if (m) {
                    var n = parseInt(m[1], 10);
                    options.push(['sayit.' + n, '.' + n]);
                }
            }
            if (options.length === 0) {
                for (var u = 0; u <= 4; u++) {
                    options.push(['sayit.' + u, '.' + u]);
                }
            }
        } else {
            for (var u = 0; u <= 4; u++) {
                options.push(['sayit.' + u, '.' + u]);
            }
        }

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Words['sayit'][systemLang])
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        var languages = [[Blockly.Words['sayit_configured'][systemLang], '']];
        for (var l in sayitEngines) {
            if (sayitEngines.hasOwnProperty(l)) languages.push([sayitEngines[l].name, l]);
        }

        this.appendDummyInput('LANGUAGE')
            .appendField(new Blockly.FieldDropdown(languages), 'LANGUAGE');

        var input = this.appendValueInput('VOLUME')
            .setCheck('Number')
            .appendField(Blockly.Words['sayit_volume'][systemLang]);
        if (input.connection) input.connection._optional = true;

        this.appendValueInput('MESSAGE')
            .appendField(Blockly.Words['sayit_message'][systemLang]);

        this.appendDummyInput('LOG')
            .appendField(Blockly.Words['sayit_log'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['sayit_log_none'][systemLang],  ''],
                [Blockly.Words['sayit_log_info'][systemLang],  'log'],
                [Blockly.Words['sayit_log_debug'][systemLang], 'debug'],
                [Blockly.Words['sayit_log_warn'][systemLang],  'warn'],
                [Blockly.Words['sayit_log_error'][systemLang], 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Words['sayit_tooltip'][systemLang]);
        this.setHelpUrl(Blockly.Words['sayit_help'][systemLang]);
    }
};

Blockly.JavaScript['sayit'] = function(block) {
    var dropdown_instance = block.getFieldValue('INSTANCE');
    var dropdown_language = block.getFieldValue('LANGUAGE');
    var value_message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    var value_volume  = Blockly.JavaScript.valueToCode(block, 'VOLUME', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("sayIt' + (dropdown_language ? '[' + dropdown_language + ']' : '') + (value_volume ? '[Volume - ' + value_volume + ']' : '') + ': " + ' + value_message + ');\n'
    } else {
        logText = '';
    }
    
    if(dropdown_instance == "all") {
        let output = "";
        for (var i = 0; i < main.instances.length; i++) {
            var m = main.instances[i].match(/^system.adapter.sayit.(\d+)$/);
            if (m) {
                var k = parseInt(m[1], 10);
                output = output + 'setState("sayit.' + k + '.tts.text", "' + (dropdown_language ? dropdown_language + ';' : '') + (value_volume !== null && value_volume !== '' ? value_volume + ';' : '') + '" + ' + value_message  + ');\n';
            }
        }
        return output;
    } else {
        

    return 'setState("sayit' + dropdown_instance + '.tts.text", "' + (dropdown_language ? dropdown_language + ';' : '') + (value_volume !== null && value_volume !== '' ? value_volume + ';' : '') + '" + ' + value_message  + ');\n' +
        logText;
    }
};
