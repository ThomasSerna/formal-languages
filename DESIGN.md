---
name: Autómata
description: Laboratorio continuo para construir un autómata y comparar cada paso con su configuración.
colors:
  accent: "#6a45b8"
  accent-hover: "#573499"
  accent-wash: "#f0eaf9"
  activity: "#0e7490"
  activity-ink: "#085c73"
  activity-wash: "#e5f3f6"
  shell: "#3c3152"
  ink: "#252335"
  muted: "#625d70"
  border: "#ddd8e5"
  control-border: "#bdb5cb"
  paper: "#ffffff"
  ground: "#f7f5fa"
  accepted: "#167249"
  rejected: "#b12c40"
  inconclusive: "#8a5b18"
  nav-surface: "#493d5e"
  nav-text: "#e9e1f1"
  nav-selected: "#4f2c86"
typography:
  headline:
    fontFamily: "'Source Sans 3', 'Segoe UI', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0"
  title:
    fontFamily: "'Source Sans 3', 'Segoe UI', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Source Sans 3', 'Segoe UI', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Source Sans 3', 'Segoe UI', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  notation:
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  state:
    fontFamily: "'STIX Two Text', Georgia, serif"
    fontSize: "23px"
    fontWeight: 400
    lineHeight: 1.2
rounded:
  compact: "4px"
  control: "6px"
  support: "8px"
  circle: "50%"
spacing:
  compact: "4px"
  tight: "6px"
  control: "8px"
  group: "12px"
  panel: "16px"
  inset: "20px"
  section: "24px"
  large: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-neutral:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 9px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 11px"
  model-navigation:
    backgroundColor: "{colors.nav-surface}"
    textColor: "{colors.nav-text}"
    rounded: "{rounded.control}"
    padding: "3px"
  state-chip:
    backgroundColor: "{colors.activity-wash}"
    textColor: "{colors.activity-ink}"
    rounded: "{rounded.compact}"
    padding: "3px 9px"
  reference-panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.support}"
    padding: "20px 24px"
  graph-state:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.state}"
    rounded: "{rounded.circle}"
    size: "60px"
  transition-label:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.notation}"
    rounded: "{rounded.compact}"
    padding: "5px 9px"
  input-symbol:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    padding: "3px 5px"
    width: "34px"
---

# Design System: Autómata

## Overview

**Creative North Star: "Secuencia en continuidad"**

Un laboratorio universitario de superficies claras, cabecera ciruela y bandas de trabajo continuas. La construcción y la ejecución comparten una escena: el grafo conserva su presencia mientras la entrada, la regla aplicada y la configuración permiten comparar cada paso.

La identidad se apoya en tipografía legible, diagramas operativos y dos acentos con funciones distintas. El violeta identifica edición y selección; el petróleo vincula la actividad del grafo con el cálculo. El detalle contextual aparece junto al trabajo y la referencia formal conserva una lectura propia debajo.

La aplicación no distribuye imágenes raster: la geometría operativa del grafo y los iconos se construyen con SVG y HTML. Las capturas y propuestas locales son artefactos de revisión; la procedencia y las licencias de las fuentes locales están registradas en `public/fonts/README.md`.

**Key Characteristics:**

- Cabecera ciruela y superficies blancas separadas por bordes discretos.
- Violeta para seleccionar y editar; petróleo para representar la ejecución.
- Source Sans 3 en la interfaz, STIX Two Text en nombres matemáticos y monoespaciada en datos.
- Burbujas contextuales junto a estados y reglas, dentro del lienzo en todos los tamaños.
- Lienzo prioritario y simulación en una bandeja inferior plegable.

## Colors

La paleta combina ciruela, papel ligeramente violáceo y tinta oscura; los acentos separan la intención de edición de la actividad del modelo.

### Primary

- **Violeta de edición:** acciones principales, foco, selección de estados y reglas, enlaces y controles de configuración. El lavado acompaña las superficies seleccionadas; la variante oscura sirve al hover de la acción principal.

### Secondary

- **Petróleo de ejecución:** estados y reglas utilizados, símbolo actual, cinta, pila, configuración y explicación del paso. La tinta de petróleo mantiene legibilidad sobre el lavado claro.

