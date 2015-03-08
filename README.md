![Logo](admin/sayit.png)
ioBroker sayit adapter
=================
SayIt Adapter can convert text to speech and play it on some device.
Actuall following outputs are supported:

- *Browser* - the text will be played by browser with opened DashUI page. It is almost by every desktop browser supported and by few mobily Browsers.
- *[Home24- MediaPlayer](http://www.home-24.net/index.php?app=media)* - the text will be sent and played to the Android device with Home24 - MediaPlayer installed. For this will be used build in Android text to speech engine. The port cannot be changed and set to 50000.
- *Home24 - MediaPlayer and [FTP Server](https://play.google.com/store/apps/details?id=lutey.FTPServer)* - the text will be sent and played on the Android device with Home24 - MediaPlayer installed. For this will be used the Google text to speech engine. Generated mp3 file will be copied over FTP to android device and played with Home24 - MediaPlayer.
    Both apps have to have same home directories. (E.g. root directory of \"sd card\").
- *System* - the text will be played by OS, where the ioBroker adapter runs. Following OS are supported: Windows, linux, Mac OSx.
- *Windows engine* - the text will be played by windows, where the sayIt adapter runs. For this will be used windows text to speech engine, that should be preconfigured by user. You can check [here](http://windows.microsoft.com/en-us/windows/setting-speech-options#1TC=windows-7) how to setup it.
- *Sonos* - play text on sonos device.

To enable the text to speech on RaspberryPI or linux system call one time following command ```sudo apt-get -y install mpg321``` to install mpg321.

The mp3/wav files can be played to by wrinting its name into the object. (e.g. "/vis.0/main/img/door-bell.mp3")

The file must be first loaded.

To use Yandex voices you must request the API key here: [https://tech.yandex.ru/speechkit/cloud/doc/dg/concepts/About-docpage/](https://tech.yandex.ru/speechkit/cloud/doc/dg/concepts/About-docpage/).

Actual Yandex supports only russian.

Usage:
SayIt adapter cannot be used alone. It must be controlled from javascript adapter or from "vis" with specific widget.
After creation of adapter instance will can find following objects:
- sayit.N.tts.text: Frase to be spoken.
- sayit.N.tts.volume: volume which will be used by playing of the frase.
- sayit.N.tts.playing: true if text is now playing and false if not. Supported only for "windows" and "system" play mode.

State **tts.text** supports extended syntax, so the langugage/engine and volume can be defined together with text. It is used to enable multi-language text2speech engines.
E.g. if adapter has engine "Google-english", it is possible with frase ```de:Sag es``` to force to use Google-Deustch speech engine.

With ```ru;75;Погода хорошая``` we can force to use russian language and volume 75%.
Following values for engines are possible:

- en:   Google - English
- de:   Google - Deutsch
- ru:   Google - Русский
- it:   Google - Italiano
- es:   Google - Espaniol
- fr:   Google - Français
- ru_YA:Yandex - Русский

**Note:** "N" is depends on index of the adapter instance.

## Changelog
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

## Install

```node iobroker.js add sayit```

## Usage
There are 4 variables:

- *tts.volume*  - to set the volume on the end device
- *tts.text*    - write here text, that must be spoken
- *tts.playing* - plaing indicator (only for "windows" or "system")
- *tts.mp3*     - binary mp3 file to read it through web server.
                  If selected "browser" or "sonos" the file will be made accessable over http://ip:8082/state/sayit.0.tts.mp3

Object tts.text can be written as ```de;70;Sage es``` or ```ru;Скажи пять```, where first part is always language and
the second part is volume, but it can be omitted. If nothing set the default settings will be used and volume from *tts.volume*.