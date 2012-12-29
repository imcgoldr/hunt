function pd( func ) {
  return function( event ) {
    event.preventDefault()
    func && func(event)
  }
}

document.ontouchmove = pd()

_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g,
  escape:      /\{\{-(.+?)\}\}/g,
  evaluate:    /\{\{=(.+?)\}\}/g
};

var browser = {
	android: /Android/.test(navigator.userAgent)
}
browser.iphone = !browser.android

var app = {
  model: {},
  view: {}
}

var bb = {
  model: {},
  view: {}
}

//var server = 'http://127.0.0.1'
//var server = 'http://192.168.1.3'
//var server = 'http://192.168.1.36'
var server = 'http://184.72.57.180'  // AWS Server
var AWS_BUCKET = 'https://s3-eu-west-1.amazonaws.com/ian-filestore/'

var image = null
var imagedata = null

bb.init = function() {

  var scrollContent = {
    scroll: function() {
      var self = this
      setTimeout( function() {
        if( self.scroller ) {
          self.scroller.refresh()
        }
        else {
		  self.scroller = new iScroll( $('#qscroller')[0] )
        }
      },1)
    }
  }
  
  var myRouter = Backbone.Router.extend({
    routes : {
	  '': 'showRegistration',
	  'questions': 'showQuestions',
	  'question': 'showQuestion',
	  'photo': 'showPhoto',
	  'participants': 'showParticipants'
	},
	showQuestions : function() {
		console.log('myRouter:showQuestions')
		$('div#question').hide()
		$('div#photo').hide()
		$('div#registration').hide()
		$('div#participants').hide()
		$('div#questions').show()
	},
	showQuestion : function() {
		console.log('myRouter:showQuestion')
		$('div#photo').hide()
		$('div#questions').hide()
		$('div#registration').hide()
		$('div#participants').hide()
		$('div#question').show()
	},
	showPhoto : function() {
		console.log('myRouter:showPhoto')
		$('div#questions').hide()
		$('div#question').hide()
		$('div#registration').hide()
		$('div#participants').hide()
		$('div#photo').show()
	},
	showRegistration : function() {
		console.log('myRouter:showRegistration')
		$('div#questions').hide()
		$('div#question').hide()
		$('div#photo').hide()
		$('div#participants').hide()
		$('div#registration').show()
	},
	showParticipants : function() {
		console.log('myRouter:showParticipants')
		$('div#questions').hide()
		$('div#question').hide()
		$('div#photo').hide()
		$('div#registration').hide()
		$('div#participants').show()
	}
  });
  // As per bb documentation need to create a router and call history.start()
  bb.router = new myRouter()
  Backbone.history.start()

  bb.model.Participant = Backbone.Model.extend(_.extend({
    urlRoot: server+'/api/participant',
    defaults: {
	  id: null,
	  userName:'',
	  email:'',
	  huntCode:'',
	  numLocated: 0,
	  numCorrect: 0,
	  photo:false
	},

	initialize: function(){
	  console.log('model.Participant:initialize:begin')
	  var self = this
	  _.bindAll(self)
	  var savedParticipant = localStorage.getItem('hunt_participant_id')
	  self.set({id:savedParticipant})
	  console.log('model.Participant:initialize:end')
	}
  }))
  
  bb.model.Participants = Backbone.Collection.extend(_.extend({
    model: bb.model.Participant,
	url: server+'/api/participant',

	initialize: function(){
	  console.log('model.Participants:initialize:begin')
	  var self = this
	  _.bindAll(self)
	  console.log('model.Participants:initialize:end')
	}
  }))

  bb.model.Question = Backbone.Model.extend(_.extend({
    defaults: {
	  correct:false,
	  located:false,
	  summary: '',
	  question:'',
	  answer:'',
	  guess:'',
	  latitude: null,
	  longitude: null,
	  number:0,
	  participantID: null
	},

	initialize: function(){
	  console.log('model.Question:initialize:begin')
	  var self = this
	  _.bindAll(self)
	  console.log('model.Question:initialize:end')
	}
  }))

  bb.model.Questions = Backbone.Collection.extend(_.extend({
    model: bb.model.Question,
	url: server+'/api/question',

	initialize: function(){
	  console.log('model.Questions:initialize:begin')
	  var self = this
	  _.bindAll(self)
	  console.log('model.Questions:initialize:end')
	},

    addquestion: function(question, participantID){
	  console.log('model.Questions:addquestion:begin')
      var self = this
      var q = new bb.model.Question({
	    summary:question.summary,
		question:question.question,
		latitude:question.latitude,
		longitude:question.longitude,
		answer:question.answer,
		number:question.number,
		participantID: participantID
		})
      self.add(q)
	  q.save()
	  console.log('model.Questions:addquestion:end')
    }
  }))

  bb.view.QuestionListEntry = Backbone.View.extend(_.extend({  
	events: {
	  'touchend .summary': 'showQuestion',
	  'click .summary': 'showQuestion'
    },
	initialize: function(){
	  console.log('view.QuestionListEntry:initialize:begin')
	  var self = this
	  _.bindAll(self)
	  self.render()
	  self.model.on('change:correct change:located', self.mark)
	  console.log('view.QuestionListEntry:initialize:end')
	},
	
	render: function() {
	  console.log('view.QuestionListEntry:render:begin')
	  var self = this
	  var html = self.tm.entry( self.model.toJSON() )
	  self.$el.append(html)
	  self.mark()
  	  console.log('view.QuestionListEntry:render:end')
	},
	
	mark: function(){
	  var self = this
	  self.$el.find('span#correct').html( self.model.attributes.correct ? '&#10003;' : 'X' ).removeClass('complete incomplete').addClass( self.model.attributes.correct ? 'complete' : 'incomplete' )
	  self.$el.find('span#located').html( self.model.attributes.located ? '&#10003;' : 'X' ).removeClass('complete incomplete').addClass( self.model.attributes.located ? 'complete' : 'incomplete' )
	},
	
	showQuestion: function() {
	  console.log('view.QuestionListEntry:showQuestion:begin')
	  var self = this
	  console.log('showing question for '+self.model.attributes.summary)
	  app.position.coords = {longitude:null, latitude:null}
	  if (!self.model.attributes.located) {
	    // Grab position
	    navigator.geolocation.getCurrentPosition(
          function(position){
		    console.log('view.QuestionListEntry:showQuestion:position located')
	        app.position = position
		    app.view.question.render()
          },
          function(error){
	        console.log('view.QuestionListEntry:showQuestion:could not locate position')
		    app.position.coords.latitude = null
		    app.position.coords.longitude = null
		    app.view.question.render()
          }
        )
	  }
	  // Set the model for question based on the entry tapped
	  app.model.question.set({
	    summary: self.model.attributes.summary,
	    question: self.model.attributes.question,
	    answer: self.model.attributes.answer,
	    guess: self.model.attributes.guess,
	    latitude: self.model.attributes.latitude,
	    longitude: self.model.attributes.longitude,
		located: self.model.attributes.located,
	    number: self.model.attributes.number
		})
      bb.router.navigate('question',{trigger:true})
	  console.log('view.QuestionListEntry:showQuestion:end')
	  return false
	}
  }, {
    tm: {
	  entry: _.template($('#questionlist').html() ) 
	}
  
  }))
  
  bb.view.Questions = Backbone.View.extend(_.extend({    
    initialize: function(questions) {
	  console.log('view.Questions:initialize:begin')
      var self = this
      _.bindAll(self)

      self.setElement('#questions')
	  self.elements = {
		numQuestions: self.$el.find('#numQuestions'),
		numAnswered: self.$el.find('#numAnswered'),
		numLocated: self.$el.find('#numLocated'),
		goParticipants: self.$el.find('#goParticipants'),
		leaveHunt: self.$el.find('#leaveHunt')
	  }
	  self.elements.goParticipants.tap(self.goParticipants)
	  self.elements.leaveHunt.tap(self.leaveHunt)
	  self.questions = questions
	  self.questions.on('reset', self.render)
	  app.model.participant.on('change:numCorrect change:numLocated', self.header)
	  
	  console.log('view.Questions:initialize:end')
    },

    render: function() {
	  console.log('view.Questions:render:begin')
      var self = this
	  self.setElement('#questionlist')
      self.$el.empty()
	  self.questions.each( function(question) {
		self.addquestion(question)
      })
	  self.header()
	  console.log('view.Questions:render:end')
    },
	
	header:function(){
	  console.log('view.Questions:header:begin')
      var self = this
	  self.elements.numQuestions.html(app.model.questions.length)
      self.elements.numAnswered.html(app.model.participant.get('numCorrect'))
      self.elements.numLocated.html(app.model.participant.get('numLocated'))
	  console.log('view.Questions:header:end')
	},

	addquestion:function(question){
	  console.log('view.Questions:addquestion:begin')
      var self = this
      var questionview = new bb.view.QuestionListEntry({model:question})
	  self.$el.append(questionview.el)
	  self.scroll()
	  console.log('view.Questions:addquestion:end')
	},

    goParticipants: function() {
	  console.log('view.Questions:goParticipants:begin')
	  var self = this
	  app.view.participants.render()
      bb.router.navigate('participants',{trigger:true})
      console.log('view.Questions:goParticipants:end')
	  return false
	},
	
    leaveHunt: function() {
	  console.log('view.Questions:leaveHunt:begin')
	  var self = this
	  app.model.questions.reset()
	  app.model.participant.destroy()
	  app.model.participant.set({id:null, userName:null, mail:null, huntCode:null})
	  localStorage.removeItem('hunt_participant_id')
	  app.view.registration.render()
	  bb.router.navigate('',{trigger:true})
      console.log('view.Questions:leaveHunt:end')
	  return false
	}
  }, scrollContent))
  
  bb.view.Question = Backbone.View.extend(_.extend({
	events: {
	  'tap #saveAnswer': 'saveAnswer',
	  'tap #questionback': 'returnToList'
    },
	initialize: function(question){
	  console.log('view.Question:initialize:begin')
	  var self = this
	  _.bindAll(self)
	  self.setElement('#question')
	  self.question = question
	  self.elements = {
		summary: self.$el.find('#summary'),
		questiontext: self.$el.find('#questiontext'),
		guess: self.$el.find('#guess'),
		guesslatitude: self.$el.find('#guesslatitude'),
		guesslongitude: self.$el.find('#guesslongitude')
	  }
	  self.render()
	  self.question.on('change', self.render)
	  console.log('view.Question:initialize:end')
	},
	
	render: function() {
	  console.log('view.Question:render:begin')
	  var self = this
	  self.elements.summary.html(self.question.attributes.summary)
	  self.elements.questiontext.html(self.question.attributes.question)
	  self.elements.guess.val(self.question.attributes.guess)
	  if (self.question.attributes.located) {
	    self.elements.guesslatitude.html(self.question.attributes.latitude)
	    self.elements.guesslongitude.html(self.question.attributes.longitude)
	  }
	  else {
	    self.elements.guesslatitude.html(app.position.coords.latitude)
	    self.elements.guesslongitude.html(app.position.coords.longitude)
	  }
  	  $( "div[data-role=page]" ).page()
  	  console.log('view.Question:render:end')
	},
	
	saveAnswer: function() {
	  console.log('view.Question:saveAnswer:begin')
	  var self = this
	  console.log('saving question for '+self.question.attributes.summary)
	  var correct = self.question.attributes.answer === self.elements.guess.val()
	  correct ? navigator.notification.beep(1) : navigator.notification.vibrate(1000)
	  // Handle the location
	  console.log('latitude:'+app.position.coords.latitude+' longitude:'+app.position.coords.longitude)
	  var located = true
	  if (!self.question.attributes.located) {
		// Use Spherical Law of Cosines to determine distance between 2 locations - see http://www.movable-type.co.uk/scripts/latlong.html
	    var R = 6371; // km
		var lat1 = self.question.attributes.latitude * Math.PI / 180
		var lat2 = app.position.coords.latitude * Math.PI / 180
		var lon1 = self.question.attributes.longitude * Math.PI / 180
		var lon2 = app.position.coords.longitude * Math.PI / 180
	    var d = Math.acos(Math.sin(lat1)*Math.sin(lat2) + Math.cos(lat1)*Math.cos(lat2) * Math.cos(lon2-lon1)) * R;
		console.log('computed distance is '+d*1000+'m')
		located = (d*1000 < 30)
	  }
	  app.model.questions.at(self.question.attributes.number).set({guess:self.elements.guess.val(), correct:correct, located:located}).save()
	  app.model.participant.set({numCorrect: app.model.questions.where({correct:true}).length, numLocated: app.model.questions.where({located:true}).length}).save()

      bb.router.navigate('questions',{trigger:true})
	  console.log('view.Question:saveAnswer:end')
	  return false
	},
	
	returnToList: function() {
	  console.log('view.Question:returntoList:begin')
	  var self = this
      bb.router.navigate('questions',{trigger:true})
	  console.log('view.Question:returntoList:end')
	  return false
	}

  }))
  
  bb.view.Photo = Backbone.View.extend(_.extend({
	events: {
	  'tap #photoBack': 'returnToList'
    },
	initialize: function(){
	  console.log('view.Photo:initialize:begin')
	  var self = this
	  _.bindAll(self)
	  self.setElement('#photo')
	  self.elements = {
		photoImage: self.$el.find('#photoImage'),
		takePhoto: self.$el.find('#takePhoto')
	  }
	  // Code for photo capture and uploade taken from lecture notes and course book
	  self.elements.takePhoto.tap(function(){
		navigator.camera.getPicture(
          function success(base64) {
            imagedata = base64
            self.elements.photoImage.attr({src:"data:image/jpeg;base64,"+imagedata})
			console.log('Uploading...')
            var padI = imagedata.length-1
            while('=' == imagedata[padI]){
    	      padI--
            }
            var padding = imagedata.length - padI -1
            $.ajax({
                url:server+':3009/api/upload/'+app.model.participant.id, 
                type:'POST',
                contentType:'application/octet-stream',
                data:imagedata, 
                headers: {'X-Lifestream-Padding':''+padding},
                success:function(){
                  console.log('Picture uploaded.')
				  app.model.participant.set({photo: true}).save()
                },
                error:function(err){
                  console.log(err)
                  console.log('Could not upload picture')
                },
            })
          }, 
          function failure(){
            console.log('Could not take picture')
          },
          { quality: 50 ,destinationType: Camera.DestinationType.DATA_URL}
        ) 
      })
	  console.log('view.Photo:initialize:end')
	},
	
	render: function() {
	  console.log('view.Photo:render:begin')
	  var self = this
	  if (image) {
	    console.log('showing image '+image)
		self.elements.photoImage.attr('src', image)
	  }
  	  console.log('view.Photo:render:end')
	},
	
	returnToList: function() {
	  console.log('view.Photo:returntoList:begin')
	  var self = this
	  app.view.participants.render()
      bb.router.navigate('participants',{trigger:true})
	  console.log('view.Photo:returntoList:end')
	  return false
	}
  }))

  bb.view.Registration = Backbone.View.extend(_.extend({
	events: {
	  'tap #register': 'register'
    },
	initialize: function(){
	  console.log('view.Registration:initialize:begin')
	  var self = this
	  _.bindAll(self)
	  self.setElement('#registration')
	  self.elements = {
		huntCode: self.$el.find('#huntCode'),
		userName: self.$el.find('#userName'),
		email: self.$el.find('#email')
	  }
	  console.log('view.Registration:initialize:end')
	},
	
	render: function() {
	  console.log('view.Registration:render:begin')
	  var self = this
	  self.elements.userName.val('')
	  self.elements.email.val('')
	  self.elements.huntCode.selectmenu()
	  console.log('loading hunts from server')
	  var hunts = ''
      $.get(server+'/api/hunt',
        function(data,status){
		  for (var i=0; i<data.length; i++){
	        console.log('Adding hunt from server: '+data[i].huntCode)
			hunts += '<option value="'+data[i].huntCode+'">'+data[i].huntName+'</option>'
	      }
		  self.elements.huntCode.html(hunts)
	      self.elements.huntCode.selectmenu("refresh")
	    },
		'json'
	  )
  	  console.log('view.Registration:render:end')
	},
	
	register: function() {
	  console.log('view.Question:register:begin')
	  var self = this
	  // Create a new participant, register on server and create questions
	  app.model.participant.set({userName:self.elements.userName.val(), huntCode: self.elements.huntCode.val(), email: self.elements.email.val()})
	  app.model.participant.save(
	    {},
	    {
		success: function(model, response){
		  console.log('setting LS with'+model.id)
	      localStorage.setItem('hunt_participant_id',model.id)
		  // now create a specific set of questions for this participant
		  console.log('creating questions for'+model.id)
		  $.get(server+'/api/question?huntCode='+self.elements.huntCode.val(),
          function(data,status){
		    for (var i=0; i<data.length; i++){
	          console.log('Adding question from server: '+data[i].summary)
	          app.model.questions.addquestion(data[i], model.id)
	        }
		    app.view.questions.render()
	        bb.router.navigate('questions',{trigger:true})
	      }, 'json')
		},
        error: function (model, response) {
          console.log("error saving new participant")
		}
        }
	  )
	  console.log('view.Question:register:end')
	  return false
	}
  }))
  
  bb.view.ParticipantListEntry = Backbone.View.extend(_.extend({
	events: {
	  'touchend #showPhoto': 'showPhoto',
	  'click #showPhoto': 'showPhoto'
    },
	initialize: function(){
	  console.log('view.ParticipantListEntry:initialize:begin')
	  var self = this
	  _.bindAll(self)
	  self.render()
	  console.log('view.ParticipantListEntry:initialize:end')
	},
	
	render: function() {
	  console.log('view.ParticipantListEntry:render:begin')
	  var self = this
	  var html = self.tm.entry( {userName: self.model.userName, numCorrect: self.model.numCorrect, numLocated: self.model.numLocated})
	  self.$el.append(html)
	  self.$el.find('#showPhoto').hide()
	  if (self.model.photo){
	    self.$el.find('#showPhoto').show()
	  }
  	  console.log('view.ParticipantListEntry:render:end')
	},
	
	showPhoto: function() {
	  console.log('view.ParticipantListEntry:showPhoto:begin')
	  var self = this
	  image = null
	  if (self.model.photo){
	    console.log('showing photo for '+self.model.id)
		image = AWS_BUCKET+self.model.id+'.jpg'
		app.view.photo.render()
		bb.router.navigate('photo',{trigger:true})
	  }
	  console.log('view.ParticipantListEntry:showPhoto:end')
	  return false
	}
  }, {
    tm: {
	  entry: _.template($('#participantlist').html() ) 
	}
  
  }))

  bb.view.Participants = Backbone.View.extend(_.extend({
    initialize: function() {
	  console.log('view.Participants:initialize:begin')
      var self = this
      _.bindAll(self)

      self.setElement('#participants')
	  self.elements = {
		goPhoto: self.$el.find('#goPhoto'),
		back: self.$el.find('#participantsBack')
	  }
	  self.elements.goPhoto.tap(self.showPhoto)
	  self.elements.back.tap(self.returnToList)
	  self.scroller = new iScroll($('#pscroller')[0])
	  console.log('view.Participants:initialize:end')
    },

    render: function() {
	  console.log('view.Participants:render:begin')
      var self = this
	  self.setElement('#participantlist')
      self.$el.empty()
	  console.log('loading participants from server')
      $.get(server+'/api/participant?huntCode='+app.model.participant.attributes.huntCode,
        function(data,status){
		  for (var i=0; i<data.length; i++){
	        console.log('Adding participant from server: '+data[i].userName)
	        self.addParticipant(data[i])
	      }
	    },
		'json'
	  )
  	  setTimeout(function(){self.scroller.refresh()}, 300)

	  console.log('view.Participants:render:end')
    },
	
	addParticipant:function(participant){
	  console.log('view.Participants:addParticipant:begin')
      var self = this
      var participantview = new bb.view.ParticipantListEntry({model:participant})
	  self.$el.append(participantview.el)
	  //self.scroll()
	  console.log('view.Participants:addParticipant:end')
	},

    showPhoto: function() {
	  console.log('view.Participants:goPhoto:begin')
	  var self = this
	  image = null
	  app.view.photo.render()
	  bb.router.navigate('photo',{trigger:true})
      console.log('view.Participants:goPhoto:end')
	  return false
	},
	
	returnToList: function() {
	  console.log('view.Participants:returnToListbegin')
	  var self = this
      bb.router.navigate('questions',{trigger:true})
	  console.log('view.Participants:returntoList:end')
	  return false
	}

  }))

  
}

