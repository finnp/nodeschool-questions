var db = require('./db')
var stream = require('stream-wrapper')
var pump = require('pump')
var tokenize = require('./tokenize')
var pad = require('./util').pad

var indexdb = db('index')
var issues = db('issues')
var keysdb = db('keys')

module.exports = createIndex

function createIndex (cb) {
  var createBatch = stream.writable({objectMode: true}, function (issue, enc, cb) {
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
    keysdb.get(issue.number.toString(), function (err, keys) {
      if (err) return deletedKeys()
      try {
        var batch = JSON.parse(keys).map(function (key) {
          return {type: 'del', key: key}
        })
        indexdb.batch(batch, deletedKeys)
      } catch (e) { deletedKeys() }
    })

    function deletedKeys () {
      keysdb.put(issue.number.toString(), JSON.stringify(keys))
      var batch = keys.map(function (key) {
        return { type: 'put', key: key, value: pad(issue.number) }
      })
      indexdb.batch(batch)
      cb()
    }
  })

  pump(
    issues.createValueStream({valueEncoding: 'json'}),
    createBatch,
    cb
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

function hasLabel (issue, name) {
  return issue.labels
    .some(function (label) {
      return label.name === name
    })
}

if (require.main === module) {
  console.log('Start indexing.')
  createIndex(function (err) {
    if (err) console.trace(err)
    console.log('done')
  })
}
