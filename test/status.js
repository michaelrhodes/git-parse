var fs = require('fs')
var path = require('path')
var glob = require('glob')
var json = require('JSONStream')
var block = require('block-stream')
var parse = require('../status')
var join = path.join

var dir = function (dir) {
  return function (file) {
    return join(dir, file)
  }
}

var statuses = join(__dirname, 'statuses')

module.exports = function (test) {
  glob('*', { cwd: statuses }, function(error, files) {
    var i = -1
    var total = files.length
    var pathify = dir(statuses)

    ;(function next () {
      if (++i === total) return

      if (i) console.log()
      console.log('#', files[i])

      fs.createReadStream(pathify(files[i]))
        .pipe(new block(128, { nopad: true }))
        .pipe(parse())
        .pipe(json.stringify('[', ',\n', ']\n', 2))
        .on('end', next)
        .pipe(process.stdout)
    })()
  })
}
