var IGNORE = require('./ignore.json')

function tokenize (str) {
  var visited = {}
  var sanitize = function (word) {
    if (!word || visited[word] || IGNORE[word]) return false
    visited[word] = true
    return true
  }

  return str.toLowerCase().split(/[^a-z0-9@]+/).filter(sanitize)
}

module.exports = tokenize
