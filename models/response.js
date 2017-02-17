NEWSCHEMA('Response').make(function(schema) {

    schema.addOperation('statusResponse', function (error, model, modules, callback) {
        return callback(buildStatusResponse(modules));
    });

    schema.addOperation('helpResponse', function (error, model, options, callback) {
        return callback(buildHelp());
    });

    schema.addOperation('issuesResponse', function(error, model, issues, callback) {
        return callback(buildResponseIssues(issues));
    });

    schema.addOperation('issueResponse', function (error, model, issue, callback) {
        return callback(buildSingleIssue(issue));
    });

    schema.addOperation('enableModuleResponse', function (error, model, options, callback) {
        return callback(buildEnableModuleResponse(options));
    });

    schema.addOperation('basicResponse', function (error, model, message, callback) {
        return callback(buildBasicResponse(message));
    });

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

    function buildHelp() {
        var title = 'This is a few commands I understand:\n\n';
        var general = '*_General Commands_*\n';
        var status = '`status` give you current modules status.\n';
        var enableModule =  '`enable {module}` will activate module: _standup_, _monitoring_, _reporting_.\n';
        var disableModule = '`disable {module}` stop module.\n';
        var help = '`help` for this wondeful and useful list.\n\n';
        var standup = '*_Standup_*\n';
        var startStandup = '`start standup` will automatically start daily standup for your team.\n';
        var cancel = '`cancel` cancel current standup.\n\n';
        var monitoring = '*_Monitoring_*\n';
        var monitor = '`monitor` will automatically start tracking current sprint and notify about any problem.\n\n';
        var reporting = '*_Reporting_*\n';
        var issues = '`sprint issues` provide list of issues in current sprint.\n';
        var users = '`@user issues` provide list of assigned issues.\n';
        var issue = '`{Issue number} progress` progress about specific issue.';

        var json = {
            text: title + general + status + enableModule + disableModule + help + standup + startStandup + cancel + monitoring + monitor + reporting + issues + users + issue
        };
        return json;
    }

    function buildStatusResponse(modules) {
        var json = {
            text: 'This is status about enabled/disabled bot modules.',
            attachments: []
        };

        if (modules) {
            modules.forEach(function (moduleObject) {
                var object = {
                    title: moduleObject.name,
                    text: moduleObject.description,
                    color: moduleObject.enabled == true ? 'good' : '#DE0416'
                }
                json.attachments.push(object);
            });
        }
        return json;
    }

    function buildBasicResponse(message) {
        if (message) {
            return message;
        }
    }
});
