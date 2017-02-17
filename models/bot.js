var EventEmitter = require('events');
var BotKit = require('botkit');

NEWSCHEMA('Bot').make(function(schema) {
    schema.define('parser', 'Object');
    schema.define('slack', 'Object');
    schema.define('emitter', 'Object');

    schema.setDefault(function(name) {
        switch(name) {
            case 'parser':
                return GETSCHEMA('Parser');
            case 'emitter':
                return new EventEmitter();
        }
    });

    schema.addWorkflow('connect', function(error, model, options, callback) {
        
        model.slack = BotKit.slackbot({
            //debug: true
        });

        model.slack.spawn({
            token: process.env.SLACK_API_KEY,
        }).startRTM();

        model.slack.on('direct_message', function(bot, message) {
            model.parser.operation('parseMessage', message, function(err, results) {
                if (err) {
                    console.log('ERR PARSER: ', err);
                    return;
                }
                if (results) {
                    model.emitter.emit(results.module, results, bot, message);
                }
            });
        });

        return callback();
    });

    schema.addWorkflow('reply', function(error, model, options, callback) {
        options.bot.reply(options.message, options.response);
        return callback();
    });

});
