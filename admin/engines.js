// DON'T Forget to update sayitEngines in blockly.js (if you change this table)

const sayitOptions = {
    'browser':    {name: 'Browser',           params: ['engine', 'cache', 'instance'],                       mp3Required: true,  checkLength: true,  func: (typeof sayItBrowser    !== 'undefined') ? sayItBrowser    : null, server: true,  libs: ['fs', 'crypto', 'http']},
    'mp24ftp':    {name: 'MediaPlayer24+FTP', params: ['engine', 'cache', 'server', 'port', 'user', 'pass'], mp3Required: true,  checkLength: true,  func: (typeof sayItMP24ftp    !== 'undefined') ? sayItMP24ftp    : null, server: false, libs: ['fs', 'crypto', 'http', 'jsftp']},
    'mp24':       {name: 'MediaPlayer24',     params: ['server'],                                            mp3Required: false, checkLength: true,  func: (typeof sayItMP24       !== 'undefined') ? sayItMP24       : null, server: false, libs: ['fs', 'crypto', 'http']},
    'system':     {name: 'System',            params: ['engine', 'cache'],                                   mp3Required: true,  checkLength: false, func: (typeof sayItSystem     !== 'undefined') ? sayItSystem     : null, server: false, libs: ['fs', 'crypto', 'http', 'child_process', 'os']},
    'windows':    {name: 'Windows default',   params: [],                                                    mp3Required: false, checkLength: true,  func: (typeof sayItWindows    !== 'undefined') ? sayItWindows    : null, server: false, libs: ['fs', 'child_process']},
    'sonos':      {name: 'Sonos',             params: ['engine', 'cache', 'device', 'web', 'webServer'],     mp3Required: true,  checkLength: true,  func: (typeof sayItSonos      !== 'undefined') ? sayItSonos      : null, server: true,  libs: ['fs', 'crypto', 'http']},
    'heos':       {name: 'Heos',              params: ['engine', 'cache', 'heos_device', 'web', 'webServer'],mp3Required: true,  checkLength: true,  func: (typeof sayItHeos       !== 'undefined') ? sayItHeos       : null, server: true,  libs: ['fs', 'crypto', 'http']},
    'chromecast': {name: 'Chromecast',        params: ['engine', 'cache', 'cDevice', 'web', 'webServer'],    mp3Required: true,  checkLength: true,  func: (typeof sayItChromecast !== 'undefined') ? sayItChromecast : null, server: true,  libs: ['fs', 'crypto', 'http']},
    'mpd':        {name: 'MPD',               params: ['engine', 'cache', 'mpd_device', 'web', 'webServer'], mp3Required: true,  checkLength: true,  func: (typeof sayItMpd        !== 'undefined') ? sayItMpd        : null, server: true,  libs: ['fs', 'crypto', 'http']},
    'googleHome': {name: 'Google Home',       params: ['engine', 'cache', 'server', 'web', 'webServer'],     mp3Required: true,  checkLength: true,  func: (typeof sayItGoogleHome !== 'undefined') ? sayItGoogleHome : null, server: true,  libs: ['fs', 'crypto', 'http', 'castv2-client']}
};

