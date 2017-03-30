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

    schema.addOperation('issueDetailResponse', function(error, model, issue, callback) {
        return callback(buildIssueDetail(issue));
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

    schema.addOperation('addedCommentResponse', function (error, model, options, callback) {
        return callback(buildAddedCommentResponse(options));
    });

    schema.addOperation('standupReportResponse', function (error, model, checkIn, callback) {
        return callback(buildStandupReportResponse(checkIn));
    });

    /**
     * Build USer's daily standup response from answers
     * @param {Object} options - { user, answers }
     */
    schema.addOperation('userStandupAnswerResponse', function (error, model, currentUser, callback) {
        return callback(buildStandupResponse(currentUser));
    });

    function buildIssueDetail(issue) {
        epochTime = new Date(issue.updated).getTime() / 1000;
        var json = {
            text: '<' + buildIssueLink(issue.key) + '|' + issue.key + '> ' + issue.title,
            attachments: [
                {   text: issue.description,
                    color: '#23B6BA',
                    author_name: issue.typeName,
                    author_icon: issue.typeImage,
                    mrkdwn_in: ['text', 'fields'],
                    fields: [
                        {
                            title: 'Status',
                            value: '`' + issue.status + '`',
                            short: true
                        },
                        {
                            title: 'Priority',
                            value: issue.priority,
                            short: true
                        },
                        {
                            title: 'Assignee',
                            value: issue.assignee,
                            short: true
                        },
                        {
                            title: 'Last updated',
                            value:  '<!date^' + epochTime + '^{date} at {time}| Not defined.>',
                            short: true
                        }
                    ]
                }
            ]
        };
        return json;
    }

    function buildResponseIssues(issues) {
        var self = this;
        var json = {
            text: 'Showing ' + issues.length + ' issues returned from Jira.',
            attachments: []
        };
        issues.forEach(function (issue) {
            var object = buildFieldsForBasicIssue(issue);
            json.attachments.push(object);
        });

        return json;
    }

    function priorityColorForIssue(issue) {
        switch (issue.priority) {
            case 'Highest':
                return '#EC181D';
            case 'High':
                return '#F83E20';
            case 'Medium':
                return '#F58925';
            case 'Low':
                return '#E3E235';
            case 'Lowest':
                return '#A3CF2C';
            default:
            break;
        }
    }

    function buildAddedCommentResponse(options) {
        var json = {
            text: 'Comment added to issue <' + buildIssueLink(options.issue) + '|' + options.issue + '> :v: ```'+ options.comment +'```'
        };
        return json;
    }

    function buildFieldsForBasicIssue(issue) {
        var self = this;
        var object = {
            text: '`' + issue.status + '` <' + buildIssueLink(issue.key) + '|' + issue.key + '> ' + issue.title,
            color: priorityColorForIssue(issue),
            footer: issue.typeName + ' | Priority: ' + issue.priority + ' | Assignee: ' + issue.assignee,
            footer_icon: issue.typeImage,
            mrkdwn_in: ['text'],
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
            attachments: [],
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

    function buildStandupResponse(currentUser) {
        console.log(JSON.stringify(currentUser));
        var json = {
            text: 'Standup report from <@' + currentUser.slackID + '> for *' + new Date().format('d. MMM yyyy') + '*',
            attachments: [],
            mrkdwn_in: ['text', 'title']
        };

        currentUser.answers.forEach(function(element) {
            var color;
            var icon;
            var footer;
            var text = element.answer;

            if (element.issues) {
                element.issues.forEach(function(issue) {
                    text = text.replace(issue, '<' + buildIssueLink(issue) + '|' + issue.toUpperCase() + '>');
                });
            }

            switch (element.question) {
                case 'Yesterday - Done':
                    icon = (element == currentUser.answers.first()) ? currentUser.icon : '';
                    color = '#12AF5C';
                    if (element.issues && element.issues.length) {
                        if (element.incorrect && element.incorrect.length) {
                            footer = '⚠️ Jira Check: ';
                            footer += element.incorrect.toString().toUpperCase();
                            footer += element.incorrect.length == 1 ? ' is not Done' : ' are not done in Jira.';
                        } else {
                            footer = '✅ Jira Check: Ok. Issues are Done.';
                        }
                    } else {
                        footer = '👀 No issues mentioned.';
                    }
                    break;
                case 'Yesterday - In Progress':
                    icon = (element == currentUser.answers.first()) ? currentUser.icon : '';
                    color = '#E8A723';
                    if (element.issues && element.issues.length) {
                        if (element.incorrect && element.incorrect.length) {
                            footer = '⚠️ Jira Check: ';
                            footer += element.incorrect.toString().toUpperCase();
                            footer += element.incorrect.length == 1 ? ' is not In Progress' : ' are not in progress in Jira.';
                        } else {
                            footer = '✅ Jira Check: Ok. Issues are In Progress.';
                        }
                    } else {
                        footer = '👀 No issues mentioned.';
                    }
                    break;
                case 'Today':
                    icon = (element == currentUser.answers.first()) ? currentUser.icon : '';
                    color = '#217CBA';
                    if (element.issues && element.issues.length) {
                        if (element.incorrect && element.incorrect.length) {
                            footer = '⚠️ Jira Check: ';
                            footer += element.incorrect.toString().toUpperCase();
                            footer += element.incorrect.length == 1 ? ' is not assigned to user.' : ' are not assigned to user in Jira.';
                        } else {
                        footer = '✅ Jira Check: Ok. Issues are assigned to user.';
                        }
                    } else {
                        footer = '👀 No issues mentioned.';
                    }
                    break;
                case 'Blockers':
                    icon = (element == currentUser.answers.first()) ? currentUser.icon : '';
                    color = '#E84F3E';
                    break;
                default:
            }
            var object = {
                color: color,
                title: element.question,
                text: text,
                thumb_url: icon,
                footer: footer
                // footer_icon: footer_icon
            }
            json.attachments.push(object);
        });
        console.log('VYSLEDOK', json);
        return json;
    }

    function buildStandupReportResponse(checkIn) {
        var json = {
            text: 'Team standup summary from *' + new Date().format('d. MMM yyyy') + '*.',
            attachments: []
        };
        var text = '';
        var participants = 0;
        var blockers = 0;

        checkIn.users.forEach(function(user) {
            if (user.answers) {
                text += '<@' + user.slackID + '> ';
                participants++;
            }
        });
        text += text ? 'reported status. ' : 'Nobody attended daily standup. ';
        text += '('+ (participants / checkIn.users.length) * 100 + '%)\n';

        checkIn.users.forEach(function(user) {
            if (user.blockers) {
                text += '<@' + user.slackID + '> ';
                blockers++;
            }
        });
        text += text ? 'reported some blockers. ' : 'Nobody reported blocking issues.';
        text += '('+ (blockers / checkIn.users.length) * 100 + '%)\n';

        var object = {
            text: text,
            color: '#217CBA'
        }
        json.attachments.push(object);
        return json;
    }
});
