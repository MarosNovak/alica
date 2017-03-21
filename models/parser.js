var apiai = require('apiai');

NEWSCHEMA('Parser').make(function(schema) {
    schema.define('analyzer', 'Object');

    schema.addOperation('initAnalyzer', function(error, model, options, callback) {
        this.analyzer = apiai("627b9af1d891422dab3e14717b526e53");
    });

    schema.addOperation('parseMessage', function(error, model, message, callback) {
        if (!message || !message.text) {
            return callback();
        }

        var self = this;
        var intent = {};

        var request = self.analyzer.textRequest(message.text, {
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

        // switch(message.text) {
        //     case 'sprint issues':
        //         return callback({
        //             module: 'REPORTING',
        //             type: 'ALL_ISSUES'
        //         });
        //     case 'init':
        //         return callback({
        //             module: 'GENERAL',
        //             type: 'INIT'
        //         });
        //     case 'ss':
        //         return callback({
        //             module: 'STANDUP',
        //             type: 'START'
        //         });
        //     default:
        //         if (message.text.includes('enable')) {
        //             return callback({
        //                 module: 'GENERAL',
        //                 type: 'ENABLE'
        //             });
        //         } else if (message.text.includes('disable')) {
        //             return callback({
        //                 module: 'GENERAL',
        //                 type: 'DISABLE'
        //             });
        //         } else if (message.text.includes('-i')) {
        //             return callback({
        //                 module: 'REPORTING',
        //                 type: 'USER_ISSUES'
        //             });
        //         } else if (message.text.includes('standup time')) {
        //             return callback({
        //                 module: 'STANDUP',
        //                 type: 'SCHEDULE'
        //             });
        //         } else if (message.text.includes('standup channel')) {
        //             return callback({
        //                 module: 'STANDUP',
        //                 type: 'CHANNEL'
        //             });
        //         } else if (message.text.includes('standup add')) {
        //             return callback({
        //                 module: 'STANDUP',
        //                 type: 'USERS'
        //             });
        //         } else if (message.text.includes('admin')) {
        //             return callback({
        //                 module: 'GENERAL',
        //                 type: 'ADMIN'
        //             });
        //         }
        //         return callback();
        //     }
    });

    schema.addOperation('parseStandupMessage', function (error, model, message, callback) {
        if (!message || !message.text) {
            return callback();
        }
        switch (message.text) {
            default:
                return callback({
                    module: 'STANDUP_ANSWER',
                    type: 'DEFAULT'
                });
        }
    });
});