const sayitEngines = {
    'en':                           {name: 'Google - English',         engine: 'google',  params: []},
    'de':                           {name: 'Google - Deutsch',         engine: 'google',  params: []},
    'pl':                           {name: 'Google - Polski',          engine: 'google',  params: []},
    'uk':                           {name: 'Google - Ukrainian',       engine: 'google',  params: []},
    'ru':                           {name: 'Google - Русский',         engine: 'google',  params: []},
    'it':                           {name: 'Google - Italiano',        engine: 'google',  params: []},
    'pt':                           {name: 'Google - Português',       engine: 'google',  params: []},
    'es':                           {name: 'Google - Espaniol',        engine: 'google',  params: []},
    'fr':                           {name: 'Google - Français',        engine: 'google',  params: []},
    'nl':                           {name: 'Google - Nederlands',      engine: 'google',  params: []},
    'zh-CN':                        {name: 'Google - 简体中文',          engine: 'google',  params: []},

    'ru_YA':                        {name: 'Yandex - Русский',         engine: 'yandex',  params: ['key', 'voice', 'emotion', 'ill', 'drunk', 'robot'], voice: ['jane', 'zahar'], emotion: ['none', 'good', 'neutral', 'evil', 'mixed']},
    'ru_YA_CLOUD':                  {name: 'Yandex Cloud - Русский',   engine: 'yandexCloud',  params: ['key', 'folderID', 'voice', 'emotion'], voice: ['alyss', 'oksana', 'jane', 'zahar', 'nick', 'ermil', 'alena Premium', 'filipp Premium'], emotion: [ 'good', 'neutral', 'evil']},

    'ru-RU_CLOUD_Female':           {name: 'Cloud - Русский - Татьяна',             gender: 'Female', engine: 'cloud', language: 'ru-RU',      ename: 'Tatyana',    ssml: true },
    'ru-RU_CLOUD_Male':             {name: 'Cloud - Русский - Максим',              gender: 'Male',   engine: 'cloud', language: 'ru-RU',      ename: 'Maxim',      ssml: true },
    'de-DE_CLOUD_Female':           {name: 'Cloud - Deutsch - Marlene',             gender: 'Female', engine: 'cloud', language: 'de-DE',      ename: 'Marlene',    ssml: true },
    'de-DE_CLOUD_Male':             {name: 'Cloud - Deutsch - Hans',                gender: 'Male',   engine: 'cloud', language: 'de-DE',      ename: 'Hans',       ssml: true },
    'de-DE_CLOUD_Female_Vicki':     {name: 'Cloud - Deutsch - Vicki',               gender: 'Female', engine: 'cloud', language: 'de-DE',      ename: 'Vicki',      ssml: true },
    'en-US_CLOUD_Female':           {name: 'Cloud - en-US - Female - Salli',        gender: 'Female', engine: 'cloud', language: 'en-US',      ename: 'Salli',      ssml: true },
    'en-US_CLOUD_Male':             {name: 'Cloud - en-US - Male - Joey',           gender: 'Male',   engine: 'cloud', language: 'en-US',      ename: 'Joey',       ssml: true },
    'da-DK_CLOUD_Female':           {name: 'Cloud - da-DK - Female - Naja',         gender: 'Female', engine: 'cloud', language: 'da-DK',      ename: 'Naja',       ssml: true },
    'da-DK_CLOUD_Male':             {name: 'Cloud - da-DK - Male - Mads',           gender: 'Male',   engine: 'cloud', language: 'da-DK',      ename: 'Mads',       ssml: true },
    'en-AU_CLOUD_Female':           {name: 'Cloud - en-AU - Female - Nicole',       gender: 'Female', engine: 'cloud', language: 'en-AU',      ename: 'Nicole',     ssml: true },
    'en-AU_CLOUD_Male':             {name: 'Cloud - en-AU - Male - Russell',        gender: 'Male',   engine: 'cloud', language: 'en-AU',      ename: 'Russell',    ssml: true },
    'en-GB_CLOUD_Female_Amy':       {name: 'Cloud - en-GB - Female - Amy',          gender: 'Female', engine: 'cloud', language: 'en-GB',      ename: 'Amy',        ssml: true },
    'en-GB_CLOUD_Male':             {name: 'Cloud - en-GB - Male - Brian',          gender: 'Male',   engine: 'cloud', language: 'en-GB',      ename: 'Brian',      ssml: true },
    'en-GB_CLOUD_Female_Emma':      {name: 'Cloud - en-GB - Female - Emma',         gender: 'Female', engine: 'cloud', language: 'en-GB',      ename: 'Emma',       ssml: true },
    'en-GB-WLS_CLOUD_Female':       {name: 'Cloud - en-GB-WLS - Female - Gwyneth',  gender: 'Female', engine: 'cloud', language: 'en-GB-WLS',  ename: 'Gwyneth',    ssml: true },
    'en-GB-WLS_CLOUD_Male':         {name: 'Cloud - en-GB-WLS - Male - Geraint',    gender: 'Male',   engine: 'cloud', language: 'en-GB-WLS',  ename: 'Geraint',    ssml: true },
    'cy-GB_CLOUD_Female':           {name: 'Cloud - cy-GB - Female - Gwyneth',      gender: 'Female', engine: 'cloud', language: 'cy-GB',      ename: 'Gwyneth',    ssml: true },
    'cy-GB_CLOUD_Male':             {name: 'Cloud - cy-GB - Male - Geraint',        gender: 'Male',   engine: 'cloud', language: 'cy-GB',      ename: 'Geraint',    ssml: true },
    'en-IN_CLOUD_Female':           {name: 'Cloud - en-IN - Female - Raveena',      gender: 'Female', engine: 'cloud', language: 'en-IN',      ename: 'Raveena',    ssml: true },
    'en-US_CLOUD_Male_Chipmunk':    {name: 'Cloud - en-US - Male - Chipmunk',       gender: 'Male',   engine: 'cloud', language: 'en-US',      ename: 'Chipmunk',   ssml: true },
    'en-US_CLOUD_Male_Eric':        {name: 'Cloud - en-US - Male - Eric',           gender: 'Male',   engine: 'cloud', language: 'en-US',      ename: 'Eric',       ssml: true },
    'en-US_CLOUD_Female_Ivy':       {name: 'Cloud - en-US - Female - Ivy',          gender: 'Female', engine: 'cloud', language: 'en-US',      ename: 'Ivy',        ssml: true },
    'en-US_CLOUD_Female_Jennifer':  {name: 'Cloud - en-US - Female - Jennifer',     gender: 'Female', engine: 'cloud', language: 'en-US',      ename: 'Jennifer',   ssml: true },
    'en-US_CLOUD_Male_Justin':      {name: 'Cloud - en-US - Male - Justin',         gender: 'Male',   engine: 'cloud', language: 'en-US',      ename: 'Justin',     ssml: true },
    'en-US_CLOUD_Female_Kendra':    {name: 'Cloud - en-US - Female - Kendra',       gender: 'Female', engine: 'cloud', language: 'en-US',      ename: 'Kendra',     ssml: true },
    'en-US_CLOUD_Female_Kimberly':  {name: 'Cloud - en-US - Female - Kimberly',     gender: 'Female', engine: 'cloud', language: 'en-US',      ename: 'Kimberly',   ssml: true },
    'es-ES_CLOUD_Female':           {name: 'Cloud - es-ES - Female - Conchita',     gender: 'Female', engine: 'cloud', language: 'es-ES',      ename: 'Conchita',   ssml: true },
    'es-ES_CLOUD_Male':             {name: 'Cloud - es-ES - Male - Enrique',        gender: 'Male',   engine: 'cloud', language: 'es-ES',      ename: 'Enrique',    ssml: true },
    'es-US_CLOUD_Female':           {name: 'Cloud - es-US - Female - Penelope',     gender: 'Female', engine: 'cloud', language: 'es-US',      ename: 'Penelope',   ssml: true },
    'es-US_CLOUD_Male':             {name: 'Cloud - es-US - Male - Miguel',         gender: 'Male',   engine: 'cloud', language: 'es-US',      ename: 'Miguel',     ssml: true },
    'fr-CA_CLOUD_Female':           {name: 'Cloud - fr-CA - Female - Chantal',      gender: 'Female', engine: 'cloud', language: 'fr-CA',      ename: 'Chantal',    ssml: true },
    'fr-FR_CLOUD_Female':           {name: 'Cloud - fr-FR - Female - Celine',       gender: 'Female', engine: 'cloud', language: 'fr-FR',      ename: 'Celine',     ssml: true },
    'fr-FR_CLOUD_Male':             {name: 'Cloud - fr-FR - Male - Mathieu',        gender: 'Male',   engine: 'cloud', language: 'fr-FR',      ename: 'Mathieu',    ssml: true },
    'is-IS_CLOUD_Female':           {name: 'Cloud - is-IS - Female - Dora',         gender: 'Female', engine: 'cloud', language: 'is-IS',      ename: 'Dora',       ssml: true },
    'is-IS_CLOUD_Male':             {name: 'Cloud - is-IS - Male - Karl',           gender: 'Male',   engine: 'cloud', language: 'is-IS',      ename: 'Karl',       ssml: true },
    'it-IT_CLOUD_Female':           {name: 'Cloud - it-IT - Female - Carla',        gender: 'Female', engine: 'cloud', language: 'it-IT',      ename: 'Carla',      ssml: true },
    'it-IT_CLOUD_Male':             {name: 'Cloud - it-IT - Male - Giorgio',        gender: 'Male',   engine: 'cloud', language: 'it-IT',      ename: 'Giorgio',    ssml: true },
    'nb-NO_CLOUD_Female':           {name: 'Cloud - nb-NO - Female - Liv',          gender: 'Female', engine: 'cloud', language: 'nb-NO',      ename: 'Liv',        ssml: true },
    'nl-NL_CLOUD_Female':           {name: 'Cloud - nl-NL - Female - Lotte',        gender: 'Female', engine: 'cloud', language: 'nl-NL',      ename: 'Lotte',      ssml: true },
    'nl-NL_CLOUD_Male':             {name: 'Cloud - nl-NL - Male - Ruben',          gender: 'Male',   engine: 'cloud', language: 'nl-NL',      ename: 'Ruben',      ssml: true },
    'pl-PL_CLOUD_Female_Agnieszka': {name: 'Cloud - pl-PL - Female - Agnieszka',    gender: 'Female', engine: 'cloud', language: 'pl-PL',      ename: 'Agnieszka',  ssml: true },
    'pl-PL_CLOUD_Male_Jacek':       {name: 'Cloud - pl-PL - Male - Jacek',          gender: 'Male',   engine: 'cloud', language: 'pl-PL',      ename: 'Jacek',      ssml: true },
    'pl-PL_CLOUD_Female_Ewa':       {name: 'Cloud - pl-PL - Female - Ewa',          gender: 'Female', engine: 'cloud', language: 'pl-PL',      ename: 'Ewa',        ssml: true },
    'pl-PL_CLOUD_Male_Jan':         {name: 'Cloud - pl-PL - Male - Jan',            gender: 'Male',   engine: 'cloud', language: 'pl-PL',      ename: 'Jan',        ssml: true },
    'pl-PL_CLOUD_Female':           {name: 'Cloud - pl-PL - Female - Maja',         gender: 'Female', engine: 'cloud', language: 'pl-PL',      ename: 'Maja',       ssml: true },
    'pt-BR_CLOUD_Female':           {name: 'Cloud - pt-BR - Female - Vitoria',      gender: 'Female', engine: 'cloud', language: 'pt-BR',      ename: 'Vitoria',    ssml: true },
    'pt-BR_CLOUD_Male':             {name: 'Cloud - pt-BR - Male - Ricardo',        gender: 'Male',   engine: 'cloud', language: 'pt-BR',      ename: 'Ricardo',    ssml: true },
    'pt-BR_CLOUD_Female_Camila':    {name: 'Cloud - pt-BR - Female - Camila',       gender: 'Female', engine: 'cloud', language: 'pt-BR',      ename: 'Camila',     ssml: true },
    'pt-PT_CLOUD_Male':             {name: 'Cloud - pt-PT - Male - Cristiano',      gender: 'Male',   engine: 'cloud', language: 'pt-PT',      ename: 'Cristiano',  ssml: true },
    'pt-PT_CLOUD_Female':           {name: 'Cloud - pt-PT - Female - Ines',         gender: 'Female', engine: 'cloud', language: 'pt-PT',      ename: 'Ines',       ssml: true },
    'ro-RO_CLOUD_Female':           {name: 'Cloud - ro-RO - Female - Carmen',       gender: 'Female', engine: 'cloud', language: 'ro-RO',      ename: 'Carmen',     ssml: true },
    'sv-SE_CLOUD_Female':           {name: 'Cloud - sv-SE - Female - Astrid',       gender: 'Female', engine: 'cloud', language: 'sv-SE',      ename: 'Astrid',     ssml: true },
    'tr-TR_CLOUD_Female':           {name: 'Cloud - tr-TR - Female - Filiz',        gender: 'Female', engine: 'cloud', language: 'tr-TR',      ename: 'Filiz',      ssml: true },
    'ko-KR_CLOUD_Female':           {name: 'Cloud - ko-KR - Female - Seoyeon',      gender: 'Female', engine: 'cloud', language: 'ko-KR',      ename: 'Seoyeon',    ssml: true },

    'en-US':                        {name: 'PicoTTS - Englisch US',    engine: 'PicoTTS'},
    'en-GB':                        {name: 'PicoTTS - Englisch GB',    engine: 'PicoTTS'},
    'de-DE':                        {name: 'PicoTTS - Deutsch',        engine: 'PicoTTS'},
    'it-IT':                        {name: 'PicoTTS - Italiano',       engine: 'PicoTTS'},
    'es-ES':                        {name: 'PicoTTS - Espaniol',       engine: 'PicoTTS'},
    'fr-FR':                        {name: 'PicoTTS - Français',       engine: 'PicoTTS'},

    'ru-RU_AP_Female':              {name: 'AWS Polly - Русский - Татьяна',         gender: 'Female', engine: 'polly', language: 'ru-RU',      ename: 'Tatyana',    ssml: true},
    'ru-RU_AP_Male':                {name: 'AWS Polly - Русский - Максим',          gender: 'Male',   engine: 'polly', language: 'ru-RU',      ename: 'Maxim',      ssml: true},
    'de-DE_AP_Female':              {name: 'AWS Polly - Deutsch - Marlene',         gender: 'Female', engine: 'polly', language: 'de-DE',      ename: 'Marlene',    ssml: true},
    'de-DE_AP_Female_Vicki':        {name: 'AWS Polly - Deutsch - Vicki',           gender: 'Female', engine: 'polly', language: 'de-DE',      ename: 'Vicki',      ssml: true},
    'de-DE_AP_Male':                {name: 'AWS Polly - Deutsch - Hans',            gender: 'Male',   engine: 'polly', language: 'de-DE',      ename: 'Hans',       ssml: true},
    'en-US_AP_Female':              {name: 'AWS Polly - en-US - Female - Salli',    gender: 'Female', engine: 'polly', language: 'en-US',      ename: 'Salli',      ssml: true},
    'en-US_AP_Male':                {name: 'AWS Polly - en-US - Male - Joey',       gender: 'Male',   engine: 'polly', language: 'en-US',      ename: 'Joey',       ssml: true},
    'da-DK_AP_Female':              {name: 'AWS Polly - da-DK - Female - Naja',     gender: 'Female', engine: 'polly', language: 'da-DK',      ename: 'Naja',       ssml: true},
    'da-DK_AP_Male':                {name: 'AWS Polly - da-DK - Male - Mads',       gender: 'Male',   engine: 'polly', language: 'da-DK',      ename: 'Mads',       ssml: true},
    'en-AU_AP_Female':              {name: 'AWS Polly - en-AU - Female - Nicole',   gender: 'Female', engine: 'polly', language: 'en-AU',      ename: 'Nicole',     ssml: true},
    'en-AU_AP_Male':                {name: 'AWS Polly - en-AU - Male - Russell',    gender: 'Male',   engine: 'polly', language: 'en-AU',      ename: 'Russell',    ssml: true},
    'en-GB_AP_Female_Amy':          {name: 'AWS Polly - en-GB - Female - Amy',      gender: 'Female', engine: 'polly', language: 'en-GB',      ename: 'Amy',        ssml: true},
    'en-GB_AP_Male':                {name: 'AWS Polly - en-GB - Male - Brian',      gender: 'Male',   engine: 'polly', language: 'en-GB',      ename: 'Brian',      ssml: true},
    'en-GB_AP_Female_Emma':         {name: 'AWS Polly - en-GB - Female - Emma',     gender: 'Female', engine: 'polly', language: 'en-GB',      ename: 'Emma',       ssml: true},
    'en-GB-WLS_AP_Female':          {name: 'AWS Polly - en-GB-WLS - Female - Gwyneth',gender: 'Female', engine: 'polly', language: 'en-GB-WLS',  ename: 'Gwyneth',    ssml: true},
    'en-GB-WLS_AP_Male':            {name: 'AWS Polly - en-GB-WLS - Male - Geraint',gender: 'Male',   engine: 'polly', language: 'en-GB-WLS',  ename: 'Geraint',    ssml: true},
    'cy-GB_AP_Female':              {name: 'AWS Polly - cy-GB - Female - Gwyneth',  gender: 'Female', engine: 'polly', language: 'cy-GB',      ename: 'Gwyneth',    ssml: true},
    'cy-GB_AP_Male':                {name: 'AWS Polly - cy-GB - Male - Geraint',            gender: 'Male',   engine: 'polly', language: 'cy-GB',      ename: 'Geraint',    ssml: true},
    'en-IN_AP_Female':              {name: 'AWS Polly - en-IN - Female - Raveena',          gender: 'Female', engine: 'polly', language: 'en-IN',      ename: 'Raveena',    ssml: true},
    'en-US_AP_Male_Chipmunk':       {name: 'AWS Polly - en-US - Male - Chipmunk',           gender: 'Male',   engine: 'polly', language: 'en-US',      ename: 'Chipmunk',   ssml: true},
    'en-US_AP_Male_Eric':           {name: 'AWS Polly - en-US - Male - Eric',           gender: 'Male',   engine: 'polly', language: 'en-US',      ename: 'Eric',       ssml: true},
    'en-US_AP_Female_Ivy':          {name: 'AWS Polly - en-US - Female - Ivy',          gender: 'Female', engine: 'polly', language: 'en-US',      ename: 'Ivy',        ssml: true},
    'en-US_AP_Female_Jennifer':     {name: 'AWS Polly - en-US - Female - Jennifer',             gender: 'Female', engine: 'polly', language: 'en-US',      ename: 'Jennifer',   ssml: true},
    'en-US_AP_Male_Justin':         {name: 'AWS Polly - en-US - Male - Justin',             gender: 'Male',   engine: 'polly', language: 'en-US',      ename: 'Justin',     ssml: true},
    'en-US_AP_Female_Kendra':       {name: 'AWS Polly - en-US - Female - Kendra',           gender: 'Female', engine: 'polly', language: 'en-US',      ename: 'Kendra',     ssml: true},
    'en-US_AP_Female_Kimberly':     {name: 'AWS Polly - en-US - Female - Kimberly',             gender: 'Female', engine: 'polly', language: 'en-US',      ename: 'Kimberly',   ssml: true},
    'es-ES_AP_Female':              {name: 'AWS Polly - es-ES - Female - Conchita',             gender: 'Female', engine: 'polly', language: 'es-ES',      ename: 'Conchita',   ssml: true},
    'es-ES_AP_Male':                {name: 'AWS Polly - es-ES - Male - Enrique',            gender: 'Male',   engine: 'polly', language: 'es-ES',      ename: 'Enrique',    ssml: true},
    'es-US_AP_Female':              {name: 'AWS Polly - es-US - Female - Penelope',             gender: 'Female', engine: 'polly', language: 'es-US',      ename: 'Penelope',   ssml: true},
    'es-US_AP_Male':                {name: 'AWS Polly - es-US - Male - Miguel',             gender: 'Male',   engine: 'polly', language: 'es-US',      ename: 'Miguel',     ssml: true},
    'fr-CA_AP_Female':              {name: 'AWS Polly - fr-CA - Female - Chantal',          gender: 'Female', engine: 'polly', language: 'fr-CA',      ename: 'Chantal',    ssml: true},
    'fr-FR_AP_Female':              {name: 'AWS Polly - fr-FR - Female - Celine',           gender: 'Female', engine: 'polly', language: 'fr-FR',      ename: 'Celine',     ssml: true},
    'fr-FR_AP_Male':                {name: 'AWS Polly - fr-FR - Male - Mathieu',            gender: 'Male',   engine: 'polly', language: 'fr-FR',      ename: 'Mathieu',    ssml: true},
    'is-IS_AP_Female':              {name: 'AWS Polly - is-IS - Female - Dora',             gender: 'Female', engine: 'polly', language: 'is-IS',      ename: 'Dora',       ssml: true},
    'is-IS_AP_Male':                {name: 'AWS Polly - is-IS - Male - Karl',           gender: 'Male',   engine: 'polly', language: 'is-IS',      ename: 'Karl',       ssml: true},
    'it-IT_AP_Female':              {name: 'AWS Polly - it-IT - Female - Carla',            gender: 'Female', engine: 'polly', language: 'it-IT',      ename: 'Carla',      ssml: true},
    'it-IT_AP_Male':                {name: 'AWS Polly - it-IT - Male - Giorgio',            gender: 'Male',   engine: 'polly', language: 'it-IT',      ename: 'Giorgio',    ssml: true},
    'nb-NO_AP_Female':              {name: 'AWS Polly - nb-NO - Female - Liv',          gender: 'Female', engine: 'polly', language: 'nb-NO',      ename: 'Liv',        ssml: true},
    'nl-NL_AP_Female':              {name: 'AWS Polly - nl-NL - Female - Lotte',            gender: 'Female', engine: 'polly', language: 'nl-NL',      ename: 'Lotte',      ssml: true},
    'nl-NL_AP_Male':                {name: 'AWS Polly - nl-NL - Male - Ruben',          gender: 'Male',   engine: 'polly', language: 'nl-NL',      ename: 'Ruben',      ssml: true},
    'pl-PL_AP_Female_Agnieszka':    {name: 'AWS Polly - pl-PL - Female - Agnieszka',            gender: 'Female', engine: 'polly', language: 'pl-PL',      ename: 'Agnieszka',  ssml: true},
    'pl-PL_AP_Male_Jacek':          {name: 'AWS Polly - pl-PL - Male - Jacek',          gender: 'Male',   engine: 'polly', language: 'pl-PL',      ename: 'Jacek',      ssml: true},
    'pl-PL_AP_Female_Ewa':          {name: 'AWS Polly - pl-PL - Female - Ewa',          gender: 'Female', engine: 'polly', language: 'pl-PL',      ename: 'Ewa',        ssml: true},
    'pl-PL_AP_Male_Jan':            {name: 'AWS Polly - pl-PL - Male - Jan',            gender: 'Male',   engine: 'polly', language: 'pl-PL',      ename: 'Jan',        ssml: true},
    'pl-PL_AP_Female':              {name: 'AWS Polly - pl-PL - Female - Maja',             gender: 'Female', engine: 'polly', language: 'pl-PL',      ename: 'Maja',       ssml: true},
    'pt-BR_AP_Female':              {name: 'AWS Polly - pt-BR - Female - Vitoria',          gender: 'Female', engine: 'polly', language: 'pt-BR',      ename: 'Vitoria',    ssml: true},
    'pt-BR_AP_Male':                {name: 'AWS Polly - pt-BR - Male - Ricardo',            gender: 'Male',   engine: 'polly', language: 'pt-BR',      ename: 'Ricardo',    ssml: true},
    'pt-PT_AP_Male':                {name: 'AWS Polly - pt-PT - Male - Cristiano',          gender: 'Male',   engine: 'polly', language: 'pt-PT',      ename: 'Cristiano',  ssml: true},
    'pt-PT_AP_Female':              {name: 'AWS Polly - pt-PT - Female - Ines',             gender: 'Female', engine: 'polly', language: 'pt-PT',      ename: 'Ines',       ssml: true},
    'ro-RO_AP_Female':              {name: 'AWS Polly - ro-RO - Female - Carmen',           gender: 'Female', engine: 'polly', language: 'ro-RO',      ename: 'Carmen',     ssml: true},
    'sv-SE_AP_Female':              {name: 'AWS Polly - sv-SE - Female - Astrid',           gender: 'Female', engine: 'polly', language: 'sv-SE',      ename: 'Astrid',     ssml: true},
    'tr-TR_AP_Female':              {name: 'AWS Polly - tr-TR - Female - Filiz',            gender: 'Female', engine: 'polly', language: 'tr-TR',      ename: 'Filiz',      ssml: true},
    'ko-KR_AP_Female':              {name: 'AWS Polly - ko-KR - Female - Seoyeon',           gender: 'Female', engine: 'polly', language: 'ko-KR',      ename: 'Seoyeon',    ssml: true}
};

if (typeof module !== 'undefined' && module.parent) {
    module.exports.sayitOptions = sayitOptions;
    module.exports.sayitEngines = sayitEngines;
}
