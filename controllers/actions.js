exports.install = function() {
    F.route('/button-action', makeButtonAction, ['post']);
}

function makeButtonAction() {
    var self = this;
    console.log(self.body);
}
