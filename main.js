/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

var utils     = require(__dirname + '/lib/utils'); // Get common adapter utils
var libs      = {};

var adapter = utils.adapter('sayit');

adapter.on('stateChange', function (id, state) {
    if (state && !state.ack) {
        if (id == adapter.namespace + '.tts.volume') {
            if (adapter.config.type == 'system') {
                sayItSystemVolume(state.val);
            } else {
                sayLastVolume = state.val;
            }
        } else if (id == adapter.namespace + '.tts.text') {
            sayIt(state.val);
        }
    }
});

adapter.on('ready', function () {
    main();
});

var sayIndex             = 0;
var sayLastGeneratedText = "";
var sayLastVolume        = null;
var cacheDir             = '';
var webLink              = '';
var list                 = [];
var ivona                = null;

var sayitOptions = {
    "browser": {name: "Browser",           mp3Required: true,  checkLength: true,  func: sayItBrowser, server: true,  libs: ['fs', 'crypto', 'http']},
    "mp24ftp": {name: "MediaPlayer24+FTP", mp3Required: true,  checkLength: true,  func: sayItMP24ftp, server: false, libs: ['fs', 'crypto', 'http', 'jsftp']},
    "mp24":    {name: "MediaPlayer24",     mp3Required: false, checkLength: true,  func: sayItMP24,    server: false, libs: ['fs', 'crypto', 'http']},
    "system":  {name: "System",            mp3Required: true,  checkLength: false, func: sayItSystem,  server: false, libs: ['fs', 'crypto', 'http', 'child_process', 'os']},
    "windows": {name: "Windows default",   mp3Required: false, checkLength: true,  func: sayItWindows, server: false, libs: ['fs']},
    "sonos":   {name: "Sonos",             mp3Required: true,  checkLength: true,  func: sayItSonos,   server: true,  libs: ['fs', 'crypto', 'http']}
};

