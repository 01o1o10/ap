var myMap
var latlong = []
var points = {}
var point1, point2, square = {}
var newPath = []
$(document).ready(function(){
    //// IMPORTS
    const socket = io.connect('http://localhost:60000')
    
    //// VARIABLES

    //// START
    ymaps.ready(init)
    $('.select-files').SumoSelect({placeholder: 'Select view datas', csvDispCount: 5, selectAll: true });

    //// codes
    document.getElementById('data-input').onchange = function(e) {
        latlong = []
        readFiles(document.getElementById('data-input').files)
    }

    $('#set-map-line').click(function(){
        var fi = $('.select-files').val()
        var color = document.getElementById('choose-color').value
        for(i in fi){
            mapFunctions.addMark(latlong[fi[i]][0], fi[i])
            mapFunctions.addPolyline(latlong[fi[i]], color)
        }
    })

    $('#reset-map').click(function(){
        myMap.geoObjects.removeAll()
        point1 = undefined
    })

    $("#set-map-point").click(function(){
        var fi = $('.select-files').val()
        for(i in fi){
            mapFunctions.printPointPath(latlong[fi[i]])
        }
    })

    $('#reduction').click(function(){
        var fi = $('.select-files').val()
        var tolerance = 0.00000001 * document.getElementById('tolerance').value
        //console.log(tolerance)
        for(i in fi){
            latlong[fi[i]] = reduction.rdp(latlong[fi[i]], tolerance)
        }
        $('#set-map').click()
    })

    $('#dtw').click(function(){
        var fi = $('.select-files').val()

        if(fi.length == 2){
            var distanceMatrix = dtw.euclideanDistanceMatrix(latlong[fi[0]], latlong[fi[1]])
            var dtwResult = dtw.dtw(distanceMatrix)
            mapFunctions.drawLines(latlong[fi[0]], latlong[fi[1]], dtwResult.pathIndexs)
            var path1Length = tools.pathLength(latlong[fi[0]])
            var path2Length = tools.pathLength(latlong[fi[1]])
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
            var simPnt = lcss.lcssdm(latlong[fi[0]], latlong[fi[1]], sigma)
            var L = lcss.lcss(simPnt)
            mapFunctions.drawLines(latlong[fi[0]], latlong[fi[1]], L)
            var path1Length = tools.pathLength(latlong[fi[0]])
            var path2Length = tools.pathLength(latlong[fi[1]])
            var subSimPathLength = tools.subPathLangth(latlong[fi[0]], latlong[fi[1]], L)
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
            latlong[fi[i]] = tools.deletePathPart(latlong[fi[i]], square)
        }
        point1 = undefined
    })

    $('#new-path').click(function(){
        socket.emit('new-path', newPath)
        newPath = []
    })

    $('#car-count-submit').click(function(){
        $('#car-count-modal').modal('hide')
        beginTime = document.getElementById('begin-time').value
        endTime = document.getElementById('end-time').value
        maxTime = document.getElementById('max-time').value
        disTol = parseFloat(document.getElementById('distance-tolerance').value)
        console.log(beginTime, endTime, maxTime)

        mapFunctions.addCircle(points.p1, 140000*disTol)
        mapFunctions.addCircle(points.p2, 140000*disTol)

        var fi = $('.select-files').val()
        pathes = []
        voyageCount = 0
        for(i in fi){
            temp = carcount(latlong[fi[i]], points.p1, points.p2, beginTime, endTime, maxTime, disTol)
            if(temp.count != 0){
                pathes.push(temp.path)
                voyageCount += temp.count
            }
        }
        document.getElementById('sonuc').innerText = 'Voyage Count: ' + voyageCount

        for(i in pathes){
            mapFunctions.addPolyline(pathes[i], "#ff0000")
        }
        
    })

    $('#show-coordinat').click(function(){
        lat = document.getElementById('latitude').value
        long = document.getElementById('longitude').value
        mapFunctions.addMark([lat, long], 'lat: ' + lat + ' long: ' + long)
    })

    $('#ed-for-count').click(function(){
        var fi = $('.select-files').val()
        if(fi.length == 2){
            var similarty = ed.edForCount(latlong[fi[0]], latlong[fi[1]]) * 100
            document.getElementById('sonuc').innerText = 'Similarity: %' + Math.round(similarty)
            console.log('ED Similarity for length', similarty)
        }
        else{
            alert("For this algorithm just you must select two trajectory!")
        }
    })

    $('#ed-for-length').click(function(){
        var fi = $('.select-files').val()
        if(fi.length == 2){
            var similarty = ed.edForLength(latlong[fi[0]], latlong[fi[1]])*100
            document.getElementById('sonuc').innerText = 'Similarity: %' + Math.round(similarty)
            console.log('ED Similarity for length', similarty)
        }
        else{
            alert("For this algorithm just you must select two trajectory!")
        }
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
            point = e.get('coords')
            document.getElementById('latitude').value = point[0]
            document.getElementById('longitude').value = point[1]
            if(e.get('type') == 'click'){
                d = new Date().toISOString()
                console.log('path oluşturuluyor')
                mapFunctions.addMark(point, 'New Path Node')
                newPath.push({ll: point, date: d.slice(0, 10), time: d.slice(11, 22)})
            }
            else if(point1 == undefined){
                console.log('rectangle ya girdi')
                point1 = point;
                mapFunctions.addMark(point1, 'Mark')
            }
            else {
                point2 = point
                mapFunctions.addMark(point2, 'Mark')
                //addRectangle([point1, point2])
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
                points.p1 = point1
                points.p2 = point2
                point1 = undefined
            }
            
        });
    }

    mapFunctions = {
    
        addMark: function(ll, num){
            var myPlacemark = new ymaps.Placemark(ll, {hintContent: '' + num});
            myMap.geoObjects.add(myPlacemark)
        },
    
        addRectangle: function(ll){
            var myRectangle = new ymaps.GeoObject({
                geometry: {
                  type: "Rectangle",
                  coordinates: ll
                }
              })
              myMap.geoObjects.add(myRectangle)
        },
    
        addCircle: function(ll, radius){
            var myCircle = new ymaps.Circle([ll, radius])
            myMap.geoObjects.add(myCircle)
        },
        
        addPolyline: function(lldata, color){
            var myPolyline = new ymaps.Polyline(
                lldata,
                {},
                {
                  strokeWidth: 2,
                  strokeColor: color,
                  draggable: true
                })
            myMap.geoObjects.add(myPolyline)
        },
    
        printPointPath: function(path){
            for(i in path){
                addMark(path[i], i)
            }
        },

        drawLines: function(path1, path2, path){
            for(i = 0; i < path.length; i++){
                //console.log([path1[path[i][0]], path2[path[i][1]]], path[i][0], path[i][1])
                if(path1[path[i][0]] != undefined && path2[path[i][1]] != undefined){
                    mapFunctions.addPolyline([path1[path[i][0]], path2[path[i][1]]], '#ff0000')
                }
            }
        }
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

    dtw = {
        euclideanDistanceMatrix: function(path1, path2){
            var distanceMatrix = []
            var row = []
            for(i = 0; i < path1.length; i++){
                row = []
                for(j = 0; j < path2.length; j++){
                    row.push(tools.distance(path1[i], path2[j]))
                }
                distanceMatrix.push(row)
            }
            return distanceMatrix
        },

        dtw: function(dm){

            //console.log('dm', dm);
            
            //getting row and column count
            var n = dm.length
            var m = dm[0].length
    
            //console.log("m: " + m, "n: "+ n);
            
    
            //create zeros matrix
            var ac = []
            for(i = 0; i < n; i++){
                ac.push([])
                for(j = 0; j < m; j++){
                    ac[i].push(0)
                }
            }
            //console.log('zeros matrix', ac)
            
    
            //getting first node of path
            ac[0][0] = (0 + dm[0][0])
            //console.log('first node', ac)
             
            for(j = 1; j < m; j++){
                ac[0][j] = ac[0][j-1] + dm[0][j]
            }
            //console.log('first row', ac)
    
            for(i = 1; i < n; i++){
                ac[i][0] = ac[i-1][0] + dm[i][0]
            }
            //console.log('first column', ac)
    
            for(i = 1; i < n; i++){
                for(j = 1; j < m; j++){
                    ac[i][j] = Math.min(dm[i-1][j-1], dm[i-1][j], dm[i][j-1]) + dm[i][j]
                }
            }
            //console.log('ac cost', ac)
    
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
            //console.log('path: ', path)
    
            return {pathIndexs: path, minDist: totalDistance}
        }
    }

    tools = {
        deletePathPart: function(path, square){
            for(i = 0; i < path.length; i++){
                if(path[i][0] < square.right && path[i][0] > square.left && path[i][1] < square.top && path[i][1] > square.bottom){
                    path.splice(i,1)
                    i--
                }
            }
            return path
        },

        distance: function(p1, p2){
            return Math.sqrt(Math.pow((p1[0]-p2[0]), 2) + Math.pow((p1[1] - p2[1]), 2))
        },

        pathLength: function(path){
            var length = 0
            for(i = 0; i < path.length - 1; i++){
                length += tools.distance(path[i], path[i+1])
            }
            return length
        },

        subPathLangth: function(path1, path2, path){
            var subPath = 0
            for(i = 0; i < path.length-1; ){
                if(path[i][0] + 1 == path[i+1][0]){
                    for(j = i; j < path.length-1 && path[j][0] + 1 == path[j+1][0]; j++){}
                    if(path[i] && path[j]){
                        console.log(path1.slice(path[i][0], path[j][0] + 1), path2.slice(path[i][1], path[j][1] + 1), i, j)
                        var path1SubSeqLen = tools.pathLength(path1.slice(path[i][0], path[j][0] + 1))
                        var path2SubSeqLen = tools.pathLength(path2.slice(path[i][1], path[j][1] + 1))
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
    }

    lcss = {
        lcssdm: function(path1, path2, sigma){
            var simPnt = []
            var row = []
            var dr
            for(i = 0; i < path1.length; i++){
                row = []
                for(j = 0; j < path2.length; j++){
                    dr = tools.distance(path1[i], path2[j])
                    if(i == 0 || j == 0){
                        row.push(0)
                    }
                    else {
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
        },
    
        lcss: function(simPnt){
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
    }

    function carcount(path, beginCoords, endCoords, beginTime, endTime, maxTime, disTol){

        possibleBeginPoints = []
        possibleEndPoints = []
        beginNearest = {proximity:disTol}
        endNearest = {proximity:disTol}
        for(i in path){
            if(beginNearest.proximity > tools.distance(beginCoords, path[i])){
                beginNearest.point = path[i]
                beginNearest.proximity = tools.distance(beginCoords, path[i])
            }
            else if(beginNearest.proximity != disTol){
                possibleBeginPoints.push(beginNearest.point)
                beginNearest.proximity = disTol
            }
            else if(endNearest.proximity > tools.distance(endCoords, path[i])){
                endNearest.point = path[i]
                endNearest.proximity = tools.distance(endCoords, path[i])
                if(i == path.length -1){
                    possibleEndPoints.push(endNearest.point)
                }
            }
            else if(endNearest.proximity != disTol){
                possibleEndPoints.push(endNearest.point)
                endNearest.proximity = disTol
            }
        }

        console.log('possibleBeginPoints: ', possibleBeginPoints)
        console.log('possibleEndPoints: ', possibleEndPoints)

        voyages = []
        for(i in possibleEndPoints){
            lastBeginPoint = undefined
            for(j in possibleBeginPoints){
                if(possibleBeginPoints[j][2] + possibleBeginPoints[j][3] < possibleEndPoints[i][2] + possibleEndPoints[i][3]){
                    //console.log(possibleBeginPoints[j][3] + ' < ' + possibleEndPoints[i][3])
                    lastBeginPoint = j
                }
                else{
                    //console.log(possibleBeginPoints[j][3] + ' > ' + possibleEndPoints[i][3])
                    break
                }
            }
            if(lastBeginPoint != undefined){
                voyages.push({start: possibleBeginPoints[lastBeginPoint], end: possibleEndPoints[i]})
                //console.log(possibleBeginPoints)
                lastBeginPoint++
                possibleBeginPoints = possibleBeginPoints.slice(lastBeginPoint, possibleBeginPoints.length)
                //console.log(possibleBeginPoints)
            }
        }

        for(i in voyages){
            if((beginTime > voyages[i].start[3]) || (voyages[i].start[3] > endTime) || ((Number(maxTime.split(':')[0])*60*60*1000 + Number(maxTime.split(':')[1])*60*1000) < ((new Date(voyages[i].end[2] + 'T' + voyages[i].end[3])) - (new Date(voyages[i].start[2] + 'T' + voyages[i].start[3]))))){
                print('zamanı aşıyor', i)
                voyages.splice(i, 1)
            }
        }
        console.log('voyages: ', voyages)

        return {count: voyages.length, path: path}

    }

    ed = {
        edForCount: function(path1, path2){
            var shortestPathLength = Math.min(path1.length, path2.length)
            var sumDistance = 0

            for(i = 0; i < shortestPathLength; i++){
                sumDistance += tools.distance(path1[i], path2[i])
                mapFunctions.addPolyline([path1[i], path2[i]], '#ff0000')
            }

            return sumDistance/shortestPathLength //ED Similarity
        },

        edForLength: function(path1, path2){
            var shortestPathLength = Math.min(path1.length, path2.length)
            var sumDistance = 0
            
            for(i = 0; i < shortestPathLength; i++){
                sumDistance += tools.distance(path1[i], path2[i])
                mapFunctions.addPolyline([path1[i], path2[i]], '#ff0000')
            }

            if(path1.length < path2.length){
                return 1 - (sumDistance/tools.pathLength(path1)) //ED Similarity
            }
            else{
                return 1 - (sumDistance/tools.pathLength(path2)) //ED Similarity
            }
        }
    }
})