### Tertiary

- **Aceptación / rechazo / inconclusión:** verde, rojo y ocre para los resultados explícitos. El rojo también identifica errores de campo y eliminación.

### Neutral

- **Ciruela:** cabecera de marca y navegación. La navegación usa un tono próximo; su selección es una superficie blanca con texto violeta oscuro.
- **Tinta / tinta secundaria:** texto principal y explicaciones o metadatos.
- **Borde / borde de control:** separación tenue entre zonas y contorno más firme en campos y botones.
- **Papel / fondo:** lienzo y herramientas blancos; el fondo ligeramente violáceo sostiene las referencias inferiores.

### Named Rules

**The Separate Signals Rule.** El violeta comunica selección y edición; el petróleo comunica ejecución. Un nodo seleccionado y activo conserva el borde violeta y el interior de actividad.

**The Explicit Result Rule.** Aceptación, rechazo e inconclusión conservan una etiqueta textual; el color acompaña el resultado.

## Typography

**Display / Body Font:** Source Sans 3, con Segoe UI, system-ui y sans-serif como alternativas. La fuente variable se autoaloja con pesos (200–900).

**Mathematical Font:** STIX Two Text en cursiva, autoalojada con pesos (400–700), para nombres de estados y símbolos de la definición. Georgia es la alternativa de los nodos; la definición añade Cambria Math.

**Label/Mono Font:** SFMono-Regular, Consolas y Liberation Mono para reglas, fórmulas y datos; algunos conjuntos formales recurren directamente a Consolas.

**Character:** una sans humanista permite leer controles compactos; la cursiva matemática distingue el objeto formal y la monoespaciada mantiene estables símbolos y configuraciones. La marca usa Source Sans 3 con peso (650), tamaño (26px) y espaciado (-0.035em).

### Hierarchy

- **Headline:** nombre del documento discreto de (14px), dentro de la barra de herramientas y truncado en una línea cuando falta espacio.
- **Title:** secciones de lectura. El inspector usa (18px) y la banda de simulación (19px), que pasa a (20px) en móvil.
- **Body:** texto general. Ayudas y metadatos usan (12–14px); la explicación del paso usa (15px), interlineado (1.4) y máximo (75ch).
- **Label:** botones y campos. Los botones usan el interlineado del token; las etiquetas de formulario heredan (1.5).
- **Notation:** reglas del grafo. La entrada usa (16px), los símbolos (17px), la cinta (18px) y el estado actual (19px).
- **State:** cursiva matemática en nodos; los sufijos numéricos bajan a subíndices de (0.65em).

Los archivos de fuente y su cobertura están registrados en `public/fonts/README.md`. Los operadores ausentes en las fuentes locales requieren los respaldos del sistema.

## Layout

La escena de edición ocupa todo el ancho y `100dvh`, con un mínimo de (480px) para ventanas muy bajas. La cabecera conserva la marca, los cuatro modelos y Archivo. Una sola barra agrupa creación, configuración y nombre discreto; desaparecen la franja contextual y el enlace superior a la definición.

El lienzo flexible ocupa el espacio restante sin una columna lateral. Las propiedades flotan en burbujas no modales de (280px) para estados y (320px) para transiciones y configuración, limitadas al ancho del lienzo menos (24px). Se separan (12px) del objeto y de los bordes, cambian de lado cuando falta espacio y se reposicionan al desplazar, ampliar o mover objetos. En pantallas estrechas pueden situarse arriba o abajo del objeto; su cuerpo se desplaza si falta altura.

La bandeja inferior comienza cerrada. Su cabecera de (44px) conserva una leyenda mínima y «Probar cadena», con el número de detalles de validación cuando los hay. El contenido abierto mide como máximo `min(40dvh, 340px)` y tiene desplazamiento propio. Abrir y cerrar conserva centro y zoom del grafo, entrada, cálculo, historial y rama seleccionada; cerrar pausa la reproducción. El enlace de salto abre la bandeja y enfoca la entrada.

La definición formal y la explicación del modelo permanecen debajo del editor, cerradas inicialmente. La guía de uso y las instrucciones permanentes desaparecen. La referencia conserva su ancho máximo de (1440px), relleno de (24px), separación de (24px) y columnas (2:1).

