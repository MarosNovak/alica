var Responder = GETSCHEMA('Responder');
var Monitoring = GETSCHEMA('Monitoring');
var Module = GETSCHEMA('Module');
var User = GETSCHEMA('User');
var Cron = require('node-cron');

var slackbot = GETSCHEMA('Bot').make();
var estimation = GETSCHEMA('Estimation').make();

var scheduler;
var standup;

slackbot.$workflow('connect', function(err) {
    console.log('CONNECTED');

    slackbot.emitter.on('SMALLTALK', (intent) => {
        console.log('SMALL TALK EMIT');
        return processSmallTalk(intent);
    });

    slackbot.emitter.on('GENERAL', (intent) => {
        console.log('GENERAL EMIT');
        switch (intent.type) {
            case 'INIT':
                return processInit(intent);
            case 'HELP':
                return processHelp(intent);
            case 'MODULES-STATUS':
                return processStatus(intent);
            case 'MODULES-ACTIVATION':
                return processModuleChangeEnable(intent);
            case 'MODULES-ADMIN-RIGHTS':
                return processModuleAdminRights(intent);
        }
    });

    slackbot.emitter.on('MONITORING', (intent) => {
        console.log('Monitoring EMIT');
        switch(intent.type) {
            case 'JIRA-SUMMARY':
                return processIssuesSummary(intent);
            case 'JIRA-ISSUES':
                return processSpecificIssues(intent);
            case 'JIRA-MY-ISSUES':
                return processMyIssues(intent);
            case 'JIRA-USER-ISSUES':
                return processUsersIssues(intent);
            case 'JIRA-ADD-COMMENT':
                return processAddComment(intent);
            case 'JIRA-ASSIGN':
                return processAssignIssue(intent);
            case 'JIRA-ASSIGN-ME':
                return processAssignToMeIssue(intent);
        }
    });

    slackbot.emitter.on('STANDUP', (intent) => {
        console.log('STANDUP EMIT');
        switch(intent.type) {
            case 'START':
                return processStartDailyStandup(intent);
            case 'STANDUP-TIME':
                return scheduleDailyStandup(intent);
            case 'STANDUP-CHANNEL':
                return processChannelSetup(intent);
            case 'STANDUP-USERS':
                return processUsersInStandup(intent);
            case 'STANDUP-ANSWER':
                return processUserAnsweredQuestion(intent);
        }
    });

    slackbot.emitter.on('ESTIMATION', (intent) => {
        console.log('ESTIMATION EMIT');
        switch(intent.type) {
            case 'START-VOTING':
                return processStartVoting(intent);
            case 'JIRA-STORY-POINTS':
                return processSetStoryPoints(intent);
        }
    });
});

// ****************************************************************************
// GENERAL
// ****************************************************************************

function processSmallTalk(intent) {
    var response = { text: intent.parameters.simplified };

    console.log(intent);

    slackbot.$workflow('reply', { message: intent.message, response }, function() {
        return;
    });
}

/**
    Save all slack members
    @param {Object} message received message form Slack
*/
function processInit(message) {
    slackbot.$workflow('getMembers', function (err, response) {
        if (Array.isArray(response.members)) {
            var filteredUsers = response.members.filter(m => !m.is_bot).map(formatNonBotMember);
            console.log('PARSED OBJECT MEMBERS', filteredUsers);
            var promises = filteredUsers.map(u => processUser(u));
            // return Promise.all(promises).catch(function(err) {
            //     console.log('ERR: ' + err.toString());
            // });
        }
    });
}

/**
    Help message from Responder
    @param {Object} message received message form Slack
*/
function processHelp(intent) {
    Responder.operation('help', function (err, response) {
        if (err) {
            console.log('CHYBA: ', err);
            return;
        }
        console.log('RESPONSE: ' + JSON.stringify(response));
        slackbot.$workflow('reply', { message: intent.message, response }, function() {
            console.log('ODOSLANE');
            return;
        });
    });
}

/**
*   Modules status message
*   @param {Object} intent
*/
function processStatus(intent) {
    Module.get({}, function (err, modules) {
        if (err) {
            console.log('CHYBA PRI GET Z DB', err);
            return;
        }
        User.query(filter = { filter : { admin: true } }, function(err, users) {
            Responder.operation('modulesStatus', { modules, users }, function (err, response) {
                if (err) {
                    console.log('CHYBA: ', err);
                    return;
                }
                return sendBasicAnswerMessage(intent.message, response);
            });
        });
    });
}

