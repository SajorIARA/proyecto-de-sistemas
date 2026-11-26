"""Lista curada de los 30 destinos pedidos por el usuario.

Cada fila conserva la URL que respalda la ficha y la fuente de coordenadas.
Los valores de horario, costo y dirección se transcriben de fuentes públicas;
cuando no hay evidencia se usa literalmente ``No verificado``. Las coordenadas
de vía se identifican como aproximadas en su URL de origen.
"""

from __future__ import annotations

from dataclasses import dataclass

NO_VERIFICADO = "No verificado"


@dataclass(frozen=True)
class DestinoSolicitado:
    nombre: str
    categoria: str
    descripcion: str
    horario: str
    costo: str
    direccion: str
    ficha_url: str
    url_oficial: str
    url_coordenadas: str
    latitud: float | None
    longitud: float | None
    archivo_commons: str
    terminos_imagen: str
    origenes_imagen_obsoletos: tuple[str, ...] = ()


_NOMINATIM = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q="


def _nominatim(consulta: str) -> str:
    from urllib.parse import quote

    return _NOMINATIM + quote(consulta)


DESTINOS_SOLICITADOS: tuple[DestinoSolicitado, ...] = (
    # -------------------------- museos y plazas --------------------------
    DestinoSolicitado(
        nombre="Museo Nacional de Arte",
        categoria="Cultura",
        descripcion=(
            "Ocupa el antiguo Palacio de los Condes de Arana, en la esquina de Comercio y "
            "Socabaya, y fue inaugurado en 1966; la ficha municipal lo considera uno de los "
            "ejemplos más destacados de arquitectura civil andina y recuerda que fue declarado "
            "Monumento Nacional en 1960. Su colección reúne pinturas virreinales, del siglo XIX "
            "y contemporáneas, además de esculturas, muebles coloniales y representaciones de "
            "ángeles y vírgenes andinas."
        ),
        horario="MARTES A VIERNES 09:00–17:00; SABADOS 09:00–13:00",
        costo="INGRESO NACIONALES 5 Bs.-; INGRESO EXTRANJEROS 20 Bs.-",
        direccion="Esquina Comercio y Socabaya, Centro, La Paz",
        ficha_url="https://lapaz.bo/turismo/centro-museo-nacional-de-arte/",
        url_oficial="https://lapaz.bo/turismo/centro-museo-nacional-de-arte/",
        url_coordenadas=_nominatim("Museo Nacional de Arte, La Paz"),
        latitud=-16.4958890,
        longitud=-68.1343361,
        archivo_commons="Museo Nacional de Arte – La Paz.jpg",
        terminos_imagen="Museo Nacional de Arte La Paz Bolivia",
    ),
    DestinoSolicitado(
        nombre="Museo Nacional de Etnografía y Folklore",
        categoria="Cultura",
        descripcion=(
            "La ficha municipal lo describe como uno de los principales centros de difusión de "
            "la etnografía en Bolivia: sus orígenes se remontan al Departamento Científico de "
            "Etnografía creado en 1925 y abrió sus puertas en 1962 como Museo de Artesanía y "
            "Arte Popular. Resguarda 30.000 bienes culturales —máscaras, cerámica, tejidos, arte "
            "plumario y numismática— y alrededor de 171.000 materiales documentales y "
            "audiovisuales. Desde 1987 es anfitrión anual de la Reunión Anual de Etnología."
        ),
        horario=(
            "LUNES A VIERNES 8:45–12:30 y 14:30–18:30; SÁBADO 8:30–16:00; "
            "DOMINGO 8:30–13:30"
        ),
        costo="NACIONALES Bs.- 5; EXTRANJEROS Bs.-20",
        direccion="Centro Histórico de La Paz",
        ficha_url="https://lapaz.bo/turismo/centro-museo-de-etnografia-y-floklore/",
        url_oficial="https://lapaz.bo/turismo/centro-museo-de-etnografia-y-floklore/",
        url_coordenadas=_nominatim("Museo Nacional de Etnografía y Folklore, La Paz"),
        latitud=-16.4944819,
        longitud=-68.1351409,
        archivo_commons="Museo Nacional de Etnografía y Folklore 01.jpg",
        terminos_imagen="Museo Nacional de Etnografia y Folklore La Paz",
    ),
    DestinoSolicitado(
        nombre="Centro Cultural Museo San Francisco",
        categoria="Cultura",
        descripcion=(
            "Ocupa las instalaciones de la Basílica Menor de San Francisco y el Convento de "
            "Nuestra Señora de los Ángeles, construidas inicialmente en 1549 y remodeladas "
            "extensamente desde 1743; una parte se convirtió en museo en 2005. En su cripta "
            "están sepultadas figuras como Eduardo Avaroa, Pedro Domingo Murillo y José "
            "Ballivián. Sus salas exhiben fotografías, prendas, medallas, relicarios y pinturas "
            "indígenas de hace más de trescientos años, además de espacios vinculados a antiguas "
            "prácticas de tortura."
        ),
        horario="LUNES A SÁBADO 10:00–18:00",
        costo="NACIONALES Bs.- 20; EXTRANJEROS Bs.- 40; ESTUDIANTES ESCOLARES Bs.- 10",
        direccion="Plaza Mayor de San Francisco, Centro, La Paz",
        ficha_url="https://lapaz.bo/turismo/centro-cultural-museo-de-san-francisco/",
        url_oficial="https://lapaz.bo/turismo/centro-cultural-museo-de-san-francisco/",
        url_coordenadas=_nominatim("Museo San Francisco, La Paz"),
        latitud=-16.4962209,
        longitud=-68.1372763,
        archivo_commons="Editaton Museo San Francisco (38).JPG",
        terminos_imagen="Museo San Francisco La Paz Bolivia",
    ),
    DestinoSolicitado(
        nombre="Museo Tambo Quirquincho",
        categoria="Cultura",
        descripcion=(
            "Se ubica en el Centro Histórico de La Paz, en un antiguo tambo del siglo XVI que "
            "Alonso de Mendoza eligió en 1548 como sitio para fundar la ciudad. El edificio es de "
            "dos pisos con patio central, arquería barroco mestiza y un arco del siglo XVIII "
            "donado por el Arzobispado de La Paz en 1984. Sus exposiciones abarcan arte, "
            "arqueología, historia y tradiciones culturales."
        ),
        horario=(
            "LUNES Y DOMINGO Cerrado; MARTES A VIERNES 09:00–17:00; SÁBADO 09:00–13:00"
        ),
        costo="NACIONALES Bs.- 5; PROFESORES Bs.- 3; EXTRANJEROS Bs.- 8",
        direccion="Centro Histórico de La Paz",
        ficha_url="https://lapaz.bo/turismo/centro-museo-de-tambo-quirquincho/",
        url_oficial="https://lapaz.bo/turismo/centro-museo-de-tambo-quirquincho/",
        url_coordenadas=_nominatim("Museo Tambo Quirquincho, La Paz"),
        latitud=-16.4935586,
        longitud=-68.1380394,
        archivo_commons="Museo Tambo Quirquincho La Paz.jpg",
        terminos_imagen="Museo Tambo Quirquincho La Paz",
    ),
    DestinoSolicitado(
        nombre="Museo Nacional de Historia Natural",
        categoria="Cultura",
        descripcion=(
            "Fue establecido en 1980 para fomentar el progreso científico y cultural de Bolivia y "
            "promover las ciencias naturales. Cuenta con un herbario, colecciones de fauna "
            "autóctona y exhibiciones sobre la flora y fauna del país. En su patio se conservan "
            "la elefanta taxidermizada «Rossy» y el esqueleto de una ballena de más de diez "
            "metros de longitud."
        ),
        horario="SABADOS 09:00 a 16:00",
        costo=(
            "MAYORES DE 12 AÑOS Bs.- 5; MENORES DE 5 AÑOS Bs.- 3; ADULTOS MAYORES Y PERSONAS "
            "CON DISCAPACIDAD Bs.- 2; EXTRANJEROS Bs.- 12"
        ),
        direccion="Zona Sur de La Paz",
        ficha_url="https://lapaz.bo/turismo/sur-museo-nacional-de-historia-natural-de-bolivia/",
        url_oficial="https://lapaz.bo/turismo/sur-museo-nacional-de-historia-natural-de-bolivia/",
        url_coordenadas=_nominatim("Museo Nacional de Historia Natural, La Paz"),
        latitud=-16.5388723,
        longitud=-68.0707255,
        archivo_commons="Museo Nacional de Historia Natural (3274192149).jpg",
        terminos_imagen="Museo Nacional de Historia Natural Bolivia La Paz",
    ),
    DestinoSolicitado(
        nombre="Plaza Mayor de San Francisco",
        categoria="Cultura",
        descripcion=(
            "Según Wikipedia en español, la plaza Mayor de San Francisco está localizada en el "
            "centro de la ciudad de La Paz, Bolivia. Es un atrio urbano que se despliega frente "
            "a la Basílica de San Francisco y el Centro Cultural Museo San Francisco."
        ),
        horario=NO_VERIFICADO,
        costo=NO_VERIFICADO,
        direccion="Centro de La Paz, frente a la Basílica de San Francisco",
        ficha_url="",
        url_oficial="https://es.wikipedia.org/wiki/Plaza_Mayor_de_San_Francisco",
        url_coordenadas="https://www.wikidata.org/wiki/Q7203642",
        latitud=-16.4961044,
        longitud=-68.1371350,
        archivo_commons="Plaza San Francisco - La Paz 1.jpg",
        terminos_imagen="Plaza San Francisco La Paz Bolivia",
    ),
    DestinoSolicitado(
        nombre="Plaza de las Culturas",
        categoria="Cultura",
        descripcion=(
            "Es un espacio público del centro de La Paz que colinda con las calles Potosí y "
            "Avenida Mariscal Santa Cruz. Se constituyó alrededor de la Casa de la Cultura Franz "
            "Tamayo y fue remodelada en 2012 y 2013, con mobiliario y pisos de concreto y piedra "
            "y una cubierta metálica en forma de abanico. Sus muros presentan obras escultóricas "
            "contemporáneas del maestro Ricardo Pérez Alcalá."
        ),
        horario=NO_VERIFICADO,
        costo=NO_VERIFICADO,
        direccion="Calles Potosí y Avenida Mariscal Santa Cruz, Centro, La Paz",
        ficha_url="",
        url_oficial="https://es.wikipedia.org/wiki/Plaza_de_las_Culturas",
        url_coordenadas="https://www.wikidata.org/wiki/Q21503396",
        latitud=-16.4952108,
        longitud=-68.1363237,
        archivo_commons="Cóndores 1.jpg",
        terminos_imagen="Plaza de las Culturas La Paz Bolivia",
    ),
    DestinoSolicitado(
        nombre="Casa de la Cultura Franz Tamayo",
        categoria="Cultura",
        descripcion=(
            "Es una institución cultural de La Paz ubicada en el Centro Histórico y parte del "
            "Casco Urbano Central, considerada un importante hito urbano. Debe su nombre al "
            "político y poeta Franz Tamayo y alberga el teatro Modesta Sanginés, salas de "
            "exposición y la Biblioteca Costa de la Torre, centro documental municipal."
        ),
        horario=(
            "Lunes a Viernes 08:30 a 12:30 y 14:30 a 18:30 (atención de la Dirección de "
            "Culturas; no es un horario de visita verificado)"
        ),
        costo=NO_VERIFICADO,
        direccion="Esquina de las calles Potosí y Santa Cruz, Centro, La Paz",
        ficha_url="",
        url_oficial="https://es.wikipedia.org/wiki/Casa_de_la_Cultura_Franz_Tamayo",
        url_coordenadas=_nominatim("Casa de la Cultura Franz Tamayo, La Paz"),
        latitud=-16.4952663,
        longitud=-68.1364877,
        archivo_commons="Casa de la Cultura Franz Tamayo - Detalle Anterior.jpg",
        terminos_imagen="Casa de la Cultura Franz Tamayo La Paz",
    ),
    DestinoSolicitado(
        nombre="Centro Cultural de España",
        categoria="Cultura",
        descripcion=(
            "Es un espacio cultural del Centro Histórico de La Paz que funciona desde 2012 como "
            "proyecto de la Red de Centros Culturales de la Cooperación española. Promueve el "
            "intercambio cultural entre España y Bolivia con actividades en artes visuales, "
            "plásticas, escénicas, literatura e historia. Su sitio oficial registra su dirección "
            "en la Avenida Camacho #1484, entre Loayza y Bueno."
        ),
        horario=(
            "Atención: lunes a sábado de 9:00 a 21:00; Mediateca: lunes a viernes de 10:00 a "
            "21:00 y sábados de 10:00 a 18:00; Administración: con previa cita"
        ),
        costo=NO_VERIFICADO,
        direccion="Avenida Camacho #1484, entre Loayza y Bueno, Casco Viejo, La Paz",
        ficha_url="",
        url_oficial="https://www.aecid.es/w/centro-cultural-de-espa%C3%B1a-en-la-paz-bolivia",
        url_coordenadas=_nominatim("Centro Cultural de España en La Paz"),
        latitud=-16.4998561,
        longitud=-68.1324437,
        archivo_commons="Centro Cultural de España - Fachada.jpg",
        terminos_imagen="Centro Cultural de España La Paz Bolivia",
    ),
    DestinoSolicitado(
        nombre="Plaza Tejada Sorzano",
        categoria="Cultura",
        descripcion=(
            "La ficha municipal describe un espacio cultural de La Paz concebido como exposición "
            "al aire libre sobre las civilizaciones precolombinas de la región, fundado en la "
            "década de 1980. Inaugurada en julio y conocida popularmente como Plaza del Stadium, "
            "su nombre oficial honra al presidente boliviano entre 1934 y 1936; alberga un "
            "templete semisubterráneo tiwanakota diseñado por Arturo Posnansky y la estela "
            "Pachamama o Monolito Bennett. La ficha destaca además cerámica precolombina, "
            "textiles, trabajos en metal y el monumento a Posnansky."
        ),
        horario="LUNES A VIERNES 08:00–16:00",
        costo="INGRESO GRATUITO",
        direccion="Miraflores, junto al Estadio Hernando Siles, La Paz",
        ficha_url=(
            "https://lapaz.bo/turismo/"
            "centro-museo-arqueologico-a-cielo-abierto-plaza-del-hombre-americano/"
        ),
        url_oficial=(
            "https://lapaz.bo/turismo/"
            "centro-museo-arqueologico-a-cielo-abierto-plaza-del-hombre-americano/"
        ),
        url_coordenadas=_nominatim("Plaza Tejada Sorzano, La Paz"),
        latitud=-16.4994691,
        longitud=-68.1241837,
        archivo_commons="El Stadium de LaPaz.jpg",
        terminos_imagen="Plaza del Hombre Americano La Paz Bolivia",
    ),
    # ------------------------------ mercados -----------------------------
    DestinoSolicitado(
        nombre="Mercado de las Brujas",
        categoria="Cultura",
        descripcion=(
            "La ficha municipal indica que el mercado ofrece hierbas medicinales, objetos "
            "rituales, utensilios para prácticas chamánicas, remedios y pociones tradicionales, "
            "además de artesanías. Recomienda recorrerlo con cuidado porque los pasillos son "
            "estrechos y suelen estar concurridos, y pedir permiso antes de fotografiar a los "
            "vendedores o sus puestos."
        ),
        horario="SIEMPRE ABIERTO",
        costo="INGRESO GRATUITO",
        direccion="Calle Linares y Sagárnaga, Centro, La Paz",
        ficha_url="https://lapaz.bo/turismo/centro-mercado-de-las-brujas/",
        url_oficial="https://lapaz.bo/turismo/centro-mercado-de-las-brujas/",
        url_coordenadas=_nominatim("Mercado de las Brujas, La Paz, Bolivia"),
        latitud=-16.4962388,
        longitud=-68.1391523,
        archivo_commons="05-Mercado de las Brujas (La Paz)-1.jpg",
        terminos_imagen="Mercado de las Brujas La Paz Bolivia",
    ),
    DestinoSolicitado(
        nombre="Mercado Lanza",
        categoria="Cultura",
        descripcion=(
            "La ficha municipal describe puestos de salteñas, relleno de carne, anticuchos y api "
            "con pastel, junto a puestos de frutas y verduras, artesanías y expresiones de la "
            "cultura local. El edificio actual se construyó entre 2008 y 2010 para albergar a "
            "más de mil comerciantes."
        ),
        horario="LUNES A SÁBADO 07:00–21:00; DOMINGO 08:00–17:00",
        costo="INGRESO GRATUITO",
        direccion="Centro de La Paz, cerca de la Plaza Mayor de San Francisco",
        ficha_url="https://lapaz.bo/turismo/centro-mercado-lanza/",
        url_oficial="https://lapaz.bo/turismo/centro-mercado-lanza/",
        url_coordenadas=_nominatim("Mercado Lanza, La Paz, Bolivia"),
        latitud=-16.4947146,
        longitud=-68.1374120,
        archivo_commons="Nuevo Mercado Lanza.jpg",
        terminos_imagen="Nuevo Mercado Lanza La Paz Bolivia",
    ),
    DestinoSolicitado(
        nombre="Mercado Rodriguez",
        categoria="Cultura",
        descripcion=(
            "Sus raíces se remontan a la expropiación del Tambo del Carbón en 1937 y desde junio "
            "de 1950 recibe oficialmente el nombre de Mercado Pedro Rodríguez. Cuenta con "
            "secciones de comida, ropa y electrónica, y es un referente de insumos andinos y "
            "comida popular en La Paz."
        ),
        horario="LUNES A DOMINGO 09:00–16:00",
        costo="INGRESO GRATUITO",
        direccion="Macrodistrito Cotahuma, La Paz",
        ficha_url="https://lapaz.bo/turismo/cotahuma-mercado-rodriguez/",
        url_oficial="https://lapaz.bo/turismo/cotahuma-mercado-rodriguez/",
        url_coordenadas=_nominatim("Mercado Rodriguez, La Paz, Bolivia"),
        latitud=-16.5001315,
        longitud=-68.1389083,
        archivo_commons="Comedor popular del Mercado Rodriguez - La Paz, Bolivia.jpg",
        terminos_imagen="Mercado Rodriguez La Paz Bolivia comedor",
    ),
    DestinoSolicitado(
        nombre="Mercado Camacho",
        categoria="Cultura",
        descripcion=(
            "El Sistema de Información Territorial del GAMLP registra el Mercado Camacho como "
            "centro de abasto de la zona Santa Bárbara, en Av. Simón Bolívar esquina C. Bueno. "
            "La documentación fotográfica de Wikimedia Commons muestra mesas compartidas de "
            "comida en uno de sus pisos, con comensales durante el almuerzo."
        ),
        horario=NO_VERIFICADO,
        costo=NO_VERIFICADO,
        direccion="Av. Simón Bolívar esquina C. Bueno, zona Santa Bárbara, La Paz",
        ficha_url="",
        url_oficial="http://sitservicios.lapaz.bo/mapas/abasto/",
        url_coordenadas=_nominatim("Mercado Camacho, La Paz, Bolivia"),
        latitud=-16.5006201,
        longitud=-68.1311610,
        archivo_commons="Puestos de mercado, Mercado Camacho.jpg",
        terminos_imagen="Mercado Camacho La Paz Bolivia",
    ),
    DestinoSolicitado(
        nombre="Mercado Sopocachi",
        categoria="Cultura",
        descripcion=(
            "El listado municipal de centros de abasto ubica el Mercado Sopocachi en la calle "
            "Fernando Guachalla, zona Sopocachi, dentro del macrodistrito Cotahuma. La imagen de "
            "Wikimedia Commons lo documenta como mercado de La Paz, Bolivia."
        ),
        horario=NO_VERIFICADO,
        costo=NO_VERIFICADO,
        direccion="Calle Fernando Guachalla, Sopocachi, La Paz",
        ficha_url="",
        url_oficial="http://sitservicios.lapaz.bo/mapas/abasto/",
        url_coordenadas=_nominatim("Mercado Sopocachi, La Paz, Bolivia"),
        latitud=-16.5094822,
        longitud=-68.1296904,
        archivo_commons="Mercado Sopocachi.jpg",
        terminos_imagen="Mercado Sopocachi La Paz Bolivia",
    ),
    # ---------------------------- gastronomía ----------------------------
    DestinoSolicitado(
        nombre="Popular Cocina Boliviana",
        categoria="Gastronomía",
        descripcion=(
            "El perfil oficial se identifica como «popular cocina boliviana» y señala que sirve "
            "almuerzo de 12:00 a 14:30, con refresco, pan, k'allu y llajua como en las pensiones "
            "y comedores populares. El servicio es por orden de llegada, sin reserva, y el perfil "
            "destaca un vínculo con el Mercado Rodríguez; su dirección publicada es Calle Murillo "
            "No. 826. No se encontró una foto del local; la imagen adjunta es representativa de "
            "la gastronomía paceña."
        ),
        horario="Almuerzo 12:00–14:30; servicio por orden de llegada, sin reserva",
        costo="Menú de 3 pasos: Bs. 115 por persona",
        direccion="Calle Murillo No. 826, Centro, La Paz",
        ficha_url="",
        url_oficial="https://www.instagram.com/popularbolivia/",
        url_coordenadas=_nominatim("Calle Murillo 826, La Paz, Bolivia"),
        latitud=-16.4960440,
        longitud=-68.1384215,
        archivo_commons="Sopa de Maní.jpg",
        terminos_imagen="Sopa de mani Bolivia",
        origenes_imagen_obsoletos=(
            "https://commons.wikimedia.org/wiki/File:Plato_pace%C3%B1o_tradicional.jpg",
        ),
    ),
    DestinoSolicitado(
        nombre="La Boliviana",
        categoria="Gastronomía",
        descripcion=(
            "El sitio oficial presenta el proyecto como «Cocina fusión boliviana desde 2022» y lo "
            "ubica en Calle Sagárnaga esquina Murillo #213, Galería Chuquiago, segundo piso. El "
            "menú oficial ofrece un recorrido «Descubre Bolivia» de tres tiempos con entrada, "
            "plato fuerte y postre. No se encontró una foto del local; la imagen adjunta es "
            "representativa de la gastronomía paceña."
        ),
        horario="De lunes a lunes: 12:00–22:00",
        costo="Descubre Bolivia, menú de 3 tiempos: Bs. 100",
        direccion="Calle Sagárnaga esquina Murillo #213, Galería Chuquiago, 2º piso, La Paz",
        ficha_url="",
        url_oficial="https://laboliviana.com/restaurante-la-paz-bolivia",
        url_coordenadas="https://laboliviana.com/restaurante-la-paz-bolivia",
        latitud=-16.49718239,
        longitud=-68.13873327,
        archivo_commons="Salteñas de Bolivia.jpg",
        terminos_imagen="Salteñas de Bolivia",
        origenes_imagen_obsoletos=(
            "https://commons.wikimedia.org/wiki/File:Plato_pace%C3%B1o_tradicional.jpg",
        ),
    ),
    DestinoSolicitado(
        nombre="La Rufina Restaurant",
        categoria="Gastronomía",
        descripcion=(
            "El sitio oficial describe una cocina basada en ingredientes 100 % bolivianos y "
            "técnicas de las abuelas. La página de restaurantes registra los locales de Sopocachi "
            "(Belisario Salinas #572) y Calacoto (16 Calacoto #8275); el menú de Sopocachi incluye "
            "entradas como Masaco, Anticucho e Ispi. No se encontró una foto del local; la imagen "
            "adjunta es representativa de la gastronomía paceña."
        ),
        horario="Sopocachi: lunes a sábado 12:00–22:00",
        costo="Bs. 30 (entrada Masaco, menú de Sopocachi)",
        direccion="Belisario Salinas #572, Sopocachi, La Paz",
        ficha_url="",
        url_oficial="https://larufinabolivia.com/restaurants",
        url_coordenadas=_nominatim("Belisario Salinas 572, Sopocachi, La Paz, Bolivia"),
        latitud=-16.5131150,
        longitud=-68.1302215,
        archivo_commons="Silpancho Cochabambino.jpg",
        terminos_imagen="Silpancho Cochabambino Bolivia",
        origenes_imagen_obsoletos=(
            "https://commons.wikimedia.org/wiki/File:Plato_pace%C3%B1o_tradicional.jpg",
        ),
    ),
    DestinoSolicitado(
        nombre="PLATO DE BARRO",
        categoria="Gastronomía",
        descripcion=(
            "La página oficial de Facebook y el perfil de TikTok registran el local en Av. "
            "Apumalla #929, media cuadra antes de llegar a Calatayud, con teléfono 74867703. Un "
            "aviso oficial en TikTok remite a los clientes a consultar días y horarios de "
            "atención, por lo que no se publica un horario fijo verificado. No se encontró una "
            "foto del local; la imagen adjunta es representativa de la gastronomía paceña."
        ),
        horario=NO_VERIFICADO,
        costo=NO_VERIFICADO,
        direccion="Av. Apumalla #929, media cuadra antes de Calatayud, La Paz",
        ficha_url="",
        url_oficial="https://www.facebook.com/platodebarro/",
        url_coordenadas=_nominatim("Avenida Apumalla 929, La Paz, Bolivia"),
        latitud=-16.4928838,
        longitud=-68.1456674,
        archivo_commons="Pique Macho Bolivia.jpg",
        terminos_imagen="Pique Macho Bolivia",
        origenes_imagen_obsoletos=(
            "https://commons.wikimedia.org/wiki/File:Plato_pace%C3%B1o_tradicional.jpg",
        ),
    ),
    DestinoSolicitado(
        nombre="HASTA LA VUELTA",
        categoria="Gastronomía",
        descripcion=(
            "La ficha municipal registra el nombre «Restaurante Hasta La Vuelta», la dirección "
            "Bajo Seguencoma, Julian Sandoval 1001, Ciudad La Paz, y el contacto 60646508. La "
            "ficha de referencia enumera platos con carne de res, pescado, pique macho, "
            "milanesa, salchipapa, picantes y cerdo. No se encontró una foto del local; la imagen "
            "adjunta es representativa de la gastronomía paceña."
        ),
        horario=(
            "Referencial (no publicado en la ficha municipal): viernes, sábado y domingo "
            "12:00–17:00; lunes a jueves cerrado"
        ),
        costo=NO_VERIFICADO,
        direccion="Bajo Seguencoma, Julian Sandoval 1001, La Paz",
        ficha_url="",
        url_oficial="https://lapaz.bo/turismo/restaurante/",
        url_coordenadas=_nominatim("Hasta La Vuelta, La Paz, Bolivia"),
        latitud=-16.5414586,
        longitud=-68.0947103,
        archivo_commons="Plato paceño tradicional.jpg",
        terminos_imagen="Plato paceño tradicional Bolivia",
    ),
    # ------------------ miradores y Mi Teleférico ------------------------
    DestinoSolicitado(
        nombre="Mirador Killi Killi",
        categoria="Mirador",
        descripcion=(
            "El portal municipal de la Periférica incluye el Mirador Killi Killi entre los "
            "atractivos del macrodestino. La ficha municipal detallada, enlazada desde ese "
            "portal, publica horario de lunes a domingo de 08:00 a 22:00 y acceso gratuito. "
            "Wikidata Q40587290 registra sus coordenadas y una fotografía reusable."
        ),
        horario="LUNES A DOMINGO 08:00 - 22:00",
        costo="INGRESO GRATUITO",
        direccion="Zona Periférica, La Paz",
        ficha_url="",
        url_oficial="https://lapaz.bo/turismo/periferica/",
        url_coordenadas="https://www.wikidata.org/wiki/Q40587290",
        latitud=-16.4950584,
        longitud=-68.1274447,
        archivo_commons="La Paz - Killi Killi 2.jpg",
        terminos_imagen="Mirador Killi Killi La Paz Bolivia",
    ),
    DestinoSolicitado(
        nombre="Mirador La Paz",
        categoria="Mirador",
        descripcion=(
            "La entrada «Mirador La Paz» es ambigua en la lista original. El candidato más "
            "próximo localizado es Wikidata Q136416593, asociado a la categoría de Commons "
            "«Mirador Letrero La Paz» y a un letrero gigante de la ciudad, pero no se confirmó "
            "que corresponda al mirador pedido; por eso sus datos siguen marcados como no "
            "verificados."
        ),
        horario=NO_VERIFICADO,
        costo=NO_VERIFICADO,
        direccion=NO_VERIFICADO,
        ficha_url="",
        url_oficial="https://www.wikidata.org/wiki/Q136416593",
        url_coordenadas="https://www.wikidata.org/wiki/Q136416593",
        latitud=-16.51952777777778,
        longitud=-68.14425,
        archivo_commons="La Paz (Letrero).jpg",
        terminos_imagen="Mirador letrero La Paz Bolivia",
    ),
    DestinoSolicitado(
        nombre="Mirador Sallahumani",
        categoria="Mirador",
        descripcion=(
            "La ficha municipal ubica el mirador Sallahumani junto a la autopista La Paz–El "
            "Alto, a unos 150 m de la caseta de peaje, y publica horario de «siempre abierto» e "
            "ingreso gratuito. Destaca la figura de piedra «Mamacoa», vinculada a la tradición "
            "Kallawaya, y forma parte del macrodestino Max Paredes del portal municipal. Las "
            "coordenadas se tomaron del mapa incluido en esa ficha oficial. No se encontró una "
            "foto del mirador; la imagen adjunta es una panorámica representativa de La Paz."
        ),
        horario="SIEMPRE ABIERTO",
        costo="INGRESO GRATUITO",
        direccion=(
            "Junto a la autopista La Paz–El Alto, a unos 150 m de la caseta de peaje"
        ),
        ficha_url="",
        url_oficial=(
            "https://sites.google.com/view/macro-destino-max-paredes/"
            "macro-destino-turistico-max-paredes/mirador-sallahumani"
        ),
        url_coordenadas=(
            "https://sites.google.com/view/macro-destino-max-paredes/"
            "macro-destino-turistico-max-paredes/mirador-sallahumani"
        ),
        latitud=-16.497778,
        longitud=-68.163167,
        archivo_commons="La Paz panorama December 1 2008.jpg",
        terminos_imagen="La Paz panorama city Bolivia",
        origenes_imagen_obsoletos=(
            "https://commons.wikimedia.org/wiki/File:Vista_de_la_Ciudad_de_La_Paz_Bolivia.jpg",
        ),
    ),
    DestinoSolicitado(
        nombre="Mirador Tupac Katari",
        categoria="Mirador",
        descripcion=(
            "Wikidata Q136417107 registra la entidad «MIRADOR TÚPAC KATARI» con coordenadas en "
            "el área de La Paz/El Alto. No se encontró una ficha oficial con horario, costo o "
            "fotografía verificable dentro de las fuentes permitidas; la imagen adjunta es una "
            "panorámica representativa de La Paz."
        ),
        horario=NO_VERIFICADO,
        costo=NO_VERIFICADO,
        direccion=NO_VERIFICADO,
        ficha_url="",
        url_oficial="https://www.wikidata.org/wiki/Q136417107",
        url_coordenadas="https://www.wikidata.org/wiki/Q136417107",
        latitud=-16.52887910800946,
        longitud=-68.14351965671683,
        archivo_commons="Mirada a la ciudad de la paz bolivia.jpg",
        terminos_imagen="Mirada ciudad La Paz Bolivia",
        origenes_imagen_obsoletos=(
            "https://commons.wikimedia.org/wiki/File:Vista_de_la_Ciudad_de_La_Paz_Bolivia.jpg",
        ),
    ),
    DestinoSolicitado(
        nombre="Mirador 27 De Mayo",
        categoria="Mirador",
        descripcion=(
            "El portal municipal de la Periférica incluye el Mirador 27 de Mayo entre sus "
            "atractivos. La ficha municipal detallada lo vincula a la conmemoración de la "
            "Batalla de La Coronilla del 27 de mayo de 1812 y publica horario de «siempre "
            "abierto» e ingreso gratuito. Wikidata Q136417227 confirma sus coordenadas. No se "
            "encontró una foto del mirador; la imagen adjunta es una panorámica representativa "
            "de La Paz."
        ),
        horario="SIEMPRE ABIERTO",
        costo="INGRESO GRATUITO",
        direccion="Zona Periférica, La Paz",
        ficha_url="",
        url_oficial="https://lapaz.bo/turismo/periferica/",
        url_coordenadas="https://www.wikidata.org/wiki/Q136417227",
        latitud=-16.48180283991315,
        longitud=-68.13298656478796,
        archivo_commons="Vista de la Ciudad de La Paz Bolivia.jpg",
        terminos_imagen="Vista de la ciudad de La Paz Bolivia",
    ),
    DestinoSolicitado(
        nombre="Mi Teleférico Línea Amarilla - Estación Buenos Aires",
        categoria="Transporte",
        descripcion=(
            "El sitio oficial de Mi Teleférico identifica la Estación Buenos Aires como parte "
            "de la Línea Amarilla. Los datos publicados en su bundle oficial registran la "
            "dirección Av. Buenos Aires y Calle Moxos y sus coordenadas. El FAQ oficial publica "
            "la tarifa normal y el transbordo del sistema; la fotografía disponible documenta "
            "el sistema Mi Teleférico."
        ),
        horario="Lunes-Sábado 06:00 a 23:00; Domingo 07:00 a 21:00",
        costo="Tarifa normal Bs. 3; transbordo Bs. 2",
        direccion="Av. Buenos Aires y Calle Moxos, La Paz",
        ficha_url="",
        url_oficial="https://www.miteleferico.bo/linea-amarilla",
        url_coordenadas="https://www.miteleferico.bo/_nuxt/3ddcd79.js",
        latitud=-16.51531,
        longitud=-68.14402,
        archivo_commons="La Paz, Teleferico- Linea Amarilla.JPG",
        terminos_imagen="Teleferico Linea Amarilla La Paz",
        origenes_imagen_obsoletos=(
            "https://commons.wikimedia.org/wiki/File:Mi_Telef%C3%A9rico,_La_Paz,_Bolivia.jpg",
        ),
    ),
    DestinoSolicitado(
        nombre="Mi Teleférico Línea Blanca - Estación Plaza Triangular",
        categoria="Transporte",
        descripcion=(
            "El sitio oficial de Mi Teleférico identifica la Estación Plaza Triangular dentro "
            "de la Línea Blanca. El bundle oficial registra la dirección «Miraflores plaza "
            "triangular» y sus coordenadas, casi coincidentes con la estación Próceres de la "
            "Independencia de Wikidata Q123146658. La fotografía disponible documenta el "
            "sistema Mi Teleférico."
        ),
        horario="Lunes-Sábado 06:00 a 23:00; Domingo 07:00 a 21:00",
        costo="Tarifa normal Bs. 3; transbordo Bs. 2",
        direccion="Miraflores, Plaza Triangular, La Paz",
        ficha_url="",
        url_oficial="https://www.miteleferico.bo/linea-blanca",
        url_coordenadas="https://www.miteleferico.bo/_nuxt/3ddcd79.js",
        latitud=-16.50439,
        longitud=-68.12085,
        archivo_commons="Estación Av. Arce.jpg",
        terminos_imagen="Teleferico Linea Blanca La Paz",
        origenes_imagen_obsoletos=(
            "https://commons.wikimedia.org/wiki/File:Mi_Telef%C3%A9rico,_La_Paz,_Bolivia.jpg",
        ),
    ),
    DestinoSolicitado(
        nombre="Mi Teleférico Línea Blanca - Estación Plaza Villarroel",
        categoria="Transporte",
        descripcion=(
            "El sitio oficial de Mi Teleférico incluye la Estación Plaza Villarroel en la Línea "
            "Blanca. El bundle oficial registra su dirección como «Plaza Villarroel» y sus "
            "coordenadas. El FAQ oficial publica la tarifa normal de Bs. 3 y el transbordo de "
            "Bs. 2 para el sistema integrado."
        ),
        horario="Lunes-Sábado 06:00 a 23:00; Domingo 07:00 a 21:00",
        costo="Tarifa normal Bs. 3; transbordo Bs. 2",
        direccion="Plaza Villarroel, La Paz",
        ficha_url="",
        url_oficial="https://www.miteleferico.bo/linea-blanca",
        url_coordenadas="https://www.miteleferico.bo/_nuxt/3ddcd79.js",
        latitud=-16.48434,
        longitud=-68.12190,
        archivo_commons="Tarqueada mas grande del mundo Plaza Villarroel La Paz.jpg",
        terminos_imagen="Plaza Villarroel La Paz Bolivia",
    ),
    DestinoSolicitado(
        nombre="Mi Teleférico Línea Plateada - Estación 16 de Julio",
        categoria="Transporte",
        descripcion=(
            "El sitio oficial de Mi Teleférico presenta la Línea Plateada y su Estación 16 de "
            "Julio como enlace hacia El Alto. El bundle oficial registra la dirección «El Alto, "
            "zona 16 de julio, Avenida Panorámica Norte» y sus coordenadas. El FAQ oficial "
            "publica la tarifa normal y el transbordo del sistema integrado."
        ),
        horario="Lunes-Sábado 06:00 a 23:00; Domingo 07:00 a 21:00",
        costo="Tarifa normal Bs. 3; transbordo Bs. 2",
        direccion="El Alto, zona 16 de Julio, Avenida Panorámica Norte",
        ficha_url="",
        url_oficial="https://www.miteleferico.bo/linea-plateada",
        url_coordenadas="https://www.miteleferico.bo/_nuxt/3ddcd79.js",
        latitud=-16.49879,
        longitud=-68.16434,
        archivo_commons="Estación Jach’a Qhathu.JPG",
        terminos_imagen="Estación Jach'a Qhathu Mi Teleférico El Alto",
    ),
    DestinoSolicitado(
        nombre="Línea Plateada Línea Roja y Línea Azul Mi teleferico",
        categoria="Transporte",
        descripcion=(
            "La entrada original es una descripción multi línea ambigua; se interpreta como el "
            "nodo de transbordo 16 de Julio / Jach'a Qhathu, donde confluyen las líneas Plateada, "
            "Roja y Azul. El bundle oficial publica tres registros de «Estación 16 de Julio», "
            "uno por cada línea, con coordenadas ligeramente distintas. El FAQ oficial publica "
            "la tarifa normal de Bs. 3 y el transbordo de Bs. 2 para el sistema integrado."
        ),
        horario="Lunes-Sábado 06:00 a 23:00; Domingo 07:00 a 21:00",
        costo="Tarifa normal Bs. 3; transbordo Bs. 2",
        direccion="Nodo 16 de Julio / Jach'a Qhathu, El Alto",
        ficha_url="",
        url_oficial="https://www.miteleferico.bo/linea-plateada",
        url_coordenadas="https://www.miteleferico.bo/_nuxt/3ddcd79.js",
        latitud=-16.49879,
        longitud=-68.16434,
        archivo_commons="Mi Teleférico, La Paz, Bolivia.jpg",
        terminos_imagen="Mi Teleférico La Paz Bolivia",
    ),
)
