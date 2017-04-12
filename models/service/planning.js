var jira = GETSCHEMA('Jira').make();
var Responder = GETSCHEMA('Responder');

NEWSCHEMA('Planning').make(function(schema) {

    schema.define('results', 'Array');
    schema.define('originalChannel', 'String');

    schema.setDefault(function(name) {
        switch(name) {
            case 'results':
                return {
                        users: [],
                        voters: 0
                };
        }
    });
    /**
     * Start planning
     * @param {Object} options - { intent: Intent, members: Array }
     */
    schema.addWorkflow('startVoting', function(error, model, options, callback) {
        var issues = [ options.intent.parameters.issue ];
        model.originalChannel = options.intent.message.channel;
        model.results.users = [];
        model.results.voters = 0;

        options.members.forEach(function(member) {
            model.results.users.push({
                key: member,
                value: null
            });
        });

        jira.$workflow('getIssues', issues, function(err, parsedIssue) {
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            } else {
                Responder.operation('votingResponder', parsedIssue, function(err, votingResponse) {
                    if (err) {
                        console.log('CHYBA: ', err);
                        return callback();
                    }
                    return callback(votingResponse);
                });
            }
        });
    });

    /**
     * Start planning
     * @param {Object} options - { slackID, value }
     */
    schema.addWorkflow('userVoted', function(error, model, options, callback) {
        var finished = false;

        model.results.users.forEach(function (member) {
            if (member.key == options.slackID) {
                member.value = value;
                model.results.voters++;
            }
        });
        if (model.results.voters == model.results.users.length) {
            finished = true;
        }

        return callback({ text: 'Thanks for voting!', finished });
    });

    schema.addWorkflow('votingFinished', function(error, model, options, callback) {
        Responder.operation('votingResultsReponder', model.results, function(err, response) {
            response.channel = model.originalChannel;
            if (err) {
                console.log('CHYBA: ', err);
                return callback();
            }
            return callback(response);
        });
    });
});
