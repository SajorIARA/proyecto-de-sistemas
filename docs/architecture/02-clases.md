# Diagrama de Clases — Sistema Turístico La Paz

> Refleja los modelos Django reales (`db_table` legado en español).
> `Foto` solo guarda referencias Cloudinary (sin binarios en PG) con
> máquina de estados `pending → processing → completed/failed`.

```mermaid
classDiagram
    class Usuario {
        +UUID id_usuario
        +String email
        +String password
        +String nombre
        +Boolean activo
        +DateTime fecha_creacion
        +DateTime fecha_actualizacion
        +check_password(password) Boolean
        +set_password(password) void
        +has_perm() Boolean
    }

    class Rol {
        +SmallAutoField id_rol
        +String codigo
        +String nombre
        +String descripcion
    }

    class UsuarioRol {
        +BigAutoField id
        +DateTime fecha_asignacion
    }

    class Atractivo {
        +UUID id_atractivo
        +String nombre
        +String slug
        +String descripcion
        +String url
        +String direccion
        +Integer duracion_minutos
        +PointField ubicacion
        +PolygonField area
        +String fuente_origen
        +Boolean activo
        +DateTime fecha_creacion
        +DateTime fecha_actualizacion
    }

    class Foto {
        +BigAutoField id_foto
        +String public_id
        +String url
        +String tipo
        +String estado
        +Integer ancho
        +Integer alto
        +Integer orden
        +DateTime fecha_creacion
    }

    class Categoria {
        +BigAutoField id_categoria
        +String nombre
        +String descripcion
        +Boolean activo
    }

    class AtractivoCategoria {
        +BigAutoField id
    }

    class Horario {
        +BigAutoField id_horario
        +SmallIntegerField dia_semana
        +TimeField hora_apertura
        +TimeField hora_cierre
        +Boolean cerrado
        +DateField vigente_desde
        +DateField vigente_hasta
    }

    class TipoTarifa {
        +SmallAutoField id_tipo_tarifa
        +String codigo
        +String nombre
        +String descripcion
    }

    class Tarifa {
        +BigAutoField id_tarifa
        +Decimal monto
        +String moneda
        +DateField vigente_desde
        +DateField vigente_hasta
        +String observacion
    }

    class FuenteDocumental {
        +UUID id_fuente
        +String titulo
        +String url
        +String tipo
        +DateTime fecha_actualizacion
        +DateTime fecha_creacion
    }

    class FragmentoDocumental {
        +BigAutoField id_fragmento
        +Integer numero_fragmento
        +String contenido
        +VectorField embedding
        +DateTime fecha_creacion
    }

    class UsuarioPreferencia {
        +BigAutoField id
        +Decimal nivel_interes
        +DateTime fecha_registro
    }

    class ConsultaRecomendacion {
        +UUID id_consulta
        +Decimal presupuesto_bob
        +Decimal tiempo_horas
        +PointField punto_partida
        +String macrodistrito
        +DateTime fecha_consulta
    }

    Usuario "N" --> "*" Rol : tiene
    Usuario "1" --> "*" UsuarioPreferencia : posee
    Usuario "1" --> "*" ConsultaRecomendacion : realiza
    Atractivo "N" --> "*" Categoria : clasificado_en
    Atractivo "1" --> "*" Horario : tiene
    Atractivo "1" --> "*" Tarifa : tiene
    Atractivo "1" --> "*" Foto : muestra
    Atractivo "1" --> "0..*" FuenteDocumental : documentado_por
    TipoTarifa "1" --> "*" Tarifa : define
    FuenteDocumental "1" --> "*" FragmentoDocumental : contiene
    Categoria "1" --> "*" UsuarioPreferencia : preferida_en
```

## Capa API — políticas y vistas

```mermaid
classDiagram
    class HasRole {
        +allowed_codes
        +has_permission() Boolean
    }

    class IsAdmin {
        +has_permission() Boolean
    }

    class IsTurista {
        +has_permission() Boolean
    }

    class IsAdminOrReadOnly {
        +has_permission() Boolean
    }

    class IsAuthenticatedOwnerOrAdmin {
        +has_permission() Boolean
    }

    class AtractivoViewSet {
        +list() filtros q categoria zona precio
        +cercanos() lat lon radio
        +facetas() categorias + precios
    }

    class AtractivoAdminViewSet {
        +perform_destroy() baja lógica
    }

    class FirmaFotoView {
        +post() firma Cloudinary
    }

    class SubirFotoView {
        +post() 202 + encola
    }

    class EstadoFotoView {
        +get() pending processing completed failed
    }

    class SubirFotoTask {
        +subir_foto_task() upload Cloudinary
        +purgar_staging() beat cada hora
    }

    HasRole <|-- IsAdmin
    HasRole <|-- IsTurista
    IsAdmin --> AtractivoAdminViewSet : protege
    IsAdmin --> FirmaFotoView : protege
    IsAdmin --> SubirFotoView : protege
    IsAdmin --> EstadoFotoView : protege
    IsAdminOrReadOnly --> Categoria : protege escritura
    IsAuthenticatedOwnerOrAdmin --> UsuarioPreferencia : protege
    SubirFotoView --> SubirFotoTask : delay
    SubirFotoTask --> Foto : completa
```
