var Router = require('http-hash-router')
var ndjson = require('ndjson')
var pump = require('pump')
var http = require('http')
var path = require('path')
var url = require('url')

var nodeschool = require('./')({
  storagePath: path.join(__dirname, '/db'),
  repo: 'nodeschool/berlin'
})

var PORT = process.env.PORT || 3000

var router = Router()

router.set('/issues', function (req, res) {
  var query = url.parse(req.url, true).query
  pump(
    nodeschool.getIssues(query.from, query.to),
    ndjson.serialize(),
    res
  )
})

router.set('/search', function (req, res) {
  var query = url.parse(req.url, true).query
  var queryString = query.q
  var limit = Number(query.limit)
  pump(
    nodeschool.search(queryString, limit),
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

server.listen(PORT, function () {
  console.log('Listening on port', PORT)
  nodeschool.repeatedUpdate(process.env.GH_KEY)
    .on('log', function (log) {
      console.log(log)
    })
    .on('error', function (err) {
      console.error(err)
    })
})
