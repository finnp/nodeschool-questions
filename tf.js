var level = require('level')
var sublevel = require('level-spaces')
var tokenize = require('./lib/tokenize')
var concat = require('concat-stream')
var pump = require('pump')
var search = require('./lib/fuzzy')
var Transform = require('stream').Transform

var db = level(__dirname + '/db')
var issuesdb = sublevel(db, 'issues')
var indexdb = sublevel(db, 'index')

var nDocuments = 0

var tokenizer = new Transform({
  objectMode: true,
  transform: function (data, encoding, callback) {
    this.push(tokenize(data.title + ' ' + data.body))
    nDocuments++
    callback(null)
  }
})

calculateOverallTermFrequency(function (err, overalltf) {
  if (err) return console.error(err)
  issuesdb.createValueStream({valueEncoding: 'json'})
    .on('data', function (data) {
      var tokens = tokenize(data.title + ' ' + data.body)
      var result = tokens
        .filter(function (token) {
          return overalltf[token] > 1 // TODO:assuming the issue is already in the database
          // return !!overalltf[token]
        })
        .map(function (token) {
          return [token, Math.log(nDocuments / overalltf[token])]
        })
        .sort(function (a, b) {
          return a[1] < b[1]
        })
      if (!result[0]) return
      var keywords = result.slice(0, 8)
        .map(function (token) {
          if (token) return token[0]
        })
      search(indexdb, issuesdb, keywords, 5, function (err, result) {
        if (err) return console.error(err)
        var list = result.map(function (issue) {
          return issue.number
        })
        if (list.length > 1) console.log(keywords, data.number, '->', list.join())
        else console.log('skip', keywords)
      })
    })
})

function calculateOverallTermFrequency (cb) {
  pump(
    issuesdb.createValueStream({valueEncoding: 'json'}),
    tokenizer,
    concat(function (whole) {
      cb(null, countValues(whole))
    })
  )
}

function countValues (tokens) {
  var termFrequencies = {}
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]
    if (termFrequencies[token]) {
      termFrequencies[token]++
    } else {
      termFrequencies[token] = 1
    }
  }
  return termFrequencies
}
