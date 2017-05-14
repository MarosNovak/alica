var JiraApi = require('jira-client');
var contextJQL = 'project = FR AND status in ("In Progress", Done, "To Do") AND updated >= -2d';
var usersInProgressJQL = 'status = "In Progress" AND assignee =';
var usersIssuesJQL = 'status in (Open, \'In Progress\', \'To Do\', Reopened) AND assignee =';


NEWSCHEMA('Jira').make(function(schema) {
    schema.define('jira', 'Object');

    schema.setDefault(function(name) {
        switch(name) {
            case 'jira':
                return initializeJiraClient();
        }
    });

    function initializeJiraClient() {
        return new JiraApi({
            protocol: process.env.PROTOCOL,
            host: process.env.HOST,
            port: 8080,
            username: process.env.USERNAME,
            password: process.env.PASSWORD,
            strictSSL: false,
        });
    }

    /**
     * Get last sprint issues
     * @param {Object} options { rapidView }
     * @return {Object} response
     */
    schema.addWorkflow('getJiraLastSprintIssues', function(error, model, options, callback) {
        console.log('NACITAVAM JIRA');
        var rapidView = options.rapidView;
        model.jira.findRapidView(rapidView).then(function(rapidView) {
            return model.jira.getLastSprintForRapidView(rapidView.id).then(function(sprint) {
                if (!sprint) {
                    error.push('Sprint not found');
                    return callback();
                }
                return model.jira.getSprintIssues(rapidView.id, sprint.id).then(function(issues) {
                    console.log('NACITANA JIRA');
                    if (issues && issues.contents) {
                        var jsonReponse = [];
                        issues.contents.issuesNotCompletedInCurrentSprint.forEach(function(issue) {
                            jsonReponse.push(parseIssue(issue));
                        });
                        return callback(jsonReponse);
                    } else {
                        error.push('Issues not found.');
                        return callback();
                    }
                });
            });
        });
    });

    /**
     * get user's assigned issues
     * @param {Object} email
     * @return {Object} response
     */
    schema.addWorkflow('getUsersIssues', function (error, model, email, callback) {
        if (!email) {
            error.push('Missing user email');
            return callback();
        }
        var query = usersIssuesJQL + email.replace('@', '\\u0040');
        console.log('NACITAVAM JIRA');
        model.jira.searchJira(query).then(function(jiraResponse) {
            console.log('NACITANA JIRA');
            console.log('JIRA POLE', jiraResponse);
            var jsonResponder;
            if (jiraResponse.total > 0 && Array.isArray(jiraResponse.issues)) {
                jsonResponder = jiraResponse.issues.map(issue => parseExpandedListIssue(issue));
            } else if (jiraResponse.total == 1) {
                jsonResponder = [parseExpandedListIssue(jiraResponse)];
            } else {
                jsonResponder = { error: 'No issues found.' };
            }
            return callback(jsonResponder);
        });
    });

    /**
     * get issues based on issue number
     * @param {Object} options { issues }
     * @return {Object} response
     */
    schema.addWorkflow('getIssues', function (error, model, issues, callback) {
        console.log('NACITAVAM JIRA');
        if (issues.length == 1) {
            model.jira.findIssue(issues.pop(), true).then(function (jiraResponse) {
                console.log(JSON.stringify(jiraResponse));
                return callback(parseExpandedDetailIssue(jiraResponse))
            });
        } else {
            var responseIssues = [];
            var count = 0;
            issues.forEach(function(issue) {
                model.jira.findIssue(issue, true).then(function (jiraResponse) {
                    count++;
                    responseIssues.push(parseExpandedListIssue(jiraResponse));
                    if (count == issues.length) {
                        return callback(responseIssues);
                    }
                });
            });
        }
    });

    /**
     * Assigned issue
     * @param {Object} options { user, issueKey }
     * @return {Object} response
     */
    schema.addWorkflow('assignIssue', function (error, model, options, callback) {
        username = options.user.email.replace('@', '\\u0040');
        model.jira.searchUsers({ username: options.user.email }).then(function(responseArray) {
            if (Array.isArray(responseArray)) {
                user = responseArray.first();
                model.jira.updateIssue(options.issueKey, { fields: { assignee: { name: user.name }}}).then(function(response) {
                    return callback(response);
                });
            }
        });
    });

    /**
     * ADD COMMENT
     * @param {Object} options { issue, comment }
     * @return {Object} response
     */
    schema.addWorkflow('addComment', function(error, model, options, callback) {
        console.log('NACITAVAM JIRA');
        model.jira.addComment(options.issue, options.comment).then(function(response) {
            console.log('NACITANA JIRA');
            return callback({ issue: options.issue, comment: response.body });
        });
    });

    schema.addWorkflow('getIssue', function(error, model, issueKey, callback) {
        console.log('NACITAVAM JIRU');
        model.jira.findIssue(issueKey).then(function(response) {
            return callback(parseContextIssue(response));
        });
    });

    schema.addWorkflow('getContextIssues', function(error, model, options, callback) {
        var contextIssues = [];
        model.jira.searchJira(contextJQL).then(function(response) {
            if (response.total > 0 && Array.isArray(response.issues)) {
                response.issues.forEach(function (issue) {
                    contextIssues.push(parseContextIssue(issue));
                });
            }
            return callback(contextIssues);
        });
    });

    schema.addWorkflow('getUsersInProgressIssues', function(error, model, email, callback) {
        var issues = [];
        var query = usersInProgressJQL + email.replace('@', '\\u0040');
        model.jira.searchJira(query).then(function(response) {
            if (response.total > 0 && Array.isArray(response.issues)) {
                response.issues.forEach(function(issue) {
                    issues.push(parseContextIssue(issue));
                });
            }
            return callback(issues);
        });
    });

    schema.addWorkflow('setStoryPoints', function(error, model, options, callback) {
        model.jira.updateIssue(options.issueKey, { fields: { customfield_10002: options.points }}).then(function(response) {
            return callback();
        });
    });

    schema.addWorkflow('changeStatus', function(error, model, options, callback) {
        model.jira.transitionIssue(options.issueKey, { transition: { id: options.status }}).then(function(response) {
            return callback();
        });
    });

    /**
     * Get normalized parsed Jira issue
     * @param {Object} issue parsed issue from Jira
     * @return {Object} normalized issue
     */
    function parseIssue(issue) {
        return {
            id: issue.id,
            key: issue.key,
            typeName: issue.typeName,
            typeImage: issue.typeUrl,
            title: issue.summary,
            assignee: issue.assigneeName ? issue.assigneeName : 'Not assigned',
            priority: issue.priorityName,
            priorityImage: issue.priorityUrl,
            status: issue.statusName
        }
    }

    function parseExpandedListIssue(issue) {
        return {
            id: issue.id,
            key: issue.key,
            typeName: issue.fields.issuetype.name,
            typeImage: issue.fields.issuetype.iconUrl,
            title: issue.fields.summary,
            assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Not assigned',
            priority: issue.fields.priority.name,
            priorityImage: issue.fields.priority.iconUrl,
            status: issue.fields.status.name
        }
    }

    function parseExpandedDetailIssue(issue) {
        return {
            id: issue.id,
            key: issue.key,
            description: issue.fields.description,
            updated: issue.fields.updated,
            typeName: issue.fields.issuetype.name,
            typeImage: issue.fields.issuetype.iconUrl,
            title: issue.fields.summary,
            assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Not assigned',
            priority: issue.fields.priority.name,
            priorityImage: issue.fields.priority.iconUrl,
            status: issue.fields.status.name
        }
    }

    function parseContextIssue(issue) {
        return {
            key: issue.key,
            assignee: issue.fields.assignee ? issue.fields.assignee.emailAddress : "",
            status: issue.fields.status.name
        }
    }

    /**
     * Get assigned parsed Jira issue
     * @param {Object} issue parsed issue from Jira
     * @return {Object} assinged issue
     */
    function parseAssignedIssue(issue) {
        return {
            id: issue.id,
            key: issue.key,
            typeName: issue.fields.issuetype.name,
            title: issue.fields.summary,
            status: issue.fields.status.name,
            assignee: issue.fields.assignee.displayName
        }
    }
});
