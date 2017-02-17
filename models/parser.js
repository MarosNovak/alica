NEWSCHEMA('Parser').make(function(schema) {

    schema.addOperation('parseMessage', function(error, model, message, callback) {
        if (!message || !message.text) {
            return callback();
        }
        switch(message.text) {
            case 'vsetky issues':
                return callback({
                    module: 'JIRA',
                    type: 'ALL_ISSUES'
                });
            default:
                return callback();
        }
    });
});
