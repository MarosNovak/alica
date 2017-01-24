var BotKit = require('botkit');
var Response = SOURCE('Response');
var Parser = SOURCE('Parser');

class Slack {

    constructor() {
        this.response = new Response();
        this.parser = new Parser();
        this.bot = BotKit.slackbot({
            debug:true
        });
    }

    connect() {
        this.bot.spawn({
            token: process.env.SLACK_API_KEY,
        }).startRTM();
    }

    start() {
        var self = this;
        self.connect();
        self.bot.on('direct_mention,mention,ambient,direct_message', function(bot, message) {
              self.parser.handleMessage(bot, message, function(latestSprint) {
                  U.sendSlackMessage(message, self.response.buildResponseIssues(latestSprint), bot);
              });
        });
    }
}

module.exports = Slack;
