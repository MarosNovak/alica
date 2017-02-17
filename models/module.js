var modulesDB = NOSQL('modules');

NEWSCHEMA('Module').make(function (schema) {
    schema.define('name', 'String');
    schema.define('enabled','Boolean');
    schema.define('description', 'String');
    schema.define('projectName','String');
    schema.define('content', 'Object');

    schema.setGet(function (error, model, options, callback) {
        modulesDB.find().make(function(builder) {
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
                if (Array.isArray(response)) {
                    response = response.map(function (object) {
                        return schema.make(object);
                    });
                } else if (response) {
                    response = schema.make(response);
                }
                return callback(null, response);
            });
        });
    });

    schema.setSave(function (error, model, options, callback) {
        modulesDB.update(model).make(function(builder) {
            builder.where("name",model.name);
            return builder.callback(callback);
        });
    });
});
