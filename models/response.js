NEWSCHEMA('Response').make(function(schema) {

    schema.addOperation('issuesResponse', function(error, model, issues, callback) {
        return callback(buildResponseIssues(issues));
    })

    schema.addOperation('issueResponse', function (error, model, issue, callback) {
        return callback(buildSingleIssue(issue));
    })

    function buildResponseIssues(issues) {
        var self = this;
        var json = {
            attachments: []
        };
        if (issues && issues.contents) {
            issues.contents.completedIssues.forEach(function(issue) {
                var object = buildFieldsForIssue(issue);
                json.attachments.push(object);
            });
            issues.contents.issuesNotCompletedInCurrentSprint.forEach(function(issue) {
                var object = buildFieldsForIssue(issue);
                json.attachments.push(object);
            });
        }
        return json;
    }

    function colorForIssue(issue) {
        switch (issue.status.name) {
            case 'Done':
                return 'good';
            case 'To Do':
                return '#DE0416';
            case 'In Progress':
                return '#F3B443';
            default:
            break;
        }
    }

    function buildFieldsForIssue(issue) {
        var self = this;
        var object = {
            title:issue.summary,
            title_link:buildIssueLink(issue.key),
            color:colorForIssue(issue),
            fields: [{
                title: 'Assignee',
                value: issue.assigneeName ? issue.assigneeName : 'Not assigned',
                short: true
            }, {
                title: 'Status',
                value: issue.status.name,
                short: true
            }]
        }
        return object;
    }

    function buildIssueLink(issueKey) {
        let base = '/browse/';
        return `${process.env.PROTOCOL}://${process.env.HOST}:${process.env.PORT}${base}${issueKey}`;
    }

    function buildSingleIssue(issue) {
        var self = this;
        var json = {
            attachments: []
        };
        if (issue && issue.fields) {
            var object = {
                title:issue.fields.summary,
                title_link:buildIssueLink(issue.key),
                fields: [{
                    title: 'Assignee',
                    value: issue.fields.assignee ? issue.fields.assignee : 'Not assigned',
                    short: true
                }, {
                    title: 'Status',
                    value: issue.fields.status.name,
                    short: true
                }]
            }
            json.attachments.push(object);
        }
        return json;
    }

});
