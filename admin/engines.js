var sayitEngines = {
    "en":       {name: "Google - English",         engine: "google",  params: []},
    "de":       {name: "Google - Deutsch",         engine: "google",  params: []},
    "ru":       {name: "Google - Русский",         engine: "google",  params: []},
    "it":       {name: "Google - Italiano",        engine: "google",  params: []},
    "es":       {name: "Google - Espaniol",        engine: "google",  params: []},
    "fr":       {name: "Google - Français",        engine: "google",  params: []},
    "ru_YA":    {name: "Yandex - Русский",         engine: "yandex",  params: ['key', 'voice', 'emotion', 'ill', 'drunk', 'robot'], voice: ['jane', 'zahar'], emotion: ['none', 'good', 'neutral', 'evil', 'mixed']},

    "en-US":    {name: "PicoTTS - Englisch US",    engine: "PicoTTS", params: []},
    "en-GB":    {name: "PicoTTS - Englisch GB",    engine: "PicoTTS", params: []},
    "de-DE":    {name: "PicoTTS - Deutsch",        engine: "PicoTTS", params: []},
    "it-IT":    {name: "PicoTTS - Italiano",       engine: "PicoTTS", params: []},
    "es-ES":    {name: "PicoTTS - Espaniol",       engine: "PicoTTS", params: []},
    "fr-FR":    {name: "PicoTTS - Français",       engine: "PicoTTS", params: []},

    "ru-RU_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "ru-RU",      ename: "Tatyana",    name: "Cloud - Русский - Татьяна"},
    "ru-RU_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "ru-RU",      ename: "Maxim",      name: "Cloud - Русский - Максим"},
    "de-DE_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "de-DE",      ename: "Marlene",    name: "Cloud - Deutsch - Marlene"},
    "de-DE_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "de-DE",      ename: "Hans",       name: "Cloud - Deutsch - Hans"},
    "en-US_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-US",      ename: "Salli",      name: "Cloud - en-US - Female - Salli"},
    "en-US_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-US",      ename: "Joey",       name: "Cloud - en-US - Male - Joey"},
    "da-DK_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "da-DK",      ename: "Naja",       name: "Cloud - da-DK - Female - Naja"},
    "da-DK_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "da-DK",      ename: "Mads",       name: "Cloud - da-DK - Male - Mads"},
    "en-AU_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-AU",      ename: "Nicole",     name: "Cloud - en-AU - Female - Nicole"},
    "en-AU_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-AU",      ename: "Russell",    name: "Cloud - en-AU - Male - Russell"},
    "en-GB_CLOUD_Female_Amy":   {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-GB",      ename: "Amy",        name: "Cloud - en-GB - Female - Amy"},
    "en-GB_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-GB",      ename: "Brian",      name: "Cloud - en-GB - Male - Brian"},
    "en-GB_CLOUD_Female_Emma":  {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-GB",      ename: "Emma",       name: "Cloud - en-GB - Female - Emma"},
    "en-GB-WLS_CLOUD_Female":   {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-GB-WLS",  ename: "Gwyneth",    name: "Cloud - en-GB-WLS - Female - Gwyneth"},
    "en-GB-WLS_CLOUD_Male":     {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-GB-WLS",  ename: "Geraint",    name: "Cloud - en-GB-WLS - Male - Geraint"},
    "cy-GB_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "cy-GB",      ename: "Gwyneth",    name: "Cloud - cy-GB - Female - Gwyneth"},
    "cy-GB_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "cy-GB",      ename: "Geraint",    name: "Cloud - cy-GB - Male - Geraint"},
    "en-IN_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-IN",      ename: "Raveena",    name: "Cloud - en-IN - Female - Raveena"},
    "en-US_CLOUD_Male_Chipmunk":{gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-US",      ename: "Chipmunk",   name: "Cloud - en-US - Male - Chipmunk"},
    "en-US_CLOUD_Male_Eric":    {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-US",      ename: "Eric",       name: "Cloud - en-US - Male - Eric"},
    "en-US_CLOUD_Female_Ivy":   {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-US",      ename: "Ivy",        name: "Cloud - en-US - Female - Ivy"},
    "en-US_CLOUD_Female_Jennifer": {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-US",   ename: "Jennifer",   name: "Cloud - en-US - Female - Jennifer"},
    "en-US_CLOUD_Male_Justin":  {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "en-US",      ename: "Justin",     name: "Cloud - en-US - Male - Justin"},
    "en-US_CLOUD_Female_Kendra": {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-US",     ename: "Kendra",     name: "Cloud - en-US - Female - Kendra"},
    "en-US_CLOUD_Female_Kimberly": {gender: "Female", engine: "cloud",   params: ['cloud'], language: "en-US",   ename: "Kimberly",   name: "Cloud - en-US - Female - Kimberly"},
    "es-ES_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "es-ES",      ename: "Conchita",   name: "Cloud - es-ES - Female - Conchita"},
    "es-ES_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "es-ES",      ename: "Enrique",    name: "Cloud - es-ES - Male - Enrique"},
    "es-US_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "es-US",      ename: "Penelope",   name: "Cloud - es-US - Female - Penelope"},
    "es-US_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "es-US",      ename: "Miguel",     name: "Cloud - es-US - Male - Miguel"},
    "fr-CA_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "fr-CA",      ename: "Chantal",    name: "Cloud - fr-CA - Female - Chantal"},
    "fr-FR_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "fr-FR",      ename: "Celine",     name: "Cloud - fr-FR - Female - Celine"},
    "fr-FR_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "fr-FR",      ename: "Mathieu",    name: "Cloud - fr-FR - Male - Mathieu"},
    "is-IS_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "is-IS",      ename: "Dora",       name: "Cloud - is-IS - Female - Dora"},
    "is-IS_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "is-IS",      ename: "Karl",       name: "Cloud - is-IS - Male - Karl"},
    "it-IT_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "it-IT",      ename: "Carla",      name: "Cloud - it-IT - Female - Carla"},
    "it-IT_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "it-IT",      ename: "Giorgio",    name: "Cloud - it-IT - Male - Giorgio"},
    "nb-NO_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "nb-NO",      ename: "Liv",        name: "Cloud - nb-NO - Female - Liv"},
    "nl-NL_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "nl-NL",      ename: "Lotte",      name: "Cloud - nl-NL - Female - Lotte"},
    "nl-NL_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "nl-NL",      ename: "Ruben",      name: "Cloud - nl-NL - Male - Ruben"},
    "pl-PL_CLOUD_Female_Agnieszka":{gender: "Female", engine: "cloud",params: ['cloud'], language: "pl-PL",      ename: "Agnieszka",  name: "Cloud - pl-PL - Female - Agnieszka"},
    "pl-PL_CLOUD_Male_Jacek":   {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "pl-PL",      ename: "Jacek",      name: "Cloud - pl-PL - Male - Jacek"},
    "pl-PL_CLOUD_Female_Ewa":   {gender: "Female", engine: "cloud",   params: ['cloud'], language: "pl-PL",      ename: "Ewa",        name: "Cloud - pl-PL - Female - Ewa"},
    "pl-PL_CLOUD_Male_Jan":     {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "pl-PL",      ename: "Jan",        name: "Cloud - pl-PL - Male - Jan"},
    "pl-PL_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "pl-PL",      ename: "Maja",       name: "Cloud - pl-PL - Female - Maja"},
    "pt-BR_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "pt-BR",      ename: "Vitoria",    name: "Cloud - pt-BR - Female - Vitoria"},
    "pt-BR_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "pt-BR",      ename: "Ricardo",    name: "Cloud - pt-BR - Male - Ricardo"},
    "pt-PT_CLOUD_Male":         {gender: "Male",   engine: "cloud",   params: ['cloud'], language: "pt-PT",      ename: "Cristiano",  name: "Cloud - pt-PT - Male - Cristiano"},
    "pt-PT_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "pt-PT",      ename: "Ines",       name: "Cloud - pt-PT - Female - Ines"},
    "ro-RO_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "ro-RO",      ename: "Carmen",     name: "Cloud - ro-RO - Female - Carmen"},
    "sv-SE_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "sv-SE",      ename: "Astrid",     name: "Cloud - sv-SE - Female - Astrid"},
    "tr-TR_CLOUD_Female":       {gender: "Female", engine: "cloud",   params: ['cloud'], language: "tr-TR",      ename: "Filiz",      name: "Cloud - tr-TR - Female - Filiz"},

    "ru-RU_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "ru-RU",      ename: "Tatyana",    name: "AWS Polly - Русский - Татьяна"},
    "ru-RU_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "ru-RU",      ename: "Maxim",      name: "AWS Polly - Русский - Максим"},
    "de-DE_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "de-DE",      ename: "Marlene",    name: "AWS Polly - Deutsch - Marlene"},
    "de-DE_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "de-DE",      ename: "Hans",       name: "AWS Polly - Deutsch - Hans"},
    "en-US_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Salli",      name: "AWS Polly - en-US - Female - Salli"},
    "en-US_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Joey",       name: "AWS Polly - en-US - Male - Joey"},
    "da-DK_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "da-DK",      ename: "Naja",       name: "AWS Polly - da-DK - Female - Naja"},
    "da-DK_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "da-DK",      ename: "Mads",       name: "AWS Polly - da-DK - Male - Mads"},
    "en-AU_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-AU",      ename: "Nicole",     name: "AWS Polly - en-AU - Female - Nicole"},
    "en-AU_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-AU",      ename: "Russell",    name: "AWS Polly - en-AU - Male - Russell"},
    "en-GB_AP_Female_Amy":      {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-GB",      ename: "Amy",        name: "AWS Polly - en-GB - Female - Amy"},
    "en-GB_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-GB",      ename: "Brian",      name: "AWS Polly - en-GB - Male - Brian"},
    "en-GB_AP_Female_Emma":     {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-GB",      ename: "Emma",       name: "AWS Polly - en-GB - Female - Emma"},
    "en-GB-WLS_AP_Female":      {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-GB-WLS",  ename: "Gwyneth",    name: "AWS Polly - en-GB-WLS - Female - Gwyneth"},
    "en-GB-WLS_AP_Male":        {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-GB-WLS",  ename: "Geraint",    name: "AWS Polly - en-GB-WLS - Male - Geraint"},
    "cy-GB_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "cy-GB",      ename: "Gwyneth",    name: "AWS Polly - cy-GB - Female - Gwyneth"},
    "cy-GB_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "cy-GB",      ename: "Geraint",    name: "AWS Polly - cy-GB - Male - Geraint"},
    "en-IN_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-IN",      ename: "Raveena",    name: "AWS Polly - en-IN - Female - Raveena"},
    "en-US_AP_Male_Chipmunk":   {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Chipmunk",   name: "AWS Polly - en-US - Male - Chipmunk"},
    "en-US_AP_Male_Eric":       {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Eric",       name: "AWS Polly - en-US - Male - Eric"},
    "en-US_AP_Female_Ivy":      {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Ivy",        name: "AWS Polly - en-US - Female - Ivy"},
    "en-US_AP_Female_Jennifer": {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Jennifer",   name: "AWS Polly - en-US - Female - Jennifer"},
    "en-US_AP_Male_Justin":     {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Justin",     name: "AWS Polly - en-US - Male - Justin"},
    "en-US_AP_Female_Kendra":   {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Kendra",     name: "AWS Polly - en-US - Female - Kendra"},
    "en-US_AP_Female_Kimberly": {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "en-US",      ename: "Kimberly",   name: "AWS Polly - en-US - Female - Kimberly"},
    "es-ES_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "es-ES",      ename: "Conchita",   name: "AWS Polly - es-ES - Female - Conchita"},
    "es-ES_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "es-ES",      ename: "Enrique",    name: "AWS Polly - es-ES - Male - Enrique"},
    "es-US_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "es-US",      ename: "Penelope",   name: "AWS Polly - es-US - Female - Penelope"},
    "es-US_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "es-US",      ename: "Miguel",     name: "AWS Polly - es-US - Male - Miguel"},
    "fr-CA_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "fr-CA",      ename: "Chantal",    name: "AWS Polly - fr-CA - Female - Chantal"},
    "fr-FR_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "fr-FR",      ename: "Celine",     name: "AWS Polly - fr-FR - Female - Celine"},
    "fr-FR_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "fr-FR",      ename: "Mathieu",    name: "AWS Polly - fr-FR - Male - Mathieu"},
    "is-IS_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "is-IS",      ename: "Dora",       name: "AWS Polly - is-IS - Female - Dora"},
    "is-IS_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "is-IS",      ename: "Karl",       name: "AWS Polly - is-IS - Male - Karl"},
    "it-IT_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "it-IT",      ename: "Carla",      name: "AWS Polly - it-IT - Female - Carla"},
    "it-IT_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "it-IT",      ename: "Giorgio",    name: "AWS Polly - it-IT - Male - Giorgio"},
    "nb-NO_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "nb-NO",      ename: "Liv",        name: "AWS Polly - nb-NO - Female - Liv"},
    "nl-NL_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "nl-NL",      ename: "Lotte",      name: "AWS Polly - nl-NL - Female - Lotte"},
    "nl-NL_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "nl-NL",      ename: "Ruben",      name: "AWS Polly - nl-NL - Male - Ruben"},
    "pl-PL_AP_Female_Agnieszka":{gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pl-PL",      ename: "Agnieszka",  name: "AWS Polly - pl-PL - Female - Agnieszka"},
    "pl-PL_AP_Male_Jacek":      {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pl-PL",      ename: "Jacek",      name: "AWS Polly - pl-PL - Male - Jacek"},
    "pl-PL_AP_Female_Ewa":      {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pl-PL",      ename: "Ewa",        name: "AWS Polly - pl-PL - Female - Ewa"},
    "pl-PL_AP_Male_Jan":        {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pl-PL",      ename: "Jan",        name: "AWS Polly - pl-PL - Male - Jan"},
    "pl-PL_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pl-PL",      ename: "Maja",       name: "AWS Polly - pl-PL - Female - Maja"},
    "pt-BR_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pt-BR",      ename: "Vitoria",    name: "AWS Polly - pt-BR - Female - Vitoria"},
    "pt-BR_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pt-BR",      ename: "Ricardo",    name: "AWS Polly - pt-BR - Male - Ricardo"},
    "pt-PT_AP_Male":            {gender: "Male",   engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pt-PT",      ename: "Cristiano",  name: "AWS Polly - pt-PT - Male - Cristiano"},
    "pt-PT_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "pt-PT",      ename: "Ines",       name: "AWS Polly - pt-PT - Female - Ines"},
    "ro-RO_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "ro-RO",      ename: "Carmen",     name: "AWS Polly - ro-RO - Female - Carmen"},
    "sv-SE_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "sv-SE",      ename: "Astrid",     name: "AWS Polly - sv-SE - Female - Astrid"},
    "tr-TR_AP_Female":          {gender: "Female", engine: "polly",   params: ['accessKey', 'secretKey', 'region'], language: "tr-TR",      ename: "Filiz",      name: "AWS Polly - tr-TR - Female - Filiz"},

    "ru-RU_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "ru-RU",      name: "Ivona - Русский - Татьяна"},
    "ru-RU_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "ru-RU",      name: "Ivona - Русский - Максим"},
    "de-DE_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "de-DE",      name: "Ivona - Deutsch - Marlene"},
    "de-DE_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "de-DE",      name: "Ivona - Deutsch - Hans"},
    "en-US_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-US",      name: "Ivona - en-US - Female - Salli"},
    "en-US_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-US",      name: "Ivona - en-US - Male - Joey"},
    "da-DK_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "da-DK",      name: "Ivona - da-DK - Female - Naja"},
    "da-DK_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "da-DK",      name: "Ivona - da-DK - Male - Mads"},
    "en-AU_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-AU",      name: "Ivona - en-AU - Female - Nicole"},
    "en-AU_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-AU",      name: "Ivona - en-AU - Male - Russell"},
    "en-GB_AZ_Female_Amy":      {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-GB",      name: "Ivona - en-GB - Female - Amy"},
    "en-GB_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-GB",      name: "Ivona - en-GB - Male - Brian"},
    "en-GB_AZ_Female_Emma":     {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-GB",      name: "Ivona - en-GB - Female - Emma"},
    "en-GB-WLS_AZ_Female":      {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-GB-WLS",  name: "Ivona - en-GB-WLS - Female - Gwyneth"},
    "en-GB-WLS_AZ_Male":        {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-GB-WLS",  name: "Ivona - en-GB-WLS - Male - Geraint"},
    "cy-GB_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "cy-GB",      name: "Ivona - cy-GB - Female - Gwyneth"},
    "cy-GB_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "cy-GB",      name: "Ivona - cy-GB - Male - Geraint"},
    "en-IN_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-IN",      name: "Ivona - en-IN - Female - Raveena"},
    "en-US_AZ_Male_Chipmunk":   {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-US",      name: "Ivona - en-US - Male - Chipmunk"},
    "en-US_AZ_Male_Eric":       {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-US",      name: "Ivona - en-US - Male - Eric"},
    "en-US_AZ_Female_Ivy":      {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-US",      name: "Ivona - en-US - Female - Ivy"},
    "en-US_AZ_Female_Jennifer": {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-US",      name: "Ivona - en-US - Female - Jennifer"},
    "en-US_AZ_Male_Justin":     {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-US",      name: "Ivona - en-US - Male - Justin"},
    "en-US_AZ_Female_Kendra":   {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-US",      name: "Ivona - en-US - Female - Kendra"},
    "en-US_AZ_Female_Kimberly": {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "en-US",      name: "Ivona - en-US - Female - Kimberly"},
    "es-ES_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "es-ES",      name: "Ivona - es-ES - Female - Conchita"},
    "es-ES_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "es-ES",      name: "Ivona - es-ES - Male - Enrique"},
    "es-US_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "es-US",      name: "Ivona - es-US - Female - Penelope"},
    "es-US_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "es-US",      name: "Ivona - es-US - Male - Miguel"},
    "fr-CA_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "fr-CA",      name: "Ivona - fr-CA - Female - Chantal"},
    "fr-FR_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "fr-FR",      name: "Ivona - fr-FR - Female - Celine"},
    "fr-FR_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "fr-FR",      name: "Ivona - fr-FR - Male - Mathieu"},
    "is-IS_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "is-IS",      name: "Ivona - is-IS - Female - Dora"},
    "is-IS_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "is-IS",      name: "Ivona - is-IS - Male - Karl"},
    "it-IT_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "it-IT",      name: "Ivona - it-IT - Female - Carla"},
    "it-IT_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "it-IT",      name: "Ivona - it-IT - Male - Giorgio"},
    "nb-NO_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "nb-NO",      name: "Ivona - nb-NO - Female - Liv"},
    "nl-NL_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "nl-NL",      name: "Ivona - nl-NL - Female - Lotte"},
    "nl-NL_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "nl-NL",      name: "Ivona - nl-NL - Male - Ruben"},
    "pl-PL_AZ_Female_Agnieszka":{gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "pl-PL",      name: "Ivona - pl-PL - Female - Agnieszka"},
    "pl-PL_AZ_Male_Jacek":      {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "pl-PL",      name: "Ivona - pl-PL - Male - Jacek"},
    "pl-PL_AZ_Female_Ewa":      {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "pl-PL",      name: "Ivona - pl-PL - Female - Ewa"},
    "pl-PL_AZ_Male_Jan":        {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "pl-PL",      name: "Ivona - pl-PL - Male - Jan"},
    "pl-PL_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "pl-PL",      name: "Ivona - pl-PL - Female - Maja"},
    "pt-BR_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "pt-BR",      name: "Ivona - pt-BR - Female - Vitoria"},
    "pt-BR_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "pt-BR",      name: "Ivona - pt-BR - Male - Ricardo"},
    "pt-PT_AZ_Male":            {gender: "Male",   engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "pt-PT",      name: "Ivona - pt-PT - Male - Cristiano"},
    "pt-PT_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "pt-PT",      name: "Ivona - pt-PT - Female - Ines"},
    "ro-RO_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "ro-RO",      name: "Ivona - ro-RO - Female - Carmen"},
    "sv-SE_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "sv-SE",      name: "Ivona - sv-SE - Female - Astrid"},
    "tr-TR_AZ_Female":          {gender: "Female", engine: "ivona",   params: ['accessKey', 'secretKey'],           language: "tr-TR",      name: "Ivona - tr-TR - Female - Filiz"}
};

var sayitOptions = {
    "browser":    {name: "Browser",           params: ['cache', 'instance'],                       mp3Required: true,  checkLength: true, server: true,  libs: ['fs', 'crypto', 'http']},
    "mp24ftp":    {name: "MediaPlayer24+FTP", params: ['cache', 'server', 'port', 'user', 'pass'], mp3Required: true,  checkLength: true, server: false, libs: ['fs', 'crypto', 'http', 'jsftp']},
    "mp24":       {name: "MediaPlayer24",     params: ['server'],                                  mp3Required: false, checkLength: true, server: false, libs: ['fs', 'crypto', 'http']},
    "system":     {name: "System",            params: ['cache'],                                   mp3Required: true,  checkLength: false,server: false, libs: ['fs', 'crypto', 'http', 'child_process', 'os']},
    "windows":    {name: "Windows default",   params: [],                                          mp3Required: false, checkLength: true, server: false, libs: ['fs', 'child_process']},
    "sonos":      {name: "Sonos",             params: ['device', 'web', 'webServer'],              mp3Required: true,  checkLength: true, server: true,  libs: ['fs', 'crypto', 'http']},
    "chromecast": {name: "Chromecast",        params: ['cDevice', 'web', 'webServer'],             mp3Required: true,  checkLength: true, server: true,  libs: ['fs', 'crypto', 'http']},
    "mpd":        {name: "MPD",               params: ['mpd_device','web', 'webServer'],           mp3Required: true,  checkLength: true, server: true,  libs: ['fs', 'crypto', 'http']}
};


if (typeof module !== 'undefined' && module.parent) {
    module.exports.sayitEngines = sayitEngines;
    module.exports.sayitOptions = sayitOptions;
}