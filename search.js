var level = require('./level')
var intersect = require('sorted-intersect-stream')
var tokenize = require('./tokenize')

var db = level('index')

module.exports = search

function search (keywords) {
  var tokens = tokenize(keywords)

  var stream = tokens
  .map(function (token) {
    return db.createReadStream({valueEncoding: 'json', gte: token + '~', lt: token + '~~'})
  })
  .reduce(function (a, b) {
    return intersect(a, b, keyify)
  })

  function keyify (data) {
    return data.key.slice(data.key.lastIndexOf('~') + 1)
  }

  return stream
}
