var jira = GETSCHEMA('Jira').make();
var Response = GETSCHEMA('Response');

NEWSCHEMA('Standup').make(function(schema) {
    schema.define('answers', 'Array');
    schema.define('questions', 'Array');
    schema.define('conversations', 'Array');
    schema.define('specialAnswers', 'Array');
    schema.define('channel', 'String');

    schema.setDefault(function(name) {
        switch(name) {
            case 'questions':
                return ['What did you accomplish yesterday?', 'What are your plans for today?', 'What obstacles are impeding your progress?'];
            case 'specialAnswers':
                return ['nothing','none','skip','nope','no'];
        }
    });

    /**
     * Start standup and initialize users, in foreach create private convos
     * @param {Object} options - { standupModule: Object }
     * @return {function} callback - { users: Array, question: String }
     */
    schema.addWorkflow('startStandup', function(error, model, options, callback) {
        var users = options.standupModule.content.users;
        model.channel = options.standupModule.content.channel;
        users.forEach(function (user) {
            model.answers.push({
                slackID: user.slackID,
                answers: []
            });
        });
        console.log(model.answers);

        model.answered = users.length;
        console.log('standup users', users);
        var response = {
            question: model.questions[0],
            users: users
        }
        callback(error, response);
    });

    schema.addWorkflow('addConversation', function(error, model, conversation, callback) {
        conversation.sayFirst('Hi, it\'s time for daily standup. Hope you\'re ready! Join <#' + model.channel + '> for status.');
        model.conversations.push(conversation);
        return callback();
    });

    /**
     * Process question, parse answer, store it into the array
     * @param {Object} options - { message, conversation }
     * @return {function} callback - { textMessage, userFinished, standupFinished, standupCanceled }
     */
    schema.addWorkflow('processQuestion', function(error, model, options, callback) {
        var message = options.message;
        var conversation = options.conversation;
        var userFinished = false;
        var standupFinished = false;
        var standupCanceled = false;

        if (message.text == 'cancel') {
            console.log(model.conversations);
            model.conversations.forEach(function(conversation) {
                conversation.context.bot.say({ text:'Meeting was canceled.', channel: conversation.context.user });
                conversation.stop();
                standupCanceled = true;
            });
        } else if (message.question == model.questions[0]) {
            textMessage = model.questions[1];
        } else if (message.question == model.questions[1]) {
            textMessage = model.questions[2];
        } else if (message.question == model.questions[2]) {
            model.conversations.splice(model.conversations.indexOf(conversation), 1);
            conversation.context.bot.say({ text:'Thank you.', channel: conversation.context.user });
            userFinished = true;
        }

        if (model.specialAnswers.indexOf(message.text) < 0) {
            model.answers.forEach(function(user) {
                if (user.slackID == message.user) {
                    console.log(issuesFromMessage(message));
                    jira.$workflow('getIssues', issuesFromMessage(message), function(err, jiraResponse) {

                    });

                    user.answers.push({
                        question: message.question,
                        answer: message.text,
                        issues: issuesFromMessage(message)
                    });
                }
            });
        }

        if (model.conversations.length == 0) {
            standupFinished = true;
        }
        callback(error, { textMessage, userFinished, standupFinished, standupCanceled });
    });

    /**
     * User finished standup - calling Response object and parse answers
     * @return {function} callback - { error, response - output message }
     */
    schema.addWorkflow('userFinishedStandup', function(error, model, user, callback) {
        model.answers.forEach(function(filteredUser) {
            if (filteredUser.slackID == user.slackID) {
                Response.operation('userStandupAnswerResponse', { user, answers: filteredUser.answers }, function(error, response) {
                    response.channel = model.channel;
                    console.log('RESPONSE', response);
                    if (error) {
                        console.log('ERROR', error);
                        return callback(error);
                    }
                    return callback(error, response);
                });
            }
        });
    });

    function issuesFromMessage(message) {
        return message.text.match(/#(\d+)/g);
    }
});
