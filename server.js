var Router = require('http-hash-router')
var http = require('http')
var ndjson = require('ndjson')
var pump = require('pump')
var url = require('url')
var through = require('through2')

var search = require('./search')
var level = require('./level')
var download = require('./download')
var createIndex = require('./create-index')
var issues = level('issues')

var GH_KEY = process.env.GH_KEY
var PORT = process.env.PORT || 3000

var router = Router()

router.set('/issues', function (req, res) {
  var query = url.parse(req.url, true).query
  var opts = {}
  opts.valueEncoding = 'json'
  opts.keyEncoding = 'utf8'
  if (query.from) opts.gte = pad(query.from)
  if (query.to) opts.lte = pad(query.to)
  pump(
    issues.createValueStream(opts),
    ndjson.serialize(),
    res
  )
})

router.set('/search', function (req, res) {
  var queryString = url.parse(req.url, true).query.q
  pump(
    search(queryString),
    through.obj(function (r, e, cb) { return cb(null, r.value) }),
    ndjson.serialize(),
    res
  )
})

router.set('/', function (req, res) {
  res.setHeader('Content-type', 'text/html')
  res.end('Download <a href="/issues">issues</a> or do a <a href="/search?q=learnyounode">search</a>')
})

var server = http.createServer(function (req, res) {
  router(req, res, {}, onError)

  function onError (err) {
    res.statusCode = 500
    res.end(err.message)
  }
})

function pad (score) {
  var padding = '00000'
  return padding.slice(score.toString().length) + score.toString()
}

server.listen(PORT, function () {
  function update (cb) {
    console.log('Downloading issues.')
    download(GH_KEY, function (err) {
      console.log('Updating index.')
      if (err) return console.error(err)
      createIndex(function (err) {
        if (err) return console.error(err)
        console.log('done.')
        cb()
      })
    })
  }
  function loop () {
    update(function () {
      setTimeout(loop, 60 * 60 * 1000)
    })
  }
  loop()
})
