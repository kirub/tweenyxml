let formatName = 'TweenyXml'

var storyFormat = {
	'name': formatName,
    'version': '1.0.1',
    'license': 'MIT License',
    'author': '<a href="https://twitter.com/_KiruB_">Benjamin Bloc</a>',
	'description': 'Free utility format to export your story into XML format. Inspired and based on Entweedle by <a href="https://twitter.com/gnustoboz">Michael McCollum</a>',
    'image': 'icon.png',
    'url': '',
    'proofing': false
}

let fs = require('fs')
let uglifier = require('uglify-js')
let minifier = require('html-minifier')
let formatter = require('xml-formatter');

let script = fs.readFileSync('./TweenyXml.js').toString()
let page = fs.readFileSync('./template.html').toString()
let license = fs.readFileSync('./license.txt').toString()

let devStorySource = page
    .replace('{{LICENSE}}', license)
    .replace('{{SCRIPT}}', script)

storyFormat.name = formatName + '-dev'
storyFormat.source = devStorySource
fs.writeFileSync('./formatDev.js',  'window.storyFormat(' + JSON.stringify(storyFormat) + ')')
    
let processedScript = uglifier.minify(script).code
let processedPage = minifier.minify(page, { collapseWhitespace: true })
let processedLicense = ''
license.split('\n\n').forEach((p) => { processedLicense += p.replace(/\n/g, ' ') + '\n\n' })

let storySource = processedPage
    .replace('{{LICENSE}}', processedLicense)
    .replace('{{SCRIPT}}', processedScript)

storyFormat.name = formatName
storyFormat.source = storySource
fs.writeFileSync('./format.js', 'window.storyFormat(' + JSON.stringify(storyFormat) + ')')
