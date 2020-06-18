// import * as fs from "fs";
import * as xml2js from "xml2js";
import axios from 'axios';
import express from 'express'
import { rejects } from "assert";

const app: express.Express = express()

type Params = {
	username: string,
	weekPeriod: number,
	colortheme: ColorThemes,
	needText: boolean,
}

const colorThemes = Object.freeze({
	"standard": ["#ebedf0", "#c6e48b", "#7bc96f", "#239a3b", "#196127"],
	"dark":  ["#121212", "#196127", "#239a3b", "#7bc96f", "#c6e48b"],
	"ocean": ["#121212", "#196127", "#239a3b", "#7bc96f", "#c6e48b"],
});
type ColorThemes = keyof typeof colorThemes;
type colorConvertPair = { [key: string]: number }
const colorIndexMap: colorConvertPair = {
	// Low contribute
	"#ebedf0": 0,
	"#c6e48b": 1,
	"#7bc96f": 2,
	"#239a3b": 3,
	"#196127": 4,
	// High contribute
}

type Rect = {
	$: {
		class: string;
		width: string;
		height: string;
		x: string;
		y: string;
		fill: string;
		'data-count': string; 
		'data-date': string;
	}
}
type Weeks = {
	$: { transform: string };
	rect: Rect[];
}
type GrassSVG = {
	$: {
		width: string;
 		height: string;
 		class: string;
		xmlns?: string;
	};
	g: Array<{ // length is 1
		$: any;
		g: Weeks[];
	}>;
	text?: any;
}

// Note: convertColor function is destructive.
const convertColor = (svg: GrassSVG, colorTheme: ColorThemes): GrassSVG => {
	svg.g[0].g = svg.g[0].g.map(rects => {
		rects.rect.map(rect => {
			const newColor = colorThemes[colorTheme][colorIndexMap[rect.$.fill]];
			rect.$.fill = newColor;
			return rect;
		});
		return rects;
	});
	return svg;
}

const trimWeek = (svg: GrassSVG, nweek: number): GrassSVG => {
	const weekLength: number = svg.g[0].g.length;
	const newWeeks: Weeks[] = svg.g[0].g.filter((_, idx)=> {
		return (idx >= (weekLength - nweek)) 
	}).map((week, idx) => {
		week.$.transform = `translate(${idx * 14}, 0)`;
		week.rect = week.rect.map(rect => {
			rect.$.x = `${14 - idx}`;
			return rect;
		});
		return week;
	});

	svg.g[0].g = newWeeks;
	return svg;
}

const convert2Data = (svg: GrassSVG): GrassSVG => {
	const data = svg.g[0].g.map((week, idx) => {
		return week.rect.map(rect => {
			return {
				fill: rect.$.fill,
				'data-date': rect.$['data-date'],
				'data-count': rect.$['data-count'],
			};
		});
	}).flat();
	console.log('%o', data)
	return svg;
}
const getParams = (req: express.Request): Params => {
	const username: string = req.params.username;
	const weekPeriod = Number(req.query.week) ? Number(req.query.week) : 0;
	const needText: boolean = Boolean(req.query.text);

	const colorThemeInput: string =  req.query.week ? String(req.query.week) : "standard";
	if (!(colorThemeInput in colorThemes)) {
		return { username, weekPeriod, colortheme: "standard", needText };
	}
	return { username, weekPeriod, colortheme: <ColorThemes>colorThemeInput, needText };
}

const customizeSVG = (svg: any, params: Params) => {
	return new Promise((resolve, reject) => {
      xml2js.parseString(svg, (err, dom) => {
     	if (err) {
     	   reject(err);
     	   return;
		 }
		 
		 // remove texts or not.
		if (!params.needText) {
			delete dom.svg.g[0].text
		}
		// add namespace as attribute
		dom.svg.$.xmlns = "http://www.w3.org/2000/svg";
		console.log('%o', dom.svg)

		trimWeek(<GrassSVG>dom.svg, 10)
		convertColor(<GrassSVG>dom.svg, 'standard')
		convert2Data(dom.svg);
      	resolve(dom);
  	  });
	});
}

const handler = async (req: express.Request, res: express.Response) => {
	const params: Params = getParams(req);
	const githubHtml = await axios.get(`https://github.com/${params.username}`)

	// Extract SVG calender graph
	const svgTextMatch = githubHtml.data.match(/\<svg.+js-calendar-graph-svg[\s\S]+?\<\/svg\>/);
	const svgText = svgTextMatch[0]

	// add namespace to convert valid XML
	const svgValidText = svgText.replace('/<svg', '/<svg xmlns="http:\/\/www.w3.org\/2000\/svg"');

	// parse text to js DOM and Customize
	const jsdom: any = await customizeSVG(svgValidText, params);
	const builder = new xml2js.Builder({headless: true});

	const customizedSVG = builder.buildObject(jsdom);

	res.set({
		"Content-Disposition": 'attachment; filename="grass.svg"',
		'Content-type': 'image/svg+xml',
		'Vary': 'Accept-Encoding',
	});
	return res.send(customizedSVG)
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/grass/:username', handler);

app.use(function(req, res, next) {
	res.status(404).send('Sorry cant find that!');
});

app.listen(3000,()=>{ console.log('Example app listening on port 3000!') })
