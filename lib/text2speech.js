
function Text2Speech(adapter, libs, sayIt, sayFinished) {
    var appkey       = null;
    var that         = this;
    var engines      = require(__dirname + '/../admin/engines.js');
    var sayitEngines = engines.sayitEngines;
    var ivona        = null;
    var polly        = null;
    var MP3FILE      = __dirname + '/../say.mp3';
    var ERROR        = '$$$ERROR$$$';

    function splitText(text, max) {
        if (!max) max = 70;
        if (text.length > max) {
            var parts = text.split(/,|.|;|:/);
            var result = [];
            for (var p = 0; p < parts.length; p++) {
                if (parts[p].length < max) {
                    result.push(parts[p]);
                    continue;
                }

                var _parts = parts[p].split(' ');
                var i = 0;
                for (var w = 0; w < _parts.length; w++) {
                    if (_parts[i] && ((result[i] || '') + ' ' + _parts[w]).length > max) {
                        i++;
                    }
                    if (!result[i]) {
                        result.push(_parts[w]);
                    } else {
                        result[i] += ' ' + _parts[w];
                    }
                }
            }
            return result;
        } else {
            return [text];
        }
    }

    function copyFile(text, language, volume, source, dest, callback) {
        libs.fs = libs.fs || require('fs');

        try {
            var input  = libs.fs.createReadStream(source);               // Input stream
            var output = libs.fs.createWriteStream(dest);                // Output stream

            input.on('data',  function (d) {
                output.write(d);
            });

            // Copy in to out
            input.on('error', function (err) {
                throw err;
            });

            // Raise errors
            input.on('end',   function () {                               // When input ends
                output.end();                                            // close output
                adapter.log.info('Copied file "' + source + '" to "' + dest + '"');
                if (callback) callback(text, language, volume);          // And notify callback
            });
        } catch (e) {
            adapter.log.error('Cannot copy file "' + source + '" to "' + dest + '": ' + e);
            if (callback) callback('', '', volume);              // And notify callback
        }
    }

    function cacheFile(text, language, volume, seconds, callback) {
        libs.fs = libs.fs || require('fs');

        if (text.substring(0, 11) !== ERROR) {
            if (adapter.config.cache) {
                var md5filename = path.join(cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.mp3');

                var stat = libs.fs.statSync(MP3FILE);
                if (stat.size < 100) {
                    adapter.log.warn('Received file is too short: ' + libs.fs.readFileSync(MP3FILE).toString());
                } else {
                    copyFile(text, language, volume, MP3FILE, md5filename);
                }
            }
        }

        callback(text, language, volume, seconds);
    }

    this.sayItGetSpeechGoogle = function (text, language, volume, callback) {
        if (typeof volume === 'function') {
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

        // https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=%D0%BE%D1%82%D0%B2%D0%B5%D1%82%D0%B8%D1%82%D1%8C%207&tl=ru&total=1&idx=0&textlen=10
        var options = {
            host: 'translate.google.com',
            //port: 443,
            path: '/translate_tts?ie=UTF-8&client=tw-ob&q=' + encodeURI(text) + '&tl=' + language + '&total=1&idx=0&textlen=' + text.length //
        };

        if (language === 'ru') {
            options.headers = {
                'Accept-Encoding':  'identity;q=1, *;q=0',
                Range:              'bytes=0-',
                Referer:            'https://www.google.de/',
                'User-Agent':       'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.125 Safari/537.36'
                //"User-Agent":      "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:25.0) Gecko/20100101 Firefox/25.0",
                //"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                //"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
                //"Accept-Encoding": "gzip, deflate"//
            };
        }

        if (!libs.https) libs.https = require('https');
        if (!libs.fs)    libs.fs    = require('fs');

        var sounddata = '';
        libs.https.get(options, function (res) {
            res.setEncoding('binary');

            res.on('data', function (chunk) {
                sounddata += chunk;
            });

            res.on('end', function () {
                if (sounddata.length < 100) {
                    adapter.log.error('Cannot get file: received file is too short');
                    if (callback) callback(ERROR + text, language, volume, 0);
                    return;
                }

                if (sounddata.toString().indexOf('302 Moved') !== -1) {
                    adapter.log.error ('http://' + options.host + options.path);
                    adapter.log.error ('Cannot get file: ' + sounddata);
                    if (callback) callback(ERROR + text, language, volume, 0);
                    return;
                }

                libs.fs.writeFile(MP3FILE, sounddata, 'binary', function (err) {
                    if (err) {
                        adapter.log.error ('File error: ' + err);
                        if (callback) callback(ERROR + text, language, volume, 0);
                    } else {
                        that.getLength(MP3FILE, function (seconds) {
                            if (callback) callback(text, language, volume, seconds);
                        });
                    }
                });
            });
        }).on('error', function (err) {
            sounddata = '';
            adapter.log.error('Cannot get file:' + err);
        });
    };

    this.sayItGetSpeechAcapela = function (text, language, volume, callback) {
        var options = {
            host: 'vaassl3.acapela-group.com',
            path: '/Services/Synthesizer?prot_vers=2&req_voice=' + language + '22k&cl_env=FLASH_AS_3.0&req_text=%5Cvct%3D100%5C+%5Cspd%3D180%5C+' +
            encodeURI(text) + '&req_asw_type=STREAM&cl_vers=1-30&req_err_as_id3=yes&cl_login=ACAPELA_BOX&cl_app=PROD&cl_pwd=0g7znor2aa'
        };

        if (!libs.https) libs.https = require('https');

        var sounddata = '';
        libs.https.get(options, function (res) {
            res.setEncoding('binary');

            res.on('data', function (chunk) {
                sounddata += chunk;
            });

            res.on('end', function () {
                if (sounddata.length < 100) {
                    adapter.log.error('Cannot get file: received file is too short');
                    if (callback) callback(ERROR + text, language, volume);
                    return;
                }

                libs.fs.writeFile(MP3FILE, sounddata, 'binary', function (err) {
                    if (err) {
                        adapter.log.error('File error:' + err);
                        if (callback) callback(ERROR + text, language, volume);
                    } else {
                        console.log('File saved.');
                        if (callback) callback(text, language, volume);
                    }
                });
            });
        }).on('error', function (err) {
            sounddata = '';
            adapter.log.error('Cannot get file:' + err);
        });
    };

    this.sayItGetSpeechYandex = function (text, language, volume, callback) {
        if (language === 'ru' || language === 'ru_YA') {
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

        if (adapter.config.emotion && adapter.config.emotion !== 'none') options.path += '&emotion=' + adapter.config.emotion;
        if (adapter.config.drunk === 'true' || adapter.config.drunk === true) options.path += '&drunk=true';
        if (adapter.config.ill   === 'true' || adapter.config.ill   === true) options.path += '&ill=true';
        if (adapter.config.robot === 'true' || adapter.config.robot === true) options.path += '&robot=true';

        var sounddata = '';
        libs.https.get(options, function (res) {
            res.setEncoding('binary');

            res.on('data', function (chunk) {
                sounddata += chunk;
            });

            res.on('end', function () {
                if (sounddata.length < 100) {
                    adapter.log.error('Cannot get file: received file is too short');
                    if (callback) callback(ERROR + text, language, volume, 0);
                    return;
                }

                libs.fs.writeFile(MP3FILE, sounddata, 'binary', function (err) {
                    if (err) {
                        adapter.log.error('File error:' + err);
                        if (callback) callback(ERROR + text, language, volume, 0);
                    } else {
                        if (callback) callback(text, language, volume);
                    }
                });
            });
        }).on('error', function (err) {
            sounddata = '';
            adapter.log.error('Cannot get file:' + err);
        });
    };

    this.sayItGetSpeechAmazon = function (text, language, volume, callback) {
        libs.Ivona = libs.Ivona || require('ivona-node');

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
            }).pipe(libs.fs.createWriteStream(MP3FILE)).on('finish', function () {
                if (callback) callback(text, language, volume);
            });
        } catch (e) {
            adapter.log.error(e.toString());
            if (callback) callback(ERROR + text, language, volume);
        }
    };

    this.sayItGetSpeechPolly = function (text, language, volume, callback) {
        if (!libs.aws) libs.aws = require('aws-sdk');
        if (!libs.fs)  libs.fs   = require('fs');

        try {
            polly = polly || new libs.aws.Polly({
                accessKeyId:     adapter.config.accessKey,
                secretAccessKey: adapter.config.secretKey,
                region:          adapter.config.region
            });
            var type = 'text';
            if (text.match(/<[-+\w\s'"=]+>/)) {
                if (!text.match(/^<speak>/)) text = '<speak>' + text + '</speak>';
                type = 'ssml';
            }
            var params = {
                Text:         text,
                OutputFormat: 'mp3',
                TextType:     type,
                VoiceId:      sayitEngines[language].ename
            };

            polly.synthesizeSpeech(params, function (err, data) {
                if (err) {
                    adapter.log.error('Cannot get answer: ' + JSON.stringify(err));
                    if (callback) callback(ERROR + text, language, volume, 0);
                } else if (data) {
                    if (data.AudioStream instanceof Buffer) {
                        libs.fs.writeFile(MP3FILE, data.AudioStream, 'binary', function (err) {
                            if (err) {
                                adapter.log.error ('File error: ' + err);
                                if (callback) callback(ERROR + text, language, volume, 0);
                            } else {
                                that.getLength(MP3FILE, function (seconds) {
                                    if (callback) callback(text, language, volume, seconds);
                                });
                            }
                        });
                    } else {
                        adapter.log.error('Answer in invalid format: ' + (data ? data.toString() : 'null'));
                        if (callback) callback(ERROR + text, language, volume, 0);
                    }
                }
            });
        } catch (e) {
            adapter.log.error(e.toString());
            if (callback) callback(ERROR + text, language, volume);
        }
    };

    this.sayItGetSpeechCloud = function (text, language, volume, callback) {
        if (!libs.https) libs.https = require('https');
        if (!libs.fs)    libs.fs    = require('fs');

        if (!appkey) {
            adapter.getForeignObject('system.adapter.' + adapter.config.cloud, function (err, obj) {
                appkey = obj && obj.native && obj.native.apikey ? obj.native.apikey : 'error';
                that.sayItGetSpeechCloud(text, language, volume, callback);
            });
            return;
        }

        if (appkey === 'error') {
            adapter.log.error('No app key found in "' + adapter.config.cloud + '".');
            if (callback) callback(ERROR + text, language, volume, 0);
            return;
        }

        try {
            var type = 'text';
            if (text.match(/<[-+\w\s'"=]+>/)) {
                if (!text.match(/^<speak>/)) text = '<speak>' + text + '</speak>';
                type = 'ssml';
            }
            var postData = JSON.stringify({
                Text:     text,
                appkey:   appkey,
                TextType: type,
                VoiceId:  sayitEngines[language].ename
            });

            var postOptions = {
                host: 'iobroker.net',
                port: 443,
                path: '/polly/',
                method: 'POST',
                headers: {
                    'Content-Type':   'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            // Set up the request
            var postReq = libs.https.request(postOptions, function (res) {
                adapter.log.debug('Status code: ' + res.statusCode);
                if (res.statusCode === 200) {
                    res.setEncoding('binary');
                } else {
                    res.setEncoding('utf8');
                }
                var data = [];
                res.on('data', function (chunk) {
                    if (typeof chunk === 'string') chunk = new Buffer(chunk, 'binary');
                    data.push(chunk);
                });

                res.on('error', function (error) {
                    adapter.log.error('Cannot read: ' + error);
                });

                res.on('end', function () {
                    data = Buffer.concat(data);
                    if (data instanceof Buffer && data.length > 500) {
                        libs.fs.writeFile(MP3FILE, data, 'binary', function (err) {
                            if (err) {
                                adapter.log.error('File error: ' + err);
                                if (callback) callback(ERROR + text, language, volume, 0);
                            } else {
                                that.getLength(MP3FILE, function (seconds) {
                                    if (callback) callback(text, language, volume, seconds);
                                });
                            }
                        });
                    } else {
                        adapter.log.error('Answer in invalid format: ' + (data ? data.toString().substring(0, 100) : 'null'));
                        if (callback) callback(ERROR + text, language, volume, 0);
                    }
                });
            });

            // post the data
            postReq.write(postData);
            postReq.end();
        } catch (e) {
            adapter.log.error(e.toString());
            if (callback) callback(ERROR + text, language, volume);
        }
    };

    this.sayItGetSpeechPicoTTS = function (text, language, volume, callback) {
        if (!libs.fs)   libs.fs   = require('fs');
        if (!libs.exec) libs.exec = require('child_process').exec;

        try {
            var cmd = 'pico2wave -l ' + language + ' -w ' + __dirname + '/say.wav "' + text + '"';
            libs.exec(cmd, function (error, stdout, stderr) {
                if (error) {
                    adapter.log.error('Cannot create (pico2wave) "say.wav": ' + error);
                    if (callback) callback(text, language, volume);
                } else {
                    libs.exec('lame ' +  __dirname + '/say.wav ' + MP3FILE, function (error, stdout, stderr) {
                        if (error) adapter.log.error('Cannot create (lame) "say.mp3": ' + error);
                        if (callback) callback(text, language, volume);
                    });
                }
            });
        } catch (e) {
            adapter.log.error(e.toString());
            if (callback) callback(ERROR + text, language, volume);
        }
    };

    this.getLength = function (fileName, callback) {
        libs.fs = libs.fs || require('fs');

        // create a new parser from a node ReadStream
        if (fileName === adapter.config.announce && adapter.config.annoDuration) {
            if (callback) callback(adapter.config.annoDuration - 1);
            return;
        }

        if (libs.fs.existsSync(fileName)) {
            try {
                var stat = libs.fs.statSync(fileName);
                var size = stat.size;
                if (callback) callback(Math.ceil(size / 4096));
            } catch (e) {
                adapter.log.warn('Cannot read length of file ' + fileName);
                if (callback) callback(0);
            }
        } else {
            if (callback) callback(0);
        }
    };

    this.sayItGetSpeech = function (text, language, volume, callback) {
        if (adapter.config.cache) {
            var md5filename = path.join(cacheDir, libs.crypto.createHash('md5').update(language + ';' + text).digest('hex') + '.mp3');
            if (libs.fs.existsSync(md5filename)) {
                var cacheFileValid = true;
                if (adapter.config.cacheExpiryDays) {
                    var fileStat = libs.fs.statSync(md5filename);
                    if (fileStat.ctime && (new Date().getTime()-new Date(fileStat.ctime).getTime() > adapter.config.cacheExpiryDays*1000*60*60*24)) {
                        cacheFileValid = false;
                        adapter.log.info('Cached File expired, remove and re-generate');
                        libs.fs.unlinkSync(md5filename);
                    }
                }
                if (cacheFileValid) {
                    that.getLength(md5filename, function (seconds) {
                        if (callback) callback(md5filename, language, volume, seconds);
                    });
                    return;
                }
            }
        }

        if (sayitEngines[language] && sayitEngines[language].engine) {
            if (!sayitEngines[language].ssml) text = text.replace(/<\/?[-+\w\s'"=]+>/g, ''); // remove SSML

            switch (sayitEngines[language].engine) {
                case 'google':
                    that.sayItGetSpeechGoogle(text, language, volume, function (_text, _language, _volume, seconds) {
                        cacheFile(_text, _language, _volume, seconds, callback);
                    });
                    break;

                case 'yandex':
                    that.sayItGetSpeechYandex(text, language, volume, function (_text, _language, _volume, seconds) {
                        cacheFile(_text, _language, _volume, seconds, callback);
                    });
                    break;

                case 'acapela':
                    that.sayItGetSpeechAcapela(text, language, volume, function (_text, _language, _volume, seconds) {
                        cacheFile(_text, _language, _volume, seconds, callback);
                    });
                    break;

                case 'ivona':
                    that.sayItGetSpeechAmazon(text, language, volume, function (_text, _language, _volume, seconds) {
                        cacheFile(_text, _language, _volume, seconds, callback);
                    });
                    break;

                case 'polly':
                    that.sayItGetSpeechPolly(text, language, volume, function (_text, _language, _volume, seconds) {
                        cacheFile(_text, _language, _volume, seconds, callback);
                    });
                    break;

                case 'cloud':
                    that.sayItGetSpeechCloud(text, language, volume, function (_text, _language, _volume, seconds) {
                        cacheFile(_text, _language, _volume, seconds, callback);
                    });
                    break;

                case 'PicoTTS':
                    that.sayItGetSpeechPicoTTS(text, language, volume, function (_text, _language, _volume, seconds) {
                        cacheFile(_text, _language, _volume, seconds, callback);
                    });
                    break;

                default:
                    adapter.log.warn('Engine ' + sayitEngines[language].engine + ' not yet supported.');
                    sayFinished();
                    break;

            }
        } else {
            that.sayItGetSpeechGoogle(text, language, volume, function (_text, _language, _volume, seconds) {
                cacheFile(_text, _language, _volume, seconds, callback);
            });
        }
    };


    return this;
}

module.exports = Text2Speech;