exports.install = function() {
    F.route('/slack/action', makeButtonAction, ['post']);
}

function makeButtonAction() {
    var self = this;3
    json = JSON.parse(self.body.payload);

    switch (json.callback_id) {
        case 'VOTE':
        U.processUserVote(json, function (error, responseMessage) {
            if (error) {
                console.log('ERR', error);
                self.status = 404;
                return self;
            }
            self.status = 200;

            return self.json({
                text: responseMessage
            });
        });
    }
}
