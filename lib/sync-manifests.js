var url = require('url');
var async = require('async');
var request = require('request');

var config = require('./config');

module.exports.run = function() {
  var db = config.database(config.COUCHDB_DATASETS);
  var db_sources = config.database(config.COUCHDB_SYNC_SOURCES);
  var db_queue = config.database(config.COUCHDB_SYNC_FILES);

  var sync_ts = new Date();

  db_sources.all({ include_docs: true }, function(err, sync_objects) {
    async.forEachSeries(sync_objects, function(sync_item, next_sync_item) {
      config.logger.info("loading: " + sync_item.doc['url'] + " ...");

      request(sync_item.doc['url'], function(err, response, data) {
        if (!err && response.statusCode == 200) {
          var datasets = JSON.parse(data);

          config.logger.info("got a list of %d datasets", datasets.length);

          async.forEachSeries(datasets, function(manifest, next_dataset) {
            config.logger.debug("got manifest %s", manifest.urn);

            if (sync_item.doc['sync_manifest']) {
              // we want to grab the manifest
              config.logger.debug("trying to sync manifest " + manifest.urn);

              db.get(manifest.uuid, function(err, doc) {
                if (err && doc == null) {
                  // save manifest
                  config.logger.debug("adding source and sync timestamp to manifest");

                  manifest['sync_info'] = {
                    'synced_from': sync_item.doc['url'],
                    'synced_at': sync_ts.toGMTString()
                  };

                  config.logger.info("adding manifest " + manifest.urn);

                  db.save(manifest.uuid, manifest, function(err, res) {
                    // if we also grab the files, we need to alter
                    // the manifest and stream attachments

                    if (sync_item.doc['sync_files']) {
                      db_queue.save({ bind_to: res, files: manifest.files }, function(err, res) {
                        // files sync daemon will take care of this
                      });
                    }

                    next_dataset(null);
                  });

                  return;
                }

                next_dataset(null);
              });
            }
          }, function(err) {
            next_sync_item(err);
          });
        }
      });
    });
  });
}