var sayitEngines = {
    "en":       {name: "Google - English",         engine: "google"},
    "de":       {name: "Google - Deutsch",         engine: "google"},
    "ru":       {name: "Google - Русский",         engine: "google"},
    "it":       {name: "Google - Italiano",        engine: "google"},
    "es":       {name: "Google - Espaniol",        engine: "google"},
    "fr":       {name: "Google - Français",        engine: "google"},
    "ru_YA":    {name: "Yandex - Русский",         engine: "yandex"},
    "ru-RU_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"ru-RU",      "ename":"Tatyana",    "name":"Ivona - Русский - Татьяна"},
    "de-DE_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"de-DE",      "ename":"Marlene",    "name":"Ivona - Deutsch - Marlene"},
    "de-DE_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"de-DE",      "ename":"Hans",       "name":"Ivona - Deutsch - Hans"},
    "en-US_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-US",      "ename":"Salli",      "name":"Ivona - en-US - Female - Salli"},
    "en-US_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-US",      "ename":"Joey",       "name":"Ivona - en-US - Male - Joey"},
    "da-DK_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"da-DK",      "ename":"Naja",       "name":"Ivona - da-DK - Female - Naja"},
    "da-DK_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"da-DK",      "ename":"Mads",       "name":"Ivona - da-DK - Male - Mads"},
    "en-AU_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-AU",      "ename":"Nicole",     "name":"Ivona - en-AU - Female - Nicole"},
    "en-AU_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-AU",      "ename":"Russell",    "name":"Ivona - en-AU - Male - Russell"},
    "en-GB_AZ_Female_Amy":      {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-GB",      "ename":"Amy",        "name":"Ivona - en-GB - Female - Amy"},
    "en-GB_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-GB",      "ename":"Brian",      "name":"Ivona - en-GB - Male - Brian"},
    "en-GB_AZ_Female_Emma":     {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-GB",      "ename":"Emma",       "name":"Ivona - en-GB - Female - Emma"},
    "en-GB-WLS_AZ_Female":      {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-GB-WLS",  "ename":"Gwyneth",    "name":"Ivona - en-GB-WLS - Female - Gwyneth"},
    "en-GB-WLS_AZ_Male":        {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-GB-WLS",  "ename":"Geraint",    "name":"Ivona - en-GB-WLS - Male - Geraint"},
    "cy-GB_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"cy-GB",      "ename":"Gwyneth",    "name":"Ivona - cy-GB - Female - Gwyneth"},
    "cy-GB_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"cy-GB",      "ename":"Geraint",    "name":"Ivona - cy-GB - Male - Geraint"},
    "en-IN_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-IN",      "ename":"Raveena",    "name":"Ivona - en-IN - Female - Raveena"},
    "en-US_AZ_Male_Chipmunk":   {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-US",      "ename":"Chipmunk",   "name":"Ivona - en-US - Male - Chipmunk"},
    "en-US_AZ_Male_Eric":       {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-US",      "ename":"Eric",       "name":"Ivona - en-US - Male - Eric"},
    "en-US_AZ_Female_Ivy":      {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-US",      "ename":"Ivy",        "name":"Ivona - en-US - Female - Ivy"},
    "en-US_AZ_Female_Jennifer": {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-US",      "ename":"Jennifer",   "name":"Ivona - en-US - Female - Jennifer"},
    "en-US_AZ_Male_Justin":     {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-US",      "ename":"Justin",     "name":"Ivona - en-US - Male - Justin"},
    "en-US_AZ_Female_Kendra":   {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-US",      "ename":"Kendra",     "name":"Ivona - en-US - Female - Kendra"},
    "en-US_AZ_Female_Kimberly": {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"en-US",      "ename":"Kimberly",   "name":"Ivona - en-US - Female - Kimberly"},
    "es-ES_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"es-ES",      "ename":"Conchita",   "name":"Ivona - es-ES - Female - Conchita"},
    "es-ES_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"es-ES",      "ename":"Enrique",    "name":"Ivona - es-ES - Male - Enrique"},
    "es-US_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"es-US",      "ename":"Penelope",   "name":"Ivona - es-US - Female - Penelope"},
    "es-US_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"es-US",      "ename":"Miguel",     "name":"Ivona - es-US - Male - Miguel"},
    "fr-CA_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"fr-CA",      "ename":"Chantal",    "name":"Ivona - fr-CA - Female - Chantal"},
    "fr-FR_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"fr-FR",      "ename":"Celine",     "name":"Ivona - fr-FR - Female - Celine"},
    "fr-FR_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"fr-FR",      "ename":"Mathieu",    "name":"Ivona - fr-FR - Male - Mathieu"},
    "is-IS_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"is-IS",      "ename":"Dora",       "name":"Ivona - is-IS - Female - Dora"},
    "is-IS_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"is-IS",      "ename":"Karl",       "name":"Ivona - is-IS - Male - Karl"},
    "it-IT_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"it-IT",      "ename":"Carla",      "name":"Ivona - it-IT - Female - Carla"},
    "it-IT_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"it-IT",      "ename":"Giorgio",    "name":"Ivona - it-IT - Male - Giorgio"},
    "nb-NO_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"nb-NO",      "ename":"Liv",        "name":"Ivona - nb-NO - Female - Liv"},
    "nl-NL_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"nl-NL",      "ename":"Lotte",      "name":"Ivona - nl-NL - Female - Lotte"},
    "nl-NL_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"nl-NL",      "ename":"Ruben",      "name":"Ivona - nl-NL - Male - Ruben"},
    "pl-PL_AZ_Female_Agnieszka":{"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"pl-PL",      "ename":"Agnieszka",  "name":"Ivona - pl-PL - Female - Agnieszka"},
    "pl-PL_AZ_Male_Jacek":      {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"pl-PL",      "ename":"Jacek",      "name":"Ivona - pl-PL - Male - Jacek"},
    "pl-PL_AZ_Female_Ewa":      {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"pl-PL",      "ename":"Ewa",        "name":"Ivona - pl-PL - Female - Ewa"},
    "pl-PL_AZ_Male_Jan":        {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"pl-PL",      "ename":"Jan",        "name":"Ivona - pl-PL - Male - Jan"},
    "pl-PL_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"pl-PL",      "ename":"Maja",       "name":"Ivona - pl-PL - Female - Maja"},
    "pt-BR_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"pt-BR",      "ename":"Vitoria",    "name":"Ivona - pt-BR - Female - Vitoria"},
    "pt-BR_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"pt-BR",      "ename":"Ricardo",    "name":"Ivona - pt-BR - Male - Ricardo"},
    "pt-PT_AZ_Male":            {"gender":"Male",   engine: "ivona", params: ['accessKey', 'secretKey'], "language":"pt-PT",      "ename":"Cristiano",  "name":"Ivona - pt-PT - Male - Cristiano"},
    "pt-PT_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"pt-PT",      "ename":"Ines",       "name":"Ivona - pt-PT - Female - Ines"},
    "ro-RO_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"ro-RO",      "ename":"Carmen",     "name":"Ivona - ro-RO - Female - Carmen"},
    "sv-SE_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"sv-SE",      "ename":"Astrid",     "name":"Ivona - sv-SE - Female - Astrid"},
    "tr-TR_AZ_Female":          {"gender":"Female", engine: "ivona", params: ['accessKey', 'secretKey'], "language":"tr-TR",      "ename":"Filiz",      "name":"Ivona - tr-TR - Female - Filiz"}
};

function mkpathSync(rootpath, dirpath) {
    // Remove filename
    dirpath = dirpath.split('/');
    dirpath.pop();
    if (!dirpath.length) return;

    for (var i = 0; i < dirpath.length; i++) {
        rootpath += dirpath[i] + '/';
        if (!libs.fs.existsSync(rootpath)) {
            if (dirpath[i] != '..') {
                libs.fs.mkdirSync(rootpath);
            } else {
                throw 'Cannot create ' + rootpath + dirpath.join('/');
            }
        }
    }
}

function copyFile(text, language, volume, source, dest, callback) {
    try {
        var input  = libs.fs.createReadStream(source);               // Input stream
        var output = libs.fs.createWriteStream(dest);                // Output stream

        input.on("data",  function (d) {
            output.write(d);
        });

        // Copy in to out
        input.on("error", function (err) {
            throw err;
        });

        // Raise errors
        input.on("end",   function () {                               // When input ends
            output.end();                                            // close output
            adapter.log.info("Copied file '" + source + "' to '" + dest + "'");
            if (callback) callback(text, language, volume);          // And notify callback
        });
    } catch (e) {
        adapter.log.error('Cannot copy file "' + source + '" to "' + dest + '": ' + e);
        if (callback) callback('', '', volume);              // And notify callback
    }
}

function getLength(fileName, callback) {
    // create a new parser from a node ReadStream
    if (libs.fs.existsSync(fileName)) {
        try {
            var stat = libs.fs.statSync(fileName);
            var size = stat.size;
            if (callback) callback(Math.ceil(size / 4096));
        } catch (e) {
            adapter.log.warn('Cannot read length of file ' + filename);
            if (callback) callback(0);
        }
    } else {
        if (callback) callback(0);
    }
}

function splitText(text, max) {
    if (!max) max = 70;
    if (text.length > max) {
        var parts = text.split(' ');
        var result = [];
        var i = 0;
        for (var w = 0; w < parts.length; w++) {
            if (result[i] && ((result[i] || '') + ' ' + parts[w]).length > max) {
                i++;
            }
            if (!result[i]) {
                result.push(parts[w]);
            } else {
                result[i] += ' ' + parts[w];
            }
        }
        return result;
    } else {
        return [text];
    }
}

function sayFinished(duration) {
    duration = duration || 0;
    console.log('Duration "' + list[0].text + ' ' + duration);
    setTimeout(function () {
        if (list.length) list.shift();
        if (list.length) {
            sayIt(list[0].text, list[0].language, list[0].volume, true);
        }
    }, duration * 1000);
}

function sayItGetSpeechGoogle(text, language, volume, callback) {
    if (typeof volume == 'function') {
        callback = volume;
        volume = undefined;
    }

    if (text.length === 0) {
        if (callback) callback('', language, volume, 0);
        return;
    }

    if (text.length > 70) {
        var parts = splitText(text);
        for (var t = 1; t < parts.length; t++) {
            sayIt(parts[t], language, volume);
        }
        text = parts[0];
    }

    language = language || adapter.config.engine;

    if (!cacheDir) {
        cacheDir = __dirname + '/' + adapter.config.cacheDir;
        if (!libs.fs.existsSync(cacheDir)) {
            try {
                mkpathSync(__dirname + '/', adapter.config.cacheDir);
            } catch (e) {
                adapter.log.error('Cannot create "' + cacheDir + '": ' + e.message);
            }
        }
    }

    var md5filename = cacheDir + libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.mp3';

    if (libs.fs.existsSync(md5filename)) {
        getLength(__dirname + '/say.mp3', function (seconds) {
            copyFile(text, language, volume, md5filename, __dirname + '/say.mp3', function () {
                getLength(__dirname + '/say.mp3', function (seconds) {
                    if (callback) callback(text, language, volume, seconds);
                });
            });
        });
    } else {
        adapter.log.debug('cache file "' + md5filename + '" does not exist, fetching new file ...');
        var options = {
            host: 'translate.google.com',
            //port: 80,
            path: '/translate_tts?ie=utf-8&q=' + encodeURI(text) + '&tl=' + language
        };

        if (language == "ru") {
            options.headers = {
                "User-Agent":      "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:25.0) Gecko/20100101 Firefox/25.0",
                "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
                "Accept-Encoding": "gzip, deflate"
            };
        }

        libs.http.get(options, function (res) {
            var sounddata = '';
            res.setEncoding('binary');

            res.on('data', function (chunk) {
                sounddata += chunk;
            });

            res.on('end', function () {
                libs.fs.writeFile(__dirname + '/say.mp3', sounddata, 'binary', function (err) {
                    if (err) {
                        adapter.log.error ('File error: ' + err);
                    } else {
                        if (adapter.config.cache) copyFile(text, language, volume, __dirname + '/say.mp3', md5filename);

                        getLength(__dirname + '/say.mp3', function (seconds) {
                            if (callback) callback(text, language, volume, seconds);
                        });
                    }
                });
            });
        });
    }
}

function sayItGetSpeechAcapela(text, language, volume, callback) {
    var options = {
        host: 'vaassl3.acapela-group.com',
        path: '/Services/Synthesizer?prot_vers=2&req_voice=' + language + '22k&cl_env=FLASH_AS_3.0&req_text=%5Cvct%3D100%5C+%5Cspd%3D180%5C+' +
              encodeURI(text) + '&req_asw_type=STREAM&cl_vers=1-30&req_err_as_id3=yes&cl_login=ACAPELA_BOX&cl_app=PROD&cl_pwd=0g7znor2aa'
    };

    if (!libs.https) libs.https = require('https');

    libs.https.get(options, function (res) {
        var sounddata = '';
        res.setEncoding('binary');

        res.on('data', function (chunk) {
            sounddata += chunk;
        });

        res.on('end', function () {
            libs.fs.writeFile(__dirname + '/say.mp3', sounddata, 'binary', function (err) {
                if (err) {
                    adapter.log.error('File error:' + err);
                } else {
                    console.log('File saved.');
                    if (callback) callback(text, language, volume);
                }
            });
        });
    });
}

function sayItGetSpeechYandex(text, language, volume, callback) {
    if (language == 'ru' || language == 'ru_YA') {
        language = 'ru-RU';
    }

    if (!libs.https) libs.https = require('https');

    /*emotion: good, neutral, evil, mixed
    drunk:   true, false
    ill:     true, false
    robot:   true, false
    */
    var options = {
        host: 'tts.voicetech.yandex.net',
        path: '/generate?lang=' + language + '&format=mp3&speaker=' + adapter.config.voice + '&key=' + adapter.config.key +
              '&text=' + encodeURI(text.trim())
    };

    if (adapter.config.emotion && adapter.config.emotion != 'none') options.path += '&emotion=' + adapter.config.emotion;
    if (adapter.config.drunk === 'true' || adapter.config.drunk === true) options.path += '&drunk=true';
    if (adapter.config.ill   === 'true' || adapter.config.ill   === true) options.path += '&ill=true';
    if (adapter.config.robot === 'true' || adapter.config.robot === true) options.path += '&robot=true';

    libs.https.get(options, function (res) {
        var sounddata = '';
        res.setEncoding('binary');

        res.on('data', function (chunk) {
            sounddata += chunk;
        });

        res.on('end', function () {
            libs.fs.writeFile(__dirname + '/say.mp3', sounddata, 'binary', function (err) {
                if (err) {
                    adapter.log.error('File error:' + err);
                } else {
                    if (callback) callback(text, language, volume);
                }
            });
        });
    });
}

function sayItGetSpeechAmazon(text, language, volume, callback) {
    if (!libs.Ivona) libs.Ivona = require('ivona-node');

    if (!ivona) ivona = new libs.Ivona({
        accessKey: adapter.config.accessKey,
        secretKey: adapter.config.secretKey
    });

    if (!libs.fs) libs.fs = require('fs');

    try {
        ivona.createVoice(text, {
            body: {
                voice: {
                    name:     sayitEngines[language].ename,
                    language: sayitEngines[language].language,
                    gender:   sayitEngines[language].gender
                }
            }
        }).pipe(libs.fs.createWriteStream(__dirname + '/say.mp3')).on('finish', function () {
            if (callback) callback(text, language, volume);
        });
    } catch (e) {
        adapter.log.error(e.toString());
        if (callback) callback(text, language, volume);
    }
}

function sayItGetSpeech(text, language, volume, callback) {
    if (sayitEngines[language] && sayitEngines[language].engine) {
        switch (sayitEngines[language].engine) {
            case 'google':
                sayItGetSpeechGoogle(text, language, volume, callback);
                break;

            case 'yandex':
                sayItGetSpeechYandex(text, language, volume, callback);
                break;

            case 'acapela':
                sayItGetSpeechAcapela(text, language, volume, callback);
                break;

            case 'ivona':
                sayItGetSpeechAmazon(text, language, volume, callback);
                break;

            default:
                adapter.log.warn('Engine ' + sayitEngines[language].engine + ' not yet supported.');
                sayFinished();
                break;

        }
    } else {
        sayItGetSpeechGoogle(text, language, volume, callback);
    }
}

function sayItBrowser(text, language, volume, duration) {
    var fileData;
    if (sayItIsPlayFile(text)) {
        fileData = libs.fs.readFileSync(text);
    } else {
        fileData = libs.fs.readFileSync(__dirname + '/say.mp3');
    }
    adapter.setBinaryState(adapter.namespace + '.tts.mp3', fileData);
    adapter.setForeignState('vis.0.control.instance', adapter.config.instance);
    adapter.setForeignState('vis.0.control.data',     '/state/' + adapter.namespace + '.tts.mp3');
    adapter.setForeignState('vis.0.control.command',  'playSound');
    sayFinished(duration);
}

function sayItSonos(text, language, volume, duration) {
    var fileData;
    if (sayItIsPlayFile(text)) {
        fileData = libs.fs.readFileSync(text);
    } else {
        fileData = libs.fs.readFileSync(__dirname + '/say.mp3');
    }

    volume = volume || sayLastVolume;

    adapter.setBinaryState(adapter.namespace + '.tts.mp3', fileData);

    if (adapter.config.device && webLink) {
        adapter.setForeignState(adapter.config.device + '.tts', volume + ';' + webLink + '/state/' + adapter.namespace + '.tts.mp3');
    } else if (webLink) {
        adapter.sendTo('sonos', 'send', volume + ';' + webLink + '/state/' + adapter.namespace + '.tts.mp3');
    } else {
        adapter.log.warn('Web server is unavailable!');
    }
    sayFinished(duration);
}

function sayItMP24(text, language, volume, duration) {
    if (adapter.config.server && !sayItIsPlayFile(text)) {
        adapter.log.debug('Request MediaPlayer24 "http://' + adapter.config.server + ':50000/tts=' + encodeURI(text) + '"');
        var opts = {
            host: adapter.config.server,
            port: 50000,
            path: '/tts=' + encodeURI(text),
        };
        libs.http.get(opts, function (res) {
            var body = '';
            res.on('data', function (chunk) {
                body += chunk;
            });
            res.on('end', function () {
                // all data has been downloaded
                adapter.log.debug('Response from MediaPlayer24 "' + adapter.config.server + '": ' + body);
            });
            res.on('error', function (e) {
                adapter.log.error('Cannot say text on MediaPlayer24 "' + adapter.config.server + '":' + e.message);
            });
        }).on('error', function (e) {
            if (e.message == 'Parse Error') {
                adapter.log.debug('Played successfully');
            } else {
                adapter.log.error('Cannot say text on MediaPlayer24 "' + adapter.config.server + '":' + e.message);
            }
        });
    }
    sayFinished(duration + 2);
}

function sayItMP24ftp(text, language, volume, duration) {
    // Copy mp3 file to android device to play it later with MediaPlayer
    if (adapter.config.port && adapter.config.server) {

        var file = sayItGetFileName(text);

        var ftp = new libs.jsftp({
            host: adapter.config.server,
            port: parseInt(adapter.config.port, 10), // defaults to 21
            user: adapter.config.user || "anonymous", // defaults to "anonymous"
            pass: adapter.config.pass || "anonymous"  // defaults to "anonymous"
        });

        try {
            // Copy file to FTP server
            ftp.put(file, __dirname + '/say.mp3', function (hadError) {
                if (!hadError) {
                    var opts = {
                        host: adapter.config.server,
                        port: 50000,
                        path: '/track=say.mp3',
                    };
                    libs.http.get(opts, function (res) {
                        var body = '';
                        res.on('data', function (chunk) {
                            body += chunk;
                        });
                        res.on('end', function () {
                            // all data has been downloaded
                            adapter.log.debug('Response from MediaPlayer24 "' + adapter.config.server + '": ' + body);
                        });
                        res.on('error', function (e) {
                            adapter.log.error('Cannot say text on MediaPlayer24 "' + adapter.config.server + '":' + e.message);
                        });
                    }).on('error', function (e) {
                        if (e.message == 'Parse Error') {
                            adapter.log.debug('Played successfully');
                        } else {
                            adapter.log.error('Cannot say text on MediaPlayer24 "' + adapter.config.server + '":' + e.message);
                        }
                    });
                } else {
                    adapter.log.error ('FTP error:' + hadError);
                }
                ftp.raw.quit(function (err, data) {
                    if (err) adapter.log.error(err);
                    ftp.destroy();
                });
            });
        } catch (e) {
            adapter.log.error('Cannot upload file to ' + adapter.config.server + ':' + adapter.config.port);
        }
    }
    sayFinished(duration + 2);
}

function sayItIsPlayFile(text) {
    if (text.length > 4) {
        var ext = text.substring(text.length - 4).toLowerCase();
        if (ext == ".mp3" || ext == ".wav") {
            return true;
        }
    }
    return false;
}

// If text is gong.mp3 or bong.wav
function sayItGetFileName(text) {
    if (sayItIsPlayFile(text)) return __dirname + '/' + text;

    return __dirname + '/say.mp3';
}

function sayItSystem(text, language, volume, duration) {
    var p = libs.os.platform();
    var ls = null;
    var file = sayItGetFileName(text);

    if (volume !== null && volume !== undefined) sayItSystemVolume(volume);

    if (p == 'linux') {
        //linux
        adapter.setState('tts.playing', true);
         ls = libs.child_process.exec('mpg321 ' + file, function (error, stdout, stderr) {
            adapter.setState('tts.playing', false);
        });
    } else if (p.match(/^win/)) {
        //windows
        adapter.setState('tts.playing', true);
        ls = libs.child_process.exec (__dirname + '/cmdmp3/cmdmp3.exe ' + file, function (error, stdout, stderr) {
            adapter.setState('tts.playing', false);
        });
    } else if (p == 'darwin') {
        //mac osx
        adapter.setState('tts.playing', true);
        ls = libs.child_process.exec('/usr/bin/afplay ' + file, function (error, stdout, stderr) {
            adapter.setState('tts.playing', false);
        });
    }

    if (ls) {
        ls.on('error', function (e) {
            throw new Error('sayIt.play: there was an error while playing the mp3 file:' + e);
        });
    }
    sayFinished(duration + 2);
}

function sayItWindows(text, language, volume, duration) {
    // If mp3 file
    if (sayItIsPlayFile(text)) {
        sayItSystem(text, language, volume);
        return;
    }

    // Call windows own text 2 speech
    var p    = libs.os.platform();
    var ls   = null;
    var file = sayItGetFileName(text);

    if (volume || volume === 0) sayItSystemVolume(volume);

    if (p.match(/^win/)) {
        //windows
        adapter.setState('tts.playing', true);
        ls = libs.child_process.exec(__dirname + '/Say/SayStatic.exe ' + text, function (error, stdout, stderr) {
            adapter.setState('tts.playing', false);
        });
    } else {
        adapter.log.error ('sayItWindows: only windows OS is supported for Windows default mode');
    }

    if (ls) {
        ls.on('error', function (e) {
            throw new Error('sayIt.play: there was an error while text2speech on window:' + e);
        });
    }
    sayFinished(duration + 2);
}

function sayItSystemVolume(level) {
    level = parseInt(level);
    if (level < 0)   level = 0;
    if (level > 100) level = 100;

    if (level === sayLastVolume) return;

    adapter.setState('tts.volume', level, true);

    sayLastVolume = level;

    var p  = libs.os.platform();
    var ls = null;

    if (p == 'linux') {
        //linux
        ls = libs.child_process.spawn('amixer', ["cset", "numid=1", "--", level + "%"]);
    } else if (p.match(/^win/)) {
        //windows
        // windows volume is from 0 to 65535
        level = Math.round((65535 * level) / 100); // because this level is from 0 to 100
        ls = libs.child_process.spawn (__dirname + '/nircmd/nircmdc.exe', ["setsysvolume", level]);
    } else if (p == 'darwin') {
        //mac osx
        ls = libs.child_process.spawn('sudo', ['osascript', '-e', '"set Volume ' + Math.round(level / 10) + '"']);
    }

    if (ls) {
        ls.on('error', function (e) {
            throw new Error('sayIt.play: there was an error while playing the mp3 file:' + e);
        });
    }
}

function sayIt(text, language, volume, process) {
    if (!process) {
        var time = (new Date()).getTime();

        // Workaround for double text
        if (list.length > 1 && list[list.length - 1].text == text && time - list[list.length - 1].time < 500) {
            adapter.warn('Same text in less than a second.. Strange. Ignore it.');
            return;
        }

        list.push({text: text, language: language, volume: volume, time: time});
        if (list.length > 1) return;
    }

    if (!text.length) {
        sayFinished(0);
        return;
    }
    adapter.log.info('saying: ' + text);

    // Extract language from "en;Text to say"
    if (text.indexOf(';') != -1) {
        var arr = text.split(';', 3);
        // If language;text or volume;text
        if (arr.length == 2) {
            // If number
            if (parseInt(arr[0]) == arr[0]) {
                volume = arr[0];
            } else {
                language = arr[0];
            }
            text = arr[1];
        } else if (arr.length == 3) {
            // If language;volume;text or volume;language;text
            // If number
            if (parseInt(arr[0]) == arr[0]) {
                volume   = arr[0];
                language = arr[1];
            } else {
                volume   = arr[1];
                language = arr[0];
            }
            text = arr[2];
        }
    }

    var isGenerate = false;
    if (!language) language = adapter.config.engine;
    if (!volume && adapter.config.volume)   volume = adapter.config.volume;

    // find out if say.mp3 must be generated
    if (!sayItIsPlayFile(text)) isGenerate = sayitOptions[adapter.config.type].mp3Required;

    // If text first must be generated
    if (isGenerate && sayLastGeneratedText != '[' + language + ']' + text) {
        sayLastGeneratedText = '[' + language + ']' + text;
        sayItGetSpeech(text, language, volume, sayitOptions[adapter.config.type].func);
    } else {
        if (sayItIsPlayFile(text)) {
            getLength(text, function (duration) {
                sayitOptions[adapter.config.type].func(text, language, volume, duration);
            });
        } else {
            getLength(__dirname + '/say.mp3', function (duration) {
                sayitOptions[adapter.config.type].func(text, language, volume, duration);
            });
        }
    }
}

function main() {
    // Load libs
    for (var i = 0; i < sayitOptions[adapter.config.type].libs.length; i++) {
        libs[sayitOptions[adapter.config.type].libs[i]] = require(sayitOptions[adapter.config.type].libs[i]);
    }
    adapter.getState('tts.text', function (err, state) {
        if (err || !state) {
            adapter.setState('tts.text', '', true);
        }
    });

    adapter.getState('tts.volume', function (err, state) {
        if (err || !state) {
            adapter.setState('tts.volume', 70, true);
            if (adapter.config.type != 'system') sayLastVolume = 70;
        } else {
            if (adapter.config.type != 'system') sayLastVolume = state.val;
        }
    });

    adapter.getState('tts.playing', function (err, state) {
        if (err || !state) {
            adapter.setState('tts.playing', false, true);
        }
    });

    if (adapter.config.type == 'system') {
        // Read volume
        adapter.getState('tts.volume', function (err, state) {
            if (!err && state) {
                sayItSystemVolume(state.val);
            } else {
                sayItSystemVolume(70);
            }
        });
    }

    if (adapter.config.type == 'sonos') {
        adapter.getForeignObject('system.adapter.' + adapter.config.web, function (err, obj) {
            if (!err && obj && obj.native) {
                webLink = 'http';
                if (obj.native.auth) {
                    adapter.log.error('Cannot use server "' + adapter.config.web + '" with authentication for sonos. Select other or create another one.');
                } else {
                    if (obj.native.secure) webLink += 's';
                    webLink += '://';
                    if (obj.native.bind == 'localhost' || obj.native.bind == '127.0.0.1') {
                        adapter.log.error('Selected web server "' + adapter.config.web + '" is only on local device available. Select other or create another one.');
                    } else {
                        if (obj.native.bind == '0.0.0.0') {
                            webLink += adapter.config.webServer;
                        } else {
                            webLink += obj.native.bind;
                        }
                    }

                    webLink += ':' + obj.native.port;
                }
            } else {
                adapter.log.error('Cannot read information about "' + adapter.config.web + '". No web server is active');
            }
        });
    }

    adapter.subscribeStates('*');
}

