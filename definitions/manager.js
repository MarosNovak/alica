var Response = GETSCHEMA('Response');
var slackbot = GETSCHEMA('Bot').make();
var jira = GETSCHEMA('Jira').make();
var SlackModule = GETSCHEMA('Module');

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
            });
        });
    });
}

function processHelpMessage(bot, message) {
    Response.operation('helpResponse', function (err, response) {
        if (err) {
            console.log('CHYBA: ', err);
            return;
        }
        console.log('RESPONSE: ' + JSON.stringify(response));
        slackbot.$workflow('reply', { bot, message, response }, function() {
            console.log('ODOSLANE');
            return;
        });
    })
}

function processStatusMessage(bot, message) {
    SlackModule.get({}, function (err, modules) {
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
            slackbot.$workflow('reply', { bot, message, response }, function() {
                console.log('ODOSLANE');
                return;
            });
        });
    });
}

function changeModuleEnabledStatus(bot, message, enabled) {
    var self = this;
    var parts = message.text.split(' ', 2);
    var filter = {
        filter : { name: parts[1] }
    };
    SlackModule.get(filter, function (error, response) {
        console.log('ERR', error);
        console.log('SLACK MODUL GET Z DB', response);
        var slackModule = response[0];
        if (slackModule) {
            if (slackModule.enabled == enabled) {
                var answer = { text: 'Module is already' + (enabled ? ' enabled' : ' disabled') };
                sendBasicAnswerMessage(bot, message, answer);
                return;
            }
            slackModule.enabled = enabled;
            slackModule.$save(function (error, count) {
                if (error) {
                    return;
                }
                var answer = { text: 'Module ' + '*' + slackModule.name + '*' + (enabled ? ' enabled.' : ' disabled.') };
                sendBasicAnswerMessage(bot, message, answer);
            });
        } else {
            var answer = { text: 'Module not found.' };
            sendBasicAnswerMessage(bot, message, answer);
            return;
        }
    });
}

function sendBasicAnswerMessage(bot, message, answer) {
    Response.operation('basicResponse', answer, function (err, response) {
        if (err) {
            console.log('CHYBA: ', err);
            return;
        }
        slackbot.$workflow('reply', { bot, message, response }, function() {
            console.log('ODOSLANE');
            return;
        });
    });
}
