# ServiceHub

ServiceHub es una aplicacion web para publicar, descubrir y contratar servicios cotidianos desde una interfaz sencilla. El proyecto combina un escaparate publico de anuncios con zonas privadas para perfil, actividad, reservas y chat entre cliente y anunciante.

## Que hace esta web

- Muestra anuncios de servicios con buscador, filtros por categoria y cambio entre vista en cuadricula o listado.
- Permite abrir la ficha completa de cada anuncio con informacion del servicio, datos del anunciante, reseñas y disponibilidad.
- Permite publicar nuevos anuncios con horarios reservables.
- Permite guardar y reutilizar el perfil del anunciante.
- Permite contratar un hueco disponible y bloquearlo para evitar dobles reservas.
- Permite revisar actividad privada: servicios contratados, servicios recibidos y conversaciones.
- Permite iniciar y continuar chats entre cliente y vendedor.

## Como lo hace

### 1. Portada y ficha del servicio

La portada principal vive en `index.html`, `script.js` y `style.css`. Desde ahi se cargan los anuncios, se normalizan los datos recibidos y se renderizan tanto las tarjetas como la vista detalle del servicio.

La ficha del anuncio muestra:

- banner del servicio,
- informacion del anunciante,
- especificaciones,
- disponibilidad,
- reseñas,
- accion de reserva,
- acceso directo al chat con el vendedor.

### 2. Publicacion de anuncios

La publicacion se gestiona desde la carpeta `serv/`.

El flujo de publicacion:

1. Lee el perfil del anunciante autenticado desde `users/{uid}`.
2. Permite definir titulo, categoria, precio, modalidad, imagen y agenda.
3. Guarda el anuncio en `services/*` con un modelo de disponibilidad unificado.

Ese modelo soporta:

- recurrencia semanal,
- recurrencia mensual,
- servicio diario,
- horas concretas,
- tramos fijos.

### 3. Perfil reutilizable

La carpeta `config/` gestiona el perfil publico del anunciante. Desde ahi se actualizan nombre, descripcion, zona, redes y foto. Esa informacion se reutiliza despues al crear anuncios, evitando duplicar datos en cada publicacion.

### 4. Reservas, actividad y chat

La carpeta `contact/` concentra la parte privada del usuario:

- actividad como cliente,
- actividad como anunciante,
- bandeja de mensajes,
- chat privado.

Cuando se crea una reserva:

1. Se guarda la reserva completa en un nodo privado.
2. Se crea un bloqueo tecnico separado para deshabilitar el hueco reservado.
3. Se generan resúmenes privados para el cliente y para el anunciante.

De esta forma la interfaz puede mostrar huecos ocupados sin exponer datos personales del cliente.

## Stack tecnico

- HTML5
- CSS3
- JavaScript vanilla
- Firebase Authentication
- Firebase Realtime Database
- Particles.js para el fondo visual

## Estructura principal del proyecto

- `index.html`, `script.js`, `style.css`: portada, listado y detalle del servicio.
- `serv/`: alta de anuncios y constructor de disponibilidad.
- `config/`: perfil del anunciante.
- `contact/`: actividad privada, mensajes y chat.
- `rules.txt`: reglas de seguridad propuestas para Firebase Realtime Database.
- `DOCUMENTO_ESPECIFICACIONES_TECNICAS.md`: historial tecnico de iteraciones.
- `CODIGO_GENERADO.md`: trazabilidad de cambios realizados.

## Dificultades encontradas

### Modelar la disponibilidad sin complicar la UI

Uno de los retos principales fue soportar varios tipos de agenda sin romper la experiencia de uso. La solucion fue unificar la disponibilidad en una estructura comun con `mode`, `type`, `targets` y `slots`, de forma que la ficha del servicio y el formulario de publicacion pudieran compartir la misma logica.

### Bloquear reservas sin perder privacidad

