/*

TODO

- Check can load questions from absolute path... will need to in phonegap
- Get it working on Amazon
- Add FB login (use FB client side then failing that book p253... lab11 doesn't help :( )
- Add picture capability (inc S3 upload?) - lab09 has backbone with phonegap... hopefully just copy it :)
- Add mailing of notification to service owner when a hunt is downloaded
- Change scroller setup to be same as tab example from lab09
- Try and use http object in util.js of lab 11 social example util.js, instead of $.get...?
- Keep summary of questions answered / located in footer
- Add display of a map to the question page (where are we?)
- Add the ability to delete the hunt from the device (therefore enable loading of a new one)
- Add the ability to choose which hunt to load
- Need to tidy up setting of coords when position is not found

*/

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

var server = 'http://192.168.1.3'
// var server = 'http://184.72.57.180'

bb.init = function() {

  var scrollContent = {
    scroll: function() {
      var self = this
      setTimeout( function() {
        if( self.scroller ) {
          self.scroller.refresh()
        }
        else {
		  self.scroller = new iScroll( $('#scroller')[0] )
        }
      },1)
    }
  }
  
  var myRouter = Backbone.Router.extend({
    routes : {
	  '': 'showQuestions',
	  'question': 'showQuestion',
	  'photo': 'showPhoto',
	  'registration': 'showRegistration'
	},
	showQuestions : function() {
		console.log('myRouter:showQuestions')
		$('div#question').hide()
		$('div#photo').hide()
		$('div#registration').hide()
		$('div#questions').show()
	},
	showQuestion : function() {
		console.log('myRouter:showQuestion')
		$('div#photo').hide()
		$('div#questions').hide()
		$('div#registration').hide()
		$('div#question').show()
	},
	showPhoto : function() {
		console.log('myRouter:showPhoto')
		$('div#questions').hide()
		$('div#question').hide()
		$('div#registration').hide()
		$('div#photo').show()
	},
	showRegistration : function() {
		console.log('myRouter:showRegistration')
		$('div#questions').hide()
		$('div#question').hide()
		$('div#photo').hide()
		$('div#registration').show()
	}
  });
  // As per bb documentation need to create a router and call history.start()
  bb.router = new myRouter()
  Backbone.history.start()
  
  bb.model.State = Backbone.Model.extend({    
    defaults: {
      numQuestions: 0,
	  numLocated: 0,
	  numAnswered: 0,
	  huntNames: []
    },

	initialize: function(){
	  console.log('model.State:initialize:begin')
	  var self = this
	  _.bindAll(self)
	  console.log('model.State:initialize:end')
	}
  })
  
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
	  number:0
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
	localStorage: new Store("questions"),
	//url: '/api/questions',

	initialize: function(){
	  console.log('model.Questions:initialize:begin')
	  var self = this
	  _.bindAll(self)
	  console.log('model.Questions:initialize:end')
	},

    addquestion: function(question){
	  console.log('model.Questions:addquestion:begin')
      var self = this
      var q = new bb.model.Question({
	    summary:question.summary,
		question:question.question,
		latitude:question.latitude,
		longitude:question.longitude,
		answer:question.answer,
		number:question.number
		})
      self.add(q)
	  q.save()
	  console.log('model.Questions:addquestion:end')
    }
  }))

  bb.view.QuestionListEntry = Backbone.View.extend(_.extend({
	events: {
	  'click #questionlistentry': 'showQuestion'
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
		goPhoto: self.$el.find('#goPhoto')
	  }
	  self.elements.goPhoto.tap(self.showPhoto)
	  self.questions = questions
	  self.questions.on('add', self.addquestion)
	  self.questions.on('reset', self.render)
	  app.model.state.on('change:numQuestions change:numAnswered change:numLocated', self.footer)
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
	  self.footer()
	  console.log('view.Questions:render:end')
    },
	
	footer:function(){
	  console.log('view.Questions:footer:begin')
      var self = this
      self.elements.numQuestions.html(app.model.state.get('numQuestions'))
      self.elements.numAnswered.html(app.model.state.get('numAnswered'))
      self.elements.numLocated.html(app.model.state.get('numLocated'))
	  console.log('view.Questions:footer:end')
	},

	addquestion:function(question){
	  console.log('view.Questions:addquestion:begin')
      var self = this
      var questionview = new bb.view.QuestionListEntry({model:question})
	  self.$el.append(questionview.el)
	  self.scroll()
	  console.log('view.Questions:addquestion:end')
	},

    showPhoto: function() {
	  console.log('view.Questions:goPhoto:begin')
	  var self = this
	  console.log('going to photo')
	  bb.router.navigate('photo',{trigger:true})
      console.log('view.Questions:goPhoto:end')
	  return false
	}
  }, 
  scrollContent))
  
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
  	  console.log('view.Question:render:end')
	},
	
	saveAnswer: function() {
	  console.log('view.Question:saveAnswer:begin')
	  var self = this
	  console.log('saving question for '+self.question.attributes.summary)
	  var correct = self.question.attributes.answer === self.elements.guess.val()
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
	  app.model.state.set({numQuestions: app.model.questions.length, numAnswered: app.model.questions.where({correct:true}).length, numLocated: app.model.questions.where({located:true}).length})

      bb.router.navigate('',{trigger:true})
	  console.log('view.Question:saveAnswer:end')
	  return false
	},
	
	returnToList: function() {
	  console.log('view.Question:returntoList:begin')
	  var self = this
      bb.router.navigate('',{trigger:true})
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
	  self.elements.takePhoto.tap(function(){
		navigator.camera.getPicture(
		  function success(imageURI){
		    self.elements.photoImage.attr('src', imageURI)
		  },
		  function failure(message){
		    alert('failed with '+message)
		  },
		  {quality: 50, destinationType: Camera.DestinationType.FILE_URI}
		)
      })
	  console.log('view.Photo:initialize:end')
	},
	
	render: function() {
	  console.log('view.Photo:render:begin')
	  var self = this
  	  console.log('view.Photo:render:end')
	},
	
	returnToList: function() {
	  console.log('view.Question:returntoList:begin')
	  var self = this
      bb.router.navigate('',{trigger:true})
	  console.log('view.Question:returntoList:end')
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
		huntName: self.$el.find('#huntName')
	  }
	  
	  console.log('view.Registration:initialize:end')
	},
	
	render: function() {
	  console.log('view.Registration:render:begin')
	  var self = this
	  if (app.model.state.attributes.huntNames.length === 0){
	    console.log('loading hunts from server')
        $.get(server+'/api/hunt',
          function(data,status){
		    for (var i=0; i<data.length; i++){
	          console.log('Adding hunt from server: '+data[i].huntCode)
	          self.elements.huntName.addOption(data[i].huntCode, data[i].huntName)
	        }
	      },
		  'json')
	  }
  	  console.log('view.Registration:render:end')
	},
	
	register: function() {
	  console.log('view.Question:register:begin')
	  var self = this
	  alert('registering')
	  console.log('view.Question:register:end')
	  return false
	}
  }))
}

