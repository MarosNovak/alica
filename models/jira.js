var JiraApi = require('jira-client');

NEWSCHEMA('Jira').make(function(schema) {
    schema.define('jira', 'Object');

    schema.setDefault(function(name) {
        switch(name) {
            case 'jira':
                return initializeJiraClient();
        }
    });

    schema.addWorkflow('getSprintIssues', function(error, model, options, callback) {
        console.log('NACITAVAM JIRA');
        model.jira.findRapidView('FRIs-kill').then(function(rapidView) {
            return model.jira.getLastSprintForRapidView(rapidView.id).then(function(sprint) {
                return model.jira.getSprintIssues(rapidView.id, sprint.id).then(function(issues) {
                    console.log('NACITANA JIRA');
                    return callback(issues);
                });
            });
        }).catch(function(err) {
            console.log('JIRA ERROR');
            error.push(err.message);
            return callback();
        });
    });

    function initializeJiraClient() {
        return new JiraApi({
            protocol: process.env.PROTOCOL,
            host: process.env.HOST,
            port: process.env.PORT,
            username: process.env.USERNAME,
            password: process.env.PASSWORD,
            strictSSL: false
        });
    }

});
