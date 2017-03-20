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

    schema.addOperation('enableModuleResponse', function (error, model, options, callback) {
        return callback(buildEnableModuleResponse(options));
    });

    schema.addOperation('basicResponse', function (error, model, message, callback) {
        return callback(buildBasicResponse(message));
    });

    schema.addOperation('usersIssuesResponse', function (error, model, usersIssues, callback) {
        return callback(buildResponseIssues(usersIssues));
    });

    /**
     * Build USer's daily standup response from answers
     * @param {Object} options - { user, answers }
     */
    schema.addOperation('userStandupAnswerResponse', function (error, model, options, callback) {
        return callback(buildStandupResponse(options));
    });

    function buildResponseIssues(issues) {
        console.log('RESPONSEE', issues);
        var self = this;
        var json = {
            attachments: []
        };
        issues.forEach(function (issue) {
            var object = buildFieldsForIssue(issue);
            json.attachments.push(object);
        });
        console.log('JAAASON', json);

        return json;
    }

    function colorForIssue(issue) {
        switch (issue.status) {
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
            title: issue.title,
            title_link: buildIssueLink(issue.key),
            color: colorForIssue(issue),
            fields: [{
                title: 'Assignee',
                value: issue.assignee,
                short: true
            }, {
                title: 'Status',
                value: issue.status,
                short: true
            }]
        }
        return object;
    }

    function buildIssueLink(issueKey) {
        let base = '/browse/';
        return `${process.env.PROTOCOL}://${process.env.HOST}:${process.env.PORT}${base}${issueKey}`;
    }

    function buildHelp() {
        var title = 'This is a few commands I understand:\n\n';
        var general = '*_General Commands_*\n';
        var status = '`status` give you current modules status.\n';
        var enableModule =  '`enable {module}` will activate module: _standup_, _monitoring_, _reporting_.\n';
        var disableModule = '`disable {module}` stop module.\n';
        var help = '`help` for this wondeful and useful list.\n';
        var admin = '`admin {@users}` will set rights for various commands.\n\n'
        var standup = '*_Standup_*\n';
        var startStandup = '`start standup` will automatically start daily standup for your team.\n';
        var cancel = '`cancel` cancel current standup.\n';
        var schedule = '`standup time {HH:MM}` for scheduling daily standups.\n';
        var nope = '`skip` `no` `nope` `nothing` `none` for skip question.\n'
        var add = '`standup add {@users}` to invite users for daily standup.\n\n';
        var monitoring = '*_Monitoring_*\n';
        var monitor = '`monitor` will automatically start tracking current sprint and notify about any problem.\n\n';
        var reporting = '*_Reporting_*\n';
        var issues = '`sprint issues` provide list of issues in current sprint.\n';
        var users = '`@user -i` provide list of assigned issues.\n';
        var issue = '`{Issue number} progress` progress about specific issue.';

        var json = {
            text: title + general + status + enableModule + disableModule + help + admin + standup + startStandup + cancel + schedule + nope + add + monitoring + monitor + reporting + issues + users + issue
        };
        return json;
    }

    function buildStatusResponse(modules) {
        var json = {
            text: 'This is status about enabled/disabled bot modules.',
            attachments: []
        };
        modules.forEach(function (moduleObject) {
            var fields = [];
            if (moduleObject.name == 'standup') {
                var users = '';
                moduleObject.content.users.forEach(function(user) {
                    users += '<@' + user.slackID + '> ';
                });
                fields = [{
                    title: 'Output Channel',
                    value: '<#' + moduleObject.content.channel + '>',
                    short: true
                }, {
                    title: 'Repeating at',
                    value: moduleObject.content.scheduledTime,
                    short: true
                }, {
                    title: 'Members',
                    value: users != '' ? users : 'None',
                    short: false
                }]
            }

            var object = {
                title: moduleObject.name,
                text: moduleObject.description,
                color: moduleObject.enabled == true ? 'good' : '#DE0416',
                fields: fields
            }
            json.attachments.push(object);
        });
        return json;
    }

    function buildBasicResponse(message) {
        if (!message) {
            console.log('FAILED BUILD BASIC RESPONSE');
        } else {
            return message;
        }
    }

    function buildStandupResponse(options) {
        var user = options.user;
        var answers = options.answers;

        var json = {
            text: '<@' + user.slackID + '> reported his standup status from *' + new Date().format('d. MMM yyyy') + '*',
            attachments: []
        };
        answers.forEach(function(answer) {
            var color = '#3EB890';
            if (answers.indexOf(answer) == 1) {
                color = '#E8A723';
            } else if (answers.indexOf(answer) == 2) {
                color = '#E01765';
            }
            var object = {
                color: color,
                title: answer.question,
                text: answer.answer,
            }
            json.attachments.push(object);
        });
        console.log('VYSLEDOK', json);
        return json;
    }
});
