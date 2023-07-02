# Serverless Watermark Node.js
Watermarking images with Node.js, lambda, api gateway, serverless framework.

[Qiita](https://qiita.com/haxidoi/items/b278237d5aebfa889303)

## Dependence
### serverless
```shell
$ npm install -g serverless
```
### serverless(plugins)
```shell
$ sls plugin install -n serverless-offline
```

## Local test
```shell
$ sls offline start
```

## Deploy to AWS
```shell
$ rm -r node_modules/*

$ npm install --platform=linux --arch=x64

# deploy to development environment.
$ sls deploy

# deploy to production environment.
$ sls deploy --stage prod
```
