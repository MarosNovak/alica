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
// ****************************************************************************
// Real Time Messaging - bot conversation workflows
// ****************************************************************************

    /**
     * Connect slackbot and initialize real time messaging
     * @return {Object} - intent
     */
    schema.addWorkflow('connect', function(error, model, options, callback) {

        model.slack = BotKit.slackbot({
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            scopes: ['bot'],
        });

        model.bot = model.slack.spawn({
            token: process.env.SLACK_API_KEY
        }).startRTM();

        model.parser.operation('initAnalyzer');

        model.slack.on('direct_message', function(bot, message) {
            console.log('RECEIVED DIRECT MESSAGE');
            model.parser.operation('parseMessage', message, function(err, intent) {
                if (err) {
                    console.log('ERR PARSER: ', err);
                    return;
                }
                if (intent) {
                    model.bot.startTyping(message);
                    model.emitter.emit(intent.module, intent);
                }
            });
        });

        model.slack.on('direct_mention', function(bot,message) {
            console.log('RECEIVED MENTION MESSAGE');
            model.parser.operation('parseMessage', message, function(err, intent) {
                if (err) {
                    console.log('ERR PARSER: ', err);
                    return;
                }
                if (intent) {
                    model.bot.startTyping(message);
                    model.emitter.emit(intent.module, intent);
                }
            });
        });
        return callback();
    });

    /**
     * Reply message
     * @param {Object} options - { message, response }
     */
    schema.addWorkflow('reply', function(error, model, options, callback) {
        console.log('ODOSLANE REPLY');
        model.bot.reply(options.message, options.response);
        return callback();
    });

    /**
     * Start private conversations with every user in users
     * @param {Object} options - { users }
     */
    schema.addWorkflow('startConversations', function(error, model, options, callback) {
        var users = options.users;
        users.forEach(function(user) {
            model.bot.startPrivateConversation( { user: user.slackID }, function(err, conversation) {
                console.log('PRIVATE CONVERSATION STARTED WITH', user.slackID);
                return callback(err, conversation);
            });
        });
    });

    /**
     * Bot ask question via conversations with users
     * @param {Object} options - { conversation, question }
     */
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

    /**
     * Bot will post message to channel
     * @param {Object} options - { message } with channel in it
     */
    schema.addWorkflow('postMessage', function(error, model, message, callback) {
        model.bot.say(message);
        return callback();
    });

    schema.addWorkflow('updateMessage', function(error, model, message, callback) {

        console.log('update message',message);

        model.bot.replyAndUpdate({ message, text: 'Thanks' });
    });

// ****************************************************************************
// SLACK API - REST functions
// ****************************************************************************

    /**
     * GET active memebers without bots
     * @return {Array} users
     */
    schema.addWorkflow('getMembers', function(error, model, options, callback) {
        model.bot.api.users.list({},function(err, responseMembers) {
            if (err) {
                return callback(err);
            }
            return callback(err, responseMembers);
        });
    });

    schema.addWorkflow('getChannelMembers', function(error, model, channel, callback) {
        model.bot.api.channels.info({ channel }, function(error, response) {
            var users = [];
            var count = 0;
            if (response.channel && response.channel.is_channel && response.channel.members) {
                response.channel.members.forEach(function(member) {
                    model.bot.api.users.info({ user: member }, function(error, userInfo) {
                        count++
                        if (!userInfo.user.is_bot) {
                            users.push(member);
                        }
                        if (count == response.channel.members.length) {
                            return callback(users);
                        }
                    });
                });
            } else {
                return callback(response);
            }
        });
    });
    
});
