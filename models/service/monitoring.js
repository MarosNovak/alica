var jira = GETSCHEMA('Jira').make();
var Responder = GETSCHEMA('Responder');

NEWSCHEMA('Monitoring').make(function(schema) {

    schema.addOperation('getLastSprintIssues', function(error, model, options, callback) {
        options = { rapidView: options.MonitoringModule.projectName };
        jira.$workflow('getJiraLastSprintIssues', options, function(err, issues) {
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            }
            Responder.operation('issuesResponder', issues, function(err, responseIssues) {
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
        jira.$workflow('getUsersIssues', options, function(err, jiraResponder) {
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            } else if (jiraResponder.error) {
                Responder.operation('basicResponder', { text: jiraResponder.error }, function(err, message) {
                    console.log(message);
                    return callback(message);
                });
            } else {
                Responder.operation('usersIssuesResponder', jiraResponder, function(err, responseIssues) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return callback();
                    }
                    console.log('VSAK?',responseIssues);
                    return callback(responseIssues);
                });
            }
        });
    });

    schema.addOperation('getSpecificIssues', function(error, model, issues, callback) {
        jira.$workflow('getIssues', issues, function(err, parsedIssues) {
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            } else if (parsedIssues.error) {
                Responder.operation('basicResponder', { text: parsedIssues.error }, function(err, message) {
                    console.log(message);
                    return callback(message);
                });
            } else if (Array.isArray(parsedIssues)) {
                Responder.operation('issuesResponder', parsedIssues, function(err, responseIssues) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return callback();
                    }
                    console.log(responseIssues);
                    return callback(responseIssues);
                });
            } else {
                Responder.operation('issueDetailResponder', parsedIssues, function(err, responseIssues) {
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

    schema.addOperation('addComment', function(error, model, options, callback) {
        jira.$workflow('addComment', options, function(err, response) {
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            } else if (response.error) {
                Responder.operation('basicResponder', { text: response.error }, function(err, message) {
                    console.log(message);
                    return callback(message);
                });
            } else {
                Responder.operation('addedCommentResponder', response, function(err, responseMessage) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return callback();
                    }
                    console.log(responseMessage);
                    return callback(responseMessage);
                });
            }
        });
    });

    schema.addOperation('assignIssue', function(error, model, options, callback) {
        jira.$workflow('assignIssue', options, function(err, parsedIssues) {
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            } else if (parsedIssues.error) {
                Responder.operation('basicResponder', { text: parsedIssues.error }, function(err, message) {
                    console.log(message);
                    return callback(message);
                });
            } else {
                console.log(ASSIGNED);
            }
        });
    });

});
