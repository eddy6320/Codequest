/* Lenguajes planificados (aparecen como "Próximamente"). Para publicar uno: crea content/<id>.js
   siguiendo CONTENT_SPEC.md, agrégalo a index.html y a sw.js, y quítalo de esta lista. */
(window.CQ = window.CQ || { content: {}, roadmap: [] });
CQ.roadmap.push(
  { id: 'typescript', name: 'TypeScript', emoji: '🔷', color: '#3178c6', units: ['Tipos básicos', 'Interfaces y alias', 'Genéricos', 'Narrowing y utilidades', 'TypeScript en proyectos reales'] },
  { id: 'cpp', name: 'C++', emoji: '🚀', color: '#00599c', units: ['Primeros pasos', 'Tipos, referencias y punteros', 'Clases y RAII', 'STL: vectores, mapas, algoritmos', 'Plantillas y C++ moderno'] },
  { id: 'csharp', name: 'C#', emoji: '🎯', color: '#68217a', units: ['Primeros pasos', 'Tipos y control de flujo', 'Clases y objetos', 'LINQ y colecciones', 'Async/await y .NET'] },
  { id: 'go', name: 'Go', emoji: '🐹', color: '#00add8', units: ['Primeros pasos', 'Tipos, slices y mapas', 'Funciones y structs', 'Interfaces y errores', 'Goroutines y canales'] },
  { id: 'rust', name: 'Rust', emoji: '🦀', color: '#b7410e', units: ['Primeros pasos', 'Ownership y borrowing', 'Structs, enums y match', 'Traits y genéricos', 'Concurrencia segura'] },
  { id: 'php', name: 'PHP', emoji: '🐘', color: '#777bb4', units: ['Primeros pasos', 'Arrays y funciones', 'Formularios y sesiones', 'POO', 'Bases de datos con PDO'] },
  { id: 'kotlin', name: 'Kotlin', emoji: '🎨', color: '#7f52ff', units: ['Primeros pasos', 'Null safety', 'Clases y data classes', 'Colecciones y lambdas', 'Corrutinas'] },
  { id: 'swift', name: 'Swift', emoji: '🕊️', color: '#f05138', units: ['Primeros pasos', 'Opcionales', 'Structs y clases', 'Protocolos y genéricos', 'Concurrencia'] },
  { id: 'ruby', name: 'Ruby', emoji: '💎', color: '#cc342d', units: ['Primeros pasos', 'Colecciones y bloques', 'Clases y módulos', 'Metaprogramación suave', 'Testing'] },
  { id: 'bash', name: 'Bash y terminal', emoji: '💻', color: '#4eaa25', units: ['Navegar archivos', 'Tuberías y redirección', 'Variables y scripts', 'Condicionales y bucles', 'Herramientas: grep, sed, awk'] },
  { id: 'r', name: 'R', emoji: '📊', color: '#276dc3', units: ['Primeros pasos', 'Vectores y data frames', 'Visualización', 'Estadística básica'] },
  { id: 'dart', name: 'Dart', emoji: '🎯', color: '#0175c2', units: ['Primeros pasos', 'Clases y null safety', 'Colecciones', 'Async y streams'] }
);
