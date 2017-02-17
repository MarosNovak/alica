NEWSCHEMA('Parser').make(function(schema) {

    schema.addOperation('parseMessage', function(error, model, message, callback) {
        if (!message || !message.text) {
            return callback();
        }
        switch(message.text) {
            case 'sprint issues':
                return callback({
                    module: 'JIRA',
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
                }
                return callback();
            }
    });
});
