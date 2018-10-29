var sql = require('./../sql')

if(typeof require !== 'undefined') XLSX = require('xlsx')

var workbook = XLSX.readFile('IL_ILCE_LISTESI.xls')
var first_sheet_name = workbook.SheetNames[0]
 
/* Get worksheet */
var data = XLSX.utils.sheet_to_json(workbook.Sheets[first_sheet_name])

for(i in data){
    sql.query("insert into sehirler(sehir_id, sehir_ad) values(" + data[i].il_kodu + ", '" + data[i].il_ad + "')", function(check){
        console.log(check)
    })
    sql.query("insert into ilceler(ilce_id, ilce_ad, ilce_sehir) values(" + data[i].ilce_kodu + ", '" + data[i].ilce_ad + "', " + data[i].il_kodu + ")", function(check){
        console.log(check)
    })
}
