var Response = GETSCHEMA('Response');
var slackbot = GETSCHEMA('Bot').make();
var jira = GETSCHEMA('Jira').make();

slackbot.$workflow('connect', function(err) {
    console.log('CONNECTED');
    slackbot.emitter.on('JIRA', (results, bot, message) => {
        console.log('JIRA EMIT');
        switch(results.type) {
            case 'ALL_ISSUES':
                return processAllIssuesJiraTask(bot, message);
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
