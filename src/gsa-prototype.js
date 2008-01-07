/*  gsa-prototype, version 0.0.1
 *  (c) 2008 Jesse Newland
 *  jnewland@gmail.com
 *
 *  gsa-prototype is freely distributable under the terms of an MIT-style license.
 *--------------------------------------------------------------------------*/

//Prototype and Scriptaculous' Builder are required
if(typeof Prototype == 'undefined')
   throw("prototype.js version > 1.6 is required");
if(typeof Builder == 'undefined')
    throw("script.aculo.us' builder.js library is required");

var Gsa = Class.create({

  initialize: function(domain, options) {

    //required options
    if (domain == null)
      throw("'domain' argument required");

    //default parameters for the request
    this.options = $H({
      output: 'xml_no_dtd',
      proxystylesheet: 'json'
    }).update(this.parseOptions(options));

    //set some properties based on the options
    this.domain = domain;
  },
  
  _request: function(url) {
    return this.request = new Json.Request(url);
  },
  
  _response: function () {
    return this.response = this.request.response;
  },
  
  search: function (q, options) {
    if (q == null || q.blank())
      return false;
    this.q = q;
    this.options.update(this.parseOptions(options));
    this._request(this.buildUri());
    return true;
  },
  
  parseOptions: function (options) {
    return $H(options);
  },
  
  buildUri: function () {
    var uriString = 'http://' + this.domain + '/search?' + this.options.toQueryString();
    return uriString;
  }
});

var Json = {
  activeRequestCount: 0,
  currentRequest: false
};

Json.Responders = {
  responders: [],
  
  _each: function(iterator) {
    this.responders._each(iterator);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },
  
  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },
  
  dispatch: function(callback, request, json) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, json]);
        } catch (e) { }
      }
    });
  }
};

Object.extend(Json.Responders, Enumerable);

Json.Responders.register({
  onCreate:   function() {
    Json.activeRequestCount++;
  }, 
  onComplete: function(request,json) {
    Json.activeRequestCount--;
    request.response = json;
  }
});

//Json.callback(JSON) is used to store the JSON
Object.extend(Json, {
  callback: function(json) {
    try {
      (Json.currentRequest.options.onComplete || Prototype.emptyFunction)(Json.currentRequest, json);
      Json.Responders.dispatch('onComplete', Json.currentRequest, json);
    } catch (e) {
      Json.currentRequest.dispatchException(e);
    }
  }
});

Json.Request = Class.create({
  initialize: function(url, options) {
    this.options = $H({
      //um, nothing yet
    }).update($H(options));
    Json.currentRequest = this;
    this.request(url);
  },

  request: function(url) {
    try {
      (this.options.onCreate || Prototype.emptyFunction)(this);
      Json.Responders.dispatch('onCreate', this);
      var head = $$('head')[0];                 
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = url+'&callback=Json.callback'+ '&timestamp=' + (new Date()).getTime();
      script.id = 'json_request';
      head.appendChild(script);
    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Json.Responders.dispatch('onException', this, exception);
  }
});