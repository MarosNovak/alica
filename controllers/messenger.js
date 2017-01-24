exports.install = function() {
    F.route('/jira/{projectName}', parseProject, ['get']);
};

function parseProject(projectName) {
    var self = this;
    U.projectResponse(projectName)
}

function startBot() {
    U.connect()
}
