var Response = GETSCHEMA('Response');
var Report = GETSCHEMA('Report');
var Module = GETSCHEMA('Module');
var User = GETSCHEMA('User');
var slackbot = GETSCHEMA('Bot').make();
var Cron = require('node-cron');
var scheduler;
var standup;

slackbot.$workflow('connect', function(err) {
    console.log('CONNECTED');

    slackbot.emitter.on('GENERAL', (results, message) => {
        console.log('GENERAL EMIT');
        switch (results.type) {
            case 'INIT':
                return processInit(message);
            case 'HELP':
                return processHelpMessage(message);
            case 'STATUS':
                return processStatusMessage(message);
            case 'ENABLE':
                return processModuleChangeEnable(message, true);
            case 'DISABLE':
                return processModuleChangeEnable(message, false);
            case 'ADMIN':
                return processModuleAdminRights(message);
        }
    });

    slackbot.emitter.on('REPORTING', (results, message) => {
        console.log('REPORTING EMIT');
        switch(results.type) {
            case 'ALL_ISSUES':
                return processAllIssueInCurrentSprint(message);
            case 'USER_ISSUES':
                return processUsersIssues(message);
        }
    });

    slackbot.emitter.on('STANDUP', (results, message) => {
        console.log('STANDUP EMIT');
        switch(results.type) {
            case 'START':
                return processStartDailyStandup(message);
            case 'SCHEDULE':
                return scheduleDailyStandup(message);
            case 'CHANNEL':
                return processChannelSetup(message);
            case 'USERS':
                return processUsersInStandup(message);
        }
    });

    slackbot.emitter.on('STANDUP_ANSWER', (results, message, conversation) => {
        console.log('STANDUP ANSWER EMIT');
        switch (results.type) {
            case 'DEFAULT':
                return processUserAnsweredQuestion(message, conversation);
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
    Help message from Response
    @param {Object} message received message form Slack
*/
function processHelpMessage(message) {
    Response.operation('helpResponse', function (err, response) {
        if (err) {
            console.log('CHYBA: ', err);
            return;
        }
        console.log('RESPONSE: ' + JSON.stringify(response));
        slackbot.$workflow('reply', { message, response }, function() {
            console.log('ODOSLANE');
            return;
        });
    });
}

/**
    Get help message from Response
    @param {Object} message received message form Slack
*/
function processStatusMessage(message) {
    Module.get({}, function (err, modules) {
        if (err) {
            console.log('CHYBA PRI GET Z DB', err);
            return;
        }
        Response.operation('statusResponse', modules, function (err, response) {
            if (err) {
                console.log('CHYBA: ', err);
                return;
            }
            console.log('RESPONSE: ' + JSON.stringify(response));
            slackbot.$workflow('reply', { message, response }, function() {
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
function processModuleChangeEnable(message, enabled) {
    checkPermission(message, function(permission) {
        if (permission) {
            var self = this;
            var parts = message.text.split(' ', 2);
            var filter = {
                filter : { name: parts[1] }
            };
            Module.get(filter, function (error, response) {
                console.log('ERR', error);
                console.log('SLACK MODUL GET Z DB', response);
                var slackModule = response[0];
                if (slackModule) {
                    if (slackModule.enabled == enabled) {
                        var answer = { text: 'Module is already' + (enabled ? ' enabled' : ' disabled') };
                        sendBasicAnswerMessage(message, answer);
                        return;
                    }
                    slackModule.enabled = enabled;
                    slackModule.$save(function (error, count) {
                        if (error) {
                            return;
                        }
                        var answer = { text: 'Module *' + slackModule.name + (enabled ? '* enabled.' : '* disabled.') };
                        sendBasicAnswerMessage(message, answer);
                    });
                } else {
                    var answer = { text: 'Module not found.' };
                    sendBasicAnswerMessage(message, answer);
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
// REPORTING
// ****************************************************************************

/**
    All Jira issues in current sprint
    @param {Object} message received message
*/
function processAllIssueInCurrentSprint(message) {
    checkPermission(message, function(permission) {
        if (permission) {
            getModule('reporting', function(err, reportingModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!reportingModule.enabled) {
                    var answer = { text: 'Module *' + reportingModule.name + '* is disabled.' };
                    sendBasicAnswerMessage(message, answer);
                    return;
                } else {
                    var options = { reportingModule: reportingModule };
                    Report.operation('getLastSprintIssues', options, function(err, response) {
                        if (err) {
                            console.log('CHYBA: ', err);
                            var answer = { text: err.message };
                            sendBasicAnswerMessage(message, answer);
                            return;
                        }
                        slackbot.$workflow('reply', { message, response }, function() {
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
    All User's issues assigned - ToDo, In progress
    @param {Object} message received message
*/
function processUsersIssues(message) {
    checkPermission(message, function(permission) {
        if (permission) {
            getModule('reporting', function(err, reportingModule) {
                if (err) {
                    console.log('ERROR');
                    return;
                }
                if (!reportingModule.enabled) {
                    var answer = { text: 'Module *' + reportingModule.name + '* is disabled.' };
                    sendBasicAnswerMessage(message, answer);
                    return;
                } else {
                    if (message.text.includes('<@')) {
                        var regex = new RegExp('<@(.*)>');

                        var filter = {
                            filter : { slackID: message.text.match(regex)[1] }
                        };
                        User.get(filter, function (error, user) {
                            if (error) {
                                console.log('ERROR' , error);
                                return;
                            }
                            var options = { email: user.email };
                            Report.operation('getUsersIssues', options, function(err, response) {
                                if (err) {
                                    console.log('CHYBA: ', err);
                                    return;
                                }
                                slackbot.$workflow('reply', { message, response }, function() {
                                    return;
                                });
                            });
                        });
                    }
                }
            });
        }
    });
}

// ****************************************************************************
// DAILY STANDUP
// ****************************************************************************

/**
    Start Daily standup
    @param {Object} message received message
*/
function processStartDailyStandup(message) {
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
function processUserAnsweredQuestion(message, conversation) {
    var self = this;
    self.standup.$workflow('processQuestion', { conversation, message }, function (error, response) {
        if (response.standupCanceled) {
            self.standup = null;
            return;
        }
        if (response.userFinished) {
            getUser(message.user, function(error, user) {
                console.log('USER PARSED', user);
                self.standup.$workflow('userFinishedStandup', user, function(error, message) {
                    if (error) {
                        console.log('ERROR', error);
                        return;
                    }
                    slackbot.$workflow('postMessage', message);
                });
            });
            if (response.standupFinished) {

            }
        } else {
            slackbot.$workflow('askQuestion', { conversation: conversation, question: response.textMessage });
        }
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
    Setup channel for reporting output from user's after daily standup.
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
                            var answer = { text: 'Mesage format is not correct. Please send message in format `standup channel #report` for example.' };
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
                    messages.forEach(function (message) {
                        if (message.contains('<@')) {
                            standupModule.content.users.push({ slackID: message.match(regex)[1] })
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
    Response.operation('basicResponse', answer, function (err, response) {
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
