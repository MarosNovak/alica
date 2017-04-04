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
            // debug: true
        });

        model.bot = model.slack.spawn({
            token: process.env.SLACK_API_KEY
        }).startRTM();

        model.slack.setupWebserver(process.env.port,function(err,webserver) {
            model.slack.createWebhookEndpoints(model.slack.webserver);
        });

        model.parser.operation('initAnalyzer');


        controller.on('interactive_message_callback', function(bot, message) {
            console.log('RECEIVED MESSAGE', message);
        });

        model.slack.on('direct_message', function(bot, message) {
            model.parser.operation('parseMessage', message, function(err, intent) {
                if (err) {
                    console.log('ERR PARSER: ', err);
                    return;
                }
                if (intent) {
                    model.emitter.emit(intent.module, intent);
                }
            });
        });

        model.slack.on('direct_mention', function(bot,message) {
            model.parser.operation('parseMessage', message, function(err, intent) {
                if (err) {
                    console.log('ERR PARSER: ', err);
                    return;
                }
                if (intent) {
                    model.emitter.emit(intent.module, intent);
                }
            });
        });
        return callback();

    });

    schema.addWorkflow('reply', function(error, model, options, callback) {
        console.log('ODOSLANE');
        model.bot.reply(options.message, options.response);
        return callback();
    });

    schema.addWorkflow('askQuestion', function(error, model, options, callback) {
        let conversation = options.conversation;
        let text = options.question;
        conversation.ask(text, function(message, conversation) {
            model.parser.operation('parseStandupMessage', message, function(err, intent) {
                if (err) {
                    console.log('ERR PARSER: ', err);
                    return;
                }
                if (intent) {
                    intent.conversation = conversation;
                    model.emitter.emit(intent.module, intent);
                }
            });
        });
    });

    schema.addWorkflow('postMessage', function(error, model, message, callback) {
        model.bot.say(message);
        return callback();
    });

    schema.addWorkflow('startConversations', function(error, model, options, callback) {
        var users = options.users;
        users.forEach(function(user) {
            model.bot.startPrivateConversation( { user: user.slackID }, function(err, conversation) {
                console.log('PRIVATE CONVERSATION STARTED WITH', user.slackID);
                return callback(err, conversation);
            });
        });
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
