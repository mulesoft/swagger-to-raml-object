#!/usr/bin/env node

var fs        = require('fs');
var http      = require('http');
var converter = require('../');
var args      = process.argv.slice(2);

if (!args.length) {
  console.error();
  console.error('Usage: swagger-to-raml-object resource.json');
  console.error();
  process.exit(1);
}

converter(args[0], function (filename, done) {
  if (/https?:\/\//i.test(filename)) {
    return request(filename, function (err, res, body) {
      return done(err, body);
    });
  }

  return fs.readFile(filename, 'utf8', done);
}, function (err, ramlObject) {
  if (err) {
    console.error(err.stack);
    return process.exit(1);
  }

  console.log(JSON.stringify(ramlObject));
});