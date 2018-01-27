var EventEmitter = require('events')
var download = require('./lib/download')
var createIndex = require('./lib/create-index')
var pad = require('./lib/util').pad
var db = require('./lib/db')
var search = require('./lib/search')

var indexdb = db('index')
var issuesdb = db('issues')
var keysdb = db('keys')

exports.search = search.bind(this, indexdb, issuesdb)
exports.update = update
exports.repeatedUpdate = repeatedUpdate
exports.getIssues = getIssues

function getIssues (from, to) {
  var opts = {}
  opts.valueEncoding = 'json'
  opts.keyEncoding = 'utf8'
  if (from) opts.gte = pad(from)
  if (to) opts.lte = pad(to)

  return issuesdb.createValueStream(opts)
}

function update (githubKey, bus, cb) {
  bus.emit('log', 'Update start.')
  bus.emit('log', 'Downloading...')
  download(issuesdb, githubKey, function (err) {
    if (err) return cb(err)
    bus.emit('log', 'Creating the index...')
    createIndex(indexdb, issuesdb, keysdb, function (err) {
      if (err) return cb(err)
      bus.emit('log', 'Update done.')
      cb()
    })
  })
}

function repeatedUpdate (githubKey, interval) {
  var bus = new EventEmitter()
  interval = interval || 60 * 60 * 1000
  function loop () {
    update(githubKey, bus, function (err) {
      if (err) bus.emit('error', err)
      setTimeout(loop, interval)
    })
  }
  process.nextTick(loop)
  return bus
}
