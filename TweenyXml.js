var prettifyXml = function(xmlDoc)
{
    var xsltDoc = new DOMParser().parseFromString([
        // describes how we want to modify the XML - indent everything
        '<?xml version="1.0" encoding="UTF-8"?>',
		'<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:strip-space elements="*"/>',
        '  <xsl:template match="text()">', // change to just text() to strip space in text nodes
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

var prettifyXmlFromString = function(sourceXml)
{
    var xmlDoc = new DOMParser().parseFromString(sourceXml, 'application/xml');
	return prettifyXml(xmlDoc)
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
				var xmlAsText = document.createTextNode(prettifyXml(this.export()))
				output.appendChild(xmlAsText)
			},

			
			export: function() {
				var buffer = []

				this.debug.push('=export=')				
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
				
				var passages = Array.from(window.document.getElementsByTagName("tw-passagedata"));
				storyDataInfo["size"] = passages.length
				var xmlDoc = this.createXmlDocument(storyDataInfo)
					this.buildTwineElement(xmlDoc, properties)
					this.buildPassages(xmlDoc, passages)

				return xmlDoc
			},			
			
			createXmlDocument: function(storyData) {
				
				var storyElementName = (this.trimTWElements) ? "story" : "tw-story"				
				var xmlDoc = document.implementation.createDocument(null, storyElementName)
				var storyElement = xmlDoc.documentElement
				
				for (let a in storyData)
					storyElement.setAttribute(a, storyData[a])
				
				return xmlDoc
			},
			
			pushAttribute: function(buffer, key, value) {
				buffer.push(" ", key, "=\"", value, "\"")		
			},
			
			buildTwineElement: function(xmlDoc, twineData) {
						
				var rootNode = xmlDoc.documentElement
				
				var twineElementName = (this.trimTWElements) ? "twine" : "tw-twine"
				var twineElement = xmlDoc.createElement(twineElementName)
				
				for (let a in twineData)
					twineElement.setAttribute(a, twineData[a])
				
				rootNode.appendChild(twineElement)
				
				return twineElement
			},
			
			buildPassageElement: function(xmlDoc, passagesData, currentPassageIdx)
			{
				var rootNode = xmlDoc.documentElement
				var ogPassageElement = passagesData[currentPassageIdx]
				var passageText = ogPassageElement.textContent.trim()
				var passageElementName = (this.trimTWElements) ? ogPassageElement.tagName.slice(3) : ogPassageElement.tagName
				var passageElement = xmlDoc.createElement(passageElementName.toLowerCase())
				
				for (var key in ogPassageElement.attributes)
				{
					if(ogPassageElement.attributes[key].name && ogPassageElement.attributes[key].value)
					{
						passageElement.setAttribute(ogPassageElement.attributes[key].name, ogPassageElement.attributes[key].value)
					}
				}
													
				var regexp = /\[{2}(.*?)(?:\|(.*?))?(?:->(.*?))?\]{2}/gm				
				var passageLinks = passageText.matchAll(regexp)
				var debugElement = window.document.getElementById("debug")	
				if( passageLinks )
				{					
					var arrayFromMatches = Array.from(passageLinks)
					var noChoice = arrayFromMatches.length == 1 && !arrayFromMatches[0][2]
					
					for (var key in arrayFromMatches)
					{
						if(arrayFromMatches[key])
						{
							if(noChoice)
							{
								var passageLinkID = this.passageLinkPIDFromTitle(passagesData, arrayFromMatches[key][1])
								if(passageLinkID)
								{
									passageElement.setAttribute("next",passageLinkID)
								}
								else
								{
									// Dead end?
								}
							}
							else
							{
								var choiceElementTextNode = null								
								var link = arrayFromMatches[key][1]
								if(arrayFromMatches[key][2]) // means it is a named link
								{				
									link = arrayFromMatches[key][2]
									choiceElementTextNode = xmlDoc.createTextNode(arrayFromMatches[key][1]) // we keep first capture as the text node
								}
								var passageLinkID = this.passageLinkPIDFromTitle(passagesData, link)
								
								if(passageLinkID)
								{
									var choiceElement = xmlDoc.createElement("choice")
									choiceElement.setAttribute("next", passageLinkID)
									if(choiceElementTextNode)
									{
										choiceElement.appendChild(choiceElementTextNode) // we keep first capture as the text node
									}
									passageElement.appendChild(choiceElement)
								}									
							}
						}
					}
					
					var passageTextContent = passageText.replace(regexp, "").trim();
					if(passageTextContent.length > 0)
					{
						var passageTextElement = xmlDoc.createElement("text")
						passageTextElement.appendChild(xmlDoc.createTextNode(passageTextContent))
						passageElement.appendChild(passageTextElement)
					}
				}

				rootNode.appendChild(passageElement)
				debugElement.innerHTML = debugArray.join('')
				return passageElement
			},
			
			passageLinkPIDFromTitle: function(passagesData, passageLinkName)
			{
				var passagePid = null				
				for (var j = 0; j < passagesData.length; ++j)
				{
					var passageElement = passagesData[j]
					var passageName = passageElement.getAttribute("name")
					if(passageLinkName == passageName )
					{
						passagePid = passageElement.getAttribute("pid")
						break;
					}
				}
				return passagePid;
			},
			
			passageLinksPIDFromTitles: function(passagesData, passageLinksNames)
			{
				var passageLinksPID = []
				for (var i = 0; i < passageLinksNames.length; ++i)
				{
					var linkName = passageLinksNames[i]
					passageLinksPID.push(this.passageLinkPIDFromTitle(passagesData, linkName))
				}
				return passageLinksPID;
			},
			
			buildPassages: function(xmlDoc, passagesData) {
				var passageElements = []
				if(passagesData)
				{
					for (var i = 0; i < passagesData.length; ++i)
					{				
						passageElements.push(this.buildPassageElement(xmlDoc, passagesData, i))
					}
				}		
				
				return passageElements
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