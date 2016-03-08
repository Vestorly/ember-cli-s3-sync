'use strict';

var fileTool  = require('../utils/file-tool');
var Promise   = require('ember-cli/lib/ext/promise');
var extend    = require('extend');
var chalk     = require('chalk');
var path      = require('path');
var mime      = require('mime');
var fs        = require('fs');
var execSync  = require('sync-exec');

mime.default_type = 'text/plain';

/**
 *  Sets the correct bucket for the s3 instance
 *   incase the wrong or no region was provided
 *
 *  @method updateBucketLocation
 *  @param {Object} s3 an S3 instance
 *  @param {String} loc The region of the bucket
 */
function updateBucketLocation(s3, loc) {
  var location = s3.config.region;
  if (location !== loc.LocationConstraint) {
    s3.config.region = loc.LocationConstraint;
  }
}

/**
 *  @method buildFileParameters
 *  @param {String} filePath file path to be created in s3 bucket
 *  @param {String} fullPath path of file on your hard drive
 *  @param {Object} options
 *  @return {Object} details on a file.
 */
function buildFileParameters(fullPath, options) {
  options = options || {};

  var mimeType = mime.lookup(fullPath);
  var isGzip = !execSync('gzip -t "'+fullPath+'" 2> /dev/null').status;

  var params = {
    ACL: 'public-read',
    CacheControl: "max-age=31536000, public",
    ContentType: mimeType
  };

  if (isGzip) {
    params.ContentEncoding = 'gzip';
  }

  return extend(params, options);
}

/**
 *
 *
 *  @method uploadFile
 *  @param {Object} s3 an S3 instance
 *  @param {Object} ui
 *  @param {Object} file
 *  @params {Object} params Parameters containing file details
 */
module.exports.uploadFile = function(s3, ui, file, params) {
  var fullPath = file.fullPath;
  var params = params || {};
  var putObject = Promise.denodeify(s3.putObject.bind(s3));
  var fileStream = fs.createReadStream(fullPath);
  var fileName = path.basename(fullPath);

  params.Body = fileStream;
  params.Key = params.Key ? params.Key : fileName;

  return function() {
    var startTime = new Date().getTime();
    var elapsed = function(){
      return chalk.cyan('['+((new Date().getTime() - startTime)/1000)+'s]');
    };
    var stopProgress = function(message){
      ui.pleasantProgress.stop();
      ui.writeLine(message);
    }

    ui.pleasantProgress.start(chalk.yellow('Uploading ') + params.Key + chalk.white(' [' + params.ContentLength + 'b]'), chalk.green('.'));

    return putObject(params).then(function(data) {
        stopProgress(chalk.green('Upload complete: ') + params.Key + ' ' + elapsed());
        return Promise.resolve({ mode:'success', value:data, file:file });
      }).catch(function(err) {
        stopProgress(chalk.red('Upload error: ') + params.Key);
        return Promise.resolve({ mode:'fail', value:err, file:file });
      });
  }
}

/**
 *
 *
 *  @method validateBucket
 *  @param {Object} s3 an S3 instance
 *  @param {Object} ui
 */
module.exports.validateBucket = function(s3, ui) {
  var getBucketLocation = Promise.denodeify(s3.getBucketLocation.bind(s3));

  ui.pleasantProgress.start(chalk.green('Verifying bucket'), chalk.green('.'));

  return getBucketLocation().then(function(locData) {
      ui.pleasantProgress.stop();
      ui.writeLine(chalk.green('Bucket found: ') + s3.config.params.Bucket);
      updateBucketLocation(s3, locData);
      return locData;

    }, function(err) {
      ui.writeLine(chalk.red('Error locating bucket: ') + s3.config.params.Bucket);
      throw err;
    });
}

function defer(label) {
  var deferred = {};

  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject  = reject;
  }, label);

  return deferred;
}

/**
 *
 *
 *  @method uploadDirectory
 *  @param {Object} s3 an S3 instance
 *  @param {Object} ui
 *  @param {String} dir The directory to upload to s3
 *  @param {Options} options The options hash of cl
 */
module.exports.uploadDirectory = function(s3, ui, dir, options) {
  var prependPath = s3.config.prependPath || '';
  //var timeOut = s3.config.timeOut || 0;
  //var maxRetries = s3.config.maxRetries || 1;
  var bucketPath =  !!prependPath ?
                    s3.config.params.Bucket + '/' + prependPath :
                    s3.config.params.Bucket;

  return fileTool.readDirectory(dir).then(function(files) {
    var deferred = defer();
    var source = files.slice();
    var count = source.length;
    var promise = Promise.resolve();

    var upload = function() {
      var file = source.shift();
      var filePath = path.join(prependPath, file.path);

      var params = buildFileParameters(file.fullPath, {
        Key: filePath,
        ContentLength: file.stat.size
      });

      promise = promise.then(module.exports.uploadFile(s3, ui, file, params)).then(function(result){
        if (result.mode === 'fail') {
          ui.writeLine(chalk.red(result.value.message));
          source.push(result.file);
          upload();
        } else if (--count > 0) {
          upload();
        } else {
          deferred.resolve();
        }
      });
    }

    upload();

    return deferred.promise;
  });
}
