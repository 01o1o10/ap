var express = require('express')
var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server)
const fs = require('fs');

app.use(express.static(__dirname + '/view'))

var port = 2000
console.log("localhost:" + port)
server.listen(port)

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
})

io.on('connection', function (socket) {

  	socket.on('read-file', function(fileName){

    path = "view/Trajectory/" + fileName

		fs.readFile(path, "utf8", function (err, data) {
      
      var latlong = []

			if (err) {
				console.log(err);
			} else {
				var ll = data.split("\n");
				for(var i = 6; i < ll.length-1; i++){
					var dizi = ll[i].split(",");
					latlong.push([parseFloat(dizi[0]), parseFloat(dizi[1]), dizi[5], dizi[6]]);
				}
      }
      socket.emit('data-is-ready', latlong)

		});
	})
	
	socket.on('new-path', function(newPath){

		var content = ""
		for(i = 0; i < newPath.length; i++){
			content += newPath[i].ll[0] + ',' + newPath[i].ll[1] + ',un2,un3,un4,' + newPath[i].date + ',' + newPath[i].time + '\n'
		}
		
		var d = (new Date()).toISOString()
    fs.writeFile("view/Trajectory/1_" + d.slice(11, 19) + "~" + d.slice(0, 10) + "_.csv", "a\na\na\na\na\na\n" + content, function(err){
			if(err){
				console.log(err);
			}
			else {
				console.log('kayit tamamlandi!');
			}
			fs.close
		})
	})
})