const app = require("express")()
const fetch = require('node-fetch');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");
class Database{
constructor(fileName){
this.fileName = __dirname + "/" + fileName;
}
get data(){
return JSON.parse(fs.readFileSync(this.fileName));
}
get setData(){
return function(name, key){
var data = this.data;
data[name] = key;
fs.writeFileSync(this.fileName,JSON.stringify(data),{encoding:'utf8',flag:'w'})
};
}
get append(){
return function(arr, elm){
var data = this.data
data[arr] = data[arr].concat(elm)
fs.writeFileSync(this.fileName,JSON.stringify(data),{encoding:'utf8',flag:'w'})
}
}
}
let db = new Database("database.json");
dbd=db.data
function crawlSite(url){
console.log("website crawl: " + url)
db.append("crawled", url)
var websiteData = {"url":url}
fetch(url, {headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36"}}).then((t)=>t.text().then(t=>{
var dom = new JSDOM(t);
websiteData.title = dom.window.document.title
websiteData.text = dom.window.document.body.textContent.substring(0, 100)
db.append("websiteData", websiteData)
var links = []
Array.prototype.forEach.call(dom.window.document.links, function(link, index){
  if(link.href.match(/^(http)/g)&&index<7&&!dbd.forCrawl.includes(link.href)){
  links.push(link.href)
  }
})
dbd=db.data
db.append("forCrawl", links)
})).catch(console.log)
}
function nextCrawl(){
dbd = db.data
var index = dbd.forCrawl.findIndex((url)=>{
return !dbd.crawled.includes(url)
})
if(index+1){
crawlSite(dbd.forCrawl[index])
}
}
//do not set down, this might spam servers
setInterval(nextCrawl, 10000)
nextCrawl()
app.get("/*", function(req, res){
var s = (name)=>res.sendFile(__dirname+"/"+name)
switch(req.path){
case "/":
s("search.html")
break;
case "/search":
s("dosearch.html")
break;
case "/getSearch":
var results = dbd.websiteData.filter(function(website){
return website.title.toLowerCase().includes(req.query.q.toLowerCase())||website.text.toLowerCase().includes(req.query.q.toLowerCase())||website.url.toLowerCase().includes(req.query.q.toLowerCase())
})
results = results.sort((a,b)=>{
return a.url.length - b.url.length
})
res.send(JSON.stringify(results.slice((10*req.query.page)-10, 10*req.query.page)))
break;
case "/getAmount":
res.send(String(dbd.websiteData.length));
break;
default:
s("error404.html")
}
})
app.listen(3000)