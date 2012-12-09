// API implementation

var common = require('./common')

var mongodb = common.mongodb
var SendGrid = common.SendGrid
var keys    = common.keys

var questioncoll = null

var util = {}

util.validate = function( input ) {
  return input.text
}

util.fixid = function( doc ) {
  if( doc._id ) {
    doc.id = doc._id.toString()
    delete doc._id
  }
  else if( doc.id ) {
    doc._id = new mongodb.ObjectID(doc.id)
    delete doc.id
  }
  return doc
}


exports.ping = function( req, res ) {
  var output = {ok:true,time:new Date()}
  res.sendjson$( output )
}


exports.questions = {

  list: function( req, res ) {
    var output = []
    var options = {sort:[['number','asc']]}
    var query   = {}

    questioncoll.find( query, options, res.err$( function( cursor ) {
      cursor.toArray( res.err$( function( docs ) {
        output = docs
        output.forEach(function(question){
          util.fixid(question)
        })
        res.sendjson$( output )
		var sendgrid = new SendGrid(keys.sendgrid.user, keys.sendgrid.pw)
		sendgrid.send({
          to: 'imcgoldr@gmail.com',
          from: 'ian.mcgoldrick@sunlife.com',
          subject: 'Hunt Downloaded',
          text: 'Someone is hunting in Tramore'
        }, function(success, message) {
          if (!success) {
            console.log(message);
          }
       })
      }))
    }))
  }

}

exports.hunt = {

  list: function( req, res ) {
    var output = []
    var options = {}
    var query   = {}

    huntcoll.find( query, options, res.err$( function( cursor ) {
      cursor.toArray( res.err$( function( docs ) {
        output = docs
        output.forEach(function(question){
          util.fixid(question)
        })
        res.sendjson$( output )
      }))
    }))
  }
}

exports.connect = function(options,callback) {
  var client = new mongodb.Db( options.name, new mongodb.Server(options.server, options.port, {}))
  client.open( function( err, client ) {
    if( err ) return callback(err);
    client.collection('question', function( err, collection ) {
      if( err ) return callback(err);
      questioncoll = collection
    })
    client.collection('hunt', function( err, collection ) {
      if( err ) return callback(err);
      huntcoll = collection
    })
  })
  callback()
}