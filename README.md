# Invitaciones mágicas de cumpleaños · versión 2.9

Sitio para GitHub Pages conectado con Google Apps Script y Google Sheets. Esta versión añade:

- Confirmación individual del invitado principal y cada acompañante.
- Conteo administrativo de personas que sí asisten, no asisten o siguen pendientes.
- Asignación de mesa por grupo.
- Texto personalizable después del nombre: «Esposa e hijos», «Familia», «Acompañante» u otro.
- Edición y eliminación lógica de invitaciones.
- Fotografía integrada y optimizada en formato WebP.
- Caché de lecturas públicas y menos operaciones repetidas contra Sheets.
- Composición editorial orgánica centrada en la celebración de los 50 años.
- Destellos elegantes que siguen el cursor únicamente en equipos compatibles.
- Portada, buzón y tarjeta reorganizados para teléfonos y pantallas pequeñas.
- Fotografía más grande dentro de un retrato circular con órbitas, halo y destellos animados.
- Botón final para descargar una versión A4 de la invitación en PDF.
- El PDF se genera dentro del navegador y ahora integra retrato circular, sello de 50 años y una jerarquía más elegante.
- Constelación anónima con respaldo inmediato: siempre dibuja las confirmaciones del grupo aunque Apps Script todavía responda con una versión anterior.
- Revelación animada de la mesa únicamente después de guardar la confirmación.
- Acceso directo a la ubicación mediante **Cómo llegar**.
- Mesa asignada incluida automáticamente en el PDF.
- Módulo gratuito de WhatsApp en el panel administrativo.
- Mensaje personalizado con enlace, clave secreta y nombre del invitado.
- Imagen promocional optimizada para descargar o compartir desde el teléfono.
- Apertura directa del chat del destinatario con el texto ya diligenciado.
- Sesión del invitado conservada durante 12 horas después de validar su clave (tiempo configurable).
- Tratamiento antes del nombre seleccionable: Sr/a, Sr., Sra., Señorita, Dr., Dra., Ing. u otro.
- Tarjeta y PDF especiales para la cumpleañera, seleccionables desde el administrador.
- Un destello morado secreto dentro de la constelación, sin panel, leyenda ni identificación visible.
- Selección, optimización y conservación local de la imagen enviada por WhatsApp.
- Copia UTF-8 del mensaje para conservar correctamente los emojis.
- Sesiones aisladas por clave y por pestaña para accesos simultáneos.
- Validación conjunta de código e ID antes de guardar cualquier confirmación.
- Botón para cerrar la invitación y eliminar únicamente la sesión activa.
- Verificación automática de `SALUDO` y `TIPO_TARJETA` antes de leer o guardar datos.
- Lectura fresca al abrir o volver a la invitación para reflejar inmediatamente cambios de Sheets.
- Escritura por nombre de encabezado, aunque las columnas estén en un orden diferente.
- Tarjeta de cumpleañera con un tema nocturno violeta y dorado claramente diferenciado.

## Envío gratuito por WhatsApp

En la tabla del panel aparece un botón **WhatsApp** para cada invitación que tenga teléfono. Al pulsarlo:

1. Se completa automáticamente el destinatario, el enlace público y la clave secreta.
2. En un teléfono compatible, **Compartir imagen y mensaje** abre el menú de compartir del dispositivo con ambos elementos.
3. **Abrir chat en WhatsApp** abre directamente la conversación con el texto preparado.
4. Si el navegador no permite compartir archivos, usa **Descargar imagen** y adjúntala al chat después de abrirlo.

El remitente siempre es la cuenta de WhatsApp que esté abierta en el teléfono o computador. Elegir otra cuenta remitente o enviar sin intervención requiere WhatsApp Business Cloud API y no pertenece al modo gratuito.

Desde **Configurar mensaje** puedes cambiar el prefijo del país, el enlace público, la plantilla y la imagen. La configuración se guarda únicamente en ese dispositivo. La imagen elegida se optimiza automáticamente y no se sube a GitHub ni a Sheets. La plantilla admite:

- `{{LINK}}`: enlace de la página.
- `{{CLAVE}}`: código secreto de la invitación.
- `{{NOMBRE}}`: nombre del invitado principal.

La imagen se encuentra en:

```text
assets/images/invitacion-whatsapp.jpg
```

## Si ya instalaste una versión anterior

Para actualizar a la versión 2.9, reemplaza todos los archivos de GitHub, copia `apps-script/Code.gs` en `Código.gs` y publica una nueva versión de la aplicación web. La estructura se comprueba automáticamente y las columnas faltantes se agregan sin borrar ni reemplazar datos existentes.

## Cómo funciona la constelación

- Aparece después de guardar la respuesta de asistencia.
- Cada estrella representa a una persona confirmada, incluyendo al invitado principal y sus acompañantes.
- Muestra inmediatamente las estrellas del grupo que acaba de responder.
- Cuando Apps Script está actualizado, el contador y el cielo usan el total de todas las invitaciones activas.
- No muestra nombres, códigos ni grupos de los demás invitados.
- Existe un único detalle morado secreto, sin textos, nombres ni pistas visibles.
- Para mantener el dibujo legible se muestran máximo 64 estrellas; si hay más confirmados, el contador sí conserva el total real.

## Configurar la ubicación

En `assets/js/config.js`, completa `mapsUrl` dentro de `event`:

```js
mapsUrl: ""
```

- `mapsUrl` es opcional. Si queda vacío, la aplicación buscará en Google Maps el lugar y la dirección escritos en la configuración.

## Actualizar el proyecto que ya está funcionando

### 1. Actualizar GitHub

Sube a la raíz del repositorio todo el contenido de esta carpeta, reemplazando los archivos anteriores. No borres las carpetas `assets` ni `apps-script`.

La conexión ya está configurada en `assets/js/config.js` con la URL de Apps Script utilizada en este proyecto. Si en el futuro creas una implementación distinta, sustituye allí la URL terminada en `/exec`.

La foto utilizada por la tarjeta está en:

```text
assets/images/retrato-cumpleanos.webp
assets/images/invitacion-whatsapp.jpg
```

### 2. Actualizar Apps Script

1. En Google Sheets abre **Extensiones → Apps Script**.
2. Reemplaza el contenido de `Código.gs` por `apps-script/Code.gs`.
3. Reemplaza el contenido de `Bridge.html` por `apps-script/Bridge.html`.
4. Guarda los dos archivos.
5. No necesitas ejecutar una migración: la aplicación comprobará la estructura automáticamente.

Si decides ejecutar manualmente `actualizarEstructura`, conserva todos los registros y solo agrega:

| Hoja | Columnas nuevas |
|---|---|
| `INVITACIONES` | `SALUDO`, `TIPO_TARJETA` |

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
- Tratamiento antes del nombre.
- Texto después del nombre.
- Mesa asignada.
- Diseño general o tarjeta especial para la cumpleañera.
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
assets/js/guest-session.js         Sesiones aisladas por código y pestaña
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
