var assert = require('assert'),
    chai = require('chai'),
    sinon = require('sinon'),
    mockrequire = require('mock-require'),
    expect = chai.expect;

// Start - Mocking request
var response = {statusCode: 200, body: ""};
var request = {
  get: function (url, callback) { 
    callback(null, response, response.body);
  }
};
mockrequire('request', request);
// End - Mocking Request

var crawl = require('../../src/server/crawl.js');

var htmlTest = '<body><a href="http://myurl">link</a>';
htmlTest += '<a href="http://another">link</a></body>';

var htmlTest2 = '<body><a href="http://myurl2">link</a>';
htmlTest2 += '<a href="http://another2">link</a></body>';

var noHrefLinks = '<body><a>link</a>';
var relativeLinks = '<body><a href="/relative/path">link</a>';

var requestTest = '<body><a href="http://myurl.com">link</a>';

describe('Crawler', function() {
  describe('parse', function () {
    it('should return a list of links', function () {
        var result = crawl.parse(htmlTest);
        expect(result[0]).to.equal('http://myurl');
        expect(result[1]).to.equal('http://another');
    });

    it('should not return links with no href', function () {
        var result = crawl.parse(noHrefLinks);
        expect(result).to.be.empty;
    });

    it('should not return relative links', function () {
        var result = crawl.parse(relativeLinks);
        expect(result).to.be.empty;
    });
  });

  describe('getLinks', function(){
    it('should return a list of links', function (done) {
      response.statusCode = 200;
      response.body = htmlTest;
      crawl.getLinks(['http://whatever.com/'], function (res, error) {
        expect(error).to.be.null;  
        expect(res).to.eql(['http://myurl','http://another']);  
        done();
      });
    });

    it('should callback with message cant request', function (done) {
      response.statusCode = 400;
      crawl.getLinks(['http://apple.com/'], function (res, error) {
        expect(error).to.have.a.property('message');  
        done();
      });
    });
    
    it('should request the url and parse the body', function (done) {
      response.statusCode = 200;
      crawl.getLinks(['http://google.com/'], function(){});
      crawl.getLinks(['http://google.com/'], function (res, error) {
        expect(error).to.have.a.property('message', 'Duplicated!');  
        done();
      });
    });
  });
  
  describe('getMultipleLinks', function(){
    it('should return a list of links', function (done) {
      var firstURL = 'http://yahoo.com';
      var secondURL = 'http://verizon.com';
      response.statusCode = 200;
      
      var stub = sinon.stub(request, 'get');
      stub.withArgs(firstURL).callsArgWith(1, null, response, htmlTest);
      stub.withArgs(secondURL).callsArgWith(1, null, response, htmlTest2);

      crawl.getMultipleLinks([firstURL, secondURL], function (res, error) {
        expect(error).to.be.null;
        expect(res).to.eql(['http://myurl','http://another','http://myurl2','http://another2']);  
        done();
      });
    });
  });
  
  describe('crawl', function(){
    it('recursevely call itself to find links until there is no links', function (done) {
        crawl.init();

        var stub = sinon.stub(crawl, 'getMultipleLinks');
        stub.onCall(0).callsArgWith(1, [1, 2]);
        stub.onCall(1).callsArgWith(1, [3, 4]);
        stub.callsArgWith(1, []);

        crawl.crawl('anyurl', function (result) {
          expect(result).to.eql([1,2,3,4]);
          stub.restore();
          done();
        });
    });

    it('or until it reaches the default limit', function (done) {
        crawl.init();

        var stub = sinon.stub(crawl, 'getMultipleLinks');
        stub.onCall(0).callsArgWith(1, [1, 2]);
        stub.onCall(1).callsArgWith(1, [3, 4]);
        stub.onCall(2).callsArgWith(1, [5, 6]);
        stub.onCall(3).callsArgWith(1, [7, 8]);

        crawl.crawl('anyurl', function (result) {
          expect(result).to.eql([1,2,3,4,5,6]);
          stub.restore();
          done();
        });
    });
    
    it('or until it reaches the defined limit', function (done) {
        crawl.init(1);

        var stub = sinon.stub(crawl, 'getMultipleLinks');
        stub.onCall(0).callsArgWith(1, [1, 2]);
        stub.onCall(1).callsArgWith(1, [3, 4]);
        stub.onCall(2).callsArgWith(1, [5, 6]);

        crawl.crawl('anyurl', function (result) {
          expect(result).to.eql([1,2,3,4]);
          stub.restore();
          done();
        });
    });
  });

});
