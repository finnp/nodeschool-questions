
module.exports.pad = pad

function pad (score) {
  var padding = '00000'
  return padding.slice(score.toString().length) + score.toString()
}
