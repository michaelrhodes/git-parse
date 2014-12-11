var splice = require('stream-splicer')
var filter = require('through2-filter')
var through = require('through2')
var split = require('split')
var plain = require('strip-ansi')
var match = require( './lib/match')
var filetypes = {
  'Changes to be committed': 'staged',
  'Changes not staged for commit': 'unstaged',
  'Untracked files': 'untracked',
  'Ignored files': 'ignored'
}

var regex = {
  branch: /^# On branch (.+)$/,
  content: /^#.{1,}/,
  heading: /^# ([^:]+):$/,
  unstaged: /^#\t([^:]+)?:\s+(.+)$/,
  untracked: /^#\t(.+)$/
}

regex.staged = regex.unstaged 
regex.ignored = regex.untracked

module.exports = function () {
  var parsed = Object.create(null)
  var filetype = null

  function relevant (chunk) {
    return regex.content.test(chunk)
  }

  function parse (line, enc, next) {
    line = plain(line.toString())

    // Set upcoming filetype group
    var heading = match(line, regex.heading)[1]
    if (heading && filetypes[heading]) {
      filetype = filetypes[heading]
      parsed[filetype] = []
      return next()
    }

    var isFile = filetype && regex[filetype].test(line)

    // Parse unstaged file
    if (/(un)?staged/.test(filetype) && isFile) {
      var matched = match(line, regex[filetype])
      var file = {
        status: matched[1],
        filename: matched[2]
      }
      parsed[filetype].push(file)
      return next()
    }

    // Parse untracked or ignored file
    if (/(untracked|ignored)/.test(filetype) && isFile) {
      var filename = match(line, regex[filetype])[1]
      parsed[filetype].push(filename)
      return next()
    }

    // Parse branch name
    if (!parsed.branch && regex.branch.test(line)) {
      parsed.branch = match(line, regex.branch)[1]
      return next()
    }

    // Ignore
    return next()
  }

  function end (done) {
    this.push(parsed)
    done()
  }

  return splice.obj([
    split(),
    filter(relevant),
    through.obj(parse, end)
  ])
}
