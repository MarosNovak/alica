var Responder = GETSCHEMA('Responder');
var Monitoring = GETSCHEMA('Monitoring');
var Planning = GETSCHEMA('Planning').make();
var Module = GETSCHEMA('Module');
var User = GETSCHEMA('User');
var slackbot = GETSCHEMA('Bot').make();
var Cron = require('node-cron');
var scheduler;
var standup;

slackbot.$workflow('connect', function(err) {
    console.log('CONNECTED');

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
            case 'ADMIN':
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
        }
    });

    slackbot.emitter.on('STANDUP', (intent) => {
        console.log('STANDUP EMIT');
        switch(intent.type) {
            case 'START':
                return processStartDailyStandup(intent);
            case 'SCHEDULE':
                return scheduleDailyStandup(intent);
            case 'CHANNEL':
                return processChannelSetup(intent);
            case 'USERS':
                return processUsersInStandup(intent);
            case 'STANDUP-ANSWER':
                return processUserAnsweredQuestion(intent);
        }
    });

    slackbot.emitter.on('PLANNING', (intent) => {
        console.log('PLANNING EMIT');
        switch(intent.type) {
            case 'START-VOTING':
                return processStartVoting(intent);
        }
    });
});

// ****************************************************************************
// GENERAL
// ****************************************************************************

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
            return Promise.all(promises).catch(function(err) {
                console.log('ERR: ' + err.toString());
            });
        }
    });
}

