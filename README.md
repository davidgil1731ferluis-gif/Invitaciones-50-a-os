# Invitaciones mágicas de cumpleaños · versión 2.3

Sitio para GitHub Pages conectado con Google Apps Script y Google Sheets. Esta versión añade:

- Confirmación individual del invitado principal y cada acompañante.
- Conteo administrativo de personas que sí asisten, no asisten o siguen pendientes.
- Asignación de mesa por grupo.
- Texto personalizable después del nombre: «Esposa e hijos», «Familia», «Acompañante» u otro.
- Edición y eliminación lógica de invitaciones.
- Fotografía integrada y optimizada en formato WebP.
- Caché de lecturas públicas y menos operaciones repetidas contra Sheets.
- Composición visual equilibrada y nuevas microanimaciones.
- Destellos elegantes que siguen el cursor únicamente en equipos compatibles.
- Portada, buzón y tarjeta reorganizados para teléfonos y pantallas pequeñas.
- Fotografía ampliada dentro de una ventana ornamental inspirada en marcos clásicos.
- Botón final para descargar una versión A4 de la invitación en PDF.
- El PDF se genera dentro del navegador, sin enviar la fotografía o los datos a servicios externos.
- Constelación anónima construida con el total real de personas confirmadas.
- Revelación animada de la mesa únicamente después de guardar la confirmación.
- Descarga de evento para calendario y acceso directo a la ubicación.
- Mesa asignada incluida automáticamente en el PDF.

## Si ya instalaste una versión anterior

Para actualizar a la versión 2.3, reemplaza todos los archivos de GitHub y actualiza `Código.gs` en Apps Script. No necesitas ejecutar nuevamente `actualizarEstructura`, porque no se agregan columnas a Sheets. Sí debes crear una nueva versión de la implementación web de Apps Script.

## Configurar calendario y ubicación

En `assets/js/config.js`, completa los siguientes campos dentro de `event`:

```js
calendarStart: "2026-09-12T19:00:00-05:00",
calendarEnd: "2026-09-12T23:00:00-05:00",
mapsUrl: ""
```

- Usa fecha y hora ISO. Para Colombia conserva `-05:00` al final.
- `calendarStart` es el inicio y `calendarEnd` es la finalización del evento.
- `mapsUrl` es opcional. Si queda vacío, la aplicación buscará en Google Maps el lugar y la dirección escritos en la configuración.
- Si las fechas todavía están vacías, el botón de calendario se ocultará automáticamente para no mostrar una acción que no funciona.

## Actualizar el proyecto que ya está funcionando

### 1. Actualizar GitHub

Sube a la raíz del repositorio todo el contenido de esta carpeta, reemplazando los archivos anteriores. No borres las carpetas `assets` ni `apps-script`.

La conexión ya está configurada en `assets/js/config.js` con la URL de Apps Script utilizada en este proyecto. Si en el futuro creas una implementación distinta, sustituye allí la URL terminada en `/exec`.

La foto utilizada por la tarjeta está en:

```text
assets/images/retrato-cumpleanos.webp
assets/images/portrait-window-frame.svg
assets/images/portrait-window-frame.svg
```

### 2. Actualizar Apps Script

1. En Google Sheets abre **Extensiones → Apps Script**.
2. Reemplaza el contenido de `Código.gs` por `apps-script/Code.gs`.
3. Reemplaza el contenido de `Bridge.html` por `apps-script/Bridge.html`.
4. Guarda los dos archivos.
5. En el selector de funciones elige `actualizarEstructura` y pulsa **Ejecutar** una sola vez.
6. Espera el mensaje **Ejecución completada**.

`actualizarEstructura` conserva todos los registros. Solo agrega:

| Hoja | Columnas nuevas |
|---|---|
| `INVITACIONES` | `TRATAMIENTO`, `MESA` |
| `ASISTENTES` | `MESA` |

No vuelvas a ejecutar `configurarProyecto` para esta actualización: tus credenciales y el vínculo con Sheets ya están guardados.

