var cheerio = require('cheerio');
var request  = require('request');

var limit = 3;
var duplicatedUrls = {};

function getCrawl () {

  var scope = {};
  scope.parse = function(body) {
      var link_list = [];
      var $ = cheerio.load(body);
  
      //getting links on the page
      var links = $('a');
      links.map(function(index, link) {
          var href = link.attribs.href;
          if (href && href.startsWith("http"))
              link_list.push(href);
      });
  
      // get the links parameter href and add to the lis
      return link_list;
  }
  
  function isDuplicated(url) {
      if (duplicatedUrls[url]) {
         //console.log("Duplication: " + url);
         return true; 
      }
  
      //adding to the list
      duplicatedUrls[url] = true;
      return false;
  }
  
  scope.getLinks = function (url, callback) {
  
      if (isDuplicated(url)){
         callback(null, {message: "Duplicated!"});
         return;
      } 
  
      request.get(url, function (error, response, body) {
          if (error == null && response && response.statusCode == 200) {
              var list_links = scope.parse(body);
              callback(list_links, null);
          } else if (response.statusCode >= 400) {
              callback(null, {message: "Nop!"});
          } else if (error != null) {
              callback(null, error);
          } else {
              callback(null, {error: "weird!!"});
          }
      });
  };
  
  scope.init = function (limit) {
    scope.limit = limit || 2;
    scope.resulting_urls = [];
  }
  
  scope.crawl = function (url, callback) {
      var input = (typeof url === "string") ? [url] : url;
      scope.getMultipleLinks(input, function (links, error) {
          
          if (error) console.log("Error: " + error.message);
          scope.resulting_urls = scope.resulting_urls.concat(links);
          
          if (links.length > 0 && scope.limit > 0) {
              scope.limit--;
              scope.crawl(links, callback);
          } else {
              callback(scope.resulting_urls);
          } 
  
      });
  };
  
  scope.getMultipleLinks = function (urlArray, callback) {
     var counter = urlArray.length;
     var result = [];
     urlArray.forEach(function (item, index, array) {
       scope.getLinks(item, function (links, error) {
         counter--;
         
         if (error == null) 
             result = result.concat(links);
         
         if (counter == 0)
             callback(result, error);
      });
    });
  };

  return scope;
}

module.exports = getCrawl();

//module.exports.crawl('http://apple.com');
