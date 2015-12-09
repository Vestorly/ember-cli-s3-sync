'use strict';

var CoreObject  = require('core-object');
var chalk       = require('chalk');
var Promise     = require('ember-cli/lib/ext/promise');
var fileTool    = require('../utils/file-tool');
var Config      = require('../utils/config-s3');
var s3Tool      = require('../utils/s3-tool');
var S3          = require('../models/s3');


function DeployS3() {
  CoreObject.apply(this, arguments);
}
DeployS3.__proto__ = CoreObject;

module.exports = DeployS3.extend({
  s3: null,

  run: function() {
    var self = this;
    var ui = this.ui;
    var distDir = this.options.outputPath;

    return this.constructS3()
      .then(function(s3) { return s3Tool.validateBucket(s3, ui); })
      .then(function() { return fileTool.validateDirectory(distDir); })
      .then(function(dir) {
        return s3Tool.uploadDirectory(self.s3, ui, dir);
      }, function(err) {
        return Promise.reject(err);
      });

  },

  /*
    Grabs config-s3.js file. Builds `options` hash for S3

    @method constructConfig
    @return Promise
  */
  constructConfig: function() {
    var self = this;
    var configFile = this.config;
    var config = new Config({
      ui: this.ui,
      config: configFile,
      options: configFile.options,
      commandOptions: this.options
    });
    return config.getOptions();
  },

  /*
    Builds a new instance of S3

    @method constructS3
    @return Promise -> s3 instance returned in resolved promise
  */
  constructS3: function(options) {
    var self = this;
    return this.constructConfig()
      .then(function(options) {
        return self.s3 = new S3(options);
      }, function(err) {
        return Promise.reject(err);
      });
  }

});
