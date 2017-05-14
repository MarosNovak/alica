NEWSCHEMA('Responder').make(function(schema) {

    // ****************************************************************************
    // Basic text messages, warnings and errors
    // ****************************************************************************

    /**
     * WARNING MESSAGE
     * @param {String} warningMessage String text from CONFIG file
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('warningMessage', function(error, model, message, callback) {
        return callback({ text: '⚠️ ' + message });
    });

    /**
     * MODULE DISABLED MESSAGE
     * @param {Object} options - module
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('moduleDisabled', function(error, model, options, callback) {
        return callback({ text: '⚠️ Module *' + options.name + '* is disabled.' });
    });

    /**
     * HELP MESSAGE
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('help', function(error, model, options, callback) {
        return callback(buildHelp());
    });

    // ****************************************************************************
    // GENERAL messages
    // ****************************************************************************

    /**
     * MDOULES STATUS MESSAGE
     * @param {Object} options - { modules[], users[] }
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('modulesStatus', function (error, model, options, callback) {
        return callback(buildStatusMessage(options));
    });

    /**
     * ADMIN RIGHTS MESSAGE
     * @param {Object} options - { admins, action }
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('adminRightsMessage', function(error, model, options, callback) {
        var users = '';
        options.admins.forEach(function(user) {
            users += '<@' + user.slackID + '> ';
        });
        return callback({ text: '👥 ' + (options.action ? 'Added.' : 'Removed.') + ' Admin rights now have ' + users });
    });

    /**
     * MODULE STATUS CHANGE
     * @param {Object} options - { module, enabled }
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('moduleStatusChanged', function(error, model, options, callback) {
        return callback({ text: 'Module *' + options.slackModule.name + (options.enabled ? '* enabled.' : '* disabled.') });
    });

    // ****************************************************************************
    // STANDUP messages
    // ****************************************************************************

    /**
     * STANDUP TIME SETUP MESSAGE
     * @param {String} time new time set in format HH:MM
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('standupTimeMessage', function(error, model, time, callback) {
        return callback({ text: '⏰ Ok. Time is set for *' + time + '* from Monday to Friday.' })
    });

    /**
     * STANDUP USERS CHANGE MESSAGE
     * @param {Object} options - { standupModole: Object, action: true/false }
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('standupUsersMessage', function(error, model, options, callback) {
        var users = '';
        options.standupModule.content.users.forEach(function(user) {
            users += '<@' + user.slackID + '> ';
        });
        return callback({ text: '👥 ' + (options.action ? 'Added.' : 'Removed.') + ' Team now consist of ' + users });
    });

    /**
     * STANDUP USERS CHANGE MESSAGE
     * @param {String} channel - channel ID
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('standupChannelMessage', function(error, model, channel, callback) {
        return callback({ text:'📋 Every user\'s report is now reported to the <#' + channel + '> channel.' });
    });

    /**
     * STANDUP ALICA ANSWER TO USER - JIRA CHECK
     * @param {Object} options - { incorrect, type }
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('standupJiraCheckMessage', function(error, model, options, callback) {
        return callback(buildJiraCheckMessage(options));
    });

    /**
     * Build User's daily standup response from answers
     * @param {Object} currentUser - { answers[], finished, blockers, icon }
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('standupUserReport', function (error, model, currentUser, callback) {
        return callback(buildStandupReport(currentUser));
    });

    /**
     * Build User's daily standup response from answers
     * @param {Object} reports - { users[] }
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('standupSummaryMessage', function (error, model, reports, callback) {
        return callback(buildStandupSummary(reports));
    });

    // ****************************************************************************
    // MONITORING messages
    // ****************************************************************************

    /**
     * Issues list
     * @param {String} issues
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('issuesList', function(error, model, issues, callback) {
        return callback(buildIssuesList(issues));
    });

    /**
     * Issue detail
     * @param {String} issue
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('issueDetail', function(error, model, issue, callback) {
        return callback(buildIssueDetail(issue));
    });

    /**
     * Added comment response
     * @param {String} options - { issue, comment }
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('addedComment', function (error, model, options, callback) {
        return callback({
            text: '💬 Comment added to <' + buildIssueLink(options.issue) + '|' + options.issue.toUpperCase() + '>: ```'+ options.comment +'```'
        });
    });

    /**
     * Assigned issue to user
     * @param {String} options - { user, issueKey }
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('assignedIssue', function (error, model, options, callback) {
        return callback({ text:'✋🏻 Done. Issue <' + buildIssueLink(options.issueKey) + '|' + options.issueKey.toUpperCase() + '> assigned to <@'+ options.user.slackID + '>.'});
    });

    // ****************************************************************************
    // ESTIMATION messages
    // ****************************************************************************

    /**
     * Voting started ...
     * @param {String} issueKey
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('votingStarted', function(error, model, issueKey, callback) {
        return callback({ text: 'Voting for <' + buildIssueLink(issueKey) + '|' + issueKey.toUpperCase() + '> has beed started ...' });
    });

    /**
     * Vote direct message
     * @param {String} issue
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('voteMessage', function (error, model, issue, callback) {
        return callback(buildVotingMessage(issue));
    });

    /**
     * Voting results message
     * @param {String} votingResults
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('votingResults', function (error, model, votingResults, callback) {
        return callback(buildVotingResults(votingResults));
    });

    /**
     * Story points set message
     * @param {String} options - issueKey, points
     * @return {Object} - {responseMessage}
     */
    schema.addOperation('storyPointsSet', function (error, model, options, callback) {
        return callback({text: 'Set. User story <' + buildIssueLink(options.issueKey) + '|' + options.issueKey.toUpperCase() + '> was estimated for *' + options.points + '* story points.'});
    });

    // ****************************************************************************
    // GENERAL messages
    // ****************************************************************************

    function buildStatusMessage(options) {
        var json = {
            text: '🗂 Here is status about enabled/disabled modules.',
            attachments: [],
        };
        var admins = '';
        options.users.forEach(function(user) {
            admins += '<@' + user.slackID + '> ';
        });
        json.attachments.push({
            title: 'General',
            text: '👥 Information about admin rights.',
            color: '#217CBA',
            fields: [{
                title: 'Admin (SM privilages)',
                value: admins,
                short: false
            }]
        });

        options.modules.forEach(function(moduleObject) {
            var fields = [];
            if (moduleObject.name == 'Daily Standup') {
                var users = '';
                moduleObject.content.users.forEach(function(user) {
                    users += '<@' + user.slackID + '> ';
                });
                fields = [{
                    title: 'Report channel',
                    value: '<#' + moduleObject.content.channel + '>',
                    short: true
                }, {
                    title: 'Scheduled',
                    value: moduleObject.content.scheduledTime,
                    short: true
                }, {
                    title: 'Members',
                    value: users != '' ? users : 'None',
                    short: false
                }]
            }

            var object = {
                mrkdwn_in: ['text'],
                title: moduleObject.name,
                text: 'Module is ' + (moduleObject.enabled ? 'enabled. ' : 'disabled. ') + moduleObject.description,
                color: moduleObject.enabled == true ? 'good' : '#DE0416',
                fields: fields
            }
            json.attachments.push(object);
        });
        return json;
    }

    // ****************************************************************************
    // STANDUP messages
    // ****************************************************************************

    function buildJiraCheckMessage(options) {
        var issues = options.incorrect;
        var answer;

        if (options.type == 'Ongoing') {
            if (options.inProgress.length) {
                answer = 'Okay. Please keep on your mind these *yours In Progress* issues: ';
                options.inProgress.forEach(function(issue) {
                    answer = answer + '<' + buildIssueLink(issue.key) + '|' + issue.key.toUpperCase() + '> ';
                });
                answer = answer + '\n';
            } else {
                answer = '👌🏼 Okay everything looks good in Jira.\n';
            }
        } else if (!issues.length) {
            answer = '👌🏼 Ok. Issues are ' + options.type + ' in Jira.\n';
        } else if (issues.length == 1) {
            answer = '⚠️ Please update issue in Jira, because <' + buildIssueLink(issues.first().key) + '|' + issues.first().key.toUpperCase() + '> is *not ' + options.type + '*.\n';
        } else {
            answer = '⚠️ Please update issues in Jira, because ';
            issues.forEach(function(issue) {
                answer = answer + '<' + buildIssueLink(issue.key) + '|' + issue.key.toUpperCase() + '> ';
            });
            answer = answer + 'are *not ' + options.type + '*.\n';
        }
        return answer;
    }

    function buildStandupReport(currentUser) {
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
                            footer = '👌🏼 Ok. Issues are Done.';
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
                            footer = '👌🏼 Ok. Issues are In Progress.';
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
                        footer = '👌🏼 Ok. Issues are assigned to user.';
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
            }
            json.attachments.push(object);
        });
        console.log('VYSLEDOK', json);
        return json;
    }

    function buildStandupSummary(reports) {
        var json = {
            text: 'Team standup summary report from *' + new Date().format('d. MMM yyyy') + '*.',
            attachments: []
        };
        var text = '';
        var ignoringUsers = '';
        var blockingUsers = '';
        var participants = 0;
        var blockers = 0;
        var done = 0;
        var progress = 0;

        reports.users.forEach(function(user) {
            if (user.ignored) {
                ignoringUsers += '<@' + user.slackID + '> ';
            } else if (user.answers) {
                text += '<@' + user.slackID + '> ';
                participants++;
            }
            if (user.blockers) {
                blockingUsers += '<@' + user.slackID + '> ';
                blockers++;
            }

            user.answers.forEach(function(answer) {
                if (answer.question == 'Yesterday - Done') {
                    done += answer.issues.length;
                }
                if (answer.question == 'Yesterday - In Progress') {
                    progress += answer.issues.length;
                }
            });

        });

        text += text ? 'reported status. ' : 'Nobody attended daily standup. ';
        text += '*('+ (participants / reports.users.length) * 100 + '%)*\n';

        text += ignoringUsers;
        text += ignoringUsers ? 'ignored daily standup ' : 'Everybody attended daily standup.';
        text += ignoringUsers ? '*('+ ((reports.users.length - participants) / reports.users.length) * 100 + '%)*\n' : '';

        text += blockingUsers;
        text += blockingUsers ? 'reported some blockers ' : 'Nobody reported blocking issues.';
        text += ignoringUsers ? '('+ (blockers / reports.users.length) * 100 + '%)\n' : '';

        json.attachments.push({
            text: text,
            color: '#217CBA',
            mrkdwn_in: ['text'],
            fields: [{
                    title: 'Done',
                    value: (done += (done == 1 ? ' issue' : ' issues')),
                    short: true
                }, {
                    title: 'In Progress',
                    value: (progress += (progress == 1 ? ' issue' : ' issues')),
                    short: true
                }
            ]
        });
        return json;
    }

    // ****************************************************************************
    // MONITORING messages
    // ****************************************************************************

    function buildIssuesList(issues) {
        var self = this;
        var json = {
            text: '📦 Here are ' + issues.length + ' issues returned from Jira.',
            attachments: []
        };
        issues.forEach(function (issue) {
            var object = buildFieldsForBasicIssue(issue);
            json.attachments.push(object);
        });
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

    function buildIssueLink(issueKey) {
        let base = '/browse/';
        return `${process.env.PROTOCOL}://${process.env.HOST}:${8080}${base}${issueKey}`;
    }

    function buildIssueDetail(issue) {
        epochTime = new Date(issue.updated).getTime() / 1000;
        var json = {
            text: '<' + buildIssueLink(issue.key) + '|' + issue.key + '> *' + issue.title + '*',
            attachments: [
                {   text: issue.description,
                    color: '#217CBA',
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
                }, {
                    text: 'Do you want to change the status?',
                    color: '#217CBA',
                    callback_id: 'JIRA-ACTION',
                    actions: [
                        {
                        name: issue.key,
                        text: 'To Do',
                        type: 'button',
                        value: 11
                       }, {
                        name: issue.key,
                        text: 'In Progress',
                        type: 'button',
                        value: 21
                      }, {
                        name: issue.key,
                        text: 'Done',
                        type: 'button',
                        value: 31
                     }]
                }
            ]
        };
        return json;
    }

    // ****************************************************************************
    // ESTIMATION messages
    // ****************************************************************************

    function buildVotingMessage(issue) {
        var json = {
            text: 'Voting for issue <' + buildIssueLink(issue.key) + '|' + issue.key + '> has been started. Please choose amount of story points.\n *' + issue.title + '*',
            attachments: [
                {   text: issue.description,
                    color: '#217CBA',
                    author_name: issue.typeName,
                    author_icon: issue.typeImage,
                    callback_id: 'VOTE',
                    actions: [ { name: '0', text: '0', type: 'button', value: 0 }, { name: '1', text: '1', type: 'button', value: 1 }, { name: '2', text: '2', type: 'button', value: 2 }, { name: '3', text: '3', type: 'button', value: 3 }, { name: '5', text: '5', type: 'button', value: 5 }
                    ]
                },
                {   text: '',
                    color: '#217CBA',
                    callback_id: 'VOTE',
                    actions: [ { name: '8', text: '8', type: 'button', value: 8 }, { name: '13', text: '13', type: 'button', value: 13 }, { name: '20', text: '20', type: 'button', value: 20 }, { name: '40', text: '40', type: 'button', value: 40 }, { name: '100', text: '100', type: 'button', value: 100 }
                    ]
                },
                {   text: '',
                    color: '#217CBA',
                    callback_id: 'VOTE',
                    actions: [ { name: '?', text: '?', type: 'button', value: '?' }, { name: 'coffee', text: '☕️', type: 'button', value: 'coffee' } ]
                }
            ]
        };
        return json;
    }

    function buildVotingResults(votingResults) {
        var min = 101;
        var max = 0;
        var maxUser;
        var minUser;
        var sum = 0;
        var allUsers = '';

        votingResults.users.forEach(function(element) {
            if (element.value > max) {
                max = parseInt(element.value);
                maxUser = element.key;
             }
            if (element.value < min) {
                min = parseInt(element.value);
                minUser = element.key;
            }
            allUsers += '`'+ element.value +'` - <@' + element.key + '>\n';
            sum = sum + parseInt(element.value);
        });

        var json = {
            text: 'Voting has been completed. Here are the results:',
            attachments: [
                {
                    mrkdwn_in: [ "text", "fields" ],
                    fields: [
                        {
                            title: 'Maximum',
                            value: max > 0 ? ('*' + max + '* - <@' + maxUser + '>') : '-',
                            short: true
                        }, {
                            title: 'Minimum',
                            value: min < 101 ? ('*' + min + '* - <@' + minUser + '>') : '-',
                            short: true
                        }, {
                            title: 'Average',
                            value: sum > 0 ? sum / votingResults.users.length : '-',
                            short: true
                        }],
                    color: '#217CBA'
                },
                {
                    mrkdwn_in: [ "text" ],
                    text: allUsers,
                    color: '#217CBA'
                }
            ]
        }
        return json;
    }

    function buildHelp() {
        var title = 'I\'m here to help you. This is a few setences I\'m able to understand:\n\n';
        var general = '*_General Commands_*\n';
        var status = '`Modules status` _Can you show me modules status?_\n';
        var modulesChange =  '`Modules activation` _{Turn off/on} {estimation/standup/monitoring} please._\n';
        var admin = '`Admin rights` _Please {add/remove} admin rights to {@user}._\n';
        var help = '`Help` _Can you help me please?_ \n\n';
        var standup = '*_Daily Standup settings_*\n';
        var startStandup = '`Start daily standup` _Start standup._\n';
        var standupUsers = '`Standup users` _{Add/remove} {@user} to daily standup._\n';
        var standupTime = '`Standup time` _Setup daily meeting for {9:00} please._\n';
        var standupChannel = '`Standup channel` _Setup report channel to {#channel}._\n\n';
        var standupOngoing = '*_During Standup meeting_*\n';
        var answer = '`Answer question` _I was working on {FR-43}._\n';
        var cancel = '`Cancel all meeting` _cancel_\n';
        var ignore = '`Ignore meeting` _ignore_\n';
        var nope = '`Skip question` _skip, no, nope, nothing, none_\n\n'
        var monitoring = '*_Monitoring_*\n';
        var summary = '`Sprint summary` _Please show me all issues._\n'
        var issues = '`Jira issues` _Show me status of {FR-12}, {FR-33}_.\n';
        var myIssues = '`Jira my issues` _Can you show me my tickets?_.\n';
        var usersIssues = '`Jira users issues` _Can you show me issues of {@user}_.\n';
        var assign = '`Jira assign issue` _Assign issue {FR-12} to {@user} / Assign issue {FR-12} to me_.\n';
        var addComment = '`Jira add comment` _Add comment to issues {FR-12} {‘text’}._\n\n';
        var estimation = '*_Estimation_*\n';
        var vote = '`Start voting` _Let’s vote about {FR-51}._\n';
        var storyPoints = '`Set story points` _Setup story points {5} to issue {FR-25}._\n';

        var json = {
            text: title + general + status + modulesChange + admin + help + standup + startStandup + standupUsers + standupTime + standupChannel + standupOngoing + answer + cancel + ignore + nope + monitoring + summary + issues + myIssues + usersIssues + assign + addComment + estimation + vote + storyPoints
        };
        return json;
    }
});