/**
*    Change module enable/disable status
*    @param {Object} intent - parameters: { enabled: Bool, module: String }
*/
function processModuleChangeEnable(intent) {
    checkPermission(intent.message, function(permission) {
        if (permission) {
            var self = this;
            var enabled = JSON.parse(intent.parameters.enabled);
            getModule(intent.parameters.module, function(err, slackModule) {
                if (slackModule) {
                    if (slackModule.enabled == enabled) {
                        var answer = { text: 'Module is already' + (enabled ? ' enabled' : ' disabled') };
                        sendBasicAnswerMessage(intent.message, answer);
                        return;
                    }
                    slackModule.enabled = enabled;
                    slackModule.$save(function (error, count) {
                        if (error) {
                            return;
                        }
                        Responder.operation('moduleStatusChanged', { slackModule, enabled }, function(err, response) {
                            sendBasicAnswerMessage(intent.message, response);
                        });
                    });
                } else {
                    var answer = { text: 'Module not found.' };
                    sendBasicAnswerMessage(intent.message, answer);
                    return;
                }
            });
        }
    });
}

/**
    Set admin rights to user/s
    @param {Object} intent - parameters - { users[], action: Bool }
*/
function processModuleAdminRights(intent) {
    getUser(intent.message.user, function(error, superadmin) {
        if (superadmin.superadmin) {
            users = intent.parameters.users;
            action = (intent.parameters.action == 'true');
            if (!users.length || !intent.parameters.action) {
                return replyWithWarningMessage(intent.message, F.config.WARNING_ADMIN_RIGHTS);
            }
            var count = 0;
            users.forEach(function(user) {
                getUser(user, function(error, admin) {
                    admin.admin = action;
                    admin.$save(function(err) {
                        count++;
                        if (users.length == count) {
                            User.query(filter = { filter : { admin: true } }, function(err, admins) {
                                Responder.operation('adminRightsMessage', { admins, action }, function(error, response) {
                                    return sendBasicAnswerMessage(intent.message, response);
                                });
                            });
                        }
                    });
                });
            });
        } else {
            replyWithWarningMessage(intent.message, F.config.WARNING_NOT_AUTHORIZED);
        }
    });
}

// ****************************************************************************
// Monitoring
// ****************************************************************************

/**
*   All Jira issues in current sprint
*   @param {Object} intent parameters: { }
*/
function processIssuesSummary(intent) {
    checkPermission(intent.message, function(permission) {
        if (permission) {
            getModule('Monitoring', function(err, responseModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!responseModule.enabled) {
                    Responder.operation('moduleDisabled', responseModule, function(error, response) {
                        return sendBasicAnswerMessage(intent.message, response);
                    });
                } else {
                    Monitoring.operation('getLastSprintIssues', responseModule, function(err, response) {
                        if (err) {
                            console.log('CHYBA: ', err);
                            var answer = { text: err.message };
                            return sendBasicAnswerMessage(intent.message, answer);
                        }
                        return sendBasicAnswerMessage(intent.message, response);
                    });
                }
            });
        } else {
            replyWithWarningMessage(intent.message, F.config.WARNING_NOT_AUTHORIZED);
        }
    });
}

/**
*   Specific issues list/detail
*   @param {Object} intent parameters: { issues }
*/
function processSpecificIssues(intent) {
    getModule('Monitoring', function(err, responseModule) {
        if (err) {
            console.log('ERROR');
            return;
        }
        if (!responseModule.enabled) {
            Responder.operation('moduleDisabled', responseModule, function(error, response) {
                return sendBasicAnswerMessage(intent.message, response);
            });
        } else {
            if (!intent.parameters.issues) {
                replyWithWarningMessage(intent.message, F.config.WARNING_NO_ISSUES);
            }
            Monitoring.operation('getSpecificIssues', intent.parameters.issues, function(err, response) {
                if (err) {
                    console.log('CHYBA: ', err);
                    var answer = { text: err.message };
                    sendBasicAnswerMessage(intent.message, answer);
                    return;
                }
                return sendBasicAnswerMessage(intent.message, response);
            });
        }
    });
}

