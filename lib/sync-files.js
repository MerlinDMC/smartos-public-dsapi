var async = require('async');
var request = require('request');

var config = require('./config');

module.exports.run = function() {
  var db = config.database(config.COUCHDB_DATASETS);
  var db_queue = config.database(config.COUCHDB_SYNC_FILES);

  db_queue.exists(function(err, exists) {
    if (err) {
      config.logger.error("cannot access the sync queue database");
    } else if (exists) {
      config.logger.info("starting sync...");

      db_queue.all({ include_docs: true }, function(err, queue_items) {
        async.forEachSeries(queue_items, function(item, next_item) {
          var syncAttachment = function(file, next) {
            config.logger.info("syncing " + file.path + "...");

            var stream = db.saveAttachment({
              "id": item.doc.bind_to.id,
              "rev": item.doc.bind_to.rev
            }, {
              "name": file.path,
              "content-type": "application/octet-stream"
            }, function(err) {
              if (err) {
                config.logger.error("Error: syncing " + file.path);
              }
            
              file.url = [config.DSAPI_ROOT, item.doc.bind_to.id, file.path].join('/');
             
              // remove sync item
              db_queue.remove(item.doc._id, item.doc._rev, function(err, res) {
                next(null, file);
              });
            });
            
            request(file.url).pipe(stream);
          };
 
          async.mapSeries(item.doc.files, syncAttachment, function(err) {
            config.logger.info("syncing manifest...");
 
            db.merge(item.doc.bind_to.id, { "files": item.doc.files }, function(err, res) {
              if (err) {
                config.logger.error("Error syncing: " + item.doc.bind_to.id);
              } else {
                config.logger.info("done.");
              }
 
              next_item(null);
            });
          });
        }, function(err) {
          config.logger.info('done.');
        });
      });
    }
  });
}
