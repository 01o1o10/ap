const fs = require('fs')

console.log(fs.readdir(__dirname, function(err, files){
    files.forEach(file =>{
        console.log(file)
    })
}));