- Hasta (1200px), desaparecen las descripciones de modelo.
- Hasta (850px), la navegación ocupa su propia fila, el título se ajusta dentro de la barra de herramientas y la referencia pasa a una columna.
- Hasta (600px), los tres controles de edición comparten una fila con objetivos mínimos de (44px). La simulación apila sus controles dentro de la bandeja.
- Entrada y cinta conservan desplazamiento horizontal local. La pila usa bloques verticales con el tope arriba, una base visual y desplazamiento vertical local hasta (136px). Los mensajes y fórmulas ajustan línea.

## Elevation & Depth

Las bandas de navegación, lienzo y simulación permanecen planas. Archivo y las burbujas usan elevación para distinguir acciones temporales sobre la superficie de trabajo.

### Shadow Vocabulary

- **Menú Archivo:** `0 8px 26px #251c3b2b`.
- **Burbuja contextual:** `0 6px 28px #251c3b26`, con contorno tenue de (1px) y radio de (12px).

**The Continuous Surface Rule.** El lienzo conserva todo su ancho; la elevación se reserva para los controles flotantes.

## Shapes

Los controles usan esquinas suaves; chips, símbolos y etiquetas son más compactos. Las referencias y el menú Archivo usan el radio de soporte. La envolvente del trabajo mantiene esquinas rectas; las burbujas usan un radio de (12px).

Los estados son círculos de (60px) con borde de (2px). La aceptación añade un segundo círculo interior; una flecha exterior indica inicio. Las transiciones conservan dirección, curvas recíprocas y autolazos. Estas formas expresan propiedades del modelo.

## Components

### Buttons

Controles con texto explícito y jerarquía contenida.

- **Primary:** blanco sobre violeta para «Paso siguiente» y confirmación de cambios.
- **Neutral:** papel, tinta y borde de control; altura mínima general de (40px).
- **Text:** fondo y borde transparentes para acciones auxiliares. El peligro se comunica mediante rojo y texto.
- **States:** hover solo con puntero preciso; foco visible general de (3px) y separación de (3px). La cabecera usa un foco claro. Los controles inactivos cambian texto, fondo, borde y cursor.
- **Motion:** fondo y borde cambian en (140ms). La preferencia de movimiento reducido elimina la transición.

### Inputs / Fields

Campos delineados y etiquetas encima.

- Altura mínima de (42px), con contorno de control y cursor violeta.
- Foco visible global y borde violeta; error con borde rojo, mensaje asociado y `aria-invalid`.
- La cadena combina un campo monoespaciado con «Usar ε» dentro de un mismo contorno.
- Los formularios ofrecen una alternativa a mover o conectar objetos directamente en el grafo.

### Navigation

Cuatro modelos en una banda ciruela.

- Acrónimo y descripción en escritorio; los acrónimos permanecen al reducir el ancho.
- La selección blanca usa texto violeta oscuro y `aria-current`.
- Una superficie única se desplaza entre cuatro columnas en (220ms), con `cubic-bezier(.16, 1, .3, 1)`. El teclado y el movimiento reducido resuelven el cambio inmediatamente.
- Archivo agrupa importación, exportación y creación; sus acciones tienen una altura mínima de (44px), cierre con Escape y recuperación del foco.

### Chips / symbols

Unidades estables de notación.

- Los estados de ejecución usan lavado de petróleo, tinta de petróleo y borde suave.
- El símbolo actual combina borde e interior de petróleo; la entrada consumida cambia a una superficie tenue.
- Las celdas de cinta conservan índices; el cabezal añade una etiqueta textual.
- La pila muestra un bloque por símbolo, del tope al fondo, con una marca «Tope» además del borde de actividad. Sigue la rama y el paso inspeccionados; al cambiar de configuración vuelve al tope. Las pilas vacías y la ausencia de configuración tienen mensajes distintos.
- Los bloques nuevos de la pila aparecen desde arriba durante (220ms); la marca del tope acompaña cada paso. La preferencia de movimiento reducido elimina ambas animaciones.
- Los cambios de celda usan (160ms); los valores de configuración aparecen en (220ms), sin retrasar la actualización de datos.

