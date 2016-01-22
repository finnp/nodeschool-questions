var level = require('level')
var sublevel = require('level-spaces')

var db = level(__dirname + '/db')

module.exports = function (space) {
  return sublevel(db, space)
}
