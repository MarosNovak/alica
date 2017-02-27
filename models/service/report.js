var jira = GETSCHEMA('Jira').make();
var Response = GETSCHEMA('Response');

NEWSCHEMA('Report').make(function(schema) {

    schema.addOperation('getLastSprintIssues', function(error, model, options, callback) {
        options = { rapidView: options.reportingModule.projectName };
        jira.$workflow('getJiraLastSprintIssues', options, function(err, issues) {
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            }
            Response.operation('issuesResponse', issues, function(err, responseIssues) {
                if (err) {
                    console.log('CHYBA: ', err);
                    return callback();
                }
                return callback(responseIssues);
            });
        });
    });

    schema.addOperation('getUsersIssues', function(error, model, options, callback) {
        options = { email: options.email };
        jira.$workflow('getUsersIssues', options, function(err, jiraResponse) {
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            } else if (jiraResponse.error) {
                Response.operation('basicResponse', { text: jiraResponse.error }, function(err, message) {
                    console.log(message);
                    return callback(message);
                });
            } else {
                Response.operation('usersIssuesResponse', jiraResponse, function(err, responseIssues) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return callback();
                    }
                    console.log(responseIssues);
                    return callback(responseIssues);
                });
            }
        });
    });
});
