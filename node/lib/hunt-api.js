// API implementation

var common = require('./common')

var mongodb = common.mongodb
var SendGrid = common.SendGrid
var keys    = common.keys

var questioncoll = null

var util = {}

util.validate = function( input ) {
  return input.userName
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


exports.question = {

  create: function( req, res ) {
    var input = req.body
	/*
    if( !util.validate(input) ) {
      return res.send$(400, 'invalid')
    }
	*/
    var question = {
	  correct:input.correct,
	  located:input.located,
	  summary: input.summary,
	  question:input.question,
	  answer:input.answer,
	  latitude: input.latitude,
	  longitude: input.longitude,
	  guess:input.guess,
	  number:input.number,
	  participantID: input.participantID,
	  created: new Date().getTime()
    }
    questioncoll.insert(question, res.err$(function( docs ){
      var output = util.fixid( docs[0] )
      res.sendjson$( output )
    }))
  },

  update: function( req, res ) {
    var id    = req.params.id
    var input = req.body
    
    var query = util.fixid( {id:id} )
    questioncoll.findAndModify( 
	  query, 
	  [],
	  {$set:{
	    correct:input.correct, 
		located:input.located,
		guess:input.guess}
	  }, 
	  {new:true},
	  res.err$( function(doc) {
	    if( doc ) {
          var output = util.fixid( doc )
          res.sendjson$( output )
        }
        else {
          console.log('404')
          res.send$(404,'not found')
        }
      })
	)
  },
  
  list: function( req, res ) {
    var input = req.query
    var output = []
    var options = {sort:[['number','asc']]}
	var query = {}
	if (input.huntCode) {
	  query.huntCode = input.huntCode
	}
	if (input.participantID) {
	  query.participantID = input.participantID
	}

    questioncoll.find( query, options, res.err$( function( cursor ) {
      cursor.toArray( res.err$( function( docs ) {
        output = docs
        output.forEach(function(question){
          util.fixid(question)
        })
        res.sendjson$( output )
		/*
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
	   */
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

exports.participant = {

  create: function( req, res ) {
    var input = req.body
    if( !util.validate(input) ) {
      return res.send$(400, 'invalid')
    }
    var participant = {
	  userName: input.userName,
	  email: input.email,
      huntCode: input.huntCode,
	  numCorrect: 0,
	  numLocated: 0,
	  photo: input.photo,
	  created: new Date().getTime()
    }
    participantcoll.insert(participant, res.err$(function( docs ){
      var output = util.fixid( docs[0] )
      res.sendjson$( output )
    }))
  },

  update: function( req, res ) {
    var id    = req.params.id
    var input = req.body
    
    var query = util.fixid( {id:id} )
    participantcoll.findAndModify( 
	  query, 
	  [],
	  {$set:{
	    numCorrect:input.numCorrect, 
		numLocated:input.numLocated,
		photo:input.photo}
	  }, 
	  {new:true},
	  res.err$( function(doc) {
	    if( doc ) {
          var output = util.fixid( doc )
          res.sendjson$( output )
        }
        else {
          console.log('404')
          res.send$(404,'not found')
        }
      })
	)
  },
  
  read: function( req, res ) {
	var input = req.params
    var query = util.fixid( {id:input.id} )
    participantcoll.findOne( query, res.err$( function( doc ) {
      if( doc ) {
        var output = util.fixid( doc )
        res.sendjson$( output )
      }
      else {
        res.send$(404,'not found')
      }
    }))
  },
  
  del: function( req, res ) {
    var input = req.params
	
    var query = util.fixid({id:input.id})
    participantcoll.remove( query, res.err$( function() {
      var output = {}
      res.sendjson$( output )
    }))
    query = {participantID:input.id}
    questioncoll.remove( query, res.err$( function() {
      var output = {}
      res.sendjson$( output )
    }))
  },

  list: function( req, res ) {
    var input = req.query
    var output = []
    var options = {sort:[['numcorrect','desc']]}
	var query = {}
	if (input.huntCode) {
	  query.huntCode = input.huntCode
	}

    participantcoll.find( query, options, res.err$( function( cursor ) {
      cursor.toArray( res.err$( function( docs ) {
        output = docs
        output.forEach(function(participant){
          util.fixid(participant)
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
    client.collection('participant', function( err, collection ) {
      if( err ) return callback(err);
      participantcoll = collection
    })
  })
  callback()
}