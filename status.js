var splice = require('stream-splicer')
var filter = require('through2-filter')
var through = require('through2')
var split = require('split')
var matches = require( './lib/match')
var filetypes = {
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

regex.ignored = regex.untracked

module.exports = function () {
  var parsed = Object.create(null)
  var filetype = null

  function relevant (chunk) {
    return regex.content.test(chunk)
  }

  function parse (line, enc, next) {
    line = line.toString()

    // Set upcoming filetype group
    var heading = matches(line, regex.heading)[1]
    if (heading) {
      filetype = filetypes[heading]
      parsed[filetype] = []
      return next()
    }

    // Parse unstaged file
    if (/unstaged/.test(filetype) && regex[filetype].test(line)) {
      var matched = matches(line, regex[filetype])
      var file = {
        status: matched[1],
        filename: matched[2]
      }
      parsed[filetype].push(file)
      return next()
    }

    // Parse untracked or ignored file
    if (/(untracked|ignored)/.test(filetype) && regex[filetype].test(line)) {
      var filename = matches(line, regex[filetype])[1]
      parsed[filetype].push(filename)
      return next()
    }

    // Parse branch name
    if (!parsed.branch && regex.branch.test(line)) {
      parsed.branch = matches(line, regex.branch)[1]
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
