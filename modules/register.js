const sql = require('./../modules/sql')

module.exports = function(data){
    if(data.name &&  data.lname && data.uname && data.pass && data.apass && data.email && data.city && data.town){
        if(data.pass == data.apass){
            sql.query("select * from musteriler where musteri_username='" + data.uname + "'", function(check){
                if(check.length == 0){
                    console.log(validateEmail(data.email))
                    if(validateEmail(data.email)){
                        sqlStatement = "insert into musteriler(musteri_username, musteri_pass, musteri_ad, musteri_soyad, musteri_dtarih, musteri_gelir, musteri_tel, musteri_mail, musteri_sehir, musteri_ilce) values('" + data.uname + "', '" + data.pass + "', '" + data.name + "', '" + data.lname + "', '" + data.bday + "', " + data.income + ", '" + data.phone + "', '" + data.email + "', " + data.city + ", " + data.town + ")"
                        //console.log(sqlStatement)
                        sql.query(sqlStatement, function(check){
                            if(check.insertId){
                                return {status: true, message: 'Kaydınız tamamlandı!'}
                            }
                        })
                    }
                    else {
                        return {status: false, message: 'E-posta adresiniz doğrulanamadı!'}
                    }
                }
                else {
                    return {status: false, message: 'Bu kullanıcı adı alınmıştır!'}
                }
            })
        }
        else {
            return {status: false, message: 'Girdiğiniz parola uyuşmuyor!'}
        }
    }
    else {
        return {status: false, message: 'Zorunlu alanlar boş bırakılamaz!'}
    }
}

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

/* EKSİKLER
register modalda açılan menünün arkaplanı beyaz
register verilerini geçerleme kısmında şehir ve ilçenin seçilmesini zorunlu kılma
register sırasında telefon geçerleme
register sırasında kullanıcı adını anlık olarak geçerleme
register sırasında epostayı geçerleme
*/