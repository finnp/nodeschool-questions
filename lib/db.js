var level = require('level')
var sublevel = require('level-spaces')
var path = require('path')

var db = level(path.join(__dirname, '/db'))

module.exports = function (space) {
  return sublevel(db, space)
}
