var jira = GETSCHEMA('Jira').make();
var Responder = GETSCHEMA('Responder');

NEWSCHEMA('Standup').make(function(schema) {
    schema.define('reports', 'Array');
    schema.define('questions', 'Array');
    schema.define('conversations', 'Array');
    schema.define('channel', 'String');
    schema.define('contextIssues', 'Array');

    schema.setDefault(function(name) {
        switch(name) {
            case 'questions':
                return ['_What did you accomplish yesterday? Report `done` issues._',
                        '_What you were working on yesterday? Report `in progress` issues._',
                        '_What are your plans for today?_',
                        '_What obstacles are impeding your progress?_'];
            case 'reports':
                return {
                    users:[]
                }
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

        users.forEach(function(user) {
            model.reports.users.push({
                slackID: user.slackID,
                answers: [],
                finished: false,
                blockers: false,
                ignored: false,
                icon: null
            });
        });

        console.log('standup users', model.reports);
        var response = {
            question: model.questions[0],
            users: users
        }

        jira.$workflow('getContextIssues', function(error, response) {
            model.contextIssues = response;
        });
        callback(error, response);
    });

    schema.addWorkflow('addConversation', function(error, model, conversation, callback) {
        conversation.sayFirst('Hi, it\'s time for *daily standup*. Hope you\'re ready! Join <#' + model.channel + '> for report.');
        model.conversations.push(conversation);

        return callback();
    });

    /**
     * Process question, parse answer, store it into the array
     * @param {Object} intent - { message, conversation, canceled, skip, user }
     * @return {function} callback - { textMessage, userFinished, standupFinished, standupCanceled }
     */
    schema.addWorkflow('processQuestion', function(error, model, intent, callback) {
        var message = intent.message;
        var conversation = intent.conversation;
        var standupFinished = false;
        var standupCanceled = false;
        var textMessage = "Failed to analyze answer.";

        if (intent.canceled == true) {
            model.conversations.forEach(function(conversation) {
                conversation.context.bot.say({ text:'Standup was canceled.', channel: conversation.context.user });
                conversation.stop();
                standupCanceled = true;
            });
        }

        currentUser = model.reports.users.filter(function(user) {
            return user.slackID == intent.message.user;
        }).first();

        if (intent.ignored == true) {
            currentUser.ignored = true;
            conversation.context.bot.say({ text:'You are ignoring today\'s standup. See you next time.', channel: conversation.context.user });
            conversation.stop();
            model.conversations.splice(model.conversations.indexOf(conversation), 1);
            if (!model.conversations.length) {
                standupFinished = true;
            }
            return callback(error, { textMessage, currentUser, standupFinished, standupCanceled });
        }

        if (message.question == model.questions[0]) {
            if (intent.parameters && intent.parameters.issues) {
                analyzeFirstAnswer(intent, model.contextIssues, function(incorrect) {
                    currentUser.answers.push({
                        question: 'Yesterday - Done',
                        answer: message.text,
                        issues: intent.parameters.issues,
                        incorrect: incorrect.map(function(iss) {return iss.key;})
                    });

                    Responder.operation('standupJiraCheckMessage', { incorrect, type: 'Done' }, function (error, response) {
                        textMessage = response + model.questions[1];
                        conversation.next();
                        return callback(error, { textMessage, currentUser, standupFinished, standupCanceled });
                    });
                });
            } else {
                if (!intent.skipped) {
                    currentUser.answers.push({
                        question: 'Yesterday - Done',
                        answer: message.text,
                        issues: null,
                        incorrect: null
                    });
                }
                conversation.next();
                textMessage = model.questions[1];
                return callback(error, { textMessage, currentUser, standupFinished, standupCanceled });
            }
        }

        if (message.question.includes(model.questions[1])) {
            if (intent.parameters && intent.parameters.issues) {
                analyzeSecondAnswer(intent, model.contextIssues, function(incorrect) {
                    currentUser.answers.push({
                        question: 'Yesterday - In Progress',
                        answer: message.text,
                        issues: intent.parameters.issues,
                        incorrect: incorrect.map(function(iss) {return iss.key;})
                    });

                    Responder.operation('standupJiraCheckMessage', { incorrect, type: 'In Progress' }, function (error, response) {
                        textMessage = response + model.questions[2];
                        conversation.next();
                        return callback(error, { textMessage, currentUser, standupFinished, standupCanceled });
                    });
                });
            } else {
                if (!intent.skipped) {
                    currentUser.answers.push({
                        question: 'Yesterday - In Progress',
                        answer: message.text,
                        issues: null,
                        incorrect: null
                    });
                }
                conversation.next();
                textMessage = model.questions[2];
                return callback(error, { textMessage, currentUser, standupFinished, standupCanceled });
            }
        }

        if (message.question.includes(model.questions[2])) {
            if (intent.parameters && intent.parameters.issues) {
                analyzeThirdAnswer(intent, model.contextIssues, function(incorrect) {
                    currentUser.answers.push({
                        question: 'Today',
                        answer: message.text,
                        issues: intent.parameters.issues,
                        incorrect: incorrect.map(function(iss) {return iss.key;})
                    });
                    Responder.operation('standupJiraCheckMessage', { incorrect, type: 'assigned to you' }, function (error, response) {
                        textMessage = response + model.questions[3];
                        conversation.next();
                        return callback(error, { textMessage, currentUser, standupFinished, standupCanceled });
                    });
                });
             } else {
                 if (!intent.skipped) {
                     currentUser.answers.push({
                         question: 'Today',
                         answer: message.text,
                         issues: null,
                         incorrect: null
                     });

                     jira.$workflow('getUsersInProgressIssues', intent.user.email, function(error, inProgress) {
                         Responder.operation('standupJiraCheckMessage', { inProgress, type: 'Ongoing' }, function (error, response) {
                             textMessage = response + model.questions[3];
                             conversation.next();
                             return callback(error, { textMessage, currentUser, standupFinished, standupCanceled });
                         });
                     });
                 } else {
                     conversation.next();
                     textMessage = model.questions[3];
                     return callback(error, { textMessage, currentUser, standupFinished, standupCanceled });
                 }
            }
        }

        if (message.question.includes(model.questions[3])) {
            currentUser.finished = true;
            if (!intent.skipped) {
                currentUser.blockers = true;
                currentUser.answers.push({
                    question: 'Blockers',
                    answer: message.text,
                    issues: null,
                    incorrect: null
                });
            }
            model.conversations.splice(model.conversations.indexOf(conversation), 1);
            conversation.context.bot.say({ text:'Thank you.', channel: conversation.context.user });
            conversation.stop();
            if (!model.conversations.length) {
                standupFinished = true;
            }
            callback(error, { textMessage, currentUser, standupFinished, standupCanceled });
        }
    });

    /**
     * User finished standup - calling Responder object and parse answers
     * @return {function} callback - { error, response - output message }
     */
    schema.addWorkflow('userFinishedStandup', function(error, model, currentUser, callback) {
        Responder.operation('standupUserReport', currentUser, function(error, response) {
            response.channel = model.channel;
            console.log('RESPONSE', response);
            if (error) {
                console.log('ERROR', error);
                return callback(error);
            }
            return callback(error, response);
        });
    });

    /**
     * Daily standup is over. Send Report to HR Manager
     * @return {function} callback - { error, response - output message }
     */
    schema.addWorkflow('standupEnded', function(error, model, options, callback) {
        Responder.operation('standupSummaryMessage', model.reports, function(error, response) {
            console.log('RESPONSE', response);
            if (error) {
                console.log('ERROR', error);
                return callback(error);
            }
            return callback(error, response);
        });
    });

    function analyzeFirstAnswer(intent, contextIssues, callback) {
        console.log('context issues', contextIssues);
        var incorrect = [];
        var index = 0;
        intent.parameters.issues.forEach(function(issueKey) {
            var contextIssue = contextIssues.filter(function(element) {
                return element.key.toLowerCase() == issueKey.toLowerCase();
            }).first();
            getMissingContextIssue(contextIssue, issueKey, contextIssues, function(contextIssue) {
                index++;
                if (contextIssue && contextIssue.status != 'Done') {
                    incorrect.push(contextIssue);
                }
                if (index == intent.parameters.issues.length) {
                    return callback(incorrect);
                }
            });
        });
    }

    function analyzeSecondAnswer(intent, contextIssues, callback) {
        console.log('context issues', contextIssues);
        var incorrect = [];
        var index = 0;
        intent.parameters.issues.forEach(function(issueKey) {
            var contextIssue = contextIssues.filter(function(element) {
                return element.key.toLowerCase() == issueKey.toLowerCase();
            }).first();
            getMissingContextIssue(contextIssue, issueKey, contextIssues, function(contextIssue) {
                index++;
                if (contextIssue && contextIssue.status != 'In Progress') {
                    incorrect.push(contextIssue);
                }
                if (index == intent.parameters.issues.length) {
                    return callback(incorrect);
                }
            });
        });
    }

    function analyzeThirdAnswer(intent, contextIssues, callback) {
        console.log('context issues', contextIssues);
        var incorrect = [];
        var index = 0;
        intent.parameters.issues.forEach(function(issueKey) {
            var contextIssue = contextIssues.filter(function(element) {
                return element.key.toLowerCase() == issueKey.toLowerCase();
            }).first();
            getMissingContextIssue(contextIssue, issueKey, contextIssues, function(contextIssue) {
                index++;
                if (contextIssue && contextIssue.assignee != intent.user.email) {
                    incorrect.push(contextIssue);
                }
                if (index == intent.parameters.issues.length) {
                    return callback(incorrect);
                }
            });
        });
    }

    function getMissingContextIssue(contextIssue, issueKey, contextIssues, callback) {
        if (contextIssue) {
            return callback(contextIssue);
        } else {
            jira.$workflow('getIssue', issueKey, function(error, issue) {
                contextIssue = issue;
                contextIssues.push(issue);
                return callback(contextIssue);
            });
        }
    }

});
