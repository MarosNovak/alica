NEWSCHEMA('Parser').make(function(schema) {

    schema.addOperation('parseMessage', function(error, model, message, callback) {
        if (!message || !message.text) {
            return callback();
        }
        switch(message.text) {
            case 'sprint issues':
                return callback({
                    module: 'REPORTING',
                    type: 'ALL_ISSUES'
                });
            case 'help':
                return callback({
                    module: 'GENERAL',
                    type: 'HELP'
                });
            case 'ls':
                return callback({
                    module: 'GENERAL',
                    type: 'STATUS'
                });
            case 'init':
                return callback({
                    module: 'GENERAL',
                    type: 'INIT'
                });
            case 'ss':
                return callback({
                    module: 'STANDUP',
                    type: 'START'
                });
            default:
                if (message.text.includes('enable')) {
                    return callback({
                        module: 'GENERAL',
                        type: 'ENABLE'
                    });
                } else if (message.text.includes('disable')) {
                    return callback({
                        module: 'GENERAL',
                        type: 'DISABLE'
                    });
                } else if (message.text.includes('-i')) {
                    return callback({
                        module: 'REPORTING',
                        type: 'USER_ISSUES'
                    });
                } else if (message.text.includes('standup time')) {
                    return callback({
                        module: 'STANDUP',
                        type: 'SCHEDULE'
                    });
                } else if (message.text.includes('standup channel')) {
                    return callback({
                        module: 'STANDUP',
                        type: 'CHANNEL'
                    });
                } else if (message.text.includes('standup add')) {
                    return callback({
                        module: 'STANDUP',
                        type: 'USERS'
                    });
                } else if (message.text.includes('admin')) {
                    return callback({
                        module: 'GENERAL',
                        type: 'ADMIN'
                    });
                }
                return callback();
            }
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
