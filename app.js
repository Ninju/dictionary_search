'use strict';

var express = require('express');
var app = express();
var debug = require('debug');
var serverDebug = debug('server');
var bodyParser = require('body-parser');
var _ = require('lodash');
var storage = require('node-persist');

storage.initSync();

app.use(bodyParser.json({ "limit" : "100mb" }));

var dictionaryStoreKey = 'dictionaryStore';
var dictionary = {} || storage.getItem(dictionaryStoreKey);

var getDictionary = function() {
  return dictionary;
}

var setDictionary = function(dict, wordList) {
  _.forEach(_.uniq(_.map(wordList, function(str) { return str.toLowerCase(); })).sort(), function(term) {
    insertTermIntoDictionary(term, dict);
  });

  storage.setItem(dictionaryStoreKey, dict);
}

var insertTermIntoDictionary = function(term, dict) {
  var firstChar = term[0];

  if (!firstChar) {
    return;
  }

  dict[firstChar] = dict[firstChar] || [];
  dict[firstChar].push(term);
}

var searchDictionary = function(dict, prefix) {
  var results = [];
  var matchFound = false;
  var firstChar = prefix[0];
  var wordList = dict[firstChar] || [];

  for (var i = 0; i < wordList.length; i++) {
    var word = wordList[i];

    if (isPrefixOfString(prefix, word)) {
      matchFound = true;
      results.push(word);
    } else if (matchFound) {
      return results;
    }
  }

  return results;
}

var isPrefixOfString = function(prefix, str) {
  return prefix == str.substr(0, prefix.length);
}

var respondToInvalidData = function(res) {
  res.status(422).end();
}

app.post('/dictionary', function(req, res) {
  dictionary = {};
  
  try {

    serverDebug("building dictionary");
    var wordList = req.body;
    setDictionary(dictionary, wordList);
    serverDebug("dictionary saved");

    res.status(200).end();
  } catch(err) {
    respondToInvalidData(res);
  } 
});

app.get('/search/:term?', function(req, res) {
  var term = req.params.term;

  try {
    var resultOfSearch = searchDictionary(dictionary, term);
    res.json(resultOfSearch);
  } catch(err) {
    respondToInvalidData(res);
  }
});

var portNumber = 8000;

app.listen(portNumber, function() {
  serverDebug("Listening on port " + portNumber);
});
