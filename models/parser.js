var apiai = require('apiai');
var specialAnswers = ['nothing','none','skip','nope','no'];

NEWSCHEMA('Parser').make(function(schema) {
    schema.define('analyzer', 'Object');

    /**
     * Initialization Api.ai webhook connection
     */
    schema.addOperation('initAnalyzer', function(error, model, options, callback) {
        this.analyzer = apiai(process.env.APIAI_KEY);
    });

    /**
     * Parse basic message
     * @param {Object} - message
     * @return {Object} - intent
     */
    schema.addOperation('parseMessage', function(error, model, message, callback) {
        if (!message || !message.text) {
            return callback();
        }

        switch(message.text) {
            case 'init':
                return callback({
                    module: 'GENERAL',
                    type: 'INIT',
                    message: message,
                });
            case 'start standup':
                return callback({
                    module: 'STANDUP',
                    type: 'START',
                    message: message
                });
        }

        parseMessageToIntent(message, this.analyzer, function(intent) {
            return callback(intent);
        });
    });

    /**
     * Parse standup answer message
     * @param {Object} - message
     * @return {Object} - intent
     */
    schema.addOperation('parseStandupMessage', function (error, model, message, callback) {
        if (!message || !message.text) {
            return callback();
        }

        var intent = {
            module: 'STANDUP',
            type: 'STANDUP-ANSWER',
            canceled: false,
            skipped: false,
            message: message,
            conversation: null,
            parameters: {
                issues: [],
                answerType: 'Unknown'
            },
            ignored: false
        };

        if (message.text == 'cancel') {
            intent.canceled = true;
            return callback(intent);
        }

        if (message.text == 'ignore') {
            intent.ignored = true;
            return callback(intent);
        }

        if (specialAnswers.indexOf(message.text) > -1) {
            intent.skipped = true;
            return callback(intent);
        }

        var request = this.analyzer.textRequest(message.text, {
            sessionId: U.random()
        });

        request.on('response', function(response) {
            if (response.result.metadata.intentName == 'STANDUP-ANSWER') {
                intent.parameters = response.result.parameters;
            }
            intent.parameters.issues = validateIssuesKeys(message.text);

            console.log('🤖 RECEIVED STANDUP ANSWER\n', intent);
            return callback(intent);
        });

        request.on('error', function(error) {
            console.log(error);
        });
        request.end();
    });

    /**
     * Parse natural language to intents
     * @param {Message} {Analyzer}
     */
    function parseMessageToIntent(message, analyzer, callback) {
        var intent = {};
        var request = analyzer.textRequest(message.text, {
            sessionId: U.random()
        });

        request.on('response', function(response) {
            intent = {
                module: response.result.action,
                type: response.result.metadata.intentName,
                message: message,
                parameters: response.result.parameters
            }
            if (intent.module.includes('smalltalk')) {
                intent.module = 'SMALLTALK';
                intent.parameters = { simplified: response.result.fulfillment.speech };
            }

            if (intent.parameters.issues) {
                intent.parameters.issues = validateIssuesKeys(message.text);
            } else if (intent.parameters.issue) {
                intent.parameters.issue = validateIssuesKeys(message.text).first();
            }

            console.log('🤖 RECEIVED INTENT\n', intent);
            return callback(intent);
        });

        request.on('error', function(error) {
            console.log(error);
        });
        request.end();
    }

    /**
     * Validation of Jira issue keys
     * @param {String} text - message text
     * @return {Array} issueKeys
     */
    function validateIssuesKeys(text) {
        var regex = /fr-(\d*)/g;
        return text.toLowerCase().match(regex);
    }
});
