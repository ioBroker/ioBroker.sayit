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

To use Amazon(Ivona) voices you need to get access key and secret key [here](http://www.ivona.com/us/for-business/speech-cloud/).

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
- ru-RU_AZ_Female: 	Ivona - Русский - Татьяна
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

**Note:** "N" is depends on index of the adapter instance.

## Changelog
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