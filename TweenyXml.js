var prettifyXml = function(sourceXml)
{
    var xmlDoc = new DOMParser().parseFromString(sourceXml, 'application/xml');
    var xsltDoc = new DOMParser().parseFromString([
        // describes how we want to modify the XML - indent everything
        '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:strip-space elements="*"/>',
        '  <xsl:template match="para[content-style][not(text())]">', // change to just text() to strip space in text nodes
        '    <xsl:value-of select="normalize-space(.)"/>',
        '  </xsl:template>',
        '  <xsl:template match="node()|@*">',
        '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
        '  </xsl:template>',
        '  <xsl:output indent="yes"/>',
        '</xsl:stylesheet>',
    ].join('\n'), 'application/xml');

    var xsltProcessor = new XSLTProcessor();    
    xsltProcessor.importStylesheet(xsltDoc);
    var resultDoc = xsltProcessor.transformToDocument(xmlDoc);
    var resultXml = new XMLSerializer().serializeToString(resultDoc);
    return resultXml;
};

var entweedler = function() {

	if (typeof(window.Entweedle) == "undefined") {
		
		window.Entweedle = {
					
			trimTWElements: true,			
			converted: false,
		
			convert: function() {
				
				if (window.Entweedle.converted)
					return
				
				window.Entweedle.converted = true
				
				var output = window.document.getElementById("output")
				
				var xmlAsText = this.export().trim();
				//var debug = []
				//debug.push()
				//var debugText = document.createTextNode(debug.join(''))
				//output.appendChild(debugText)
				var xmlAsText = document.createTextNode(prettifyXml(xmlAsText))
				output.appendChild(xmlAsText)
			},

			
			export: function() {
				var buffer = []

				var storyDataInfo = {}
				var properties = {}
				var storyData = window.document.getElementsByTagName("tw-storydata")[0]
				if (storyData && storyData.hasAttributes())
				{
					var simpleProperties = ['ifid','format','format-version'/*,'startnode','zoom'*/]
					
					simpleProperties.forEach(a => {
						if (storyData.hasAttribute(a))
							properties[a] = storyData.getAttribute(a)})
					
					if (storyData.hasAttribute("startnode"))
					{
						storyDataInfo["start"] = storyData.getAttribute("startnode")
					}
					if (storyData.hasAttribute("name"))
					{
						storyDataInfo["name"] = storyData.getAttribute("name")
					}

					var tagElements = Array.from(window.document.getElementsByTagName("tw-tag"))
					if (tagElements.length > 0)
					{
						var tagColors = {};
						tagElements.forEach(
							e => tagColors[e.getAttribute("name")] = e.getAttribute("color"))

						properties["tag-colors"] = tagColors
					}
				}

				/*
				var userScript = window.document.getElementById("twine-user-script")
				if (userScript)
					buffer.push(this.buildPassage("UserScript","script",userScript.innerHTML))

				var userStylesheet = window.document.getElementById("twine-user-stylesheet")
				if (userStylesheet)
					buffer.push(this.buildPassage("UserStylesheet","stylesheet",userStylesheet.innerHTML))
				*/
				
				var passages = Array.from(window.document.getElementsByTagName("tw-passagedata"));
				storyDataInfo["size"] = passages.length
				buffer.push(this.startStoryDocument(storyDataInfo))
					buffer.push(this.buildTwineTag(properties))
					buffer.push(this.buildPassages(passages))
				buffer.push(this.endStoryDocument())

				return buffer.join('')
			},			
			
			startStoryDocument: function(storyData) {
				var result = []		
									
				result.push("<");
				if(!this.trimTWElements)
				{
					result.push("tw-")					
				}
				result.push("story")
				for (let a in storyData)
					this.pushAttribute(result, a, storyData[a])	
				result.push(">")
				return result.join('')
			},
			
			endStoryDocument: function() {
				var result = []		
									
				result.push("</")				
				if(!this.trimTWElements)
				{
					result.push("tw-")					
				}
				result.push("story>")
				return result.join('')
			},
			
			pushAttribute: function(buffer, key, value) {
				buffer.push(" ", key, "=\"", value, "\"")		
			},
			
			buildTwineTag: function(twineData) {
				var result = []		
						
				result.push("<")				
				if(!this.trimTWElements)
				{
					result.push("tw-")					
				}
				result.push("twine")
				for (let a in twineData)
					this.pushAttribute(result, a, twineData[a])
				result.push("/>")
				
				return result.join('')
			},
			
			extractPassagesLinks: function(passageData, remove)
			{
				var passageText = passageData.textContent
				var re = /\[\[(.*)\]\]/gm
				var passageLinksNames = passageText.match(re);
				if(passageLinksNames)
				{
					passageLinksNames.trimElements(2, -2)
					if(remove)
					{
						passageData.textContent = passageText.replace(re, "").trim()	
					}
				}
				return {"links": passageLinksNames, "element": passageData}
			},
			
			passageLinksPIDFromTitles: function(passagesData, passageLinksNames)
			{
				var passageLinksPID = []
				for (var i = 0; i < passageLinksNames.length; ++i)
				{
					var passagePid = null
					var linkName = passageLinksNames[i]
					
					for (var j = 0; j < passagesData.length; ++j)
					{
						var passageElement = passagesData[j]
						var passageName = passageElement.getAttribute("name")
						if(linkName == passageName )
						{
							var pid = passageElement.getAttribute("pid")
							passageLinksPID.push(pid)
							break;
						}
					}
				}
				return passageLinksPID;
			},
			
			buildPassages: function(passagesData) {
				var result = []
				if(passagesData)
				{
					for (var i = 0; i < passagesData.length; ++i)
					{				
						var passageElement = passagesData[i]
						var extractObject = this.extractPassagesLinks(passageElement, true)
						passageElement = extractObject.element
						if(extractObject.links)
						{
							passageElement.setAttribute("next", this.passageLinksPIDFromTitles(passagesData, extractObject.links))
						}
						if(this.trimTWElements)
						{
							var passageElementAttributes = passageElement.attributes
							var passageElementText = passageElement.innerHTML
							passageElement = document.createElement(passageElement.tagName.slice(3))
							for(var key in passageElementAttributes) {
								if(passageElementAttributes[key].name && passageElementAttributes[key].value)
								{
									passageElement.setAttribute(passageElementAttributes[key].name, passageElementAttributes[key].value)
								}
							}
							passageElement.appendChild(document.createTextNode(passageElementText))
						}
						result.push(passageElement.outerHTML)
					}
				}		
				
				return result.join('')
			},
			
			scrub: function(content) {
				if (content) {
					content = content	
						.replace(/^::/gm, " ::")
						.replace(/\</gm, "&lt;")
						.replace(/\>/gm, "&gt;")
				}
				return content
			}

		}			
	}

	window.Entweedle.convert()
}	

window.onload = entweedler
setTimeout(entweedler, 1000)
			
Array.prototype.trimElements = function(start, end) {
	
	function trimElement(item, index, arr) {
	  arr[index] = item.slice(start,end)
	}
	this.forEach(trimElement)
}