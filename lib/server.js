var restify = require('restify');
var mime = require('mime');
var async = require('async');
var request = require('request');
var fs = require('fs');
var uuid = require('node-uuid');

var config = require('./config');

function cleanupManifest(manifest) {
  var special_keys = [
    '_builder',
    '_metadata'
  ];

  for (k in manifest) {
    if (k[0] === '_' && special_keys.indexOf(k) < 0) {
      delete manifest[k];
    }
  }

  return manifest;
}

module.exports.run = function() {
  var db = config.database(config.COUCHDB_DATASETS);
  var db_auth = config.database(config.COUCHDB_AUTH);

  var server = restify.createServer({
      name: config.APP_NAME,
      version: config.APP_VERSION,
      formatters: {
        'application/json': function(req, res, body) {
          if (!body) {
            if (res.getHeader('Content-Length') === undefined && res.contentLength === undefined) {
              res.setHeader('Content-Length', 0);
            }

            return null;
          }

          if (body instanceof Error) {
            // snoop for RestError or HttpError, but don't rely on instanceof
            if ((body.restCode || body.httpCode) && body.body) {
              body = body.body;
            } else {
              body = {
                message: body.message
              };
            }
          }

          if (Buffer.isBuffer(body)) {
            body = body.toString('base64');
          }

          var data = JSON.stringify(body, null, 2);

          if (res.getHeader('Content-Length') === undefined && res.contentLength === undefined) {
            res.setHeader('Content-Length', Buffer.byteLength(data));
          }

          return data;
        }
      }
  });

  server.use(restify.acceptParser(server.acceptable));
  server.use(restify.authorizationParser());
  server.use(restify.dateParser());
  server.use(restify.bodyParser({ mapParams: false }));
  server.use(restify.queryParser());

  server.get('/ping', function(req, res, next) {
    var data = {
      "ping": "pong"
    };

    res.send(data);

    next();
  });

  server.get('/stats', function(req, res, next) {
    var data = {
      "started_at": -1,
      "disk_size": -1
    };

    res.contentType = 'application/json';

    db.info(function(err, doc) {
      if (!err) {
        if (doc['instance_start_time']) {
          data['started_at'] = (new Date(doc['instance_start_time'] / 1000))
            .toGMTString();
        }

        data['disk_size'] = doc['disk_size'] || -1;
      }

      res.send(data);

      next();
    });
  });

  server.get('/datasets', function(req, res, next) {
    var manifests = [];

    res.contentType = 'application/json';

    if (Object.keys(req.params).length > 0) {
      // search
      db.view('datasets/published_at', { descending: true }, function(err, rows) {
        async.forEachSeries(rows, function(item, next_item) {
          var manifest = item.value;

          // filter manifest
          for (k in req.params) {
            if (manifest.hasOwnProperty(k)) {
              if (manifest[k] !== req.params[k]) {
                next_item();

                return;
              }
            }
          }

          // push if valid
          manifests.push(cleanupManifest(manifest));

          next_item();
        }, function(err) {
          res.send(manifests);

          next();
        });
      });
    } else {
      // get all
      db.view('datasets/published_at', { descending: true }, function(err, rows) {
        async.forEachSeries(rows, function(item, next_item) {
          manifests.push(cleanupManifest(item.value));

          next_item();
        }, function(err) {
          res.send(manifests);

          next();
        });
      });
    }
  });

  server.get('/datasets/:uuid', function(req, res, next) {
    res.contentType = 'application/json';

    db.get(req.params.uuid, function(err, manifest) {
      if (err || !manifest) {
        res.send(404, new Error('Not found.'));
      } else {
        res.send(cleanupManifest(manifest));
      }

      next();
    });
  });

  server.get('/datasets/:uuid/:path', function(req, res, next) {
    var stream = db.getAttachment(req.params.uuid, req.params.path, function(err) {
      if (err) {
        res.send(404, new Error('Not found.'));
      }

      next(false);
    });

    stream.pipe(res);
  });

  server.put('/datasets/:uuid', function(req, res, next) {
    res.contentType = 'application/json';

    if (uuid.unparse(uuid.parse(req.params.uuid)) !== req.params.uuid) {
      res.send(500, new Error('you must provide a valid uuid.'));

      next();

      return;
    }

    db_auth.view('users/username', { key: req.authorization.basic.username, limit: 1 }, function(err, rows) {
      if (err || rows.length === 0) {
        config.logger.error({ "authorization": req.authorization }, "authorization failed");

        res.send(500, new Error('you must be authorized to upload datasets.'));

        next();

        return;
      }

      var auth = rows[0].value;

      if (auth.password !== req.authorization.basic.password) {
        config.logger.error({ "authorization": req.authorization, "auth": auth }, "authorization failed - password mismatch");

        res.send(500, new Error('you must be authorized to upload datasets.'));

        next();

        return;
      }

      config.logger.info({ "auth": auth }, "user starting upload");

      db.get(req.params.uuid, function(err, manifest) {
        if (manifest) {
          res.send(500, new Error('a dataset with that uuid already exists.'));

          next();

          return;
        }

        if (!req.files['manifest']) {
          res.send(500, new Error('you need to upload a manifest file with the name "manifest".'));

          next();

          return;
        }

        var manifest = JSON.parse(fs.readFileSync(req.files['manifest'].path));

        if (!manifest.uuid || manifest.uuid !== req.params.uuid) {
          res.send(500, new Error('your manifest is missing an uuid or the uuid does not match ' + req.params.uuid + '.'));

          next();

          return;
        }

        delete req.files['manifest'];

        var readme = null;

        if (req.files['readme']) {
          readme = fs.readFileSync(req.files['readme'].path);

          delete req.files['readme'];
        }

        var attachments = [];

        for (key in manifest.files) {
          var file = manifest.files[key];

          if (!req.files[file.path] && !file.url) {
            res.send(500, new Error('file "' + file.path + '" is missing.'));

            next();

            return;
          } else {
            manifest.files[key].url = [config.DSAPI_ROOT, manifest.uuid, file.path].join('/');

            attachments.push(req.files[file.path]);
          }
        }

        config.logger.info({ "manifest": manifest }, "uploading new manifest");

        db.save(req.params.uuid, manifest, function(err, doc) {
          if (err) {
            res.send(500, new Error('could not push manifest into the database.'));
      
            next();
      
            return;
          }

          // save readme asynchronous
          // (we don't care about failure - if it breaks there simply is no readme)
          if (readme) {
            db.saveAttachment({
              "id": doc.id,
              "rev": doc.rev
            }, {
              "name": "readme",
              "body": readme,
              "content-type": "text/x-markdown"
            });
          }
      
          var syncAttachment = function(file, next_file) {
            config.logger.info("adding attachment %s", file.name);

            var stream = db.saveAttachment({
              "id": doc.id,
              "rev": doc.rev
            }, {
              "name": file.name,
              "content-type": "application/octet-stream"
            }, function(err) {
              next_file(null);
            });
            
            fs.createReadStream(file.path).pipe(stream);
          };

          async.forEachSeries(attachments, syncAttachment, function(err) {
            res.send(200, manifest);
      
            next();
          });
        });
      });
    });
  });

  server.listen(config.DSAPI_PORT, config.DSAPI_HOST, function() {
    config.logger.info('%s listening at %s', server.name, server.url);
  });
}
