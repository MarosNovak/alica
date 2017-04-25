exports.install = function() {
    F.route('/slack/action', makeButtonAction, ['post']);
}

function makeButtonAction() {
    var self = this;
    json = JSON.parse(self.body.payload);

    console.log(json);

    if (json.token == process.env.VERIFICATION_TOKEN) {
        switch (json.callback_id) {
            case 'VOTE':
                U.processUserVote(json, function(error, responseMessage) {
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
            case 'JIRA-ACTION':
                U.processSetStatus(json, function(response) {
                    if (response.error || !response.message) {
                        self.status = 404;
                        return self;
                    }
                    self.status = 200;
                    return self.json(response.message);
                });
        }
    } else {
        self.status = 401;
        return self.json({
            text: 'Unauthorized'
        });
    }
}
