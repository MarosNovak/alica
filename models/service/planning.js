var jira = GETSCHEMA('Jira').make();
var Response = GETSCHEMA('Response');

NEWSCHEMA('Planning').make(function(schema) {

    /**
     * Start planning
     * @param {Object} options - { planningModule: Object, intent: Intent }
     * Intent - { message, issueKey }
     */
    schema.addOperation('startPlanning', function(error, model, options, callback) {


    });


});
