type EngineType =
    | 'en'
    | 'de'
    | 'pl'
    | 'uk'
    | 'ru'
    | 'it'
    | 'pt'
    | 'es'
    | 'fr'
    | 'nl'
    | 'zh-CN'
    | 'ru_YA'
    | 'ru_YA_CLOUD'
    | 'ru-RU_CLOUD_Female'
    | 'ru-RU_CLOUD_Male'
    | 'de-DE_CLOUD_Female'
    | 'de-DE_CLOUD_Male'
    | 'de-DE_CLOUD_Female_Vicki'
    | 'de-DE_CLOUD_Male_Daniel'
    | 'de-AT_CLOUD_Female_Hannah'
    | 'en-US_CLOUD_Female'
    | 'en-US_CLOUD_Male'
    | 'da-DK_CLOUD_Female'
    | 'da-DK_CLOUD_Male'
    | 'en-AU_CLOUD_Female'
    | 'en-AU_CLOUD_Male'
    | 'en-GB_CLOUD_Female_Amy'
    | 'en-GB_CLOUD_Male'
    | 'en-GB_CLOUD_Female_Emma'
    | 'en-GB_CLOUD_Male_Arthur'
    | 'en-GB-WLS_CLOUD_Female'
    | 'en-GB-WLS_CLOUD_Male'
    | 'cy-GB_CLOUD_Female'
    | 'cy-GB_CLOUD_Male'
    | 'en-IN_CLOUD_Female'
    | 'en-US_CLOUD_Female_Ivy'
    | 'en-US_CLOUD_Male_Justin'
    | 'en-US_CLOUD_Female_Kendra'
    | 'en-US_CLOUD_Female_Kimberly'
    | 'es-ES_CLOUD_Female'
    | 'es-ES_CLOUD_Male'
    | 'es-US_CLOUD_Female'
    | 'es-US_CLOUD_Male'
    | 'fr-CA_CLOUD_Female'
    | 'fr-FR_CLOUD_Female'
    | 'fr-FR_CLOUD_Male'
    | 'is-IS_CLOUD_Female'
    | 'is-IS_CLOUD_Male'
    | 'it-IT_CLOUD_Female'
    | 'it-IT_CLOUD_Male'
    | 'no-NO_CLOUD_Female'
    | 'no-NO_CLOUD_Female_Ida'
    | 'nl-NL_CLOUD_Female'
    | 'nl-NL_CLOUD_Male'
    | 'pl-PL_CLOUD_Male_Jacek'
    | 'pl-PL_CLOUD_Female_Ewa'
    | 'pl-PL_CLOUD_Male_Jan'
    | 'pl-PL_CLOUD_Female'
    | 'pt-BR_CLOUD_Female'
    | 'pt-BR_CLOUD_Male'
    | 'pt-BR_CLOUD_Female_Camila'
    | 'pt-PT_CLOUD_Male'
    | 'pt-PT_CLOUD_Female'
    | 'ro-RO_CLOUD_Female'
    | 'sv-SE_CLOUD_Female'
    | 'tr-TR_CLOUD_Female'
    | 'ko-KR_CLOUD_Female'
    | 'en-US'
    | 'en-GB'
    | 'de-DE'
    | 'it-IT'
    | 'es-ES'
    | 'fr-FR'
    | 'ru-RU'
    | 'en_CoquiTTS'
    | 'es_CoquiTTS'
    | 'fr_CoquiTTS'
    | 'de_CoquiTTS'
    | 'nl_CoquiTTS'
    | 'ja_CoquiTTS'
    | 'ru-RU_AP_Female'
    | 'ru-RU_AP_Male'
    | 'de-DE_AP_Female'
    | 'de-DE_AP_Female_Vicki'
    | 'de-DE_AP_Male'
    | 'de-DE_AP_Male_Daniel'
    | 'de-AT_AP_Female_Hannah'
    | 'en-US_AP_Female'
    | 'en-US_AP_Male'
    | 'da-DK_AP_Female'
    | 'da-DK_AP_Male'
    | 'en-AU_AP_Female'
    | 'en-AU_AP_Male'
    | 'en-GB_AP_Female_Amy'
    | 'en-GB_AP_Male'
    | 'en-GB_AP_Female_Emma'
    | 'en-GB_AP_Male_Arthur'
    | 'en-GB-WLS_AP_Female'
    | 'en-GB-WLS_AP_Male'
    | 'cy-GB_AP_Female'
    | 'cy-GB_AP_Male'
    | 'en-IN_AP_Female'
    | 'en-US_AP_Female_Ivy'
    | 'en-US_AP_Male_Justin'
    | 'en-US_AP_Female_Kendra'
    | 'en-US_AP_Female_Kimberly'
    | 'es-ES_AP_Female'
    | 'es-ES_AP_Male'
    | 'es-US_AP_Female'
    | 'es-US_AP_Male'
    | 'fr-CA_AP_Female'
    | 'fr-FR_AP_Female'
    | 'fr-FR_AP_Male'
    | 'is-IS_AP_Female'
    | 'is-IS_AP_Male'
    | 'it-IT_AP_Female'
    | 'it-IT_AP_Male'
    | 'no-NO_AP_Female'
    | 'no-NO_AP_Female_Ida'
    | 'nl-NL_AP_Female'
    | 'nl-NL_AP_Male'
    | 'pl-PL_AP_Male_Jacek'
    | 'pl-PL_AP_Female_Ewa'
    | 'pl-PL_AP_Male_Jan'
    | 'pl-PL_AP_Female'
    | 'pt-BR_AP_Female'
    | 'pt-BR_AP_Male'
    | 'pt-PT_AP_Male'
    | 'pt-PT_AP_Female'
    | 'ro-RO_AP_Female'
    | 'sv-SE_AP_Female'
    | 'tr-TR_AP_Female'
    | 'ko-KR_AP_Female'
    | 'en-US_AP_Female_Joanna'
    | 'en-US_AP_Male_Kevin'
    | 'en-US_AP_Male_Matthew'
    | 'en-US_AP_Female_Ruth'
    | 'en-US_AP_Male_Stephen'
    | 'en-AU_AP_Female_Olivia'
    | 'en-IE_AP_Female_Niamh'
    | 'en-NZ_AP_Female_Aria'
    | 'en-ZA_AP_Female_Ayanda'
    | 'fr-FR_AP_Female_Lea'
    | 'fr-FR_AP_Male_Remi'
    | 'fr-CA_AP_Female_Gabrielle'
    | 'fr-CA_AP_Male_Liam'
    | 'fr-BE_AP_Female_Isabelle'
    | 'es-ES_AP_Female_Lucia'
    | 'es-ES_AP_Male_Sergio'
    | 'es-US_AP_Female_Lupe'
    | 'es-MX_AP_Male_Andres'
    | 'es-MX_AP_Female_Mia'
    | 'it-IT_AP_Female_Bianca'
    | 'it-IT_AP_Male_Adriano'
    | 'pt-BR_AP_Female_Camila'
    | 'pt-BR_AP_Male_Thiago'
    | 'nl-BE_AP_Female_Lisa'
    | 'pl-PL_AP_Female_Ola'
    | 'da-DK_AP_Female_Sofie'
    | 'sv-SE_AP_Female_Elin'
    | 'ja-JP_AP_Female_Mizuki'
    | 'ja-JP_AP_Male_Takumi'
    | 'ja-JP_AP_Female_Tomoko'
    | 'ja-JP_AP_Female_Kazuha'
    | 'zh-CN_AP_Female_Zhiyu'
    | 'hi-IN_AP_Female_Aditi'
    | 'hi-IN_AP_Female_Kajal'
    | 'ar-XL_AP_Male_Zayd'
    | 'ar-XL_AP_Female_Hala'
    | 'ca-ES_AP_Female_Arlet'
    | 'sk-SK_AP_Female_Laura'
    | 'fi-FI_AP_Female_Suvi';

