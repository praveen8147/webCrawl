var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var json2csv = require('json2csv');
var fs = require('fs');

var START_URL = "https://medium.com/";
var MAX_PAGES_TO_VISIT = 100;

var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit = [];
var url = new URL(START_URL);
var baseUrl = url.protocol + "//" + url.hostname;

var http = require('http'); 
var httpAgent = new http.Agent();
httpAgent.maxSockets = 5;

var cnt = 0;
var fields = ['Visiting_Page', 'Status_Code', 'Number_Of_links', 'links'];
var mainObj = [];

pagesToVisit.push(START_URL);
crawl();

function crawl() {
    if (numPagesVisited >= MAX_PAGES_TO_VISIT) {
        var csv = json2csv({
            data: mainObj,
            fields: fields
        });

        fs.writeFile('output.csv', csv, function(err) {
            if (err) throw err;
            console.log('file saved');
        });
        console.log("Reached max limit of number of pages to visit.");
        return;
    }
    var nextPage = pagesToVisit.shift();
    if (nextPage in pagesVisited) {
        // We've already visited this page, so repeat the crawl
        crawl();
    } else {
        // New page we haven't visited
        visitPage(nextPage, crawl);
    }
}

function visitPage(url, callback) {
    // Add page to our set
    urlLink = url;
    pagesVisited[url] = true;
    numPagesVisited++;

    if (url == undefined) {
        return;
    }
    // Make the request
    console.log("Visiting page " + url);
    request(url, {
        pool: httpAgent
    }, function(error, response, body) {
        
        console.log('----------------->' + response);
        console.log("Status code: " + response.statusCode);
        if (response.statusCode !== 200) {
            callback();
            return;
        }
        // Parse the document body
        var $ = cheerio.load(body);
        cnt++;
        collectInternalLinks($, urlLink, response.statusCode);
        callback();
    });
}

function collectInternalLinks($, pageLink, SC) {
    var relativeLinks = $("a[href^='http']");
    console.log("Found " + relativeLinks.length + " relative links on page");

    if (cnt < 2) {
        console.log("Now Each link will be recursivly scrap to get further more links")
        relativeLinks.each(function() {
            pagesToVisit.push($(this).attr('href'));
        });
    } else {
        var obj = {};
        obj.Visiting_Page = pageLink;
        obj.Status_Code = SC;
        obj.Number_Of_links = relativeLinks.length;

        var str = "";
        relativeLinks.each(function() {
            str = str + ($(this).attr('href')) + ',';
        });
        obj.links = str;
        mainObj.push(obj);
    }
}