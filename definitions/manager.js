var Response = GETSCHEMA('Response');
var slackbot = GETSCHEMA('Bot').make();
var jira = GETSCHEMA('Jira').make();
var SlackModule = GETSCHEMA('Module');

slackbot.$workflow('connect', function(err) {
    console.log('CONNECTED');
    slackbot.emitter.on('JIRA', (results, bot, message) => {
        console.log('JIRA EMIT');
        switch(results.type) {
            case 'ALL_ISSUES':
                return processAllIssuesJiraTask(bot, message);
        }
    });
    slackbot.emitter.on('GENERAL', (results, bot, message) => {
        console.log('GENERAL EMIT');
        switch (results.type) {
            case 'HELP':
            return processHelpMessage(bot, message);
            case 'STATUS':
            return processStatusMessage(bot, message);
            case 'ENABLE':
            return changeModuleEnabledStatus(bot, message, true);
            case 'DISABLE':
            return changeModuleEnabledStatus(bot, message, false);
            break;
        }
    });
});

function processAllIssuesJiraTask(bot, message) {
    jira.$workflow('getSprintIssues', function(err, issues) {
        if (err) {
            console.log('CHYBA: ', err);
            return;
        }
        Response.operation('issuesResponse', issues, function(err, response) {
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