### 3. Publicar una versión nueva de Apps Script

1. Pulsa **Implementar → Administrar implementaciones**.
2. Abre la implementación web con el icono de lápiz.
3. En **Versión**, elige **Nueva versión**.
4. Confirma estas opciones:
   - **Ejecutar como:** Yo.
   - **Quién tiene acceso:** Cualquier persona.
5. Pulsa **Implementar**.

Este último permiso es indispensable para que las claves funcionen en otros teléfonos, en modo incógnito y sin una cuenta de Gmail iniciada. Comparte la URL de GitHub Pages, no la URL `/exec` de Apps Script.

### 4. Comprobar la publicación

Prueba en una ventana de incógnito:

```text
Invitación: https://davidgil1731ferluis-gif.github.io/Invitaciones-50-a-os/
Panel:      https://davidgil1731ferluis-gif.github.io/Invitaciones-50-a-os/admin.html
```

Después de subir los archivos, GitHub Pages puede tardar uno o dos minutos en mostrar el cambio. Si ves la versión anterior, recarga con `Ctrl + F5` o borra la caché del navegador.

## Uso del panel

Al registrar o editar una invitación puedes indicar:

- Nombre del invitado principal.
- Correo y teléfono opcionales.
- Texto después del nombre.
- Mesa asignada.
- Acompañantes, uno por línea.

El panel muestra dos tipos de totales:

- **Invitaciones:** cantidad de códigos o grupos activos.
- **Total personas:** principal y acompañantes activos.

Los totales **Sí asistirán**, **No asistirán** y **Sin responder** se calculan sobre las personas. Al desplegar un grupo se ve la respuesta de cada integrante.

Al eliminar una invitación se hace una eliminación lógica: la clave queda desactivada y el grupo deja de aparecer en el panel, pero la fila histórica permanece en Sheets con `ACTIVO = FALSE`.

## Personalizar los datos del evento

Edita `assets/js/config.js` para cambiar:

- Título del cumpleaños.
- Mensaje general.
- Fecha y hora.
- Lugar y dirección.
- Código de vestuario.

No escribas contraseñas ni la lista de invitados en GitHub. Esa información debe permanecer en las propiedades de Apps Script y en la hoja privada.

## Estructura

```text
index.html                         Invitación pública
admin.html                         Panel administrativo
assets/images/retrato-cumpleanos.webp
assets/css/styles.css              Diseño y animaciones
assets/css/admin.css               Diseño del panel
assets/js/config.js                Datos del evento y URL del backend
assets/js/app.js                   Flujo de confirmación
assets/js/pdf-card.js              Generación local del PDF descargable
assets/js/admin.js                 Panel, edición y eliminación
assets/js/api.js                   Conexión optimizada con Apps Script
assets/js/mock-data.js             Demostración local opcional
apps-script/Code.gs                Backend y Google Sheets
apps-script/Bridge.html            Puente con GitHub Pages
apps-script/appsscript.json        Manifiesto de la aplicación web
```

## Modo de demostración local (opcional)

Para probar sin tocar Sheets, cambia temporalmente en `assets/js/config.js`:

```js
apiMode: "mock",
```

Luego ejecuta:

```bash
python -m http.server 8080
```

- Clave: `MAGIA26`
- Usuario: `admin`
- Contraseña: `Cumple2026!`

Antes de publicar vuelve a usar `apiMode: "apps-script"`.

## Ideas para una siguiente fase

1. **50 años en cinco momentos:** una línea de tiempo breve con fotografías y recuerdos de la homenajeada.
2. **Muro de buenos deseos:** después de confirmar, cada invitado puede dejar un mensaje corto guardado en Sheets.
3. **Saludo de voz:** reproducir un mensaje corto de la homenajeada al abrir la carta, siempre iniciado por el invitado.
4. **QR dentro del PDF:** permitir volver a la invitación o abrir directamente la ubicación del evento.
