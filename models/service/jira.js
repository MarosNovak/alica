var JiraApi = require('jira-client');

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
            port: process.env.PORT,
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
        if (!rapidView) {
            error.push('Missing rapid view');
            return callback();
        }
        model.jira.findRapidView(rapidView).then(function(rapidView) {
            return model.jira.getLastSprintForRapidView(rapidView.id).then(function(sprint) {
                return model.jira.getSprintIssues(rapidView.id, sprint.id).then(function(issues) {
                    console.log('NACITANA JIRA');
                    if (issues && issues.contents) {
                        var jsonResponse = [];
                        issues.contents.completedIssues.forEach(function(issue) {
                            jsonResponse.push(parseIssue(issue));
                        });
                        issues.contents.issuesNotCompletedInCurrentSprint.forEach(function(issue) {
                            jsonResponse.push(parseIssue(issue));
                        });
                        return callback(jsonResponse);
                    } else {
                        error.push('Issues not found.');
                        return callback();
                    }
                });
            });
        }).catch(function(err) {
            console.log('JIRA ERROR');
            error.push(err.message);
            return callback();
        });
    });

    /**
     * get user's assigned issues
     * @param {Object} options { email }
     * @return {Object} response
     */
    schema.addWorkflow('getUsersIssues', function (error, model, options, callback) {
        var email = options.email;
        if (!email) {
            error.push('Missing user email');
            return callback();
        }
        console.log('NACITAVAM JIRA');
        model.jira.getUsersIssues(email, true).then(function (jiraResponse) {
            console.log('NACITANA JIRA');
            console.log('JIRA POLE', jiraResponse);
            var jsonResponse;
            if (jiraResponse.total > 0 && Array.isArray(jiraResponse.issues)) {
                jsonResponse = jiraResponse.issues.map(issue => parseAssignedIssue(issue));
            } else if (jiraResponse.total == 1) {
                jsonResponse = [parseAssignedIssue(jiraResponse)];
            } else {
                jsonResponse = { error: 'No issues found.' };
            }
            return callback(jsonResponse);
        }).catch(function(err) {
            console.log('JIRA ERROR');
            error.push(err.message);
        });
    });

    /**
     * get issues based on issue number
     * @param {Object} options { issues }
     * @return {Object} response
     */
    schema.addWorkflow('getIssues', function (error, model, issues, callback) {
        console.log('NACITAVAM JIRA');
        issues.forEach(function(issue) {
            model.jira.findIssue('FR-'+ issue.replace('#',''), true).then(function (jiraResponse) {
                console.log('NACITANA JIRA');
                console.log('JIRA POLE', JSON.stringify(jiraResponse));
                var jsonResponse;
            });
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
            title: issue.summary,
            assignee: issue.assigneeName ? issue.assigneeName : 'Not assigned',
            status: issue.statusName
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
