const JiraApi = require('jira-client');
var jira = new JiraApi({
    protocol: process.env.PROTOCOL,
    host: process.env.HOST,
    port: process.env.PORT,
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    apiVersion: 'latest',
    strictSSL: false
});

U.projectResponse = function(projectName, callback) {
    jira.findRapidView(projectName)
    .then(function(rapidView) {
        jira.getLastSprintForRapidView(rapidView.id).
        then(function(sprint) {
            jira.getSprintIssues(rapidView.id, sprint.id).
            then(function(issues) {
                return callback(issues);
            })
        })
    })
    .catch(function(err) {
      console.error(err);
    });
}

U.issueResponse = function(issue) {
    console.log('NUMBER = '+ issue);
    jira.findIssue(issue)
      .then(function(issue) {
          console.log(JSON.stringify(issue));
      })
      .catch(function(err) {
        console.error(err);
      });
}