/**
*   My issues
*   @param {Object} intent parameters: { }
*/
function processMyIssues(intent) {
    getModule('Monitoring', function(err, responseModule) {
        if (err) {
            console.log('ERROR');
            return;
        }
        if (!responseModule.enabled) {
            Responder.operation('moduleDisabled', responseModule, function(error, response) {
                return sendBasicAnswerMessage(intent.message, response);
            });
        } else {
            User.get({ filter : { slackID: intent.message.user }}, function (error, user) {
                if (error) {
                    console.log('ERROR' , error);
                    return;
                }
                Monitoring.operation('getUsersIssues', user.email, function(err, response) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return;
                    }
                    return sendBasicAnswerMessage(intent.message, response);
                });
            });
        }
    });
}

/**
*   All User's issues assigned - ToDo, In progress
*   @param {Object} intent parameters: { @user }
*/
function processUsersIssues(intent) {
    checkPermission(intent.message, function(permission) {
        if (permission) {
            getModule('Monitoring', function(err, responseModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!responseModule.enabled) {
                    Responder.operation('moduleDisabled', responseModule, function(error, response) {
                        return sendBasicAnswerMessage(intent.message, response);
                    });
                } else {
                    User.get({ filter : { slackID: intent.parameters.user }}, function (error, user) {
                        if (error) {
                            console.log('ERROR' , error);
                            return;
                        }
                        Monitoring.operation('getUsersIssues', user.email, function(err, response) {
                            if (err) {
                                console.log('CHYBA: ', err);
                                return;
                            }
                            return sendBasicAnswerMessage(intent.message, response);
                        });
                    });
                }
            });
        }
    });
}

/**
*   Add comment to issue
*   @param {Object} intent - parameters: { comment, issue }
*/
function processAddComment(intent) {
    var comment = intent.parameters.comment;
    var issue = intent.parameters.issue;

    if (!comment || !issue) {
        replyWithWarningMessage(intent.message, F.config.WARNING_COMMENT_INVALID);
    }

    getModule('Monitoring', function(err, responseModule) {
        if (err) {
            console.log('ERROR');
            return;
        }
        if (!responseModule.enabled) {
            Responder.operation('moduleDisabled', responseModule, function(error, response) {
                return sendBasicAnswerMessage(intent.message, response);
            });
        } else {
            var options = { issue, comment };
            Monitoring.operation('addComment', options, function(err, response) {
                if (err) {
                    console.log('CHYBA: ', err);
                    return;
                }
                return sendBasicAnswerMessage(intent.message, response);
            });
        }
    });
}

/**
*   Assign issue to user
*   @param {Object} intent { user, issue }
*/
function processAssignIssue(intent) {
    var slackID = intent.parameters.user;
    var issueKey = intent.parameters.issue;

    if (!slackID || !issueKey) {
        replyWithWarningMessage(intent.message, F.config.WARNING_ASSIGN_INVALID);
    }
    getModule('Monitoring', function(err, responseModule) {
        if (err) {
            console.log('ERROR');
            return;
        }
        if (!responseModule.enabled) {
            Responder.operation('moduleDisabled', responseModule, function(error, response) {
                return sendBasicAnswerMessage(intent.message, response);
            });
        } else {
            User.get({ filter : { slackID }}, function (error, user) {
                if (error) {
                    console.log('ERROR' , error);
                    return;
                }
                console.log('USER', user);

                Monitoring.operation('assignIssue', { user, issueKey }, function(err, response) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return;
                    }
                    return sendBasicAnswerMessage(intent.message, response);
                });
            });
        }
    });
}

function processAssignToMeIssue(intent) {
    var issueKey = intent.parameters.issue;

    if (!issueKey) {
        replyWithWarningMessage(intent.message, F.config.WARNING_ASSIGN_INVALID);
    }
    getModule('Monitoring', function(err, responseModule) {
        if (err) {
            console.log('ERROR');
            return;
        }
        if (!responseModule.enabled) {
            Responder.operation('moduleDisabled', responseModule, function(error, response) {
                return sendBasicAnswerMessage(intent.message, response);
            });
        } else {
            User.get({ filter : { slackID: intent.message.user }}, function (error, user) {
                if (error) {
                    console.log('ERROR' , error);
                    return;
                }
                console.log('USER', user);

                Monitoring.operation('assignIssue', { user, issueKey }, function(err, response) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return;
                    }
                    return sendBasicAnswerMessage(intent.message, response);
                });
            });
        }
    });
}

