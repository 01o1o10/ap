
$(document).ready(function(){
    //// IMPORTS
    const socket = io.connect('http://localhost:1453')
    
    //// VARIABLES
    var myMap
    var latlong = []
    var point1, point2, square = {}
    var newPath = []

    //// START
    ymaps.ready(init)
    $('.select-files').SumoSelect({placeholder: 'Select view datas', csvDispCount: 5, selectAll: true });

    //// codes
    document.getElementById('data-input').onchange = function(e) {
        latlong = []
        readFiles(document.getElementById('data-input').files)
    }

    $('#set-map').click(function(){
        var fi = $('.select-files').val()
        var color = document.getElementById('choose-color').value
        console.log(fi)
        for(i in fi){
            addMark(latlong[fi[i]][0], fi[i])
            addPolyline(latlong[fi[i]], color)
        }
    })

    $('#reset-map').click(function(){
        myMap.geoObjects.removeAll()
        point1 = undefined
    })

    $('#reduction').click(function(){
        var fi = $('.select-files').val()
        var tolerance = 0.00000001 * document.getElementById('tolerance').value
        console.log(tolerance)
        for(i in fi){
            latlong[fi[i]] = reduction.rdp(latlong[fi[i]], tolerance)
        }
        $('#set-map').click()
    })

    $('#dtw').click(function(){
        var fi = $('.select-files').val()

        if(fi.length == 2){
            var dm = edm(latlong[fi[0]], latlong[fi[1]])
            var dtwResult = dtw(dm)
            drawLines(latlong[fi[0]], latlong[fi[1]], dtwResult.path)
            var path1Length = pathLength(latlong[fi[0]])
            var path2Length = pathLength(latlong[fi[1]])
            document.getElementById('sonuc').innerText = Math.round(100 * (1 - (dtwResult.minDist/(path1Length + path2Length))))
        }
        else{
            alert("For this algorithm just you must select two trajectory!")
        }
    })

    $('#lcss').click(function(){
        var fi = $('.select-files').val()

        if(fi.length == 2){
            var sigma = 0.01 * document.getElementById('sigma').value
            //var gamma = 0.01 * document.getElementById('gamma').value
            var simPnt = lcssdm(latlong[fi[0]], latlong[fi[1]], sigma)
            var L = lcss(simPnt)
            drawLines(latlong[fi[0]], latlong[fi[1]], L)
            var path1Length = pathLength(latlong[fi[0]])
            var path2Length = pathLength(latlong[fi[1]])
            var subSimPathLength = subPathLangth(latlong[fi[0]], latlong[fi[1]], L)
            var similarty = (subSimPathLength/Math.min(path1Length, path2Length)) * 100
            document.getElementById('sonuc').innerText = 'Similarity: %' + Math.round(similarty)
        }
        else{
            alert("For this algorithm just you must select two trajectory!")
        }
    })

    $('#delete-path').click(function(){
        var fi = $('.select-files').val()
        console.log(fi)
        for(i in fi){
            latlong[fi[i]] = deletePathPart(latlong[fi[i]], square)
        }
        point1 = undefined
    })

    $('#new-path').click(function(){
        socket.emit('new-path', newPath)
        newPath = []
    })

    function readFiles(files){
        $('#select-files').children().remove()
        $('.select-files')[0].sumo.reload()
        if(files.length == 1){
            socket.emit('read-file', files[0].name)
            $('#select-files').append('<option value=0>0</option>')
        }
        else if(files.length > 1){
            for(j = 0; j < files.length; j++){
                socket.emit('read-file', files[j].name)
                $('#select-files').append('<option value=' + j + '>' + j + '</option>')
            }
        }
        $('.select-files')[0].sumo.reload()
        socket.on('data-is-ready', function(ll){
            latlong.push(ll)
        })
    }

    function init(){
        myMap = new ymaps.Map("map", {
            center: [39.984702, 116.318417],
            zoom: 14
        })

        myMap.events.add(['click', 'contextmenu'], function (e) {

            if(e.get('type') == 'click'){
                console.log('patha girdi')
                newPath.push(e.get('coords'))
            }
            else if(point1 == undefined){
                console.log('rectangle ya girdi')
                point1 = e.get('coords');
                addMark(point1, 'Rectangle')
            }
            else {
                point2 = e.get('coords');
                if(point1[0] < point2[0]){
                    square.left = point1[0]
                    square.right = point2[0]
                }
                else {
                    square.left = point2[0]
                    square.right = point1[0]
                }
                if(point1[1] < point2[1]){
                    square.bottom = point1[1]
                    square.top = point2[1]
                }
                else {
                    square.bottom = point2[1]
                    square.top = point1[1]
                }
                addRectangle([point1, point2])
                point1 = undefined
            }
            
        });
    }
    
    function addMark(ll, num){
        var myPlacemark = new ymaps.Placemark(ll, {hintContent: '' + num});
        myMap.geoObjects.add(myPlacemark)
    }

    function addRectangle(ll){
        var myRectangle = new ymaps.GeoObject({
            geometry: {
              type: "Rectangle",
              coordinates: ll
            }
          })
          myMap.geoObjects.add(myRectangle)
    }
    
    function addPolyline(lldata, color){
        var myPolyline = new ymaps.Polyline(
            lldata,
            {},
            {
              strokeWidth: 2,
              strokeColor: color,
              draggable: true
            })
        myMap.geoObjects.add(myPolyline)
    }

    var reduction = {
        rdp: function(points, epsilon){
            var i,
                maxIndex = 0,
                maxDistance = 0,
                dist,
                leftRecursiveResults, rightRecursiveResults,
                filteredPoints = [];
            for(i = 1; i < points.length-1; i++) {
                dist = this.finddist(points[i], [points[0], points[points.length - 1]]);
                if(dist > maxDistance){
                    maxDistance = dist;
                    maxIndex = i;
                }
            }
            // if max distance is greater than epsilon, recursively simplify
            if (maxDistance >= epsilon) {
                leftRecursiveResults = this.rdp(points.slice(0, maxIndex), epsilon);
                rightRecursiveResults = this.rdp(points.slice(maxIndex), epsilon);
                filteredPoints = leftRecursiveResults.concat(rightRecursiveResults);
            } else {
                filteredPoints.push(points[0], points[points.length-1]);
            }
            return filteredPoints;
        },

        finddist: function(point, line) {
            var pointX = point[1],
                pointY = point[0],
                lineStart = {
                    x: line[0][1],
                    y: line[0][0]
                },
                lineEnd = {
                    x: line[1][1],
                    y: line[1][0]
                };
            var l = Math.sqrt(Math.pow((lineEnd.x-lineStart.x), 2) + Math.pow((lineEnd.y-lineStart.y), 2));
            var r = Math.sqrt(Math.pow((pointX-lineStart.x), 2) + Math.pow((pointY-lineStart.y), 2));

            var alpha = Math.asin((lineEnd.y-lineStart.y)/l);
            var betta = Math.asin((pointY-lineStart.y)/r);

            var gamma = Math.abs(alpha - betta);

            var sapma = Math.sin(gamma/180)*r;

            return sapma;
        }
    }

    function edm(path1, path2){
        var distanceMatrix = []
        var row = []
        for(i = 0; i < path1.length; i++){
            row = []
            for(j = 0; j < path2.length; j++){
                var dy = Math.abs(path1[i][0] - path2[j][0])
                var dx = Math.abs(path1[i][1] - path2[j][1])
                var dr = Math.sqrt(dy*dy + dx*dx)
                row.push(dr)
            }
            distanceMatrix.push(row)
        }
        return distanceMatrix
    }

    function dtw(dm){

        console.log('dm', dm);
        
        //getting row and column count
        var n = dm.length
        var m = dm[0].length

        console.log("m: " + m, "n: "+ n);
        

        //create zeros matrix
        var ac = []
        for(i = 0; i < n; i++){
            ac.push([])
            for(j = 0; j < m; j++){
                ac[i].push(0)
            }
        }
        console.log('zeros matrix', ac)
        

        //getting first node of path
        ac[0][0] = (0 + dm[0][0])
        console.log('first node', ac)
         
        for(j = 1; j < m; j++){
            ac[0][j] = ac[0][j-1] + dm[0][j]
        }
        console.log('first row', ac)

        for(i = 1; i < n; i++){
            ac[i][0] = ac[i-1][0] + dm[i][0]
        }
        console.log('first column', ac)

        for(i = 1; i < n; i++){
            for(j = 1; j < m; j++){
                ac[i][j] = Math.min(dm[i-1][j-1], dm[i-1][j], dm[i][j-1]) + dm[i][j]
            }
        }
        console.log('ac cost', ac)

        var totalDistance = 0
        var path = [[n-1, m-1]]
        var i = n - 1
        var j = m - 1

        while(i > 0 && j > 0){
            if(i == 0){
                j = j - 1
            }
            else if(j == 0){
                i = i - 1
            }
            else {
                if(ac[i-1][j] == Math.min(ac[i-1][j-1], ac[i-1][j], ac[i][j-1])){
                    i = i - 1
                }
                else if(ac[i][j-1] == Math.min(ac[i-1][j-1], ac[i-1][j], ac[i][j-1])){
                    j = j -1
                }
                else {
                    i = i - 1
                    j = j - 1
                }
            }
            totalDistance += dm[i][j]
            path.push([i, j])
        }
        path.push([0, 0])
        console.log('path: ', path)

        return {path: path, minDist: totalDistance}
    }

    function pathLength(path){
        var length = 0
        for(i = 0; i < path.length - 1; i++){
            var dy = Math.abs(path[i][0] - path[i+1][0])
            var dx = Math.abs(path[i][1] - path[i+1][1])
            var dr = Math.sqrt(dy*dy + dx*dx)
            length += dr
        }
        return length
    }

    function drawLines(path1, path2, path){
        for(i = 0; i < path.length; i++){
            console.log([path1[path[i][0]], path2[path[i][1]]], path[i][0], path[i][1])
            if(path1[path[i][0]] != undefined && path2[path[i][1]] != undefined){
                addPolyline([path1[path[i][0]], path2[path[i][1]]], '#ff0000')
            }
        }
    }

    function deletePathPart(path, square){
        for(i = 0; i < path.length; i++){
            if(path[i][0] < square.right && path[i][0] > square.left && path[i][1] < square.top && path[i][1] > square.bottom){
                path.splice(i,1)
                i--
            }
        }
        return path
    }

    function lcssdm(path1, path2, sigma){
        var simPnt = []
        var row = []
        for(i = 0; i <= path1.length; i++){
            row = []
            for(j = 0; j <= path2.length; j++){
                if(i == 0 || j == 0){
                    row.push(0)
                }
                else {
                    var dy = Math.abs(path1[i-1][0] - path2[j-1][0])
                    var dx = Math.abs(path1[i-1][1] - path2[j-1][1])
                    var dr = Math.sqrt(dy*dy + dx*dx)
                    if(dr < sigma){
                        row.push(1 - (dr/sigma))
                    }
                    else{
                        row.push(0)
                    }
                }
            }
            simPnt.push(row)
        }
        return simPnt
    }

    function lcss(simPnt){
        console.log('simPnt', simPnt)

        //getting row and column count
        var n = simPnt.length
        var m = simPnt[0].length

        console.log("m: " + m, "n: "+ n);
        

        //create zeros matrix
        var scoreLCS = []
        for(i = 0; i < n; i++){
            scoreLCS.push([])
            for(j = 0; j < m; j++){
                scoreLCS[i].push({value: 0})
            }
        }
        console.log('zeros matrix', scoreLCS)

        for(i = 1; i < n; i++){
            for(j = 1; j < m; j++){
                if(i == 0){
                    scoreLCS[i][j].value = 0
                    scoreLCS[i][j].dir = 'top'
                }
                else if(j == 0){
                    scoreLCS[i][j].value = 0
                    scoreLCS[i][j].dir = 'left'
                }
                else {
                    if(simPnt[i][j] != 0){
                        scoreLCS[i][j].value = simPnt[i][j]

                        max = Math.max(scoreLCS[i-1][j].value, scoreLCS[i][j-1].value)
                        if(max < simPnt[i][j]){
                            scoreLCS[i][j].dir = 'cross'
                        }
                        else{
                            if(max == scoreLCS[i-1][j].value){
                                scoreLCS[i][j].dir = 'top'
                            }
                            else {
                                scoreLCS[i][j].dir = 'left'
                            }
                        }
                    }
                    else {
                        max = Math.max(scoreLCS[i-1][j].value, scoreLCS[i][j-1].value)
                        scoreLCS[i][j].value = simPnt[i][j]
                        if(max == scoreLCS[i-1][j].value){
                            scoreLCS[i][j].value = simPnt[i][j]
                            scoreLCS[i][j].dir = 'top'
                        }
                        else {
                            scoreLCS[i][j].dir = 'left'
                        }
                    }
                }
            }
        }

        console.log(scoreLCS)
        var L = []
        /*var i = n-1; j = m-1;
        while(i >= 0 && j >= 0){
            if(scoreLCS[i][j].dir == 'cross'){
                i--
                j--
                L.push([i, j])
            }
            else if(scoreLCS[i][j].dir == 'left'){
                j--
            }
            else {
                i--
            }
        }*/

        for(i = 0; i < n; i++){
            max = scoreLCS[i][0].value
            var x = 0, y = 0
            for(j = 0; j < m; j++){
                if(scoreLCS[i][j].dir == 'cross' && max < scoreLCS[i][j].value){
                    max = scoreLCS[i][j].value
                    y = i
                    x = j
                }
            }
            if(x != 0 && y != 0){
                console.log(y, x, max)
                L.push([y-1, x-1])
            }
        }

        console.log(L)
        return L
    }

    function subPathLangth(path1, path2, path){
        var subPath = 0
        for(i = 0; i < path.length-1; ){
            if(path[i][0] + 1 == path[i+1][0]){
                for(j = i; j < path.length-1 && path[j][0] + 1 == path[j+1][0]; j++){}
                if(path[i] && path[j]){
                    console.log(path1.slice(path[i][0], path[j][0] + 1), path2.slice(path[i][1], path[j][1] + 1), i, j)
                    var path1SubSeqLen = pathLength(path1.slice(path[i][0], path[j][0] + 1))
                    var path2SubSeqLen = pathLength(path2.slice(path[i][1], path[j][1] + 1))
                    //addPolyline(path1.slice(path[i][0], path[j][0] + 1), '#00ff00')
                    //addPolyline(path2.slice(path[i][1], path[j][1] + 1), '#00ff00')
                    subPath += Math.min(path1SubSeqLen, path2SubSeqLen)
                }
                console.log(i, j)
                i = j
            }
            else {
                i++
            }
        }
        return subPath
    }
})