/**
    Help message from Responder
    @param {Object} message received message form Slack
*/
function processHelp(intent) {
    Responder.operation('helpResponder', function (err, response) {
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
    Get help message from Responder
    @param {Object} message received message form Slack
*/
function processStatus(intent) {
    Module.get({}, function (err, modules) {
        if (err) {
            console.log('CHYBA PRI GET Z DB', err);
            return;
        }
        Responder.operation('statusResponder', modules, function (err, response) {
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
    });
}

/**
    Change module enable/disable status
    @param {Object} message received message form Slack
    @param {Boolean} enabled if module should be enabled/disabled
*/
function processModuleChangeEnable(intent) {
    checkPermission(intent.message, function(permission) {
        if (permission) {
            var self = this;
            var enabled = JSON.parse(intent.parameters.enabled);
            var filter = {
                filter : { name: intent.parameters.module }
            };
            Module.get(filter, function (error, response) {
                console.log('ERR', error);
                console.log('SLACK MODUL GET Z DB', response);
                var slackModule = response[0];
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
                        var answer = { text: 'Module *' + slackModule.name + (enabled ? '* enabled.' : '* disabled.') };
                        sendBasicAnswerMessage(intent.message, answer);
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
    @param {Object} message received message form Slack contains users list
*/
function processModuleAdminRights(message) {
    var self = this;
    getUser(message.user, function(error, superadmin) {
        if (superadmin.superadmin) {
            var regex = new RegExp('<@(.*)>');
            var users = message.text.split(' ').filter(u => u.contains('<@')).map(formatSlackID);
            users.forEach(function(user) {
                getUser(user, function(error, admin) {
                    admin.admin = true;
                    admin.$save(function(err) {
                        if (err) {
                            var answer = { text: 'Setting privilages failed.' };
                            sendBasicAnswerMessage(message, answer);
                        }
                    });
                });
            });
        } else {
            var answer = { text: 'You don\' have a permission.' };
            sendBasicAnswerMessage(message, answer);
        }
    });
}

// ****************************************************************************
// Monitoring
// ****************************************************************************

/**
    All Jira issues in current sprint
    @param {Object} message received message
*/
function processIssuesSummary(intent) {
    checkPermission(intent.message, function(permission) {
        if (permission) {
            getModule('Monitoring', function(err, MonitoringModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!MonitoringModule.enabled) {
                    var answer = { text: 'Module *' + MonitoringModule.name + '* is disabled.' };
                    sendBasicAnswerMessage(intent.message, answer);
                    return;
                } else {
                    var options = { MonitoringModule: MonitoringModule };
                    Monitoring.operation('getLastSprintIssues', options, function(err, response) {
                        if (err) {
                            console.log('CHYBA: ', err);
                            var answer = { text: err.message };
                            sendBasicAnswerMessage(intent.message, answer);
                            return;
                        }
                        slackbot.$workflow('reply', { message: intent.message, response }, function() {
                            console.log('ODOSLANE');
                            return;
                        });
                    });
                }
            });
        }
    });
}

/**
    All Jira issues in current sprint
    @param {Object} message received message
*/
function processSpecificIssues(intent) {
    checkPermission(intent.message, function(permission) {
        if (permission) {
            getModule('Monitoring', function(err, MonitoringModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!MonitoringModule.enabled) {
                    var answer = { text: 'Module *' + MonitoringModule.name + '* is disabled.' };
                    sendBasicAnswerMessage(intent.message, answer);
                    return;
                } else {
                    var options = { MonitoringModule: MonitoringModule };
                    Monitoring.operation('getSpecificIssues', intent.parameters.issues, function(err, response) {
                        if (err) {
                            console.log('CHYBA: ', err);
                            var answer = { text: err.message };
                            sendBasicAnswerMessage(intent.message, answer);
                            return;
                        }
                        slackbot.$workflow('reply', { message: intent.message, response }, function() {
                            console.log('ODOSLANE');
                            return;
                        });
                    });
                }
            });
        }
    });
}

/**
    All Jira issues in current sprint
    @param {Object} message received message
*/
function processMyIssues(intent) {
    checkPermission(intent.message, function(permission) {
        if (permission) {
            getModule('Monitoring', function(err, MonitoringModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!MonitoringModule.enabled) {
                    var answer = { text: 'Module *' + MonitoringModule.name + '* is disabled.' };
                    sendBasicAnswerMessage(intent.message, answer);
                    return;
                } else {
                    User.get({ filter : { slackID: intent.message.user }}, function (error, user) {
                        if (error) {
                            console.log('ERROR' , error);
                            return;
                        }
                        console.log('USERS MAIL', user.email);
                        var options = { email: user.email };
                        Monitoring.operation('getUsersIssues', options, function(err, response) {
                            if (err) {
                                console.log('CHYBA: ', err);
                                return;
                            }
                            slackbot.$workflow('reply', { message: intent.message, response }, function() {
                                return;
                            });
                        });
                    });
                }
            });
        }
    });
}

/**
    All User's issues assigned - ToDo, In progress
    @param {Object} message received message
*/
function processUsersIssues(intent) {
    checkPermission(intent.message, function(permission) {
        if (permission) {
            getModule('Monitoring', function(err, MonitoringModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!MonitoringModule.enabled) {
                    var answer = { text: 'Module *' + MonitoringModule.name + '* is disabled.' };
                    sendBasicAnswerMessage(intent.message, answer);
                    return;
                } else {
                    User.get({ filter : { slackID: intent.parameters.user }}, function (error, user) {
                        if (error) {
                            console.log('ERROR' , error);
                            return;
                        }
                        var options = { email: user.email };
                        Monitoring.operation('getUsersIssues', options, function(err, response) {
                            if (err) {
                                console.log('CHYBA: ', err);
                                return;
                            }
                            slackbot.$workflow('reply', { message: intent.message, response }, function() {
                                return;
                            });
                        });
                    });
                }
            });
        }
    });
}

/**
    Add comment to issue
    @param {Object} message received message
*/
function processAddComment(intent) {
    var comment = intent.parameters.comment;
    var issue = intent.parameters.issue;

    getModule('Monitoring', function(err, MonitoringModule) {
        if (err) {
            console.log('ERROR');
            return;
        }
        if (!MonitoringModule.enabled) {
            var answer = { text: 'Module *' + MonitoringModule.name + '* is disabled.' };
            sendBasicAnswerMessage(intent.message, answer);
            return;
        } else {
            var options = { issue, comment };
            Monitoring.operation('addComment', options, function(err, response) {
                if (err) {
                    console.log('CHYBA: ', err);
                    return;
                }
                slackbot.$workflow('reply', { message: intent.message, response }, function() {
                    return;
                });
            });
        }
    });
}

/**
    @param {Object} message received message
*/
function processAssignIssue(intent) {
    const options = { issueID: 'FR-666', comment: 'prvy comment' }

    Monitoring.operation('addComment', options, function(err, response) {
        if (err) {
            console.log('CHYBA: ', err);
            return;
        }
        // slackbot.$workflow('reply', { message: intent.message, response }, function() {
        //     return;
        // });
    });
}

// ****************************************************************************
// DAILY STANDUP
// ****************************************************************************

/**
    Start Daily standup
    @param {Object} message received message
*/
function processStartDailyStandup(intent) {
    checkPermission(intent.message, function(permission) {
        if (permission) {
            var self = this;
            getModule('standup', function(err, standupModule) {
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
    });
}

/**
    User answered question - process incomming answer and send another question
    @param {Object} message received message
    @param {Object} conversation conversation with slack member
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
                User.query(filter = { filter : { admin: true } }, function(err, users) {

                });

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
    Schedule time for standup repetition
    @param {Object} message received message {time HH:MM}
*/
function scheduleDailyStandup(message) {
    var self = this;
    getModule('standup', function(err, standupModule) {
        if (err) {
            console.log('ERROR');
            return;
        }
        if (!standupModule.enabled) {
            var answer = { text: 'Module *' + standupModule.name + '* is disabled.' };
            sendBasicAnswerMessage(message, answer);
            return;
        } else {
            var timeString = message.text.split(' ', 3)[2];
            var timeComponents = timeString.split(':', 2);
            if (!timeComponents || !Array.isArray(timeComponents)) {
                var answer = { text: 'Mesage format is not correct. Please send message in format `standup time 10:30` for example.' };
                sendBasicAnswerMessage(message, answer);
                return;
            }
            if (self.scheduler) {
                self.scheduler.destroy();
            }
            var scheduledTime = ('59 ' + timeComponents[1] + ' ' + timeComponents[0] + ' * * *');
            self.scheduler = Cron.schedule(scheduledTime, function() {
                processStartDailyStandup(null);
            });
            standupModule.content.scheduledTime = timeString;
            standupModule.$save(function (error, count) {
                if (error) {
                    return;
                }
                self.scheduler.start();
                var answer = { text: 'Daily standup is set for *' + timeString + '* from _Monday_ to _Friday_.' };
                sendBasicAnswerMessage(message, answer);
                return;
            });
        }
    });
}

/**
    Setup channel for Monitoring output from user's after daily standup.
    @param {Object} message received message - channel number <#numb>
*/
function processChannelSetup(message) {
    checkPermission(message, function(permission) {
        if (permission) {
            var self = this;
            getModule('standup', function(err, standupModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!standupModule.enabled) {
                    var answer = { text: 'Module *' + standupModule.name + '* is disabled.' };
                    sendBasicAnswerMessage(message, answer);
                    return;
                } else {
                    var channel = message.text.split(' ',3)[2];
                    var regex = new RegExp('\\#(.*?)\\|');
                    var channelID = channel.match(regex)[1];
                    if (!channelID) {
                            var answer = { text: 'Mesage format is not correct. Please send message in format `standup channel #Monitoring` for example.' };
                            sendBasicAnswerMessage(message, answer);
                            return;
                    } else {
                        standupModule.content.channel = channelID;
                        standupModule.$save(function (error, count) {
                            if (error) {
                                console.log('SAVING ERROR');
                                return;
                            }
                            var answer = { text: 'Alice will post everyone\'s answers to a <#' + channelID + '> channel.' };
                            sendBasicAnswerMessage(message, answer);
                            return;
                        });
                    }
                }
            });
        }
    });
}

/**
    Add users to standup
    @param {Object} message received message - array of users <@num> <@num>
*/
function processUsersInStandup(message) {
    checkPermission(message, function(permission) {
        if (permission) {
            var self = this;
            getModule('standup', function(err, standupModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!standupModule.enabled) {
                    var answer = { text: 'Module *' + standupModule.name + '* is disabled.' };
                    sendBasicAnswerMessage(message, answer);
                    return;
                } else {
                    var messages = message.text.split(' ');
                    var regex = new RegExp('<@(.*)>');
                    messages.forEach(function(message) {
                        if (message.contains('<@')) {
                            var slackID = message.match(regex)[1];
                            if (standupModule.content.users.findIndex('slackID', slackID) < 0) {
                                standupModule.content.users.push({slackID : slackID})
                            }
                        }
                    });
                    standupModule.$save(function(error, count) {
                        if (error) {
                            console.log('SAVING ERROR');
                            return;
                        }
                        var string = '';
                        standupModule.content.users.forEach(function(user) {
                            string += '<@' + user.slackID + '> ';
                        });
                        var answer = { text: 'Standup members are: ' + string };
                        sendBasicAnswerMessage(message, answer);
                        return;
                    });
                }
            });
        }
    });
}

// ****************************************************************************
// PLANNING
// ****************************************************************************

function processStartVoting(intent) {
    var self = this;
    checkPermission(intent.message, function(permission) {
        if (permission) {
            getModule('Planning', function(err, standupModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!standupModule.enabled) {
                    var answer = { text: 'Module *' + standupModule.name + '* is disabled.' };
                    sendBasicAnswerMessage(intent.message, answer);
                    return;
                } else {
                    slackbot.$workflow('getChannelMembers', intent.message.channel, function(error, response) {
                        if (response.error && response.error == 'channel_not_found') {
                            sendBasicAnswerMessage(intent.message, ':warning: You can use planning only in public channel.');
                        } else if (Array.isArray(response)) {
                            Planning.$workflow('startVoting', { intent: intent, members: response }, function(error, message) {
                                response.forEach(function(member) {
                                    message.channel = member;
                                    slackbot.$workflow('postMessage', message);
                                });
                            });
                        }
                     });
                }
            });
        }
    });
}

U.processUserVote = function(json, callback) {
    slackID = json.user.id;
    value = json.actions[0].value;

    Planning.$workflow('userVoted', { slackID, value }, function(error, response) {
        if (response.finished) {
            Planning.$workflow('votingFinished', function(error, response) {
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
function sendBasicAnswerMessage(message, answer) {
    Responder.operation('basicResponder', answer, function (err, response) {
        if (err) {
            console.log('CHYBA: ', err);
            return;
        }
        slackbot.$workflow('reply', { message, response }, function() {
            console.log('ODOSLANE');
            return;
        });
    });
}
