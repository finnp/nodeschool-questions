var db = require('./db')
var intersect = require('sorted-intersect-stream')
var tokenize = require('./tokenize')
var stream = require('stream-wrapper')
var pump = require('pump')

var indexdb = db('index')
var issuesdb = db('issues')

module.exports = search

function search (keywords, limit) {
  var tokens = tokenize(keywords)
  limit = limit || 10
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
    getIssues,
    take(limit)
  )
}

function take (limit) {
  return stream.transform({objectMode: true}, write)

  function write (obj, enc, next) {
    if (limit) this.push(obj)
    else {
      this.push(null)
      process.nextTick(this.destroy.bind(this))
    }
    limit--
    next()
  }
}

if (require.main === module) {
  console.log('search')
  search('learnyounode').on('data', function (d) {
    console.log(d)
  })
}
