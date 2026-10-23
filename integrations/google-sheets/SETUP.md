# Conectar el formulario de Villas de Caguas Real con Google Sheets

**Hoja creada:** https://docs.google.com/spreadsheets/d/1PUq7gu7oe7feUuZWo7j8rBeDFF-J6TIiqyLknIURGyA/edit

Este procedimiento solo tiene que realizarse una vez desde la cuenta de Google propietaria de la hoja. El formulario público **no** recibe contraseñas ni acceso directo al Google Sheet: Vercel llama al receptor protegido del servidor.

## 1. Instalar el receptor de Google Apps Script

1. Abre el Google Sheet enlazado arriba.
2. En el menú **Extensiones → Apps Script**, crea/abre el script vinculado a esta hoja.
3. Elimina el contenido de `Código.gs` y pega **todo** el archivo [Code.gs](./Code.gs) del repositorio. Guarda.
4. En la barra lateral de Apps Script, abre **Configuración del proyecto** (engranaje) → **Propiedades de secuencia de comandos**.
5. Añade la propiedad `WEBHOOK_SECRET`. Su valor debe ser **un secreto aleatorio de por lo menos 32 caracteres**, generado por ti y que no hayas usado en otro servicio. En Mac puedes generar uno con `openssl rand -hex 32`. **No pegues este valor en GitHub ni lo compartas por chat.**
6. Haz clic en **Guardar propiedades de secuencia de comandos**.

## 2. Desplegar como aplicación web

1. Haz clic en **Implementar → Nueva implementación**.
2. En "Seleccionar tipo", elige **Aplicación web**.
3. **Ejecutar como:** **Yo** (propietario del Google Sheet).
4. **Quién tiene acceso:** **Cualquiera**, para permitir que la función privada de Vercel lo invoque sin una sesión interactiva de Google. El secreto anterior protege el ingreso de datos; la hoja NO debe hacerse pública.
5. Pulsa **Implementar**, autoriza los permisos que solicita Google y copia la **URL de la aplicación web**, terminada en `/exec`.

El código se ejecuta con los permisos del propietario de la hoja y solo admite peticiones que contengan el secreto correcto. Si una política de Google Workspace no permite acceso «Cualquiera», esta modalidad no podrá utilizarse sin una configuración adicional.

## 3. Configurar Vercel (cuenta propietaria de caguasreal.com)

En **Vercel → proyecto caguas → Settings → Environment Variables**, agrega estas dos variables en **Production**:

| Variable | Valor |
| --- | --- |
| `GOOGLE_SHEETS_WEBHOOK_URL` | URL `https://script.google.com/macros/s/…/exec` obtenida en el paso 2 |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | Exactamente el mismo secreto de `WEBHOOK_SECRET` en Apps Script |

Selecciona la opción de **sensible / secreto** para no dejar el token visible en el panel. Después realiza **Deployments → último commit en main → Redeploy → Production**. Los cambios de variables de entorno no se aplican a deployments anteriores.

## 4. Verificación funcional

1. Abre `https://caguasreal.com/api/status`. Debe aparecer `"registrationEnabled": true` y `"storageMode": "google-sheets"`.
   - Este endpoint comprueba que las variables existen; **no prueba la conectividad** por sí solo.
2. Registra una persona de prueba en la página (con datos ficticios y un correo que controles).
3. Debe aparecer la confirmación de la página **solo después de que Google confirme que la fila se guardó**.
4. Verifica que en la pestaña `Registros` se haya añadido la fila con el ID, fecha y preferencias.
5. Prueba el enlace VIG y comprueba que la columna **Clic VIG (UTC)** reciba la fecha/hora correspondiente.
6. Borra el registro de prueba cuando termines, si corresponde a tu política de retención.

## Comportamiento y limitaciones

- Mientras no configures el receptor de Google, el formulario continuará devolviendo un error de indisponibilidad **salvo que Redis ya esté configurado**.
- Si existe Upstash Redis, la hoja es el destino principal y Redis se mantiene como una copia para el panel `/admin`. Si no hay Redis, los prospectos se consultan **en Google Sheets**, no en `/admin`.
- La función limita el tamaño del formulario, valida los campos, comprueba el origen y conserva el campo anti-bots existente. Sin Redis, el límite por IP es aproximado (memoria de función) y no reemplaza una defensa distribuida o un CAPTCHA como Turnstile para campañas de mucho tráfico.
- Un fallo de Google Sheets muestra error al visitante: **nunca se anuncia éxito sin confirmación**.
- Nunca hagas pública la hoja. Configura acceso de editores solo para el personal autorizado y revisa el [aviso de privacidad](../../privacidad.html), incluyendo la identidad y el contacto real del promotor antes de lanzar una campaña.
- Si editas `Code.gs` en Apps Script después del despliegue, crea una nueva **versión de la implementación** para que el cambio se aplique.
