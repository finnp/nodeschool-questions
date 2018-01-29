var intersect = require('sorted-intersect-stream')
var tokenize = require('./tokenize')
var stream = require('stream-wrapper')
var pump = require('pump')

module.exports = search

function search (indexdb, issuesdb, keywords, limit) {
  var tokens = keywords
  if (typeof keywords === 'string') keywords = tokenize(keywords)
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
