# 🌳 Plantilla en Blanco - Árbol Genealógico Interactivo

¡Bienvenido! Este paquete te permite crear y publicar tu propio árbol genealógico interactivo desde cero, con fotos, ramas familiares, búsqueda instantánea, navegación panorámica y diseño adaptable para celulares y computadoras.

---

## ⚡ 1. Inicio Rápido (Abrir de inmediato)
No necesitas instalar ningún programa ni servidor:
1. Haz **doble clic en `index.html`** para abrirlo en cualquier navegador (Chrome, Edge, Safari, Firefox).
2. Verás el árbol inicial con los dos patriarcas fundadores (*Abuelo* y *Abuela*).
3. **Haz clic en cualquier tarjeta** para cambiar su nombre, apellido, año de nacimiento y foto.
4. Para agregar más personas, haz clic en el botón verde superior **"+ Agregar Familiar"** o en el botón **"➕ Agregar Hijo/a a esta rama"**.

---

## ⚙️ 2. Personalizar el Nombre de tu Familia
Abre el archivo `data.js` con el Bloc de Notas o cualquier editor de texto:
1. **`familyName`**: Pon el nombre de tu familia (por ejemplo: `"FAMILIA PÉREZ GÓMEZ"`).
2. **`id`**: Escribe una palabra clave única en minúsculas y sin espacios (por ejemplo: `"perez_gomez"`). Esto garantiza que tus datos se guarden de forma aislada en tu navegador.
3. **`branches`**: Puedes cambiar el nombre de las ramas familiares según los apellidos o líneas de tu familia.

---

## 🔄 3. ¿Cómo funcionan las Actualizaciones Automáticas?
Este paquete viene configurado con un **motor centralizado**:
- El diseño visual (`styles.css`) y el funcionamiento interactivo (`app.js`) se conectan directamente al motor oficial en la nube.
- **¿Qué significa esto para ti?**
  Cualquier nueva función, mejora para celulares o corrección técnica que desarrollemos **se aplicará automáticamente a tu árbol genealógico sin que tengas que tocar nada de código**.
- Tus datos, familiares y fotos siempre se mantienen **100% tuyos y privados** en tu propio archivo `data.js`.

*(Nota: Si alguna vez deseas usar el árbol 100% desconectado de internet en un pendrive, en `index.html` tienes notas para cambiar a los archivos locales `styles.css` y `app.js` que ya vienen incluidos como respaldo).*

---

## 🚀 4. Cómo Publicarlo Gratis en Internet (GitHub Pages)
Para tener un enlace web propio y compartir el árbol por WhatsApp con toda tu familia:

1. Crea una cuenta gratuita en [GitHub.com](https://github.com) si aún no tienes una.
2. Pulsa en **New repository** (Nuevo repositorio) y ponle un nombre (ejemplo: `arbol-familia-perez`).
3. Sube todos los archivos de esta carpeta a ese repositorio.
4. Ve a la pestaña **Settings** (Configuración) ➔ **Pages**.
5. En *Source*, elige la rama `main` (o `master`) y pulsa **Save** (Guardar).
6. ¡Listo! En 1 minuto tendrás un enlace público como:
   `https://tu-usuario.github.io/arbol-familia-perez/`

---

## 💾 5. Exportar y Guardar Respaldos
En la barra superior de la página, dentro del botón **"Opciones"** encontrarás:
- **Exportar Respaldo (JSON):** Descarga una copia de seguridad con todos los familiares y fotos.
- **Exportar a Excel (CSV):** Descarga una planilla con todas las generaciones, fechas y roles.
- **Importar Respaldo:** Te permite restaurar un respaldo en cualquier computadora o celular en 1 segundo.
