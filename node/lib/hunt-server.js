var common = require('./common')
var api    = require('./hunt-api')

var connect = common.connect


function init() {
  var server = connect.createServer()
  server.use( connect.logger() )
  server.use( connect.bodyParser() )
  server.use( connect.query() )

  server.use( function( req, res, next ) {
    res.sendjson$ = function( obj ) {
      common.sendjson( res, obj )
    }
	res.send$ = function( code, text ) {
      res.writeHead( code, ''+text )
      res.end()
    }
   res.err$ = function(win) {
      return function( err, output ) {
        if( err ) {
          console.log(err)
          res.send$(500, err)
        }
        else {
          win && win(output)
        }
      }
    }	
    next()
  })
  
  var router = connect.router( function( app ) {
    app.get('/api/ping', api.ping)
	app.get('/api/questions',     api.questions.list)
	app.get('/api/hunt',     api.hunt.list)
  })
  server.use(router)

  server.use( connect.static( __dirname + '/../../site/public') )

    api.connect(
    {
      name:   'hunt',
      server: '127.0.0.1',
      port:   27017,
    },
    function(err){
      if( err ) return console.log(err);
      
      server.listen(8180)
    }
  )
}


init()