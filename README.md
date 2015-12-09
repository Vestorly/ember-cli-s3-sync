# Ember-cli-s3-sync [![Build Status](https://travis-ci.org/Vestorly/ember-cli-s3-sync.svg?branch=command_line_args)](https://travis-ci.org/Vestorly/ember-cli-s3-sync)
A customizable tool for deploying your Ember app to Amazon's S3. Customize the deploy by running your own scripts within the process (beforeBuild, afterBuild, beforeDeploy, afterDeploy)


## Install
```bash
npm install ember-cli-s3-sync --save-dev
ember generate config-s3
```

## Authenticating with S3
This addon uses [`aws-sdk`](https://github.com/aws/aws-sdk-js) for communicating with Amazon S3.  You can provide authentication credentials in the following ways (listed in order of precedence):

  1. `ember deploy:s3 --aws-secret=my-secret --aws-key=my-cool-key`
  2. shared credentials file at [~/.aws/credentials file.](http://blogs.aws.amazon.com/security/post/Tx3D6U6WSFGOK2H/A-New-and-Standardized-Way-to-Manage-Credentials-in-the-AWS-SDKs)
  3. these shell environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
  4. deploy/config.js

  ```
    {
      ...
      options: {
        accessKeyId: "mycoolkey",
        secretAccessKey: "secretsarecool"
      }
      ...
    }
  ```

**note** if key & secret aren't found at any of the checks above then you will be prompted for credentials -blocking the deploy (keep this in mind if using with automated/continuous deployment systems).

## How to use
`ember deploy:s3 --environment=production --aws-key=12345 --aws-secret=asdfasdf --aws-bucket=buckets-o-fun`
  - this builds a production version of your app and deploys all files in the `/dist` directory to the S3 bucket "buckets-o-fun"

`ember deploy:s3`
  - this will build development version of your app and prompt you for `awsKey`, `awsSecret`, and `awsBucket`

possible cli arguments:
  - `environment` (optional. uses app's default. Passed into *deploy/config.js*)
  - `output-path` (optional. uses app's default `/dist`)
  - `aws-key` (required. will prompt if not found)
  - `aws-secret` (required. will prompt if not found)
  - `aws-bucket` (required. will prompt if not provided as cli arg or found in *deploy/config.js*)
  - `aws-region` (optional. will be verified and updated if necessary during deploy process)
  - `skip-build` (optional. will skip the build, deploying whatever is in `/dist`)
  - `prepend-path` (optional. will upload assets to the 'subdirectory' path defined here)

**notes:** camelCase args are okay but they'll be converted to their dasherized version.

## Configuring deployment
Generate a config file with `ember generate config-s3` (creates a file at  *your-app/deploy/config.js*)
The `environment` is passed into config file, which returns an object containing deploy configuration options.

And here are the pieces to [**deploy/config.js**:](https://github.com/Vestorly/ember-cli-s3-sync/blob/master/blueprints/config-s3/files/deploy/config.js)
#### ember-cli-s3-sync Options
```javascript
{ // deploy/config.js
  ...
  environment: 'development', // not used, but good practice to name the config incase you have several
  promptCredFile: false, // prompts whether or not to use AWS cred file, if one is found.
  verbose: false, // turns on AWS-SDK verbose flag. May be useful for troubleshooting.
  ...
}
```

#### [S3 Options:](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property)
```javascript
{ // deploy/config.js
  ...
  options: {
    region: 'us-east-1',
    maxRetries: 3,
    sslEnabled: true,
    params: {
      Bucket: 'my-bucket' // yes that's a capital B
    },
  ...
}
```

#### Prompt for additional Options:
If you want the deploy process to prompt a user for additional options to be merged in for instantiating the S3 Object:
<br>
Uses the [inquirer node module](https://github.com/SBoudrias/Inquirer.js).
```javascript
{ // deploy/config.js
  ...
  additionalOptions: [
    {
      type: 'input',
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
  ]
  ...
}
```
**notes:** when a `name` (e.g., `maxRetries`) is in both `additionalOptions` and the `options` hash,
then the value defined in the `options` hash takes precedence and the user will not be prompted.

#### Deploy Steps:
You can run scripts throughout the deploy process. These scripts must exit their process for the deploy to continue running.
```javascript
{ // deploy/config.js
  ...
  beforeBuild: [
    {
      command: 'curl http://my-site.nyc?new_build=start', // base command to run
      includeOptions: ['someOption', 'anotherOption'], // options to include as cli-args for base command
      fail: false // whether a non 0 exit code should halt the deploy process
    }
  ],
  afterBuild: [
    ...
  ],
  beforeDeploy: [
    ...
  ],
  afterDeploy: [
    ...
  ],
  ...
}
```

#### Example Deploy Steps:

**providing default cli-arguments to run with your custom scripts:**
<br>
Running: `ember deploy:s3 --compressed --head=false --header="Pragma: no-cache"`
```javascript
{ // deploy/config.js
  ...
  beforeDeploy: [
    {
      command: 'curl http://httpbin.com/headers',
      includeOptions: [
        'compressed',
        'beh',
        { header: 'X-Host: mysite.com' },
        { header: 'X-Update: 1' },
        { head: true }
      ],
      fail: false
    }
  ],
  ...
}
```
will run the following command, waiting for it to exit before deploying assets to S3 (`beforeDeploy` hook):
<br>
`curl http://httpbin.com/headers --compressed --header "X-Host: mysite.com" --header "X-Update: 1" --header "Pragma: no-cache"`

**explaination:**
> `--compressed`
  >> was passed with`ember deploy:s3` and so it was included
  
> `--beh`
  >> was **not** passed with `ember deploy:s3` and so it was ignored
  
> `--header "X-Host: mysite.com"` and `--header "X-Update: 1"`
  >> were defined as defaults so they were included
  
> `--header "Pragma: no-cache"`
  >> was passed with `ember deploy:s3` and included because there exists a `header` key in `includeOptions` Array. It did **not** overwrite any defaults since there were multiple defaults.
  
> `--head`
  >> was passed as `false` with `ember deploy:s3` and so it overwrote the default


**Example config for deploying YUI docs with [ember-cli-yuidoc](https://github.com/cibernox/ember-cli-yuidoc):**
<br>
Running: `ember deploy:s3 --environment documentation --output-path docs --prepend-path docs --skip-build`
```javascript
var documentationConfig = { // deploy/config.js
  ...
  params: {
    Bucket: 'bucket-o-docs'
  },
  beforeDeploy: [
    {
      command: 'ember ember-cli-yuidoc',
      includeOptions: [],
      fail: true
    }
  ],
  ...
};

module.exports = function(env) {
  return (env === 'documentation') ? documentationConfig : 'development';
};
```
* `--environment` gets passed into **deploy/config.js** so that it can determine which config object to return
* `--output-path` is the local folder (relative to project dir) where assets are located
* `--prepend-path` is a way to specify a 'subdirectory', inside s3 bucket, to upload assets
* `--skip-build` says to skip building the actual app (`ember build`) 

**notes:** `beforeBuild` and `afterBuild` are not run if you use `--skip-build` flag.

#### Environment variables
If the build/deploy process relies on certain shell environment variables, those can be set explicitely for each deploy environment. e.g.,
```js
//deploy/config.js
{
  ...
  processEnv: {
    API_URL: 'http://api.website.com'
  }
  ...
}
```
See [issue 26](https://github.com/Vestorly/ember-cli-s3-sync/issues/26) for rationale and example use case.

## TODO
- [ ] better test coverage
- [ ] write documentation for each function
- [x] write documentation describing flow, configurable options, general how to use
- [x] ability to save config file
- [x] ability to generate `config-s3.js` for deploy configuration
- [x] ability to specify optional params in `config-s3.json` to be prompted for
- [ ] ability to sync individual files to s3 bucket
- [ ] ability to do a dryrun
- [x] ability to skip build task and just deploy a specified directory
- [x] support gzipped files
- [ ] ability to set meta data (headers) for files, such as `Expires`
- [ ] update s3 with file's ContentMD5

