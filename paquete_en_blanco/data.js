/**
 * Árbol Genealógico - Datos Familiares
 * 
 * INSTRUCCIONES RÁPIDAS:
 * 1. "familyName": Escribe el nombre de tu familia (Ej: "FAMILIA PÉREZ GÓMEZ").
 * 2. "id": Identificador único en minúsculas sin espacios (Ej: "perez_gomez").
 * 3. Puedes editar a los fundadores y agregar a todos los hijos/nietos 
 *    directamente desde la página web haciendo clic en las tarjetas o con "+ Agregar Familiar".
 */
const FAMILY_TREE_DATA = {
  "meta": {
    "id": "mi_familia",
    "familyName": "Familia Ejemplo",
    "subtitle": "Árbol Genealógico Familiar",
    "description": "Árbol genealógico interactivo con fotografías y datos de cada integrante.",
    "generationsCount": 5
  },
  "branches": [
    {
      "id": "patron",
      "name": "Cabezas de Familia",
      "headName": "Fundadores Familiares",
      "color": "#722F37",
      "badgeColor": "#8B263E",
      "textColor": "#ffffff"
    },
    {
      "id": "rama_1",
      "name": "Rama Familiar 1",
      "headName": "Primera Rama",
      "color": "#8B6F55",
      "badgeColor": "#755941",
      "textColor": "#ffffff"
    }
  ],
  "members": [
    {
      "id": "patriarca_fundador",
      "name": "ABUELO",
      "fullName": "Nombre Apellido (Abuelo)",
      "branch": "patron",
      "generation": 1,
      "gender": "M",
      "role": "Patriarca",
      "spouseId": "matriarca_fundadora",
      "birthYear": 1930,
      "notes": "Haz clic sobre esta tarjeta para editar mi nombre, año de nacimiento y subir una fotografía."
    },
    {
      "id": "matriarca_fundadora",
      "name": "ABUELA",
      "fullName": "Nombre Apellido (Abuela)",
      "branch": "patron",
      "generation": 1,
      "gender": "F",
      "role": "Matriarca",
      "spouseId": "patriarca_fundador",
      "birthYear": 1935,
      "notes": "Haz clic sobre esta tarjeta para editar mi nombre, año de nacimiento y subir una fotografía."
    }
  ]
};

// Exportación modular o para uso en navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FAMILY_TREE_DATA;
}
