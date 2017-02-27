var usersDB = NOSQL('users');

NEWSCHEMA('User').make(function (schema) {
    schema.define('id', 'String');
    schema.define('slackID', 'String');
    schema.define('firstName', 'String', '*update');
    schema.define('lastName', 'String', '*update');
    schema.define('email','String', '*update');
    schema.define('admin', 'Boolean', '*update');
    schema.define('superadmin', 'Boolean', '*update');

    schema.setGet(function(error, model, options, callback) {
        NOSQL('users').find().make(function(builder) {
            if (options.filter) {
                builder.and();
                Object.keys(options.filter).forEach(function (key) {
                    builder.where(key, options.filter[key]);
                });
                builder.end();
            }
            builder.callback(function (error, response) {
                if (error) {
                    return callback(error);
                }
                var response = Array.isArray(response) && response.length > 0 ? response[0] : response;
                if (response) {
                    U.copy(response, model);
                }
                return callback();
            });
        });
    });

    schema.setSave(function (error, model, options, callback) {
        if (model.id) {
            console.log('USER2: ' + JSON.stringify(model.$clean()));
            NOSQL('users').update(model).make(function(builder) {
                builder.where('id', model.id);
                return builder.callback(callback);
            });
        } else {
            model.id = UID();
            NOSQL('users').insert(model).callback(callback);
        }
    });

    schema.addWorkflow('update', function(error, model, options, callback) {
       var allowed = schema.filter('*update');
       Object.keys(options).forEach(function(key) {
           if (allowed.indexOf(key) >= 0) {
               model[key] = options[key];
           }
       });
       console.log('MODEL: ' + JSON.stringify(model.$clean()));
       U.copy(model.$prepare().$clean(), model);
       error.push(model.$validate().prepare());
       return callback();
    });
});
