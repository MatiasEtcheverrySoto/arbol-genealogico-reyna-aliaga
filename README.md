# Árbol Genealógico - Familia Reyna Aliaga 🌳

Aplicación interactiva y digitalización completa del árbol genealógico familiar a partir del póster original ([20261004_153147.jpg](20261004_153147.jpg)). Permite visualizar las 5 generaciones familiares y asociar una fotografía facial a cada integrante junto a su nombre.

---

## 📁 Estructura del Proyecto

```text
├── index.html                   # Interfaz de usuario interactiva y vistas del árbol
├── styles.css                   # Sistema de diseño, temas visuales y estilos del lienzo
├── app.js                       # Motor del lienzo interactivo (Pan/Zoom), gestión de fotos y modales
├── data.js                      # Base de datos estructurada con los 143 integrantes y 11 ramas
├── familia_reyna_aliaga.json    # Exportación estándar en formato JSON
├── familia_reyna_aliaga.csv     # Exportación tabular para Microsoft Excel / Hojas de cálculo
├── assets/                      # Directorio de recursos multimedia
│   ├── carlos_alberto.jpg       # Retrato demostrativo del patriarca
│   ├── maria_laura.jpg          # Retrato demostrativo de la matriarca
│   └── magnolia_bg.jpg          # Fondo floral texturado inspirado en el póster original
├── 20261004_153147.jpg          # Fotografía original del cartel familiar físico
└── README.md                    # Documentación del proyecto
```

---

## 🏛️ Estructura Genealógica

El árbol abarca **5 generaciones** y **143 integrantes familiares catalogados**:

### 1. Cabezas de Familia (Generación 1)
* **Carlos Alberto Reyna** & **María Laura Aliaga** (Vino/Borgoña `#722F37`)

### 2. Las 11 Ramas Familiares (Generación 2)
| Rama | Color del Póster | Cabezas de Rama | Familias / Descendencia Principal |
| :--- | :--- | :--- | :--- |
| **Graciela** | Bronce / Café `#8B6F55` | Graciela & Héctor | Mateo & Susana, Rodrigo & Carolina, Jimena & Ariel, Rocío & Juan, Martín & Rocío |
| **Carlos** | Dorado / Ocre `#D49B24` | Carlos & Alicia | Mercedes & Pablo, Consuelo & Gonzalo |
| **Jorge** | Verde Bosque `#4E7345` | Jorge & María Helena | Patricia & Javier, Alejandra & Matías, Amalia |
| **María Laura** | Violeta `#6C3A6E` | María Laura & Jorge | Federico & Carolina, Laura |
| **Cecilia** | Gris Pizarra `#566573` | Cecilia & Ernesto | Carlos Patricio & María Ángela, Soledad & Sergio (alcanza Gen 5 con Santino y Ernesto) |
| **Adriana** | Rosa viejo `#B76E79` | Adriana & Carlos | Carlos & Jorgelina, Paula & Joaquín, Agustín |
| **Fernando** | Gris Plata `#546E7A` | Fernando & Teresa | Inés & Franco, Cecilia & Juan, Lucía & Emiliano, Martín, Juan Ignacio, Gonzalo, Santiago & Valentina, Belén & Javier, Hernán, Mariana & Rodrigo, Victoria |
| **José Luis** | Celeste `#2980B9` | José Luis | Consagrado a la vida religiosa (*Sacerdote*) |
| **Isabel** | Ámbar `#D35400` | Isabel & Roberto | Bernardo & Marcela, Clara & Mariano |
| **Eugenio** | Terracota `#A93226` | Eugenio & Gabriela | Juan Ignacio & Carla, Carlos Alberto & Andrea, Eugenia & Thiago, Valen, Agustín |
| **Francisco** | Azul Marino `#1B4F72` | Francisco & María Laura | Marcos & Ángeles, Francisco & Camila, Juan Cruz & Milagros |

---

## 🚀 Cómo Ejecutar la Aplicación

No requiere instalación de librerías externas. Puedes abrir la aplicación de cualquiera de las siguientes formas:

1. **Doble Clic:** Abre directamente el archivo `index.html` con cualquier navegador web moderno (Google Chrome, Microsoft Edge, Firefox, Safari).
2. **Servidor Local (Recomendado):**
   ```bash
   python -m http.server 3000
   ```
   Y accede en tu navegador a: `http://localhost:3000`

---

## 📸 Gestión de Fotografías

Cada tarjeta de familiar cuenta con un contenedor circular para su retrato facial:

1. **Arrastrar y Soltar (Drag & Drop):** Arrastra cualquier imagen desde tu explorador de archivos directamente sobre la tarjeta de la persona en el árbol.
2. **Ficha del Integrante:** Haz clic sobre cualquier familiar para abrir el editor modal. Pulsa *"Subir foto desde archivo"* o pega un enlace web.
3. **Seguimiento desde el Directorio:** 
   * Ve a la pestaña **Directorio**.
   * Marca la casilla **"Solo personas sin foto"** para ver la lista de pendientes.
   * La barra de progreso superior muestra el avance en tiempo real (ej. *2 / 143 Fotos*).

---

## 🧭 Navegación y Herramientas

* **Lienzo Infinito:** Arrastra con el ratón o el dedo para moverte libremente. Usa la rueda o los controles `+` y `-` para hacer zoom.
* **Mini-Mapa:** Ubicado en la esquina inferior derecha para una visión global y salto rápido.
* **Búsqueda Instantánea:** Escribe cualquier nombre en el buscador superior; al seleccionarlo, la vista se desplazará suavemente centrando y resaltando la tarjeta.
* **Modos de Vista:**
  * **Árbol:** Disposición panorámica jerárquica con conectores SVG.
  * **Ramas:** Tarjetas agrupadas por las 11 ramas familiares.
  * **Directorio:** Tabla detallada con estadísticas y filtros.
* **Exportación y Respaldo:**
  * **Exportar Respaldo (JSON):** Descarga una copia de seguridad que incluye todos los datos y fotos codificadas en Base64.
  * **Importar Respaldo (JSON):** Restaura tu árbol con todas sus fotos en cualquier computadora.
  * **Exportar a Excel (CSV):** Genera una tabla compatible con hojas de cálculo.
  * **Exportar a GEDCOM (.ged):** Estándar genealógico internacional para MyHeritage, Ancestry, etc.
  * **Imprimir / Guardar como PDF:** Vista optimizada para impresión en póster.
