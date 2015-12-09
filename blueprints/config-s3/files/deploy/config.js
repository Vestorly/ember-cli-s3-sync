'use strict';
// this is your config! have fun with it.

var developmentConfig = {
  environment: 'development',
  promptCredFile: false,
  verbose: false,

  /**
   *  For possible options to create S3 object with, see:
   *  http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
   */
  options: {
    region: 'us-east-1',
    maxRetries: 2,
    sslEnabled: true,
    params: {
      Bucket: 'ember-cli-deploy-test'
    },
  },
  processEnv: { },

  /**
   *  Uses inquirer to display prompts.
   *  [inquirer node module](https://github.com/SBoudrias/Inquirer.js)
   *  Basic format is:
   *  ```javascript
   *  {
   *    type: 'input',
   *    name: 'myInput',
   *    'default': '',
   *    validate: function(value) {
   *      value = value || '';
   *      return value.trim() !== '';
   *    }
   *  }
   *  ```
   */
  additionalOptions: [
    { type: 'input',
      name: 'maxRetries',
      'default': 2,
      message: 'Please enter a maximum number of retries to attempt when uploading a file',
      validate: function(value) {
        if ('number' !== typeof value) {
          return false;
        }
        return value;
      }
    }
  ],

  /**
   *
   *  There are 4 hooks to customize your deploy
   *  process with external scripts/commands:
   *  `beforeBuild`, `afterBuild`, `beforeDeploy`, and `afterDeploy`
   *
   *  each takes an array of command objects in following format:
   *  ```javascript
   *  {
   *    command: 'echo "hi"',
   *    includeOptions: ['environment']
   *    fail: false
   *  }
   *  ```
   *  `command` is the command to be run in the shell
   *  `includeOptions` is an array of command options to include
   *   in the command. It will pass any arg options from the
   *   `ember deploy:s3` command. Use camelCase version of the option.
   *   e.g. to run 'echo --foo-bar=cool' then do the following:
   *   `{ includeOptions: ['fooBar'] }`
   *   and run `ember deploy:s3 --foo-bar=cool`
   *
   */
  beforeBuild: [
    {
      command: '',
      includeOptions: [],
      fail: false,
    }
  ],

  afterBuild: [
    {
      command: '',
      includeOptions: [],
      fail: false
    }
  ],

  beforeDeploy: [
    {
      command: '',
      includeOptions: [],
      fail: false
    }
  ],

  afterDeploy: [
    {
      command: '',
      includeOptions: [],
      fail: false
    }
  ]

};

/**
 *
 *  `--environment` argument gets passed in as `env`.
 *  Default is 'development'
 *
 */
module.exports = function(env) {
  env = env || 'development';
  return (env === 'development') ? developmentConfig : productionConfig;
}
