![Logo](../../admin/sayit.png)

# ioBroker.sayit

## Configuration

Following outputs are supported:

- *Browser* - the text will be played by browser with opened `iobroker.vis` page. It is supported almost by every desktop browser and by few mobile Browsers.

- *[Home24- MediaPlayer](http://www.home-24.net/index.php?app=media)* - the text will be sent and played to the Android device with Home24 - MediaPlayer installed. For this will be used build in Android text to speech engine. The port cannot be changed and set to 50000.

- *Home24 - MediaPlayer and [FTP Server](https://play.google.com/store/apps/details?id=lutey.FTPServer)* - the text will be sent and played on the Android device with Home24 - MediaPlayer installed. For this will be used the Google text to speech engine. Generated mp3 file will be copied over FTP to android device and played with Home24 - MediaPlayer.
    Both apps have to have same home directories. (E.g. root directory of \"sd card\").

- *System* - the text will be played by OS, where the ioBroker adapter runs. Following OS are supported: Windows, linux, Mac OSx.

- *Windows engine* - the text will be played by windows, where the sayIt adapter runs. For this will be used windows text to speech engine, that should be preconfigured by user. You can check [here](http://windows.microsoft.com/en-us/windows/setting-speech-options#1TC=windows-7) how to set up it.

- *Sonos* - play text on sonos device. Be sure the Web Adapter is enabled. It is required to enable SONOS to read the generated mp3 files.

- *Heos* - play text on HEOS device. Be sure the Web Adapter is enabled. It is required to enable HEOS to read the generated mp3 files.

- *LaMetric* - Play text on LaMetric devices. Firmware 2.3.0 (or later) is required.

- *Chromecast* - play text on Chromecast device.

- *MPD* - play text on Music Player Daemon. Use only **http** for web adapter, don't use https.

To enable the text to speech on RaspberryPI or linux system call one time following command `sudo apt-get -y install mpg321` to install mpg321.

The mp3/wav files can be played to by writing its name into the object. (e.g. `/vis.0/main/img/door-bell.mp3`)

The file must be first loaded.

### Online TTS engines

- Google

> English, German, Russian, Italian, Spanish, French, Norwegian

- Yandex: Russian
  To use Yandex voices you must request the API key here: [https://tech.yandex.ru/speechkit/cloud/doc/dg/concepts/About-docpage/](https://tech.yandex.ru/speechkit/cloud/doc/dg/concepts/About-docpage/).  [This service will be disabled 1st of Jan 2019 and replaced by Yandex.cloud]
  To use Yandex.cloud you should register here: [https://cloud.yandex.ru/], install SpeechKIT API in the Cloud and get Auth Token and Folder ID as described in API instructions.
- Ivona: English, German, Russian, Italian, Spanish, French, Dansk, Welsh, Icelandic, Dutch, Polish, Portuguese, Romanian, Swedish, Turkish
        To use Amazon(Ivona) voices you need to get access key and secret key [here](http://www.ivona.com/us/for-business/speech-cloud/).
- Cloud:
        To use Cloud voices you need configured cloud adapter. (It can be disabled, but must be configured). This service use AWS Polly and it can be used directly.
- Amazon Web Services (AWS) Polly:

> To use AWS Polly voices you need to create access key and secret key [here](https://console.aws.amazon.com/iam/home). The Amazon documentation can you find [here](http://docs.aws.amazon.com/general/latest/gr/managing-aws-access-keys.html).

- Amazon Web Services (AWS) Neural:

> Neural voices aren't available in all [AWS Regions](https://docs.aws.amazon.com/polly/latest/dg/NTTS-main.html), nor do they support all Amazon Polly features. Many (but not all) of the SSML tags that are supported by Amazon Polly. For more information about NTTS-supported SSML tags, see Supported SSML Tags.

### Offline TTS engines

- PicoTTS (linux only)

> English, German, Italian, Spanish, French

For PicoTTS it is necessary to install the following packages: `libttspico-utils` and lame. Installation command: `sudo apt install libttspico-utils lame`.

### Cloud and Amazon Web Services (AWS) Polly text formatting

You can format your text with [SSML - Speech Synthesis Markup Language](http://docs.aws.amazon.com/polly/latest/dg/ssml.html).

Most useful features:

- `<break time="3s"/>`- make a pause for x seconds (max 10 seconds).
- `<emphasis> big </emphasis>` - make an emphasis on some word.
- `<prosody volume="+6dB" rate="90%">I am speaking this</prosody>` - control speed and volume parameters.
- `<say-as interpret-as="digits">12345</say-as>` - say every digit separately.

More [info](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference).

### System command

If you have some program, that can play audio files locally or somewhere else, you can write this command here. E.g.

```myCustomPlayer --option```

If **System** output is selected, the `sayit` adapter will execute following command on local system:

```myCustomPlayer --option /opt/iobroker/node_modules/iobroker.sayit/say.mp3```

If file name must stay somewhere in the middle you can use *%s* to specify where the file name must be placed:

```myCustomPlayer --option "%s" > /dev/null```

sayIt will make ```myCustomPlayer --option "/opt/iobroker/node_modules/iobroker.sayit/say.mp3" > /dev/null``` from it.

## Usage

SayIt adapter cannot be used alone. It must be controlled from javascript adapter or from "vis" with specific widget.
After creation of adapter instance you can find following objects:

- `sayit.N.tts.text`: Phrase to be spoken.
- `sayit.N.tts.volume`: volume which will be used by playing of the phrase.
- `sayit.N.tts.playing`: true if text is now playing and false if not. Supported only for "windows" and "system" play mode.
- `sayit.N.tts.cachetext`: Phrase to be cached, and then it can be used without internet.
   E.g. you can enter here manually "No internet" and if ping to google.com is negative, write  "No internet" to "tts.text" and it will be pronounced. Of course cache must be enabled.

State **tts.text** supports extended syntax, so the language/engine and volume can be defined together with text. It is used to enable multi-language text2speech engines.
E.g. if adapter has engine "Google-english", it is possible with phrase ```de:Sag es``` to force using Google-Deutsch speech engine.

With ```ru;75;Погода хорошая``` we can force using russian language and volume 75%.

You can specify the volume of announcement in percent from current or given volume (not from maximal). E.g. if command is ```de;75;Gutes Wetter```and "announce volume" is 50%, the announcement will be played with volume 38% from 100% possible.

The system command to play the mp3 file can be specified too. If you leave it blank, the default settings will be used: windows - `cmdmp3.exe`, OSX - `/usr/bin/afplay`, linux - `mpg321` or `omxplayer` (recommended).

To install omxplayer write ```sudo apt-get install omxplayer``` or write ```sudo apt-get install mpg321``` to install mpg321.

**Note:** The default announce selection will be possible only after start of the instance.

## Priorities

To immediately pronounce the text despite the queued texts you have 2 possibilities:

- place "!" as a first character in text, so this text will be pronounced immediately after current one.
- write true into "tts.clearQueue" state and the queue will be cleared. After that you can write a new text into "tts.text", but all queued texts are thrown away.