app.init_browser = function() {
	if (browser.android) {
		$("#questions div[data-role='content']").css({bottom:0})
	}
}

app.init = function() {
  console.log('start init')
  app.position = {}
  app.position.coords = {longitude:null, latitude:null}

  bb.init()
  app.init_browser()
  
  app.model.questions = new bb.model.Questions()
  app.model.state = new bb.model.State()
  
  app.view.questions = new bb.view.Questions(app.model.questions)
  app.view.questions.render()
  
  app.model.question = new bb.model.Question()
  app.view.question = new bb.view.Question(app.model.question)
  
  app.view.photo = new bb.view.Photo()
  app.view.registration = new bb.view.Registration()

  
  app.model.questions.fetch( {
    error: function() {
	  alert('error loading question from localstorage')
	}
  })
  app.model.state.set({numQuestions: app.model.questions.length, numAnswered: app.model.questions.where({correct:true}).length, numLocated: app.model.questions.where({located:true}).length})

  if (app.model.questions.length === 0){
    app.view.registration.render()
	bb.router.navigate('registration',{trigger:true})
  }
	    /*
		for (var i=0; i<4; i++){
	      app.model.questions.addquestion({
			summary:'question '+i,question:'What is '+i+'?',latitude: -46,
			longitude: 7.2,answer: 'answer',number:i})
	    }
		*/
		/*
		console.log('loading questions from server')
        $.get('http://192.168.1.3/api/questions',  // local machine
        //$.get('http://184.72.57.180/api/questions',  // AWS
          function(data,status){
		    for (var i=0; i<data.length; i++){
	          console.log('Adding question from server: '+data[i].summary)
	          app.model.questions.addquestion(data[i])
	        }
	      }, 'json')
		*/
  console.log('end init')
}

$(app.init)