U.processSetStatus = function(json, callback) {
    var status = json.actions[0].value;
    var issueKey = json.actions[0].name;
    var statusName;

    if (status == 11) {
        statusName = 'To Do';
    } else if (status == 21) {
        statusName = 'In Progress';
    } else {
        statusName = 'Done';
    }

    Monitoring.operation('changeStatus', { issueKey, status }, function(error, response) {
        var message = json.original_message;
        message.attachments[1].text = 'Status successfully changed.';
        message.attachments[1].actions = null;
        message.attachments[0].fields[0].value = '`' + statusName + '`';

        return callback({ error, message });
    });
};

// ****************************************************************************
// DAILY STANDUP
// ****************************************************************************

/**
*   Start Daily standup
*   @param {Object} intent optional
*/
function processStartDailyStandup(intent) {
    if (intent) {
        checkPermission(intent.message, function(permission) {
            if (permission) {
                startStandup();
            } else {
                replyWithWarningMessage(intent.message, F.config.WARNING_NOT_AUTHORIZED);
            }
        });
    } else {
        startStandup();
    }
}

function startStandup() {
    var self = this;
    getModule('Daily Standup', function(err, standupModule) {
        if (err) {
            console.log('ERROR');
            return;
        }
        if (!standupModule.enabled) {
            var answer = { text: 'Module *' + standupModule.name + '* is disabled.' };
            sendBasicAnswerMessage(intent.message, answer);
            return;
        } else {
            var options = { users: standupModule.content.users };
            if (!options.users) {
                console.log('STANDUP MODULE IS EMPTY!');
                return;
            }
            self.standup = GETSCHEMA('Standup').make();
            self.standup.$workflow('startStandup', { standupModule }, function (error, response) {
                slackbot.$workflow('startConversations', { users: response.users }, function(err, conversation) {
                    self.standup.$workflow('addConversation', conversation);
                    slackbot.$workflow('askQuestion', { conversation: conversation, question: response.question });
                });
            });
        }
    });
}

/**
*   User answered question - process incomming answer and send another question
*   @param {Object} intent
*/
function processUserAnsweredQuestion(intent) {
    var self = this;
    getUser(intent.message.user, function(error, user) {
        intent.user = user;
        self.standup.$workflow('processQuestion', intent, function (error, response) {
            if (response.standupCanceled) {
                console.log('CANCELED');
                self.standup = null;
                return;
            }
            if (response.standupFinished) {
                self.standup.$workflow('standupEnded', function(error, message) {
                    User.query(filter = { filter : { admin: true } }, function(err, users) {
                        users.forEach(function (user) {
                            message.channel = user.slackID;
                            slackbot.$workflow('postMessage', message);
                        });
                    });
                });
            }
            if (response.currentUser.finished) {
                getUser(currentUser.slackID, function(error, user) {
                    currentUser.icon = user.icon;
                    self.standup.$workflow('userFinishedStandup', currentUser, function(error, message) {
                        if (error) {
                            console.log('ERROR', error);
                            return;
                        }
                        slackbot.$workflow('postMessage', message);
                    });
                });
            } else {
                slackbot.$workflow('askQuestion', { conversation: intent.conversation, question: response.textMessage });
            }
        });
    });
}

/**
*   Schedule time for standup repetition
*   @param {Object} intent - parameters { time : HH:MM:SS }
*/
function scheduleDailyStandup(intent) {
    var self = this;

    getModule('Daily Standup', function(err, standupModule) {
        if (err) {
            console.log('ERROR');
            return;
        }
        if (!standupModule.enabled) {
            Responder.operation('moduleDisabled', standupModule, function(error, response) {
                return sendBasicAnswerMessage(intent.message, response);
            });
        } else {
            var timeComponents = intent.parameters.time.split(':', 2);

            if (!timeComponents.length || !intent.parameters.time) {
                return replyWithWarningMessage(intent.message, F.config.WARNING_STANDUP_TIME);
            }

            if (self.scheduler) {
                self.scheduler.destroy();
            }

            var scheduledTime = ('59 ' + timeComponents[1] + ' ' + timeComponents[0] + ' * * *');

            self.scheduler = Cron.schedule(scheduledTime, function() {
                processStartDailyStandup(null);
            });

            standupModule.content.scheduledTime = timeComponents[0] + ':' + timeComponents[1];
            standupModule.$save(function (error, count) {
                if (error) {
                    console.log('SAVE FAILED', error);
                    return;
                }
                self.scheduler.start();
                Responder.operation('standupTimeMessage', standupModule.content.scheduledTime, function(error, response) {
                    return sendBasicAnswerMessage(intent.message, response);
                });
            });
        }
    });
}

