# Invitaciones mágicas de cumpleaños

Proyecto listo para publicar con:

- **GitHub Pages:** experiencia pública y panel administrativo.
- **Google Apps Script:** validación de claves, sesiones administrativas y operaciones seguras.
- **Google Sheets:** invitados, asistentes, respuestas y registro de accesos.

## 1. Probar la demostración

El proyecto inicia en modo demostración. Desde la carpeta del proyecto ejecuta:

```bash
python -m http.server 8080
```

Abre `http://localhost:8080`.

- Clave de invitación de prueba: `MAGIA26`
- Panel: `http://localhost:8080/admin.html`
- Usuario de prueba: `admin`
- Contraseña de prueba: `Cumple2026!`

Los datos de demostración se guardan únicamente en el navegador mediante `localStorage`.

## 2. Personalizar el cumpleaños

Edita solamente `assets/js/config.js` para cambiar:

- Nombre del cumpleaños.
- Mensaje de invitación.
- Fecha y hora.
- Lugar y dirección.
- Código de vestuario.

No escribas invitados, contraseñas ni información privada en ese archivo, porque GitHub Pages publica el código del sitio.

## 3. Crear la base de Google Sheets

1. Crea un archivo nuevo de Google Sheets.
2. Copia el identificador que aparece entre `/d/` y `/edit` en la dirección del archivo.
3. No necesitas crear las hojas manualmente: el instalador del Apps Script las genera.

Se crearán estas pestañas:

| Hoja | Propósito |
|---|---|
| `INVITACIONES` | Persona principal, código secreto y estado general. |
| `ASISTENTES` | Invitado principal y acompañantes asociados. |
| `RESPUESTAS` | Historial de cada confirmación guardada. |
| `ACCESOS` | Registro de intentos válidos e inválidos sin almacenar la clave escrita. |

Mantén el archivo privado. La aplicación accede mediante Apps Script; no hace falta publicar la hoja.

## 4. Configurar Google Apps Script

1. En la hoja abre **Extensiones → Apps Script**.
2. Reemplaza el contenido de `Code.gs` por el archivo `apps-script/Code.gs` de este proyecto.
3. Crea un archivo HTML llamado exactamente `Bridge` y pega el contenido de `apps-script/Bridge.html`.
4. En la configuración del proyecto activa la visualización del manifiesto y reemplaza `appsscript.json` por el archivo incluido.
5. En `Code.gs`, busca la función `configurarProyecto()` y sustituye:
   - `ID_DE_TU_GOOGLE_SHEETS` por el ID de la hoja.
   - `administrador` por el usuario deseado.
   - `CAMBIA_ESTA_CONTRASENA` por una contraseña fuerte de mínimo 10 caracteres.
   - `https://TU_USUARIO.github.io` por el origen real de GitHub Pages, sin ruta final.
6. Selecciona `configurarProyecto` en el editor y presiona **Ejecutar**.
7. Acepta los permisos solicitados por Google.
8. Cuando termine correctamente, reemplaza nuevamente la contraseña visible en `configurarProyecto()` por el texto `CAMBIA_ESTA_CONTRASENA` y guarda el archivo. El hash configurado seguirá funcionando.

La contraseña se transforma en un hash con sal antes de guardarse en las propiedades del script. No queda escrita en Sheets ni se entrega al navegador después de la configuración.

## 5. Publicar el Apps Script

1. Pulsa **Implementar → Nueva implementación**.
2. Selecciona **Aplicación web**.
3. Ejecutar como: **Tú**.
4. Quién tiene acceso: **Cualquier persona**.
5. Publica y copia la URL terminada en `/exec`.

Cada cambio futuro del backend requiere crear una versión nueva desde **Administrar implementaciones**.

## 6. Conectar la página con Apps Script

En `assets/js/config.js` cambia:

```js
apiMode: "apps-script",
appsScriptUrl: "URL_TERMINADA_EN_EXEC",
```

La página y Apps Script se comunican mediante un iframe oculto que acepta mensajes exclusivamente desde el dominio configurado. Esto evita guardar credenciales o exponer directamente la hoja.

## 7. Publicar en GitHub Pages

1. Crea un repositorio público en GitHub.
2. Sube todos los archivos y carpetas del proyecto.
3. Abre **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Elige la rama `main` y la carpeta `/root`.
6. Guarda y espera a que GitHub muestre la dirección pública.

Direcciones esperadas:

```text
Invitación: https://TU_USUARIO.github.io/NOMBRE_REPOSITORIO/
Administración: https://TU_USUARIO.github.io/NOMBRE_REPOSITORIO/admin.html
```

## 8. Uso del panel administrativo

Después de iniciar sesión podrás:

- Registrar el invitado principal.
- Agregar acompañantes, uno por línea.
- Generar automáticamente una clave única de ocho caracteres.
- Copiar la clave para enviarla al invitado.
- Consultar confirmados, rechazados y pendientes.
- Ver cuántas personas están vinculadas a cada invitación.

La sesión administrativa vence aproximadamente después de seis horas o cuando Apps Script libera su caché. En ese caso solo debes ingresar nuevamente.

## Seguridad y privacidad

- No subas una lista de invitados al repositorio.
- No guardes la contraseña administrativa en `config.js` ni en archivos de GitHub.
- Comparte una clave únicamente con el invitado correspondiente.
- Usa nombres y datos mínimos necesarios para organizar el evento.
- Mantén privada la hoja de cálculo.
- Para cambiar la contraseña, modifica temporalmente `configurarProyecto()`, vuelve a ejecutarla y retira el valor del editor cuando termines.

## Archivos principales

```text
index.html                 Experiencia pública
admin.html                 Panel administrativo
assets/css/styles.css      Diseño y animaciones
assets/css/admin.css       Diseño del panel
assets/js/config.js        Datos editables del evento
assets/js/app.js           Flujo de la invitación
assets/js/admin.js         Flujo administrativo
assets/js/api.js           Conexión con Apps Script
assets/js/mock-data.js     Datos de demostración
apps-script/Code.gs        Backend y manejo de Sheets
apps-script/Bridge.html    Puente seguro con GitHub Pages
```
