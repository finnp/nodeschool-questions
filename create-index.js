var level = require('./level')
var through = require('through2')
var concat = require('concat-stream')
var pump = require('pump')
var tokenize = require('./tokenize')

var indexdb = level('index')
var issues = level('issues')
var keysdb = level('keys')

module.exports = createIndex

function createIndex (cb) {
  var createBatch = through.obj(function (issue, enc, cb) {
    var self = this
    var searchBody = [
      issue.body,
      issue.title,
      issue.labels.map(function (l) { return l.name }).join(' ')
    ].join(' ')
    var score = getScore(issue)
    var tokens = tokenize(searchBody)
    var keys = tokens.map(function (token) {
      return token + '~' + pad(score) + '-' + issue.number
    })
    // TODO: all this stuff should be atomic
    // delete old keys first
    keysdb.get(issue.number.toString(), function (err, keys) {
      if (err) return deletedKeys()
      try {
        var batch = JSON.parse(keys).map(function (key) {
          return {type: 'del', key: key}
        })
        indexdb.batch(batch, deletedKeys)
      } catch (e) {}
    })

    function deletedKeys () {
      keysdb.put(issue.number.toString(), JSON.stringify(keys))
      keys.forEach(function (key) {
        self.push({ type: 'put', key: key, value: JSON.stringify(issue) })
      })
      cb()
    }
  })

  pump(
    issues.createValueStream({valueEncoding: 'json'}),
    createBatch,
    concat(function (batch) {
      indexdb.batch(batch, cb)
    })
  )

  function getScore (issue) {
    var badScore = 100
    badScore = badScore - Math.min(2, issue.comments)
    if (issue.body.indexOf('```js') > -1) badScore -= 2
    if (issue.state === 'closed') badScore -= 2
    if (hasLabel(issue, 'contains-hint-for-improvement')) badScore += 1
    if (hasLabel(issue, 'waiting-for-feedback')) badScore += 1
    if (hasLabel(issue, 'discussion thread')) badScore += 3
    if (hasLabel(issue, 'probably-self-resolved')) badScore += 2
    if (hasLabel(issue, 'needs-some-love')) badScore += 5
    if (issue.labels.length > 0) badScore -= 2
    return badScore
  }
}

function pad (score) {
  var padding = '00000'
  return padding.slice(score.toString().length) + score.toString()
}

function hasLabel (issue, name) {
  return issue.labels
    .some(function (label) {
      return label.name === name
    })
}
