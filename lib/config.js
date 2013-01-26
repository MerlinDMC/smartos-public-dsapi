var async = require('async');
var cradle = require('cradle');
var bunyan = require('bunyan');

var NAME = 'dsapi';
var VERSION = '0.1.0';

var COUCHDB_HOST = process.env.COUCHDB_HOST || '127.0.0.1';
var COUCHDB_PORT = process.env.COUCHDB_PORT || 5984;
var COUCHDB_SYNC_SOURCES = process.env.COUCHDB_SYNC_SOURCES || 'sync_sources';
var COUCHDB_SYNC_FILES = process.env.COUCHDB_SYNC_FILES || 'sync_files_queue';
var COUCHDB_DATASETS = process.env.COUCHDB_DATASETS || 'datasets';
var COUCHDB_AUTH = process.env.COUCHDB_AUTH || 'auth';
var DSAPI_HOST = process.env.DSAPI_HOST || '0.0.0.0';
var DSAPI_PORT = process.env.DSAPI_PORT || 80;
var DSAPI_ROOT = process.env.DSAPI_ROOT || ('http://' + require('os').hostname() + '/' + COUCHDB_DATASETS);

cradle.setup({
  host: COUCHDB_HOST,
  port: COUCHDB_PORT,
  cache: true,
  raw: false
});

var logger = bunyan.createLogger({ name: NAME });

var connection = new(cradle.Connection);

function setupDbSources(db) {
  db.exists(function(err, exists) {
    if (!exists) {
      // create database
      db.create(function(err) {
        // add default sync source
        db.save('joyent', {
          "url": "https://datasets.joyent.com/datasets",
          "sync_manifest": true,
          "sync_files": false
        });
      });
    }
  });
}

function setupDbQueue(db) {
  db.exists(function(err, exists) {
    if (!exists) {
      // create database
      db.create();
    }
  });
}

function setupDbDatasets(db) {
  db.exists(function(err, exists) {
    if (!exists) {
      // create database
      db.create(function(err) {
        // create views
        db.save('_design/datasets', {
          published_at: {
            map: function(doc) {
              emit(doc.published_at || null, doc);
            }
          }
        });
      });
    }
  });
}

function setupDbAuth(db) {
  db.exists(function(err, exists) {
    if (!exists) {
      // create database
      db.create(function(err) {
        // create views
        db.save('_design/users', {
          username: {
            map: function(doc) {
              emit(doc.username || null, doc);
            }
          }
        });
      });
    }
  });
}

// ensure database is usable
setupDbSources(connection.database(COUCHDB_SYNC_SOURCES));
setupDbQueue(connection.database(COUCHDB_SYNC_FILES));
setupDbDatasets(connection.database(COUCHDB_DATASETS));
setupDbAuth(connection.database(COUCHDB_AUTH));

module.exports = {
  'APP_NAME': NAME,
  'APP_VERSION': VERSION,
  'COUCHDB_HOST': COUCHDB_HOST,
  'COUCHDB_PORT': COUCHDB_PORT,
  'COUCHDB_SYNC_SOURCES': COUCHDB_SYNC_SOURCES,
  'COUCHDB_SYNC_FILES': COUCHDB_SYNC_FILES,
  'COUCHDB_DATASETS': COUCHDB_DATASETS,
  'COUCHDB_AUTH': COUCHDB_AUTH,
  'DSAPI_HOST': DSAPI_HOST,
  'DSAPI_PORT': DSAPI_PORT,
  'DSAPI_ROOT': DSAPI_ROOT,
  'logger': logger,
  'database': function(database) {
    return connection.database(database);
  }
};
