// Provides a `Backbone.sync` or `Model.sync` method for the server-side
// context. Uses `stash` for model persistence. Models are expected to
// have a URL prefixed by their respective collection (e.g. `/{class}/{id}`)
// and Collections retrieve their respective models based on this convention.
var _ = require('underscore');

module.exports = function(filepath, file) {
    // Require WCL forked version of stash to support folder based stash instead of file based.
    // file is optional, converting the storage to subfolders, using file as the file to store
    // the model in.
    var stash = require('stash')(filepath, file);

    // Helper function to get a URL from a Model or Collection as a property
    // or as a function.
    var getUrl = function(object) {
        if (object.url instanceof Function) {
            return object.url();
        } else if (typeof object.url === 'string') {
            return object.url;
        }
    };

    // Sync implementation for `stash`.
    var sync = function(method, model, options) {
        var options = options || {};

        var success = options.success,
            error = options.error;

        switch (method) {
        case 'read':
            var data;
            // get a different base if stash handled recursively
            if (!file) {
                // regular base
                var base = stash.key(getUrl(model));
            } else {
                // strip the /api/models/ part of the URL
                var base = stash.key(getUrl(model).replace(/\/[\w]+\/[\w]+(\/|)/, ''));
            }
            if (model.id) {
                data = stash.get(base);
                return data ? success(data) : error('Model not found.');
            } else {
                data = [];
                _.each(stash.list(), function(val, key) {
                    val && key.indexOf(base) === 0 && data.push(val);
                });
                return success(data);
            }
            break;
        case 'create':
        case 'update':
            if (_.isEqual(stash.get(getUrl(model)), model.toJSON())) {
                return success(model.toJSON());
            }
            stash.set(
                getUrl(model),
                model.toJSON(),
                function(err) {
                    return err ? error(err) : success(model.toJSON());
                }
            );
            break;
        case 'delete':
            if (typeof stash.get(getUrl(model)) === 'undefined') {
                return success({});
            }
            stash.rm(
                getUrl(model),
                function(err) {
                    return err ? error(err) : success({});
                }
            );
            break;
        }
    };

    return { stash: stash, sync: sync };
};