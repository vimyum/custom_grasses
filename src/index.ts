// import * as fs from "fs";
import * as xml2js from "xml2js";
import axios from 'axios';
import express from 'express'

const app: express.Express = express()

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

const customizeSVG = (svg: any) => {
	return new Promise((resolve, reject) => {
      xml2js.parseString(svg, (err, result) => {
     	if (err) {
     	   reject(err);
     	   return;
     	}
      	resolve(result);
  	  });
	});
}

const handler = async (req: express.Request, res: express.Response) => {
	const githubHtml = await axios.get('https://github.com/mizchi')

	// Extract SVG calender graph
	const svgTextMatch = githubHtml.data.match(/\<svg.+js-calendar-graph-svg[\s\S]+?\<\/svg\>/);
	const svgText = svgTextMatch[0]
	console.log('%o', svgText);

	// add namespace to convert valid XML
	const svgValidText = svgText.replace('/<svg', '/<svg xmlns="http:\/\/www.w3.org\/2000\/svg"');

	// parse text to js DOM and Customize
	const jsdom = await customizeSVG(svgValidText);

	return res.json({status: 200})
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/grass', handler);

app.use(function(req, res, next) {
	res.status(404).send('Sorry cant find that!');
});

app.listen(3000,()=>{ console.log('Example app listening on port 3000!') })
