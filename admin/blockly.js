'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Sendto');

    goog.require('Blockly.JavaScript');
}

Blockly.Translate = Blockly.Translate || function (word, lang) {
    lang = lang || systemLang;
    if (Blockly.Words && Blockly.Words[word]) {
        return Blockly.Words[word][lang] || Blockly.Words[word].en;
    } else {
        return word;
    }
};


// --- SayIt --------------------------------------------------
Blockly.Words['sayit']               = {'en': 'say text',                    'de': 'aussprechen',                        'ru': 'произнести'};
Blockly.Words['sayit_message']       = {'en': 'message',                     'de': 'Meldung',                            'ru': 'сообщение'};
Blockly.Words['sayit_volume']        = {'en': 'volume (optional)',           'de': 'Lautstärke (optional)',              'ru': 'громкость (не обяз.)'};
Blockly.Words['sayit_tooltip']       = {'en': 'Text to speech',              'de': 'Text zu Sprache',                    'ru': 'Произнести сообщение'};
Blockly.Words['sayit_help']          = {'en': 'https://github.com/ioBroker/ioBroker.sayit/blob/master/README.md', 'de': 'http://www.iobroker.net/?page_id=178&lang=de', 'ru': 'http://www.iobroker.net/?page_id=4262&lang=ru'};
Blockly.Words['sayit_configured']    = {'en': 'configured',                  'de': 'Standard',                           'ru': 'настроенный'};
Blockly.Words['sayit_everyInstance'] = {'en': 'every instance',              'de': 'Alle Instanzen',                     'ru': 'На все драйвера', 'pt': 'todas as instâncias',            'pl': 'wszystkie przypadki',                'nl': 'alle instanties',                'it': 'tutte le istanze',               'es': 'todas las instancias',           'fr': 'toutes les instances'};

Blockly.Words['sayit_log']           = {'en': 'log level',                   'de': 'Loglevel',                           'ru': 'Протокол'};
Blockly.Words['sayit_log_none']      = {'en': 'none',                        'de': 'keins',                              'ru': 'нет'};
Blockly.Words['sayit_log_info']      = {'en': 'info',                        'de': 'info',                               'ru': 'инфо'};
Blockly.Words['sayit_log_debug']     = {'en': 'debug',                       'de': 'debug',                              'ru': 'debug'};
Blockly.Words['sayit_log_warn']      = {'en': 'warning',                     'de': 'warning',                            'ru': 'warning'};
Blockly.Words['sayit_log_error']     = {'en': 'error',                       'de': 'error',                              'ru': 'ошибка'};


// Blockly.Sendto is global variable and defined in javascript/admin/google-blockly/own/blocks_sendto.js

Blockly.Sendto.blocks['sayit'] =
    '<block type="sayit">'
    + '     <value name="INSTANCE">'
    + '     </value>'
    + '     <value name="VOLUME">'
    + '     </value>'
    + '     <value name="MESSAGE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">text</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="LOG">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['sayit'] = {
    init: function() {
        var options = [[Blockly.Translate('sayit_everyInstance'), 'all']];
        if (typeof main !== 'undefined' && main.instances) {
            for (var i = 0; i < main.instances.length; i++) {
                var m = main.instances[i].match(/^system.adapter.sayit.(\d+)$/);
                if (m) {
                    var n = parseInt(m[1], 10);
                    options.push(['sayit.' + n, '.' + n]);
                }
            }
        }

        if (options.length < 2) {
            for (var u = 0; u <= 4; u++) {
                options.push(['sayit.' + u, '.' + u]);
            }
        }

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('sayit'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        var input = this.appendValueInput('VOLUME')
            .setCheck('Number')
            .appendField(Blockly.Translate('sayit_volume'));
        if (input.connection) input.connection._optional = true;

        this.appendValueInput('MESSAGE')
            .appendField(Blockly.Translate('sayit_message'));

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('sayit_log'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('sayit_log_none'),  ''],
                [Blockly.Translate('sayit_log_info'),  'log'],
                [Blockly.Translate('sayit_log_debug'), 'debug'],
                [Blockly.Translate('sayit_log_warn'),  'warn'],
                [Blockly.Translate('sayit_log_error'), 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Translate('sayit_tooltip'));
        this.setHelpUrl(Blockly.Translate('sayit_help'));
    }
};

Blockly.JavaScript['sayit'] = function(block) {
    var dropdown_instance = block.getFieldValue('INSTANCE');
    var value_message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    var value_volume  = Blockly.JavaScript.valueToCode(block, 'VOLUME', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("sayIt' + (value_volume ? '[Volume - ' + value_volume + ']' : '') + ': " + ' + value_message + ');\n'
    } else {
        logText = '';
    }

    if (dropdown_instance === 'all') {
        let output = "";
        for (var i = 0; i < main.instances.length; i++) {
            var m = main.instances[i].match(/^system.adapter.sayit.(\d+)$/);
            if (m) {
                var k = parseInt(m[1], 10);
                output = output + 'setState("sayit.' + k + '.tts.text", "' + (value_volume !== null && value_volume !== '' ? '" + ' + value_volume + ' + ";' : '') + '" + ' + value_message  + ');\n';
            }
        }
        return output;
    } else {


    return 'setState("sayit' + dropdown_instance + '.tts.text", "' + (value_volume !== null && value_volume !== '' ? '" + ' + value_volume + ' + ";' : '') + '" + ' + value_message  + ');\n' +
        logText;
    }
};
