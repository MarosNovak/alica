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
                Response.operation('basicResponse', { text: parsedIssues.error }, function(err, message) {
                    console.log(message);
                    return callback(message);
                });
            } else if (Array.isArray(parsedIssues)) {
                Response.operation('issuesResponse', parsedIssues, function(err, responseIssues) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return callback();
                    }
                    console.log(responseIssues);
                    return callback(responseIssues);
                });
            } else {
                Response.operation('issueDetailResponse', parsedIssues, function(err, responseIssues) {
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
                Response.operation('basicResponse', { text: response.error }, function(err, message) {
                    console.log(message);
                    return callback(message);
                });
            } else {
                Response.operation('addedCommentResponse', response, function(err, responseMessage) {
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
                Response.operation('basicResponse', { text: parsedIssues.error }, function(err, message) {
                    console.log(message);
                    return callback(message);
                });
            } else {
                console.log(ASSIGNED);
            }
        });
    });

});
