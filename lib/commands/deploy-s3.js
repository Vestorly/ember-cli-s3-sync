'use strict';

var path      = require('path');
var chalk     = require('chalk');
var Promise   = require('ember-cli/lib/ext/promise');
var requiring = require('requiring');
var PleasantProgress = require('pleasant-progress');

module.exports = {
  name: 'deploy:s3',
  aliases: ['s3'],
  description: 'Deploys assets from project\'s build output-path (/dist by default) to an S3 bucket.',
  works: 'insideProject',
  environment: 'development',
  configFile: null,

  config: requiring.sync('./deploy/config', function() {
    return require('../../package.json')['config'];
  }),

  availableOptions: [
    { name: 'config',       type: String,   default: '',            aliases: ['c'] },
    { name: 'environment',  type: String,   default: '',            aliases: ['e'] },
    { name: 'output-path',  type: path,     default: 'dist/',       aliases: ['o'] },
    { name: 'prepend-path', type: String,   default: '',            aliases: ['p'] },
    { name: 'skip-build',   type: Boolean,  default: false },
    { name: 'aws-key',      type: String },
    { name: 'aws-secret',   type: String },
    { name: 'aws-bucket',   type: String },
    { name: 'aws-region',   type: String }
  ],

  run: function(options) {
    var deploy = this.deploy.bind(this);
    var ui = this.ui;
    this.ui.pleasantProgress = new PleasantProgress();

    this.configFile = this.config(options.config, options.environment);

    process.env.EMBER_ENV = options.environment || this.configFile.environment;

    this.setProcessEnvs(this.configFile.processEnv);

    return this.build(options)
      .then(function() {
        return deploy(options);
      }, function(err) {
        return Promise.reject(err);
      });
  },

  build: function(options) {
    if (options.skipBuild) {
      return new Promise(function(resolve) {
          return resolve();
        });
    }

    var ui = this.ui;
    var extraStep = this.extraStep.bind(this);
    var BuildTask = this.tasks.Build;
    var buildTask = new BuildTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    return extraStep('beforeBuild', options)
      .then(function() {
        ui.pleasantProgress.start(chalk.green('Building') + '\n', chalk.green('.'));

        return buildTask.run(options).then(function(result) {
            if (result === 1) {
              return Promise.reject("Build failed with error code: " + result);
            }
          });

      })
      .then(function(result) {
        ui.pleasantProgress.stop();
        return extraStep('afterBuild', options);
      }, function(err) {
        return Promise.reject(err);
      });
  },

  deploy: function(options) {
    var DeployTask = require('../tasks/deploy-s3');
    var extraStep = this.extraStep.bind(this);
    var deployTask = new DeployTask({
      ui: this.ui,
      options: options,
      project: this.project,
      config: this.configFile
    });

    return extraStep('beforeDeploy', options)
      .then(function() {
        return deployTask.run();
      })
      .then(function() {
        return extraStep('afterDeploy', options);
      });

  },

  extraStep: function(when, options) {
    var extraStep = require('../tasks/extra-step');
    var config = this.configFile;
    var steps = config[when] || [];
    this.ui.writeLine('Running step: ' + chalk.green(when));
    return extraStep(steps, options, this.ui);
  },

  setProcessEnvs: function(variables) {
    variables = variables || {}

    for (var key in variables) {
      this.ui.writeLine('Setting environment, ' +
                        chalk.yellow(key) + ' to ' +
                        chalk.green(variables[key]));

      process.env[key] = variables[key];
    }
  }

}