/**
 * Configuration of the adapter instance.
 * The default values are defined in the "native" section of io-package.json.
 */
export interface SayItAdapterConfig {
    /** Type of the output device */
    type:
        'system' | 'mp24ftp' | 'mp24' | 'chromecast' | 'googleHome' | 'sonos' | 'browser' | 'mpd' | 'heos' | 'windows';
    /** Own play command for the type "system". "%s" will be replaced by the file name */
    systemCommand: string;
    /** Player used for the type "system" on linux: "mpg321", "omxplayer" or "mplayer" */
    systemPlayer: string;
    /** Store the generated files on the disk */
    cache: boolean;
    /** Delete cached files after this number of days. 0 - never delete */
    cacheExpiryDays: number;
    /** Cache directory. Relative paths are relative to the adapter directory */
    cacheDir: string;
    /** Engine (voice) used for the text generation */
    engine: EngineType;
    /** ID of the sonos device, like "sonos.0.root.192_168_1_1" */
    sonosDevice: string;
    /** ID of the HEOS player, like "heos.0.players.123456" */
    heosDevice: string;
    /** Instance of the MPD adapter, like "mpd.0" */
    mpdInstance: string;
    /** IP address of the google home device */
    googleHomeServer: string;
    /** ID of the chromecast device, like "chromecast.0.MyDevice" */
    chromecastDevice: string;
    /** IP address of the android device with the MediaPlayer24 app */
    mp24Server: string;
    ftpPort: number | string;
    ftpUser: string;
    ftpPassword: string;
    /** Name of the browser instance for vis or "FFFFFFFF" for all instances */
    browserInstance: string;
    /** Which vis version must be controlled: "" - both, "1" - vis, "2" - vis-2 */
    browserVis: '' | '1' | '2';
    /** Instance of the web adapter, like "web.0" */
    webInstance: `${string}.${number}`;
    /** IP address of the web server. Used if the web adapter is bound to 0.0.0.0 */
    webServer: string;
    /** Name of the announcement file in the "tts.userfiles" storage */
    announce: string;
    /** Time in seconds after the last text, when the announcement must be played again */
    annoTimeout: number | string;
    /** Duration of the announcement in seconds. 0 - detect automatically */
    annoDuration: number | string;
    /** Volume of the announcement in percent of the actual volume */
    annoVolume: number | string;
    cloudAppKey: string;
    /** Instance of the cloud adapter, like "cloud.0" */
    cloudInstance: string;
    yandexKey: string;
    yandexEmotion: string;
    yandexFolderID: string;
    yandexCloudVoice: string;
    yandexVoice: string;
    yandexDrunk: boolean;
    yandexIll: boolean;
    yandexRobot: boolean;
    awsAccessKey: string;
    awsSecretKey: string;
    awsRegion: string;
    /** True if the configuration was already converted from version 1 to version 2 */
    convertedV1toV2: boolean;
    /** Model and vocoder for CoquiTTS, like "ljspeech univnet" */
    coquiVocoder: string;
    /** Fixed volume in percent. If empty, the value of the state "tts.volume" will be used */
    volume: number | string;
}

