var buffer = exports.buffer = require('buffer')

// npm modules
//exports.connect = require('connect')
exports.mongodb = require('mongodb')
exports.SendGrid = require('sendgrid').SendGrid
//exports.keys = require('./keys')


var util     = exports.util     = require('util')
var fs       = exports.fs       = require('fs')

var connect  = exports.connect  = require('connect')
var knox     = exports.knox     = require('knox')
//var simpledb = exports.simpledb = require('simpledb')
//var uuid     = exports.uuid     = require('node-uuid')

var keys = exports.keys = require('./keys.js')


exports.sendjson = function(res,obj){
  var objstr = JSON.stringify(obj)
  console.log('SENDJSON:'+objstr);

  res.writeHead(200,{
    'Content-Type': 'application/json',
    'Cache-Control': 'private, max-age=0, no-cache, no-store',
    "Content-Length": buffer.Buffer.byteLength(objstr) 
  })
  
  res.end( objstr )
}
