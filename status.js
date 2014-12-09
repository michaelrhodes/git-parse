var through = require('through2')

module.exports = function () {
  return through.obj(function (chunk, enc, next) {
    var output = chunk.toString()
    this.push('\nCHUNK\n' + output)
    next()
  })
}
