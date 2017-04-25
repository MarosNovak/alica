var jira = GETSCHEMA('Jira').make();
var Responder = GETSCHEMA('Responder');

NEWSCHEMA('Monitoring').make(function(schema) {

    schema.addOperation('getLastSprintIssues', function(error, model, monitoringModule, callback) {
        options = { rapidView: monitoringModule.projectName };
        jira.$workflow('getJiraLastSprintIssues', options, function(err, issues) {
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            }
            Responder.operation('issuesList', issues, function(err, responseIssues) {
                if (err) {
                    console.log('CHYBA: ', err);
                    return callback();
                }
                return callback(responseIssues);
            });
        });
    });

    schema.addOperation('getSpecificIssues', function(error, model, issues, callback) {
        jira.$workflow('getIssues', issues, function(err, response) {
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            } else if (response.error) {
                Responder.operation('basicResponder', { text: response.error }, function(err, message) {
                    console.log(message);
                    return callback(message);
                });
            } else if (Array.isArray(response)) {
                Responder.operation('issuesList', response, function(err, responseIssues) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return callback();
                    }
                    return callback(responseIssues);
                });
            } else {
                Responder.operation('issueDetail', response, function(err, responseIssue) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return callback();
                    }
                    return callback(responseIssue);
                });
            }
        });
    });

    schema.addOperation('getUsersIssues', function(error, model, email, callback) {
        jira.$workflow('getUsersIssues', email, function(err, response) {
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            } else if (response.error) {
                Responder.operation('basicResponder', { text: response.error }, function(err, message) {
                    console.log(message);
                    return callback(message);
                });
            } else {
                Responder.operation('issuesList', response, function(err, responseIssues) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return callback();
                    }
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
                    return callback(message);
                });
            } else {
                Responder.operation('addedComment', response, function(err, responseMessage) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return callback();
                    }
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
                Responder.operation('assignedIssue', options, function(err, responseMessage) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return callback();
                    }
                    return callback(responseMessage);
                });
            }
        });
    });

    schema.addOperation('changeStatus', function(error, model, options, callback) {
        jira.$workflow('changeStatus', options, function(err, response) {
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            }
            return callback();
        });
    });

});
