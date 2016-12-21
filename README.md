![Logo](admin/sayit.png)
ioBroker sayit adapter
=================
[![NPM version](http://img.shields.io/npm/v/iobroker.sayit.svg)](https://www.npmjs.com/package/iobroker.sayit)
[![Downloads](https://img.shields.io/npm/dm/iobroker.sayit.svg)](https://www.npmjs.com/package/iobroker.sayit)

[![NPM](https://nodei.co/npm/iobroker.sayit.png?downloads=true)](https://nodei.co/npm/iobroker.sayit/)


SayIt Adapter can convert text to speech and play it on some device.
Actual following outputs are supported:

- *Browser* - the text will be played by browser with opened iobroker.vis page. It is supported almost by every desktop browser and by few mobily Browsers.


- *[Home24- MediaPlayer](http://www.home-24.net/index.php?app=media)* - the text will be sent and played to the Android device with Home24 - MediaPlayer installed. For this will be used build in Android text to speech engine. The port cannot be changed and set to 50000.


- *Home24 - MediaPlayer and [FTP Server](https://play.google.com/store/apps/details?id=lutey.FTPServer)* - the text will be sent and played on the Android device with Home24 - MediaPlayer installed. For this will be used the Google text to speech engine. Generated mp3 file will be copied over FTP to android device and played with Home24 - MediaPlayer.
    Both apps have to have same home directories. (E.g. root directory of \"sd card\").


- *System* - the text will be played by OS, where the ioBroker adapter runs. Following OS are supported: Windows, linux, Mac OSx.


- *Windows engine* - the text will be played by windows, where the sayIt adapter runs. For this will be used windows text to speech engine, that should be preconfigured by user. You can check [here](http://windows.microsoft.com/en-us/windows/setting-speech-options#1TC=windows-7) how to setup it.


- *Sonos* - play text on sonos device. Be sure the Web Adapter is enabled. It is required to enable SONOS to read the generated mp3 files.

- *Chromecast* - play text on Chromecast device.

- *MPD* - play text on Music Player Daemon. Use only **http** for web adapter, don't use https.

To enable the text to speech on RaspberryPI or linux system call one time following command ```sudo apt-get -y install mpg321``` to install mpg321.

The mp3/wav files can be played to by writing its name into the object. (e.g. "/vis.0/main/img/door-bell.mp3")

The file must be first loaded.

To use Yandex voices you must request the API key here: [https://tech.yandex.ru/speechkit/cloud/doc/dg/concepts/About-docpage/](https://tech.yandex.ru/speechkit/cloud/doc/dg/concepts/About-docpage/).

Actual Yandex supports only russian.

To use Amazon(Ivona) voices you need to get access key and secret key [here](http://www.ivona.com/us/for-business/speech-cloud/).

### System command
If you have some program, that can play audio files locally or somewhere else, you can write this command here. E.g.

```myCustomPlayer --option```

If **System** output is selected, the sayit adapter will execute following command on local system:

```myCustomPlayer --option /opt/iobroker/node_modules/iobroker.sayit/say.mp3```

If file name must stay somewhere in the middle you can use *%s* to specify where the file name must be placed:

```myCustomPlayer --option "%s" > /dev/null```

sayIt will make ```myCustomPlayer --option "/opt/iobroker/node_modules/iobroker.sayit/say.mp3" > /dev/null``` from it.

## Usage
SayIt adapter cannot be used alone. It must be controlled from javascript adapter or from "vis" with specific widget.
After creation of adapter instance will can find following objects:
- sayit.N.tts.text: Phrase to be spoken.
- sayit.N.tts.volume: volume which will be used by playing of the phrase.
- sayit.N.tts.playing: true if text is now playing and false if not. Supported only for "windows" and "system" play mode.
- sayit.N.tts.cachetext: Phrase to be cached and then it can be used without internet.
   E.g. you can enter here manually "No internet" and if ping to google.com is negative, write  "No internet" to "tts.text" and it will pronounced. Of course cache must be enabled.

State **tts.text** supports extended syntax, so the langugage/engine and volume can be defined together with text. It is used to enable multi-language text2speech engines.
E.g. if adapter has engine "Google-english", it is possible with phrase ```de:Sag es``` to force to use Google-Deustch speech engine.

With ```ru;75;Погода хорошая``` we can force to use russian language and volume 75%.

You can specify the volume of announcement in percent from current or given volume (not from maximal). E.g. if command is ```de;75;Gutes Wetter```and "announce volume" is 50%, the announce will be played with volume 38% from 100% possible.

The system command to play the mp3 file can be specified too. If you leave it blank, the default settings will be used: windows - cmdmp3.exe, OSX - /usr/bin/afplay, linux - mpg321 or omxplayer (recommended).

To install omxplayer write ```sudo apt-get install omxplayer``` or write ```sudo apt-get install mpg321``` to install mpg321.

**Note:** The default announce selection will be possible only after start of the instance.

Following values for engines are possible:

- en:   Google - English
- de:   Google - Deutsch
- ru:   Google - Русский
- it:   Google - Italiano
- es:   Google - Espaniol
- fr:   Google - Français
- ru_YA:Yandex - Русский
- ru-RU_AZ_Female: 	Ivona - Русский - Татьяна
- ru-RU_AZ_Male: 	Ivona - Русский - Максим
- de-DE_AZ_Female: 	Ivona - Deutsch - Marlene
- de-DE_AZ_Male: 		Ivona - Deutsch - Hans
- en-US_AZ_Female: 	Ivona - en-US - Female - Salli
- en-US_AZ_Male: 		Ivona - en-US - Male - Joey
- da-DK_AZ_Female: 	Ivona - da-DK - Female - Naja
- da-DK_AZ_Male: 		Ivona - da-DK - Male - Mads
- en-AU_AZ_Female: 	Ivona - en-AU - Female - Nicole
- en-AU_AZ_Male: 		Ivona - en-AU - Male - Russell
- en-GB_AZ_Female_Amy: Ivona - en-GB - Female - Amy
- en-GB_AZ_Male: Ivona - en-GB - Male - Brian
- en-GB_AZ_Female_Emma: Ivona - en-GB - Female - Emma
- en-GB-WLS_AZ_Female: Ivona - en-GB-WLS - Female - Gwyneth
- en-GB-WLS_AZ_Male: Ivona - en-GB-WLS - Male - Geraint
- cy-GB_AZ_Female: Ivona - cy-GB - Female - Gwyneth
- cy-GB_AZ_Male: Ivona - cy-GB - Male - Geraint
- en-IN_AZ_Female: Ivona - en-IN - Female - Raveena
- en-US_AZ_Male_Chipmunk: Ivona - en-US - Male - Chipmunk
- en-US_AZ_Male_Eric: Ivona - en-US - Male - Eric
- en-US_AZ_Female_Ivy: Ivona - en-US - Female - Ivy
- en-US_AZ_Female_Jennifer: Ivona - en-US - Female - Jennifer
- en-US_AZ_Male_Justin: Ivona - en-US - Male - Justin
- en-US_AZ_Female_Kendra: Ivona - en-US - Female - Kendra
- en-US_AZ_Female_Kimberly: Ivona - en-US - Female - Kimberly
- es-ES_AZ_Female: Ivona - es-ES - Female - Conchita
- es-ES_AZ_Male: Ivona - es-ES - Male - Enrique
- es-US_AZ_Female: Ivona - es-US - Female - Penelope
- es-US_AZ_Male: Ivona - es-US - Male - Miguel
- fr-CA_AZ_Female: Ivona - fr-CA - Female - Chantal
- fr-FR_AZ_Female: Ivona - fr-FR - Female - Celine
- fr-FR_AZ_Male: Ivona - fr-FR - Male - Mathieu
- is-IS_AZ_Female: Ivona - is-IS - Female - Dora
- is-IS_AZ_Male: Ivona - is-IS - Male - Karl
- it-IT_AZ_Female: Ivona - it-IT - Female - Carla
- it-IT_AZ_Male: Ivona - it-IT - Male - Giorgio
- nb-NO_AZ_Female: Ivona - nb-NO - Female - Liv
- nl-NL_AZ_Female: Ivona - nl-NL - Female - Lotte
- nl-NL_AZ_Male: Ivona - nl-NL - Male - Ruben
- pl-PL_AZ_Female_Agnieszka:Ivona - pl-PL - Female - Agnieszka
- pl-PL_AZ_Male_Jacek: Ivona - pl-PL - Male - Jacek
- pl-PL_AZ_Female_Ewa: Ivona - pl-PL - Female - Ewa
- pl-PL_AZ_Male_Jan: Ivona - pl-PL - Male - Jan
- pl-PL_AZ_Female: Ivona - pl-PL - Female - Maja
- pt-BR_AZ_Female: Ivona - pt-BR - Female - Vitoria
- pt-BR_AZ_Male: Ivona - pt-BR - Male - Ricardo
- pt-PT_AZ_Male: Ivona - pt-PT - Male - Cristiano
- pt-PT_AZ_Female: Ivona - pt-PT - Female - Ines
- ro-RO_AZ_Female: Ivona - ro-RO - Female - Carmen
- sv-SE_AZ_Female: Ivona - sv-SE - Female - Astrid
- tr-TR_AZ_Female: Ivona - tr-TR - Female - Filiz

## Changelog

### 1.3.0 (2016-12-20)
* (bluefox) add mpd

### 1.2.1 (2016-10-31)
* (bluefox) Fix cache

### 1.2.0 (2016-10-28)
* (bluefox) Finish sayit

### 1.1.3 (2016-10-24)
* (bluefox) Fix changing of engine

### 1.1.2 (2016-10-20)
* (bluefox) Add omxplayer option

### 1.0.1 (2016-10-12)
* (bluefox) support of blockly

### 1.0.0 (2016-05-14)
* (bluefox) Make the type of mp3 as file

### 0.3.16 (2015-12-26)
* (Vegetto) Support for Chromecast devices

### 0.3.16 (2015-12-26)
* (bluefox) enable play of mp3 files from disk

### 0.3.15 (2015-11-10)
* (bluefox) fill default settings by first start

### 0.3.14 (2015-11-01)
* (bluefox) fix error with sayItWindows

### 0.3.13 (2015-10-27)
* (bluefox) fix error with sayItSystem

### 0.3.12 (2015-10-06)
* (bluefox) fix error if received mp3 file is too short
* (bluefox) try to implement cache datapoint (you can use sayit.0.tts.cachetext to create cache for phrases and use sayit without internet)

### 0.3.11 (2015-08-03)
* (bluefox) change google requests from http to https

### 0.3.10 (2015-07-26)
* (bluefox) add new voice Russian-Maxim
* (bluefox) fix error with mp24ftp

### 0.3.9 (2015-07-09)
* (bluefox) fix error by mediaplayer24

### 0.3.8 (2015-06-09)
* (bluefox) make the volume for announce configurable
* (bluefox) make the command for "system" configurable

### 0.3.7 (2015-05-28)
* (bluefox) fix volume for announce
* (bluefox) support of play files from internal filesystem, like "/sayit.0/tts.userfiles/myGong.mp3"

### 0.3.6 (2015-03-24)
* (bluefox) fix error with volume by sonos

### 0.3.5 (2015-03-22)
* (bluefox) fix error in announcement

### 0.3.4 (2015-03-20)
* (bluefox) fix error in announcement

### 0.3.3 (2015-03-20)
* (bluefox) enable announcement

### 0.3.2 (2015-03-16)
* (bluefox) clear cache if engine changed

### 0.3.1 (2015-03-15)
* (bluefox) fix small error with log

### 0.3.0 (2015-03-08)
* (bluefox) add ivona/Amazon voices

### 0.2.2 (2015-03-08)
* (bluefox) fix error by buffering of non-generated texts.

### 0.2.1 (2015-03-07)
* (bluefox) fix error by buffering of non-generated texts.

### 0.2.0 (2015-03-02)
* (bluefox) add yandex-russian support

### 0.1.0 (2015-03-02)
* (bluefox) queue texts

### 0.0.1 (2015-02-06)
* (bluefox) initial commit

## License

The MIT License (MIT)

Copyright (c) 2014-2016, bluefox<dogafox@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
