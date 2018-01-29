var merge = require('sorted-merge-stream')
var parallel = require('run-parallel')
var stream = require('stream-wrapper')
var sort = require('stream-sort')
var pump = require('pump')
var level = require('level')
var sublevel = require('level-spaces')

var db = level('/Users/finnpauls/projects/nodeschool-questions/db')
var indexdb = sublevel(db, 'index')
var issuesdb = sublevel(db, 'issues')

var tokens = ['learnyounode', 'exercise', '6']

var filter = tokens
  .map(function (token) {
    return indexdb.createReadStream({gte: token + '~', lt: token + '~~'})
  })
  .reduce(function (a, b) {
    return merge(a, b, keyify)
  })

var getTopResults = sort({ count: 4,
  compare: function (left, right) {
    var a = getCount(left)
    var b = getCount(right)
    return a < b ? -1 : a > b ? +1 : 0
  }})

getTopResults.on('result', function (topResults) {
  parallel(topResults.map(function (topResult) {
    var key = topResult.key
    return function (cb) {
      issuesdb.get(key, function (err, issue) {
        if (err) return cb() // skip not founds
        cb(err, JSON.parse(issue))
      })
    }
  }), function (err, results) {
    if (err) return console.error(err)
    console.log(results.map(function (result) {
      return result.title
    }))
  })
})

pump(
  filter,
  countStream(getValue),
  getTopResults
)

function getValue (obj) {
  return obj.value
}

function getCount (obj) {
  return obj.count
}

function keyify (data) {
  return data.key.slice(data.key.lastIndexOf('~') + 1)
}

function countStream (getKey) {
  var last = null
  return stream.transform({objectMode: true}, function (data, enc, cb) {
    if (last && getKey(data) === last.key) {
      last.count++
    } else {
      if (last) this.push(last)
      last = {key: getKey(data), count: 1}
    }
    cb()
  })
}
