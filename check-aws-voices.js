const { PollyClient, DescribeVoicesCommand } = require('@aws-sdk/client-polly');

async function getAwsVoices() {
    try {
        // Create a client without credentials to get public voice list
        const client = new PollyClient({ 
            region: 'us-east-1',
            credentials: {
                accessKeyId: 'dummy',
                secretAccessKey: 'dummy'
            }
        });
        
        const command = new DescribeVoicesCommand({});
        const response = await client.send(command);
        
        console.log('AWS Polly Voices:');
        console.log('================');
        
        const voices = response.Voices || [];
        voices.sort((a, b) => {
            if (a.LanguageCode !== b.LanguageCode) {
                return a.LanguageCode.localeCompare(b.LanguageCode);
            }
            return a.Id.localeCompare(b.Id);
        });
        
        console.log(`Total voices found: ${voices.length}`);
        console.log('');
        
        const languageGroups = {};
        voices.forEach(voice => {
            if (!languageGroups[voice.LanguageCode]) {
                languageGroups[voice.LanguageCode] = [];
            }
            languageGroups[voice.LanguageCode].push(voice);
        });
        
        Object.keys(languageGroups).sort().forEach(langCode => {
            console.log(`\n${langCode}:`);
            languageGroups[langCode].forEach(voice => {
                const neural = voice.SupportedEngines?.includes('neural') ? ' [NEURAL]' : '';
                const standard = voice.SupportedEngines?.includes('standard') ? ' [STANDARD]' : '';
                console.log(`  ${voice.Id} (${voice.Gender})${neural}${standard}`);
            });
        });
        
        // Generate structured data for comparison
        console.log('\n\nVoices in JSON format for analysis:');
        console.log('===================================');
        console.log(JSON.stringify(voices.map(v => ({
            id: v.Id,
            language: v.LanguageCode,
            gender: v.Gender,
            engines: v.SupportedEngines
        })), null, 2));
        
    } catch (error) {
        console.error('Error fetching AWS voices:', error.message);
        
        // If API call fails, provide known voices as of 2024
        console.log('\nUsing known AWS Polly voices as of 2024:');
        console.log('=======================================');
        
        const knownVoices = [
            // Standard voices
            { id: 'Aditi', language: 'hi-IN', gender: 'Female', engines: ['standard'] },
            { id: 'Amy', language: 'en-GB', gender: 'Female', engines: ['neural', 'standard'] },
            { id: 'Astrid', language: 'sv-SE', gender: 'Female', engines: ['standard'] },
            { id: 'Bianca', language: 'it-IT', gender: 'Female', engines: ['standard'] },
            { id: 'Brian', language: 'en-GB', gender: 'Male', engines: ['neural', 'standard'] },
            { id: 'Camila', language: 'pt-BR', gender: 'Female', engines: ['neural'] },
            { id: 'Carla', language: 'it-IT', gender: 'Female', engines: ['standard'] },
            { id: 'Carmen', language: 'ro-RO', gender: 'Female', engines: ['standard'] },
            { id: 'Celine', language: 'fr-FR', gender: 'Female', engines: ['standard'] },
            { id: 'Chantal', language: 'fr-CA', gender: 'Female', engines: ['standard'] },
            { id: 'Conchita', language: 'es-ES', gender: 'Female', engines: ['standard'] },
            { id: 'Cristiano', language: 'pt-PT', gender: 'Male', engines: ['standard'] },
            { id: 'Dora', language: 'is-IS', gender: 'Female', engines: ['standard'] },
            { id: 'Emma', language: 'en-GB', gender: 'Female', engines: ['neural', 'standard'] },
            { id: 'Enrique', language: 'es-ES', gender: 'Male', engines: ['standard'] },
            { id: 'Ewa', language: 'pl-PL', gender: 'Female', engines: ['standard'] },
            { id: 'Filiz', language: 'tr-TR', gender: 'Female', engines: ['standard'] },
            { id: 'Gabrielle', language: 'fr-CA', gender: 'Female', engines: ['neural'] },
            { id: 'Geraint', language: 'en-GB-WLS', gender: 'Male', engines: ['standard'] },
            { id: 'Giorgio', language: 'it-IT', gender: 'Male', engines: ['standard'] },
            { id: 'Gwyneth', language: 'cy-GB', gender: 'Female', engines: ['standard'] },
            { id: 'Hans', language: 'de-DE', gender: 'Male', engines: ['standard'] },
            { id: 'Ines', language: 'pt-PT', gender: 'Female', engines: ['standard'] },
            { id: 'Ivy', language: 'en-US', gender: 'Female', engines: ['standard'] },
            { id: 'Jacek', language: 'pl-PL', gender: 'Male', engines: ['standard'] },
            { id: 'Jan', language: 'pl-PL', gender: 'Male', engines: ['standard'] },
            { id: 'Joanna', language: 'en-US', gender: 'Female', engines: ['neural', 'standard'] },
            { id: 'Joey', language: 'en-US', gender: 'Male', engines: ['standard'] },
            { id: 'Justin', language: 'en-US', gender: 'Male', engines: ['standard'] },
            { id: 'Karl', language: 'is-IS', gender: 'Male', engines: ['standard'] },
            { id: 'Kendra', language: 'en-US', gender: 'Female', engines: ['standard'] },
            { id: 'Kevin', language: 'en-US', gender: 'Male', engines: ['neural'] },
            { id: 'Kimberly', language: 'en-US', gender: 'Female', engines: ['standard'] },
            { id: 'Lea', language: 'fr-FR', gender: 'Female', engines: ['neural'] },
            { id: 'Liv', language: 'nb-NO', gender: 'Female', engines: ['standard'] },
            { id: 'Lotte', language: 'nl-NL', gender: 'Female', engines: ['standard'] },
            { id: 'Lucia', language: 'es-ES', gender: 'Female', engines: ['neural'] },
            { id: 'Lupe', language: 'es-US', gender: 'Female', engines: ['neural'] },
            { id: 'Mads', language: 'da-DK', gender: 'Male', engines: ['standard'] },
            { id: 'Maja', language: 'pl-PL', gender: 'Female', engines: ['standard'] },
            { id: 'Marlene', language: 'de-DE', gender: 'Female', engines: ['standard'] },
            { id: 'Mathieu', language: 'fr-FR', gender: 'Male', engines: ['standard'] },
            { id: 'Matthew', language: 'en-US', gender: 'Male', engines: ['neural', 'standard'] },
            { id: 'Maxim', language: 'ru-RU', gender: 'Male', engines: ['standard'] },
            { id: 'Miguel', language: 'es-US', gender: 'Male', engines: ['standard'] },
            { id: 'Mizuki', language: 'ja-JP', gender: 'Female', engines: ['standard'] },
            { id: 'Naja', language: 'da-DK', gender: 'Female', engines: ['standard'] },
            { id: 'Nicole', language: 'en-AU', gender: 'Female', engines: ['standard'] },
            { id: 'Olivia', language: 'en-AU', gender: 'Female', engines: ['neural'] },
            { id: 'Penelope', language: 'es-US', gender: 'Female', engines: ['standard'] },
            { id: 'Raveena', language: 'en-IN', gender: 'Female', engines: ['standard'] },
            { id: 'Ricardo', language: 'pt-BR', gender: 'Male', engines: ['standard'] },
            { id: 'Ruben', language: 'nl-NL', gender: 'Male', engines: ['standard'] },
            { id: 'Russell', language: 'en-AU', gender: 'Male', engines: ['standard'] },
            { id: 'Salli', language: 'en-US', gender: 'Female', engines: ['standard'] },
            { id: 'Seoyeon', language: 'ko-KR', gender: 'Female', engines: ['standard'] },
            { id: 'Takumi', language: 'ja-JP', gender: 'Male', engines: ['standard'] },
            { id: 'Tatyana', language: 'ru-RU', gender: 'Female', engines: ['standard'] },
            { id: 'Vicki', language: 'de-DE', gender: 'Female', engines: ['neural', 'standard'] },
            { id: 'Vitoria', language: 'pt-BR', gender: 'Female', engines: ['standard'] },
            { id: 'Zhiyu', language: 'zh-CN', gender: 'Female', engines: ['standard'] },
            
            // Neural voices (newer)
            { id: 'Aria', language: 'en-NZ', gender: 'Female', engines: ['neural'] },
            { id: 'Ayanda', language: 'en-ZA', gender: 'Female', engines: ['neural'] },
            { id: 'Arlet', language: 'ca-ES', gender: 'Female', engines: ['neural'] },
            { id: 'Hannah', language: 'de-AT', gender: 'Female', engines: ['neural'] },
            { id: 'Daniel', language: 'de-DE', gender: 'Male', engines: ['neural'] },
            { id: 'Liam', language: 'fr-CA', gender: 'Male', engines: ['neural'] },
            { id: 'Ruth', language: 'en-US', gender: 'Female', engines: ['neural'] },
            { id: 'Stephen', language: 'en-US', gender: 'Male', engines: ['neural'] },
            { id: 'Kajal', language: 'hi-IN', gender: 'Female', engines: ['neural'] },
            { id: 'Niamh', language: 'en-IE', gender: 'Female', engines: ['neural'] },
            { id: 'Sofie', language: 'da-DK', gender: 'Female', engines: ['neural'] },
            { id: 'Lisa', language: 'nl-BE', gender: 'Female', engines: ['neural'] },
            { id: 'Isabelle', language: 'fr-BE', gender: 'Female', engines: ['neural'] },
            { id: 'Zayd', language: 'ar-XL', gender: 'Male', engines: ['neural'] },
            { id: 'Hala', language: 'ar-XL', gender: 'Female', engines: ['neural'] },
            { id: 'Adriano', language: 'it-IT', gender: 'Male', engines: ['neural'] },
            { id: 'Andres', language: 'es-MX', gender: 'Male', engines: ['neural'] },
            { id: 'Sergio', language: 'es-ES', gender: 'Male', engines: ['neural'] },
            { id: 'Remi', language: 'fr-FR', gender: 'Male', engines: ['neural'] },
            { id: 'Arthur', language: 'en-GB', gender: 'Male', engines: ['neural'] },
            { id: 'Ola', language: 'pl-PL', gender: 'Female', engines: ['neural'] },
            { id: 'Ida', language: 'no-NO', gender: 'Female', engines: ['neural'] },
            { id: 'Laura', language: 'sk-SK', gender: 'Female', engines: ['neural'] },
            { id: 'Suvi', language: 'fi-FI', gender: 'Female', engines: ['neural'] },
            { id: 'Elin', language: 'sv-SE', gender: 'Female', engines: ['neural'] },
            { id: 'Thiago', language: 'pt-BR', gender: 'Male', engines: ['neural'] },
            { id: 'Mia', language: 'es-MX', gender: 'Female', engines: ['neural'] },
            { id: 'Tomoko', language: 'ja-JP', gender: 'Female', engines: ['neural'] },
            { id: 'Kazuha', language: 'ja-JP', gender: 'Female', engines: ['neural'] },
        ];
        
        knownVoices.forEach(voice => {
            const neural = voice.engines.includes('neural') ? ' [NEURAL]' : '';
            const standard = voice.engines.includes('standard') ? ' [STANDARD]' : '';
            console.log(`${voice.id} (${voice.language}) - ${voice.gender}${neural}${standard}`);
        });
    }
}

getAwsVoices();