/**
*    Setup channel for Reports output from users
*   @param {Object} intent - parameters { channel: String }
*/
function processChannelSetup(intent) {
    checkPermission(intent.message, function(permission) {
        if (permission) {
            var self = this;
            getModule('Daily Standup', function(err, standupModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!standupModule.enabled) {
                    Responder.operation('moduleDisabled', standupModule, function(error, response) {
                        return sendBasicAnswerMessage(intent.message, response);
                    });
                } else {
                    var channel = intent.parameters.channel;
                    if (!channel) {
                        return replyWithWarningMessage(intent.message, F.config.WARNING_STANDUP_CHANNEL);
                    }
                    standupModule.content.channel = channel;
                    standupModule.$save(function (error, count) {
                        if (error) {
                            console.log('SAVING ERROR');
                            return;
                        }
                        Responder.operation('standupChannelMessage', channel, function(error, response) {
                            return sendBasicAnswerMessage(intent.message, response);
                        });
                    });
                }
            });
        }
    });
}

/**
*   Add/Remove standup users
*   @param {Object} intent - parameters { action:true/false, users:[] }
*/
function processUsersInStandup(intent) {
    checkPermission(intent.message, function(permission) {
        if (permission) {
            var self = this;
            getModule('Daily Standup', function(err, standupModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!standupModule.enabled) {
                    Responder.operation('moduleDisabled', standupModule, function(error, response) {
                        return sendBasicAnswerMessage(intent.message, response);
                    });
                } else {
                    users = intent.parameters.users;
                    action = (intent.parameters.action == 'true');

                    if (!users.length || !intent.parameters.action) {
                        return replyWithWarningMessage(intent.message, F.config.WARNING_STANDUP_USERS);
                    }
                    users.forEach(function(slackID) {
                        if (action) {
                            if (standupModule.content.users.findIndex('slackID', slackID) < 0) {
                                standupModule.content.users.push( {slackID : slackID} )
                            }
                        } else {
                            if (standupModule.content.users.findIndex('slackID', slackID) > -1) {
                                standupModule.content.users.splice(standupModule.content.users.indexOf(slackID), 1)
                            }
                        }
                    });
                    standupModule.$save(function(error, count) {
                        if (error) {
                            console.log('SAVING ERROR');
                            return;
                        }
                        Responder.operation('standupUsersMessage', { standupModule, action }, function(error, response) {
                            return sendBasicAnswerMessage(intent.message, response);
                        });
                    });
                }
            });
        }
    });
}

// ****************************************************************************
// ESTIMATION
// ****************************************************************************

/**
*   Start voting
*   @param {Object} intent - parameters: { issue }
*/
function processStartVoting(intent) {
    if (!intent.parameters.issue) {
        return replyWithWarningMessage(intent.message, F.config.WARNING_VOTING_ISSUE);
    }
    checkPermission(intent.message, function(permission) {
        if (permission) {
            getModule('Estimation', function(err, estimationModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!estimationModule.enabled) {
                    Responder.operation('moduleDisabled', estimationModule, function(error, response) {
                        return sendBasicAnswerMessage(intent.message, response);
                    });
                } else {
                    slackbot.$workflow('getChannelMembers', intent.message.channel, function(error, response) {
                        if (response.error && response.error == 'channel_not_found') {
                            return replyWithWarningMessage(intent.message, F.config.WARNING_VOTING_CHANNEL);
                        } else if (Array.isArray(response)) {
                            estimation.$workflow('startVoting', { intent: intent, members: response }, function(error, message) {
                                response.forEach(function(member) {
                                    message.channel = member;
                                    slackbot.$workflow('postMessage', message);
                                });
                            });
                            Responder.operation('votingStarted', intent.parameters.issue, function(error, response) {
                                return sendBasicAnswerMessage(intent.message, response);
                            });
                        }
                     });
                }
            });
        } else {
            replyWithWarningMessage(intent.message, F.config.WARNING_NOT_AUTHORIZED);
        }
    });
}