Otro punto delicado fue permitir que cualquier visitante viera que un hueco ya estaba ocupado, pero sin hacer publicos telefono, direccion o notas del cliente. Esto obligo a separar el bloqueo visual de la reserva completa.

### Mezclar navegacion publica con zonas privadas

La app permite explorar anuncios sin iniciar sesion, pero algunas acciones requieren autenticacion: publicar, ver actividad privada o continuar conversaciones. Coordinar ambos contextos sin romper el flujo fue una dificultad importante de UX y de permisos.

### Mantener coherencia entre varias pantallas

El proyecto reparte funcionalidades entre portada, perfil, publicacion, actividad y chat. Mantener consistencia visual, enlaces de retorno y estado sincronizado entre pantallas ha sido otro de los puntos de trabajo mas constantes.

## Vulnerabilidades corregidas o mitigadas

| Hallazgo | Ubicacion donde se detecto | Como se encontro | Correccion aplicada |
| --- | --- | --- | --- |
| Exposicion de datos sensibles de reserva | Revision del flujo de reservas en `script.js` y del modelo de datos reflejado en `rules.txt` | Durante la revision del error `PERMISSION_DENIED` y del bloqueo de huecos se detecto que el estado publico de una reserva no debia compartir telefono, direccion o notas del cliente | Se separo el bloqueo tecnico en `bookingLocks/*` y se dejo la reserva completa en nodos privados como `bookings/*`, `bookingByOwner/*` y `bookingByCustomer/*` |
| Riesgo de inyeccion en contenido dinamico | Renderizado de fichas, actividad y mensajes en `script.js`, `contact/script.js` y `contact/chat.js` | Se revisaron todos los puntos donde la app escribe contenido recibido en el DOM | Se reforzo el uso de `escapeHTML(...)` en plantillas y `textContent` en el chat para evitar insercion directa de HTML no confiable |
| Acceso no autorizado a actividad privada | Pantallas de `contact/` y reglas de base de datos | Se revisaron los flujos de lectura de reservas, mensajes y conversaciones desde cuentas autenticadas y no autenticadas | Se limito la lectura por `auth.uid` en `bookingByOwner`, `bookingByCustomer` y `messages`, y se redirige al usuario a la portada cuando no hay sesion activa |
| Escritura de datos por usuarios no propietarios | Escritura de perfiles y servicios en `config/script.js`, `serv/script.js` y `rules.txt` | Se audito quien podia crear o modificar datos persistidos | Se restringio la escritura de `users/{uid}` y `services/*` al usuario autenticado propietario y se añadieron validaciones basicas de estructura en las reglas |

## Como y donde se localizaron estos problemas

Los hallazgos no se localizaron mediante escaneos automaticos, sino a traves de:

- revision manual del codigo que renderiza HTML dinamico,
- revision del modelo de datos de Firebase,
- pruebas funcionales de reserva, actividad y chat,
- comprobacion de permisos a partir de errores reales de acceso y escritura,
- auditoria de que informacion debia ser publica y cual debia quedarse en zonas privadas.

## Riesgos pendientes y mejoras recomendadas

Aunque se han corregido varias debilidades, aun quedan mejoras recomendables antes de una publicacion mas amplia:

- endurecer el acceso a `chats/*` para que solo puedan leer y escribir los participantes reales de cada conversacion,
- valorar exigir autenticacion o mecanismos anti abuso en el flujo de reservas para reducir spam,
- mover la configuracion del proyecto a un esquema mas preparado para varios entornos,
- añadir tests automaticos para flujos criticos de reserva, permisos y chat.

## Nota para un repositorio publico

Este README evita incluir claves, identificadores de despliegue, datos reales de usuarios o cualquier otro detalle sensible. Si este proyecto se publica en GitHub, la seguridad no debe depender de ocultar la configuracion del frontend, sino de unas reglas de acceso correctas y de una separacion adecuada entre datos publicos y privados.

## Autores

- Néstor
- Mario
- Lorena
- Edgar