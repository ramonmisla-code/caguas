# Villas de Caguas Real · Sitio preparado para Vercel

**Fecha:** 13 de octubre de 2026  
**Idioma:** Español de Puerto Rico  
**Tecnología:** HTML/CSS/JS + funciones serverless Node.js en `/api`; sin framework ni dependencias de instalación.

## Incluye

- Landing page editorial de alta gama (versión premium revisada), adaptable a celular, tableta y escritorio.
- Las **siete imágenes que proporcionaste**, convertidas a WebP para acelerar la descarga.
- Secciones: portada, concepto, datos preliminares, distribución, arquitectura, entorno, fotografías, ubicación, lista de interés, financiamiento y preguntas frecuentes.
- Registro de prospectos con nombre, teléfono, correo, municipio, contacto preferido, plazo para comprar, interés en financiamiento, comentarios y consentimientos.
- Captura automática de fuente de anuncio `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, referidor y página de entrada.
- Registra el clic hacia [VIG Mortgage](https://prequalify.vigpr.com/?lang=es) **después** de haber guardado el prospecto. No significa solicitud hipotecaria terminada ni aprobada.
- Panel comercial privado en `/admin`: búsqueda, filtros por etapa, edición de etapa, estadísticas, exportación CSV compatible con Excel.
- Datos almacenados en **Upstash Redis REST** si se configuran las credenciales en Vercel. No se utiliza `localStorage` como almacenamiento de información de prospectos.
- Posibilidad de recibir email por cada nuevo lead usando Resend (opcional).
- Avisos de provisionalidad de precios, amenidades, planos y dimensiones.

## IMPORTANTE ANTES DE PUBLICAR

1. **Confirmar el nombre final** y autorización del promotor para usar el nombre "Villas de Caguas Real".
2. **Confirmar número y dimensiones de unidades, amenidades, acceso al campo de golf y piscina, precio, estatus legal y disponibilidad**. Nada de eso se garantiza en la web.
3. **Aprobar el aviso de privacidad:** ahora incluye recordatorios para identificar la razón social, el correo y un proceso de solicitudes de los interesados. **No lanzar una campaña pública de captación de leads antes de completar esta revisión.**
4. Configurar el almacenamiento Upstash Redis: **sin ese paso el formulario NO registra** y presenta un error explícito; no redirige a VIG sin guardar el contacto.
5. Definir la clave del panel de administración y conservarla en un gestor seguro de contraseñas.
6. Verificar con VIG la autorización para usar su nombre/enlace comercialmente y cualquier identificación/revelación requerida por su marca o prácticas aplicables.

## Publicar en Vercel (línea de comandos)

1. Descomprime la carpeta en una computadora con Node.js instalado.
2. Inicia sesión en tu cuenta: `npx vercel login`
3. Dentro de la carpeta, vincula y crea el proyecto: `npx vercel`
4. En el panel de Vercel, ve a **Project → Settings → Environment Variables** e introduce estas variables en `Production`:

   - `UPSTASH_REDIS_REST_URL` (URL REST de Upstash)
   - `UPSTASH_REDIS_REST_TOKEN` (token REST de Upstash; secreto)
   - `ADMIN_ACCESS_KEY` (cadena aleatoria de al menos 16 caracteres)

5. Opcional, para alertas de email: configura las variables `RESEND_API_KEY`, `SALES_NOTIFICATION_EMAIL` y `RESEND_FROM_EMAIL`. La dirección remitente debe estar autorizada en Resend.
6. Vuelve a publicar para cargar las variables: `npx vercel --prod`
7. Abre `https://TU-PROYECTO.vercel.app/api/status` y confirma `"registrationEnabled": true`. Hasta que diga **true**, el formulario público no está listo.
8. Prueba un registro real con datos de prueba. Luego revisa `https://TU-PROYECTO.vercel.app/admin`, utilizando la clave configurada.
9. Revisa el botón hacia VIG, filtros, CSV y avisos legales antes de anunciar el proyecto.

### Alternativa sin terminal

Sube el código a un repositorio privado de GitHub y en Vercel entra a **Add New → Project → Import Git Repository**. Selecciona el repositorio, Framework Preset: **Other**, Root Directory: raíz del proyecto, y añade las mismas variables de entorno. La web es estática con funciones Node, no requiere comandos de compilación.

### Upstash

Crea una base Redis en [Upstash](https://upstash.com/) o desde la integración correspondiente de Vercel. Utiliza específicamente su **REST URL** y **REST TOKEN**. Si el proveedor asigna nombres de variable distintos, copia sus valores a los nombres que usa este proyecto. Los datos se indexan bajo `vcr:leads:by-date` y se guardan como `vcr:lead:<uuid>`.

### Aviso técnico de administración

El panel utiliza una clave compartida de administración (`ADMIN_ACCESS_KEY`) enviada únicamente a endpoints HTTPS. No guardes esa clave en código público ni la compartas. Para un proyecto con varios vendedores se recomienda evolucionar a cuentas individuales, permisos y auditoría. La exportación actual devuelve hasta 2,000 leads recientes; en operaciones mayores conviene añadir paginación.

## Archivos

- `index.html`: landing page.
- `styles.css`, `site.js`: estilos y funciones de la web.
- `assets/`: fotografías e ilustraciones.
- `privacidad.html`: borrador de aviso de privacidad.
- `admin.html`, `admin.css`, `admin.js`: panel comercial.
- `api/leads.js`: valida y guarda registros.
- `api/vig.js`: registra el clic hacia VIG.
- `api/admin/leads.js`, `api/admin/status.js`: consulta y seguimiento privado.
- `api/status.js`: verifica si el almacenamiento está configurado.
- `lib/redis.js`: cliente Upstash REST y utilidades.
- `vercel.json`: rutas y encabezados HTTP.
- `.env.example`: variables que deben configurarse como secretos.

## Notas de fidelidad y comercialización

Las fotografías del desarrollo original (incluyendo piscina, golf y canchas) no garantizan derecho de uso a sus instalaciones. La fachada es conceptual. La delimitación azul del terreno es ilustrativa y no sustituye el levantamiento topográfico ni plano registrado. Las superficies interiores (`±1,425 ft²`) y terraza (`±288 ft²`) son estimaciones previas, no un metraje certificado. Las condiciones y aprobación de financiamiento corresponden a VIG Mortgage, no al promotor.

### Dominio sugerido

`VillasDeCaguasReal.com` **sujeto a comprobar disponibilidad, autorización de marca y compra del dominio**. No se ha adquirido ni vinculado ningún dominio.

## Revisión visual premium · 13 de octubre de 2026

- Identidad editorial con monograma CR, tipografías elegantes y fotografía protagonista.
- Portada renovada, frase de marca más breve y ritmo visual con mayores espacios.
- Contenido que presenta exclusividad sin inventar prestaciones: todas las amenidades existentes siguen identificadas como pertenecientes al entorno.
- Se mantiene sin cambios el proceso de registro seguro previo a precualificación VIG y el panel administrativo.
- Los responsables deberán aprobar el nombre comercial, la identidad gráfica y las fotos antes de publicación.