/**
*   Set story points to issue
*   @param {Object} intent - parameters: { issue, points }
*/
function processSetStoryPoints(intent) {
    var issueKey = intent.parameters.issue;
    var points = intent.parameters.points;
    if (!issueKey || !points) {
        return replyWithWarningMessage(intent.message, F.config.WARNING_SET_POINTS);
    }
    checkPermission(intent.message, function(permission) {
        if (permission) {
            getModule('Estimation', function(err, estimationModule) {
                if (!estimationModule.enabled) {
                    Responder.operation('moduleDisabled', estimationModule, function(error, response) {
                        return sendBasicAnswerMessage(intent.message, response);
                    });
                } else {
                    estimation.$workflow('setStoryPoints', { issueKey, points: JSON.parse(points) }, function(err, response) {
                        return sendBasicAnswerMessage(intent.message, response);
                    });
                }
            });
        } else {
            return replyWithWarningMessage(intent.message, F.config.WARNING_NOT_AUTHORIZED);
        }
    });
}

U.processUserVote = function(json, callback) {
    slackID = json.user.id;
    value = json.actions[0].value;

    estimation.$workflow('userVoted', { slackID, value }, function(error, response) {
        if (response.finished) {
            estimation.$workflow('votingFinished', function(error, response) {
                slackbot.$workflow('postMessage', response);
            });
        }
        return callback(error, response.text);
    });
};

// ****************************************************************************
// HELPER FUNCTIONS
// ****************************************************************************

/**
    Get module - return object from database
    @param {String} moduleName - name of the module
    @param {function} callback - {error, module object}
*/
function getModule(moduleName, callback) {
    var filter = {
        filter : { name: moduleName }
    };
    Module.get(filter, function (err, response) {
        if (err) {
            return callback(err);
        }
        var responseModule = response[0];
        return callback(null, responseModule);
    });
}

/**
    Get user - return object from database
    @param {String} moduleName - slackID
    @param {function} callback - {error, user object}
*/
function getUser(slackID, callback) {
    var filter = {
        filter : { slackID: slackID }
    };
    User.get(filter, function (err, user) {
        if (err) {
            return callback(err);
        }
        return callback(null, user);
    });
}

function formatNonBotMember(member) {
    return {
        id: member.id,
        firstName: member.profile.first_name,
        lastName: member.profile.last_name,
        email: member.profile.email,
        icon: member.profile.image_72,
        admin: false,
        superadmin: false
    };
}

function formatSlackID(rawSlackID) {
    var regex = new RegExp('<@(.*)>');
    return rawSlackID.match(regex)[1];
}

function checkPermission(message, callback) {
    getUser(message.user, function(error, user) {
        if (!user.admin) {
            var answer = { text: 'You don\'t have a permission.' };
            sendBasicAnswerMessage(message, answer);
        }
        return callback(user.admin);
    });
}

function processUser(data) {
    return new Promise(function(resolve, reject) {
        console.log(data.id);
        User.get({
            filter: {
                slackID: data.id
            }
        }, function(err, user) {
            if (err) {
                return reject(err);
            }
            if (user.id) {
                console.log('NASLO: ' + JSON.stringify(user));
                delete data.id;
                user.$workflow('update', data, function(err) {
                    if (err) {
                        return reject(err);
                    }
                    console.log('USER: ' + JSON.stringify(user));
                    user.$save(function(err) {
                        if (err) {
                            return reject(err);
                        }
                        return resolve();
                    });
                });
            } else {
                console.log('NENASLO: ' + data.id);
                data.slackID = data.id;
                delete data.id;
                User.make(data, function(err, user) {
                    if (err) {
                        return reject(err);
                    }
                    user.$save(function(err) {
                        if (err) {
                            return reject(err);
                        }
                        return resolve();
                    });
                });
            }
        });
    });
}

/**
    Helper function for returning basic answer from slackbot
    @param {Object} message received message
    @param {Object} asnwer response message with text
*/
function replyWithWarningMessage(message, warningMessage) {
    Responder.operation('warningMessage', warningMessage, function (err, response) {
        slackbot.$workflow('reply', { message, response }, function() {
            return;
        });
    });
}

/**
    Helper function for returning basic answer from slackbot
    @param {Object} message received message
    @param {Object} asnwer response message with text
*/
function sendBasicAnswerMessage(message, response) {
    slackbot.$workflow('reply', { message, response }, function() {
        console.log('ODOSLANE');
        return;
    });
}
