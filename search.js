var level = require('./level')
var intersect = require('sorted-intersect-stream')
var tokenize = require('./tokenize')
var stream = require('stream-wrapper')
var pump = require('pump')
var indexdb = level('index')
var issuesdb = level('issues')

module.exports = search

function search (keywords) {
  var tokens = tokenize(keywords)
  var filter = tokens
  .map(function (token) {
    return indexdb.createReadStream({gte: token + '~', lt: token + '~~'})
  })
  .reduce(function (a, b) {
    return intersect(a, b, keyify)
  })

  function keyify (data) {
    return data.key.slice(data.key.lastIndexOf('~') + 1)
  }

  var getIssues = stream.transform({objectMode: true}, function (row, enc, cb) {
    issuesdb.get(row.value, function (err, issue) {
      if (err) return cb() // skip not founds
      cb(err, JSON.parse(issue))
    })
  })

  return pump(
    filter,
    getIssues
  )
}

if (require.main === module) {
  console.log('search')
  search('learnyounode').on('data', function (d) {
    console.log(d)
  })
}
