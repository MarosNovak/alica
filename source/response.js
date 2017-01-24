class Response {

    buildResponseIssues(issues) {
        var self = this;
        var json = {
            attachments: []
        };
        if (issues && issues.contents && Array.isArray(issues.contents.issuesNotCompletedInCurrentSprint)) {
            issues.contents.completedIssues.forEach(function(issue) {
                var object = self.buildFieldsForIssue(issue);
                json.attachments.push(object);
            });
            issues.contents.issuesNotCompletedInCurrentSprint.forEach(function(issue) {
                var object = self.buildFieldsForIssue(issue);
                json.attachments.push(object);
            });
        }
        return json;
    }

    colorForIssue(issue) {
        switch (issue.status.name) {
            case 'Done':
                return '#00A454';
            case 'To Do':
                return '#DE0416';
            case 'In Progress':
                return '#F3B443';
            default:
            break;
        }
    }

    buildFieldsForIssue(issue) {
        var self = this;
        var object = {
            title:issue.summary,
            title_link:self.buildIssueLink(issue.key),
            color:self.colorForIssue(issue),
            fields: [{
                title: 'Assignee',
                value: issue.assigneeName ? issue.assigneeName : 'Not assigned',
                short: true
            }, {
                title: 'Status',
                value: issue.status.name,
                short: true
            }]
        }
        return object;
    }

    buildIssueLink(issueKey) {
        let base = '/browse/';
        return `${process.env.PROTOCOL}://${process.env.HOST}:${process.env.PORT}${base}${issueKey}`;
    }
}

module.exports = Response;
