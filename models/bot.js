var EventEmitter = require('events');
var BotKit = require('botkit');

NEWSCHEMA('Bot').make(function(schema) {
    schema.define('parser', 'Object');
    schema.define('slack', 'Object');
    schema.define('emitter', 'Object');
    schema.define('bot', 'Object');

    schema.setDefault(function(name) {
        switch(name) {
            case 'parser':
                return GETSCHEMA('Parser');
            case 'emitter':
                return new EventEmitter();
        }
    });

    /**
     * Connect slackbot and initialize real time messaging
     * @return EMIT MESSAGE
     */
    schema.addWorkflow('connect', function(error, model, options, callback) {
        
        model.slack = BotKit.slackbot({
            //debug: true
        });

        model.bot = model.slack.spawn({
            token: process.env.SLACK_API_KEY
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

    schema.addWorkflow('getMembers', function(error, model, options, callback) {
        model.bot.api.users.list({},function(err, responseMembers) {
            if (err) {
                return callback(err);
            }
            return callback(err, responseMembers);
        });
    });
});