### Cards / Containers

Referencias claras, con borde y sin sombra.

- La definición formal y la explicación del modelo usan desplegables nativos dentro de contenedores de soporte.
- Avisos y validación mantienen texto y acciones explícitos; los errores del modelo están en la bandeja de simulación.
- El inspector preserva campos estables al escribir y redimensionar, sin ayudas ni definición repetidas. Los roles del estado usan botones con icono, etiqueta y `aria-pressed`.

### Graph and simulation

El diagrama es operativo y conserva representación textual equivalente.

- Los nodos muestran inicio, aceptación, actividad y selección. Las etiquetas de reglas son botones; las conexiones con el mismo origen y destino agrupan sus etiquetas.
- Las reglas activas incluyen «en uso» y los nodos activos muestran su estado textual. La selección utiliza borde además de color.
- Zoom y «Ajustar todos los estados» permiten recorrer o abarcar el modelo. Los controles miden (44px); las reglas tienen objetivos mínimos de (44px), que aumentan a (48px) en pantallas pequeñas.
- Cuando el grafo completo no cabe a escala legible, abre alrededor del estado inicial con zoom (0.95), en cualquier ancho de pantalla. La vista permite desplazamiento y recentra un estado activo fuera del área visible. «Ajustar todos los estados» ofrece la vista general explícita, con escala entre (0.25) y (1.15); la vista inicial no promete mostrar todo el grafo a la vez.
- Cada paso produce un pulso de llegada y un trazo sobre las reglas utilizadas durante (220ms). Todas las reglas no deterministas aplicadas se resaltan simultáneamente.
- El mensaje de paso usa una región `aria-live="polite"`. Los pulsos decorativos están ocultos al árbol accesible y no reciben eventos.
- El ajuste manual de vista dura (240ms); recentrar un estado activo es inmediato. El movimiento reducido interrumpe también un ajuste ya iniciado.
- El inspector entra en (220ms), con escala (0.94 → 1.01 → 1), y sale en (140ms), con escala final (0.97), desde el borde orientado al objeto o botón que lo abre. El cierre retira la interacción y la exposición accesible inmediatamente; el teclado y el movimiento reducido evitan la animación.
- Cambiar el objeto inspeccionado acompaña el contenido con una aparición de (160ms); escribir conserva los campos. Avisos y validación usan (160ms) y un desplazamiento de (3px).
- Pulsar el fondo vacío, incluso al comenzar a arrastrar, produce una onda de puntos halftone de (3px) en una cuadrícula de (8px) durante (1800ms). Las franjas lavanda de contorno orgánico se expanden hasta el extremo del lienzo y se desvanecen. Un único canvas transparente queda sobre la retícula y debajo de nodos, reglas y controles; conserva hasta cuatro ondas en coordenadas de pantalla, sin interceptar eventos ni reaccionar a objetos o controles. La cuadrícula de puntos se rasteriza una vez y cada fotograma actualiza una máscara pequeña de opacidad; solo se dibuja mientras hay ondas y la resolución se limita a (2×). El movimiento reducido omite y cancela las ondas.
- La reproducción mantiene intervalos de (1400ms), (800ms) o (300ms). El movimiento reducido conserva datos, etiquetas y estados, sin pulsos ni transiciones.

## Do's and Don'ts

### Do:

- **Do** mantener violeta para edición y petróleo para ejecución.
- **Do** conservar etiquetas, contornos y formas que explican cada estado además de su color.
- **Do** permitir comparar grafo, entrada y configuración con posiciones estables.
- **Do** mantener formularios, definición formal, foco visible y controles táctiles accesibles.
- **Do** adaptar el flujo a una columna y conservar el desplazamiento local de los datos en pantallas pequeñas.
- **Do** respetar movimiento reducido y cancelar las animaciones en curso al cambiar la preferencia.

### Don't:

- **Don't** usar solo color para distinguir selección, actividad o resultados.
- **Don't** sustituir el lienzo funcional por una imagen del grafo.
- **Don't** añadir sombras a las bandas de trabajo o a la simulación.
- **Don't** reducir la notación para encajar todo el contenido en una pantalla.
