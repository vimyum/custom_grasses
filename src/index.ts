import * as fs from "fs";
import * as xml2js from "xml2js";
import axios from 'axios';


/*
fs.readFile("./grass.svg", (err, data)=> {
	if (err) {
		console.error('ERROR: %o', err);
	}
	xml2js.parseString(data.toString(), (err, result)=> {
			console.dir(result);
			console.log(result.svg.g);
	});
});
*/

axios.get('https://github.com/mizchi')
  .then(response => {
	// Extract SVG calender graph
	const svgTextMatch = response.data.match(/\<svg.+js-calendar-graph-svg[\s\S]+?\<\/svg\>/);
	const svgText = svgTextMatch[0]
	console.log('%o', svgText);

	// add namespace to convert valid XML
	const svgValidText = svgText.replace('/<svg', '/<svg xmlns="http:\/\/www.w3.org\/2000\/svg"');

	// parse text to js DOM
	xml2js.parseString(svgValidText, (err, result)=> {
			console.dir(result);
	});
  })