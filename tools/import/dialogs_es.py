D=[
("Tại sân bay","¿Tiene algo que declarar?","Bạn có gì cần khai báo không?","No, solo equipaje de mano.","Me llamo Pablo.","Mañana voy al cine."),
("Ở nhà hàng","¿Desean algo de postre?","Quý khách có muốn tráng miệng gì không?","Sí, un flan, por favor.","Vivo en Valencia.","Tengo veinte años."),
("Hỏi đường","Perdone, ¿dónde está la estación?","Xin lỗi, nhà ga ở đâu ạ?","Siga recto y gire a la derecha.","Es muy caro.","Me gusta el fútbol."),
("Mua sắm","¿Cuánto cuesta esta camisa?","Chiếc áo sơ mi này giá bao nhiêu?","Cuesta veinte euros.","Es mi hermano.","Estoy cansado."),
("Ở khách sạn","Buenas noches, ¿tiene una reserva?","Chào buổi tối, anh/chị có đặt phòng trước không?","Sí, a nombre de López.","No me gusta el café.","Hoy hace calor."),
("Tại phòng khám","¿Qué le duele?","Bạn bị đau ở đâu?","Me duele la cabeza.","Voy en autobús.","Es de Madrid."),
("Gọi điện thoại","¿Diga? ¿Quién habla?","Alô? Ai đang nói đấy?","Soy Marta, ¿puedo hablar con Luis?","Sí, el lunes.","Una cerveza, por favor."),
("Gặp lại bạn bè","¿Qué tal el fin de semana?","Cuối tuần của bạn thế nào?","Muy bien, fui a la playa.","Mi madre es profesora.","No tengo hambre."),
("Rủ đi xem phim","¿Quieres venir al cine esta noche?","Tối nay bạn có muốn đi xem phim không?","Sí, ¿a qué hora empieza?","Soy de Colombia.","Ayer llovió mucho."),
("Nói về nghề nghiệp","¿A qué te dedicas?","Bạn làm nghề gì?","Soy ingeniero.","Estoy en casa.","Son las tres."),
("Hỏi giờ","¿Qué hora es?","Mấy giờ rồi?","Son las cinco y media.","Vivo cerca.","Tengo dos hermanos."),
("Xin lỗi vì đến muộn","Perdona, llego tarde.","Xin lỗi, mình đến muộn.","No pasa nada, acabamos de empezar.","Sí, me encanta.","Hasta mañana."),
("Thanh toán ở quán cà phê","¿Algo más?","Quý khách dùng thêm gì không ạ?","No, nada más, gracias. La cuenta, por favor.","Me llamo Elena.","A las ocho."),
("Thuê nhà","¿Cuántas habitaciones tiene el piso?","Căn hộ có mấy phòng ngủ?","Tiene tres habitaciones y dos baños.","Trabajo en un banco.","Es muy simpático."),
("Trong lớp học","¿Puede repetir, por favor? No he entendido.","Bạn có thể nhắc lại không? Tôi chưa hiểu.","Claro, lo repito más despacio.","Vivo en Hanói.","Me gusta correr."),
("Nói về sở thích","¿Qué haces en tu tiempo libre?","Lúc rảnh bạn làm gì?","Leo novelas y toco la guitarra.","Son diez euros.","Estoy bien, gracias."),
("Thời tiết","¿Qué tiempo hace hoy?","Hôm nay thời tiết thế nào?","Hace sol, pero hace frío.","Es mi cumpleaños.","Voy al médico."),
("Đặt bàn qua điện thoại","¿Para cuántas personas es la mesa?","Bàn này dành cho mấy người ạ?","Para cuatro personas, a las nueve.","Es mi primo.","Cerca del parque."),
]
def dialogs():
    out=[]
    for sc,line,vi,ok,b1,b2 in D:
        out.append({"scene":sc,"line":line,"lineVi":vi,"options":[{"text":ok,"correct":True},{"text":b1,"correct":False},{"text":b2,"correct":False}]})
    return out
