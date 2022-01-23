# tweenyxml
Free utility format to export your story into XML format. Inspired and based on Entweedle by [Michael McCollum](https://twitter.com/gnustoboz)

## Usage
You'll need [Node.js](https://nodejs.org/en/download/) and use npm for installing dependencies (uglify-js and html-minifier)

Open your terminal in the source folder

use `npm install uglify-js` to install required dependencies
build the format.js using `npm run build` 

Then in twine, you can import `format.js` using the formats menu > Add new format.
Finally either play your story or `publish to file` then open your exported html into your browser to see the generated xml code.
