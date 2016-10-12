'use strict';

goog.provide('Blockly.JavaScript.Sendto');

goog.require('Blockly.JavaScript');

// --- SayIt --------------------------------------------------
Blockly.Words['sayit']               = {'en': 'say text',                    'de': 'aussprechen',                        'ru': 'произнести'};
Blockly.Words['sayit_message']       = {'en': 'message',                     'de': 'Meldung',                            'ru': 'сообщение'};
Blockly.Words['sayit_volume']        = {'en': 'volume (optional)',           'de': 'Lautstärke (optional)',              'ru': 'громкость (не обяз.)'};
Blockly.Words['sayit_tooltip']       = {'en': 'Text to speech',              'de': 'Text zu Sprache',                    'ru': 'Произнести сообщение'};
Blockly.Words['sayit_help']          = {'en': 'https://github.com/ioBroker/ioBroker.sayit/blob/master/README.md', 'de': 'http://www.iobroker.net/?page_id=178&lang=de', 'ru': 'http://www.iobroker.net/?page_id=4262&lang=ru'};

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
    + '     <value name="LANGUAGE">'
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
        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Words['sayit'][systemLang])
            .appendField(new Blockly.FieldDropdown([['sayit.0', '.0'], ['sayit.1', '.1'], ['sayit.2', '.2'], ['sayit.3', '.3'], ['sayit.4', '.4']]), 'INSTANCE');

        var languages;
        if (systemLang === 'en') {
            languages = [['english', 'en'], ['deutsch', 'de'], ['русский', 'ru']];
        } else if (systemLang === 'de') {
            languages = [['deutsch', 'de'], ['english', 'en'], ['русский', 'ru']];
        } else if (systemLang === 'ru') {
            languages = [['русский', 'ru'], ['english', 'en'], ['deutsch', 'de']];
        } else {
            languages = [['english', 'en'], ['deutsch', 'de'], ['русский', 'ru']];
        }

        this.appendDummyInput('LANGUAGE')
            .appendField(new Blockly.FieldDropdown(languages), 'LANGUAGE');

        this.appendValueInput('VOLUME')
            .setCheck('Number')
            .appendField(Blockly.Words['sayit_volume'][systemLang]);

        this.appendValueInput('MESSAGE')
            .appendField(Blockly.Words['sayit_message'][systemLang]);

        this.appendDummyInput('LOG')
            .appendField(Blockly.Words['sayit_log'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['sayit_log_none'][systemLang],  ''],
                [Blockly.Words['sayit_log_info'][systemLang],  'log'],
                [Blockly.Words['sayit_log_debug'][systemLang], 'debug'],
                [Blockly.Words['sayit_log_warn'][systemLang],  'warn'],
                [Blockly.Words['sayit_log_error'][systemLang], 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Words['sayit_tooltip'][systemLang]);
        this.setHelpUrl(Blockly.Words['sayit_help'][systemLang]);
    }
};

Blockly.JavaScript['sayit'] = function(block) {
    var dropdown_instance = block.getFieldValue('INSTANCE');
    var dropdown_language = block.getFieldValue('LANGUAGE');
    var value_message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    var value_volume  = Blockly.JavaScript.valueToCode(block, 'VOLUME', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("sayIt' + (dropdown_language ? '[' + dropdown_language + ']' : '') + (value_volume ? '[Volume - ' + value_volume + ']' : '') + ': " + ' + value_message + ');\n'
    } else {
        logText = '';
    }

    return 'setState("sayit' + dropdown_instance + '.tts.text", "' + dropdown_language + ';' + (value_volume !== null && value_volume !== '' ? value_volume + ';' : '') + '" + ' + value_message  + ');\n' +
        logText;
};
