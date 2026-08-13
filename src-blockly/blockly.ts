/**
 * The ioBroker.sayit block for the Blockly editor of ioBroker.javascript.
 *
 * This is the source of `admin/blockly.js`, which is a generated bundle - do not edit that file,
 * run `npm run build:blockly` instead.
 *
 * The editor loads the bundle as a classic script *after* Blockly itself is up, so the runtime is
 * taken from `window.Blockly` and the `blockly` package contributes types only. See
 * `src-blockly/README.md` for why importing the runtime would break the block.
 */
import { sayitEngines } from '../src/lib/engines';

// The words are bundled into `admin/blockly.js` at build time, because the editor loads that file as a
// classic script and `Blockly.Words` must be filled before the block is registered - there is no moment
// at which the files could be fetched. They are kept apart from `admin/i18n`, so that only the words of
// the block end up in the bundle and not all labels of the configuration dialog.
// `npm run translate` keeps both directories up to date - `-b` takes any number of base files from
// any directory, so they can stay next to the source that imports them.
import de from './i18n/de.json';
import en from './i18n/en.json';
import es from './i18n/es.json';
import fr from './i18n/fr.json';
import it from './i18n/it.json';
import nl from './i18n/nl.json';
import pl from './i18n/pl.json';
import pt from './i18n/pt.json';
import ru from './i18n/ru.json';
import uk from './i18n/uk.json';
import zhCn from './i18n/zh-cn.json';

import type { Block } from 'blockly/core';

const Blockly = window.Blockly;

// Older editors do not ship a translator yet
Blockly.Translate ||= function (word: string, lang?: string): string {
    lang ||= window.systemLang;
    const entry = Blockly.Words?.[word];
    return entry ? entry[lang || 'en'] || entry.en : word;
};

// --- SayIt --------------------------------------------------
const LANGUAGES: Record<string, Record<string, string>> = {
    de,
    en,
    es,
    fr,
    it,
    nl,
    pl,
    pt,
    ru,
    uk,
    'zh-cn': zhCn,
};

// `Blockly.Words` is keyed by word and not by language, so the imported files must be turned inside out
const sayitWords: Record<string, Record<string, string>> = {};
for (const [lang, texts] of Object.entries(LANGUAGES)) {
    for (const [word, text] of Object.entries(texts)) {
        if (text) {
            (sayitWords[word] ||= {})[lang] = text;
        }
    }
}
Object.assign(Blockly.Words, sayitWords);

// Not a word but a link per language, so it must not be given to the translator
Blockly.Words.sayit_help = {
    en: 'https://github.com/ioBroker/ioBroker.sayit/blob/master/README.md',
    de: 'http://www.iobroker.net/?page_id=178&lang=de',
    ru: 'http://www.iobroker.net/?page_id=4262&lang=ru',
};

// Blockly.Sendto is a global variable and defined in javascript/admin/google-blockly/own/blocks_sendto.js
Blockly.Sendto.blocks.sayit = `<block type="sayit">
     <value name="INSTANCE">
     </value>
     <value name="LANGUAGE">
     </value>
     <value name="VOLUME">
     </value>
     <value name="MESSAGE">
         <shadow type="text">
             <field name="TEXT">text</field>
         </shadow>
     </value>
     <value name="LOG">
     </value>
</block>`;

Blockly.Blocks.sayit = {
    init: function (this: Block): void {
        const options: [string, string][] = [];
        const instances = window.main?.instances;
        if (instances) {
            for (let i = 0; i < instances.length; i++) {
                const m = instances[i].match(/^system\.adapter\.sayit\.(\d+)$/);
                if (m) {
                    const n = parseInt(m[1], 10);
                    options.push([`sayit.${n}`, `.${n}`]);
                }
            }
        }

        // The editor may not know the instances yet - offer the usual ones
        if (!options.length) {
            for (let k = 0; k <= 4; k++) {
                options.push([`sayit.${k}`, `.${k}`]);
            }
        }
        options.unshift([Blockly.Translate('sayit_anyInstance'), '']);

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('sayit'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        const languages: [string, string][] = [[Blockly.Translate('sayit_configured'), '']];
        for (const engine of Object.keys(sayitEngines)) {
            languages.push([sayitEngines[engine].name, engine]);
        }

        this.appendDummyInput('LANGUAGE').appendField(new Blockly.FieldDropdown(languages), 'LANGUAGE');

        const input = this.appendValueInput('VOLUME').setCheck('Number').appendField(Blockly.Translate('sayit_volume'));
        if (input.connection) {
            // Blockly has no public API for an optional input
            (input.connection as unknown as { _optional: boolean })._optional = true;
        }

        this.appendValueInput('MESSAGE').appendField(Blockly.Translate('sayit_message'));

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('sayit_log'))
            .appendField(
                new Blockly.FieldDropdown([
                    [Blockly.Translate('sayit_log_none'), ''],
                    [Blockly.Translate('sayit_log_info'), 'log'],
                    [Blockly.Translate('sayit_log_debug'), 'debug'],
                    [Blockly.Translate('sayit_log_warn'), 'warn'],
                    [Blockly.Translate('sayit_log_error'), 'error'],
                ]),
                'LOG',
            );

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('sayit_tooltip'));
        this.setHelpUrl(Blockly.Translate('sayit_help'));
    },
};

function sayitToJavaScript(block: Block): string {
    const language = block.getFieldValue('LANGUAGE');
    const text = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    const volume = Blockly.JavaScript.valueToCode(block, 'VOLUME', Blockly.JavaScript.ORDER_ATOMIC);
    const logLevel = block.getFieldValue('LOG');
    const instance = block.getFieldValue('INSTANCE');

    let logText = '';
    if (logLevel) {
        // `text` is empty while the message input is unconnected. Appending it unconditionally
        // would emit `console.log("…" + );` and break the whole script with a syntax error.
        const prefix = `"Executed sayit${instance}: ${volume ? `[Volume - ${volume}]` : ''}: "`;
        logText = `\nconsole.${logLevel}(${text ? `${prefix} + ${text}` : prefix});\n`;
    }

    const objText: string[] = [];
    language && objText.push(`language: "${language}"`);
    text && objText.push(`text: ${text}`);
    volume && objText.push(`volume: ${volume}`);

    return `sendTo("sayit${instance}", "say", { ${objText.join(', ')} });${logText}`;
}

// Blockly >= 10 looks the generator up in `forBlock`. Registering on the plain slot is not enough:
// the editor migrates that slot to `forBlock` for its own blocks only, because its migration step
// has already run by the time an adapter's blockly.js is loaded.
if (Blockly.JavaScript.forBlock) {
    Blockly.JavaScript.forBlock.sayit = sayitToJavaScript;
} else {
    Blockly.JavaScript.sayit = sayitToJavaScript;
}