app.init_browser = function() {
	if (browser.android) {
		$("div[data-role='content']").css({bottom:0})
	}
}

app.init = function() {
  console.log('start init')
  app.position = {}
  app.position.coords = {longitude:null, latitude:null}

  bb.init()
  app.init_browser()
  
  app.model.questions = new bb.model.Questions()
  app.model.participant = new bb.model.Participant()
  
  app.view.questions = new bb.view.Questions(app.model.questions)
  
  app.view.participants = new bb.view.Participants()
  
  app.model.question = new bb.model.Question()
  app.view.question = new bb.view.Question(app.model.question)
  
  app.view.photo = new bb.view.Photo()
  app.view.registration = new bb.view.Registration()
  app.view.registration.render()

  if (app.model.participant.attributes.id) {
    app.model.participant.fetch({
	  success: function(){
	    console.log('got the participant details from server')
		app.model.questions.fetch({
		  data: {participantID: app.model.participant.attributes.id},
		  success: function(){
		    app.view.questions.render()
	        bb.router.navigate('questions',{trigger:true})
		  },
		  error: function(){
	        console.log('did not get the participant questions from the server')
		    app.model.participant.set({id:null})
			localStorage.removeItem('hunt_participant_id')
		  }
		})
	  },
	  error: function(){
	    console.log('did not get the participant details from the server')
		app.model.participant.set({id:null})
		localStorage.removeItem('hunt_participant_id')
	  }
	})
  }
  console.log('end init')
}

$(app.init)