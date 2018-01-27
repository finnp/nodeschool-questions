var requestAllPages = require('request-all-pages')
var pad = require('./util').pad

module.exports = downloadIssues

function downloadIssues (issuesdb, ghkey, cb) {
  var requestOpts = {
    uri: 'https://api.github.com/repos/nodeschool/discussions/issues?state=all',
    json: true,
    body: {},
    headers: { 'user-agent': 'request-all-pages', 'Authorization': 'token ' + ghkey }
  }

  requestAllPages(requestOpts, { startPage: 1, pagesPer: 100 }, function (err, pages) {
    if (err) return cb(err)
    var all = pages
      .reduce(
        function (acc, page) {
          acc = acc.concat(page.body)
          return acc
        }
        , [])
    var batch = all.map(function (issue) {
      return {
        type: 'put',
        key: pad(issue.number),
        value: JSON.stringify(issue)
      }
    })
    issuesdb.batch(batch, function (err) {
      if (err) return cb(err)
      cb()
    })
  })
}