export type TestOptions = {
    type: SayItAdapterConfig['type'];
    engine: EngineType;
    browserInstance?: string;
    browserVis?: '' | '1' | '2';
    sonosDevice?: string;
    webServer?: string;
    webInstance?: `${string}.${number}`;
    heosDevice?: string;
    mpdInstance?: `${string}.${number}`;
    chromecastDevice?: string;
    googleHomeServer?: string;
    mp24Server?: string;
    ftpPort?: string;
    ftpUser?: string;
    ftpPassword?: string;
    systemCommand?: string;
    systemPlayer?: string;
    yandexCloudVoice?: string;
    yandexKey?: string;
    yandexEmotion?: string;
    yandexFolderID?: string;
    yandexVoice?: string;
    yandexDrunk?: boolean;
    yandexIll?: boolean;
    yandexRobot?: boolean;
    awsAccessKey?: string;
    awsSecretKey?: string;
    awsRegion?: string;
    coquiVocoder?: string;
    cloudAppKey?: string;
    cloudInstance?: string;
    annoVolume?: number | string;
    announce?: string;
    annoTimeout?: number | string;
    volume?: number | string;
    callback?: (error?: string) => void;
};

export type SayItProps = {
    text: string;
    fileName?: string;

    type: SayItAdapterConfig['type'];
    language: EngineType;
    volume?: number;
    testOptions?: TestOptions;
};

export type SayItDeviceProps = SayItProps & { duration: number };
