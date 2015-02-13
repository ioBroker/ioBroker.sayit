![Logo](admin/sayit.png)
ioBroker sayit adapter
=================
SayIt Adapter can convert text to speech and play it on some device or different devices.
The specific variable should be written with the text to hear the voice.
E.g. if the variable has ID 72910, it can be written with text "Say it in browser".
The Variable *72903* writes automatically the given text into all conifuged outputs, the same as you write all configured variables with the same text.
For every variable/Object can be setup where the text will be played. Actuall following outputs are supported:"

- *Browser* - the text will be played by browser with opened DashUI page. It is almost by every desktop browser supported and by few mobily Browsers.
- <a href=\"http://www.home-24.net/index.php?app=media\">Home24- MediaPlayer</a> - the text will be sent and played to the Android device with Home24 - MediaPlayer installed. For this will be used build in Android text to speech engine. The port cannot be changed and set to 50000.
- <a href=\"https://play.google.com/store/apps/details?id=lutey.FTPServer\">Home24 - MediaPlayer and FTP Server</a></b> - the text will be sent and played to the Android device with Home24 - MediaPlayer installed. For this will be used the Google text to speech engine. Generated mp3 file will be copied over FTP to android device and played with Home24 - MediaPlayer.
    Both apps have to have same home directories. (E.g. root directory of \"sd card\").
- *System* - the text will be played by OS, where the ioBroker adapter runs. Following OS are supported: Windows, linux, Mac OSx.
- *Windows engine* - the text will be played by windows, where the CCU.IO runs. For this will be used windows text to speech engine, that should be preconfigured by user.
- *Sonos* - play text on sonos device

To enable the text to speech on RaspberryPI or linux system call one time following command ```sudo apt-get -y install mpg321``` to install mpg321.
The mp3/wav files can be played to by wrinting its name into the object. (e.g. "dashui/img/door-bell.mp3")

## Changelog
### 0.0.2 (2015-02-12)
* (bluefox) enable be a part of "web"

### 0.0.1 (2015-02-06)
* (bluefox) initial commit

## Install

```node iobroker.js add simple-api```

## Usage
Assume, we have no security and the server runs on default port 8087.

For all queries the name or id of the state can be specified.

For every requiest that returns JSON you can set parameter *prettyPrint* to get the output in human readable form.

If authentication is enabled, two other fields are mandatory: <pre>?user=admin&pass=iobroker</pre>

