var apiai = require('apiai');
var specialAnswers = ['nothing','none','skip','nope','no'];

NEWSCHEMA('Parser').make(function(schema) {
    schema.define('analyzer', 'Object');

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
            case 's':
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
            sessionId: '1'
        });

        request.on('response', function(response) {
            if (response.result.metadata.intentName == 'STANDUP-ANSWER') {
                intent.parameters = response.result.parameters;
            }
            intent.parameters.issues = validateIssuesKeys(message.text);

            console.log(intent);
            return callback(intent);
        });

        request.on('error', function(error) {
            console.log(error);
        });
        request.end();
    });

// ****************************************************************************
// MACHINE LEARNING
// ****************************************************************************

    schema.addOperation('initAnalyzer', function(error, model, options, callback) {
        this.analyzer = apiai("627b9af1d891422dab3e14717b526e53");
    });

    /**
     * Parse natural language to intents
     *
     */
    function parseMessageToIntent(message, analyzer, callback) {
        var intent = {};
        var request = analyzer.textRequest(message.text, {
            sessionId: '1'
        });

        request.on('response', function(response) {
            intent = {
                module: response.result.action,
                type: response.result.metadata.intentName,
                message: message,
                parameters: response.result.parameters
            }

            console.log('PARSED INTENT:', intent);
            return callback(intent);
        });

        request.on('error', function(error) {
            console.log(error);
        });
        request.end();
    }

    function validateIssuesKeys(text) {
        var regex = /fr-(\d*)/g;
        return text.toLowerCase().match(regex);
    }
});
