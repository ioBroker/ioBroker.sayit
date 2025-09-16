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
    | 'en-US_CLOUD_Male_Chipmunk'
    | 'en-US_CLOUD_Male_Eric'
    | 'en-US_CLOUD_Female_Ivy'
    | 'en-US_CLOUD_Female_Jennifer'
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
    | 'pl-PL_CLOUD_Female_Agnieszka'
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
    | 'en-US_AP_Male_Chipmunk'
    | 'en-US_AP_Male_Eric'
    | 'en-US_AP_Female_Ivy'
    | 'en-US_AP_Female_Jennifer'
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
    | 'pl-PL_AP_Female_Agnieszka'
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
    | 'ko-KR_AP_Female';

export interface SayItAdapterConfig {
    type:
        | 'system'
        | 'mp24ftp'
        | 'mp24'
        | 'chromecast'
        | 'googleHome'
        | 'sonos'
        | 'browser'
        | 'mpd'
        | 'heos'
        | 'windows';
    systemCommand: string;
    systemPlayer: string;
    cache: boolean;
    cacheExpiryDays: number;
    cacheDir: string;
    engine: EngineType;
    sonosDevice: string;
    heosDevice: string;
    mpdInstance: string;
    googleHomeServer: string;
    chromecastDevice: string;
    mp24Server: string;
    ftpPort: number | string;
    ftpUser: string;
    ftpPassword: string;
    browserInstance: string;
    browserVis: '' | '1' | '2';
    webInstance: `${string}.${number}`;
    webServer: string;
    announce: string;
    annoTimeout: number | string;
    annoDuration: number | string;
    annoVolume: number | string;
    cloudAppKey: string;
    cloudInstance: string;
    yandexEffectVoice: string;
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
    convertedV1toV2: boolean;
    coquiVocoder: string;
    volume: number | string;
}

export type TestOptions = {
    type: SayItAdapterConfig['type'];
    engine: EngineType;
    browserInstance?: `${string}.${number}`;
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
