
var common = require('./common.js')

var connect = common.connect
var knox    = common.knox
var util    = common.util
//var uuid    = common.uuid

var keys    = common.keys

var bs = 48

var server = connect.createServer(
  connect.router(function(app){
 
    app.post('/api/upload/:id',function(req,res) {
      util.debug('upload start')
      var bytes = 0
      
      var s3client = knox.createClient({
        key:    keys.amazon.keyid,
        secret: keys.amazon.secret,
        bucket: 'ian-filestore'
      })

      var conlen   = parseInt( req.headers['content-length'], 10 )
      var padding  = parseInt( req.headers['x-lifestream-padding'], 10 ) 
      var bytelen = Math.floor( ((conlen-padding)*3)/4 )
      util.debug('bytelen:'+bytelen)

      var picid = req.params.id

      var s3req = s3client.put(
        picid+'.jpg',
        {
          'Content-Length':bytelen,
          'x-amz-acl': 'public-read'
        }
      )

      s3req.on('error',function(err){
        util.debug('error: '+err)
      })

      s3req.on('response',function(res){
        util.debug('response: '+res.statusCode)

        res.on('data',function(chunk){
          util.debug(chunk)
        })
      })

      var remain = ''

      req.on('data', function(chunk) {
        var ascii = remain + chunk.toString('ascii')
        var bslen = bs * Math.floor( ascii.length / bs )

        var base64     = ascii.substring(0,bslen)
        var binary     = new Buffer(base64,'base64')
        var newremain  = ascii.substring(bslen)

        util.debug('in='+ascii.length+' out='+binary.length )
        bytes+=binary.length

        remain = newremain
        s3req.write(binary)
      });
    
      req.on('end', function() {
        if( 0 < remain.length ) {
          var binary = new Buffer(remain,'base64')
          bytes+=binary.length
          s3req.write(binary)
        }
        s3req.end()

        util.debug('bytes:'+bytes)
        util.debug('upload end')

        res.writeHead(200, "OK", {'Content-Type': 'application/json'});
        res.end( JSON.stringify({ok:true,picid:picid}) )
      });

    })
  }),
  connect.static('../public')
)

server.listen(3009)
