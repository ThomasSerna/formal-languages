---
name: Autómata
description: Laboratorio claro de lenguajes formales, con grafo, configuración y regla sincronizados.
colors:
  cobalt: "#245de8"
  cobalt-hover: "#164bcf"
  cobalt-ink: "#174ac5"
  cobalt-wash: "#eaf0ff"
  cobalt-trace: "#79a5ff"
  ink: "#182641"
  muted: "#536276"
  border: "#dce3ef"
  paper: "#ffffff"
  shell: "#f5f7fb"
  canvas: "#fbfcff"
  inspector: "#f9fbfe"
  accepted: "#167249"
  rejected: "#b12c40"
  inconclusive: "#8a5b18"
  danger: "#b42338"
typography:
  headline:
    fontFamily: "Manrope, 'Segoe UI', sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "-0.015em"
  body:
    fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
  notation:
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
    fontSize: "12px"
    lineHeight: 1.5
  transition:
    fontFamily: "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
  state:
    fontFamily: "'STIX Two Text', Georgia, serif"
    fontSize: "23px"
    lineHeight: 1.2
rounded:
  tag: "4px"
  chip: "5px"
  symbol: "6px"
  control: "7px"
  support: "9px"
  navigation: "11px"
  panel: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  section: "24px"
  gutter: "28px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "8px 13px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-hover}"
  button-neutral:
    backgroundColor: "{colors.paper}"
    textColor: "#344563"
    rounded: "{rounded.control}"
    padding: "8px 13px"
  button-text:
    backgroundColor: "transparent"
    textColor: "#344563"
    rounded: "{rounded.control}"
    padding: "8px 9px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 11px"
  model-navigation:
    backgroundColor: "#eaf0f8"
    rounded: "{rounded.navigation}"
    padding: "5px"
  state-chip:
    backgroundColor: "#eff4ff"
    textColor: "#2454c8"
    rounded: "{rounded.chip}"
    padding: "5px 11px"
  laboratory-panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
  graph-state:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "50%"
    size: "60px"
  input-symbol:
    backgroundColor: "#f8fafd"
    textColor: "#3d506e"
    rounded: "{rounded.symbol}"
    padding: "5px"
    width: "40px"
---

# Design System: Autómata

## Overview

**Creative North Star: "Laboratorio claro de cobalto"**

El sistema presenta un laboratorio universitario de trabajo directo. Superficies blancas y frías, tinta oscura y cobalto dan prioridad al grafo y a su configuración actual. La densidad permite construir, inspeccionar y ejecutar un modelo dentro de una misma herramienta.

La identidad se expresa mediante tipografía, controles y diagramas funcionales. El grafo, la configuración y la regla se actualizan juntos; el color acompaña ese vínculo y el texto explica cada paso. El grafo combina trazos SVG con nodos y etiquetas HTML interactivos, sin imágenes raster de decoración.

**Key Characteristics:**
- Superficies claras delimitadas por bordes finos.
- Cobalto para acciones principales, selección y ejecución activa.
- Interfaz sans, notación monoespaciada y nombres matemáticos en serif cursiva.
- Inspector contextual en un popup no modal junto al elemento seleccionado.
- Controles y definición formal con ecuaciones para complementar los gestos del grafo.

## Colors

La paleta combina papel frío y tinta azul oscura con un acento de cobalto; los colores de resultado conservan un significado propio.

### Primary
- **Cobalto:** acciones principales, foco de interacción, estado seleccionado y reglas activas. Su variante oscura sirve al hover de la acción principal; la tinta y el lavado de cobalto distinguen estados activos y etiquetas del grafo.
- **Trazo de cobalto:** acento luminoso de las capas decorativas que recorren una regla aplicada; el trazo base y su etiqueta conservan la información de actividad.

### Secondary
- **Aceptación:** verde en el resultado aceptado de la simulación.
- **Rechazo:** rojo en el resultado rechazado; el tono de peligro se reserva para eliminación y validación de campos.
- **Inconcluso:** ocre en el resultado limitado por recursos. Conserva una etiqueta explícita de resultado inconcluso.

### Neutral
- **Tinta:** texto principal, encabezados y nombres del modelo.
- **Tinta secundaria:** explicaciones, ayudas, metadatos y trazos inactivos.
- **Borde frío:** separación entre herramientas y contornos de paneles.
- **Papel / fondo / lienzo / inspector:** blancos y grises azulados que distinguen la página, el área del grafo y el panel de edición mediante tono y borde.

### Named Rules
**The Synchronized Cobalt Rule.** Una configuración activa se reconoce en el grafo y en la simulación mediante la misma familia de cobalto y una descripción textual de su estado.

**The Explicit Result Rule.** Aceptación, rechazo e inconclusión siempre llevan una etiqueta; el color no sustituye su significado.

## Typography

**Display Font:** Manrope, con Segoe UI y sans-serif como alternativas. Se autoaloja como fuente variable y se utiliza en el nombre de la marca y el encabezado principal.

**Body Font:** Segoe UI Variable, Segoe UI, system-ui y sans-serif. Los títulos secundarios mantienen esta familia de interfaz.

**Label/Mono Font:** SFMono-Regular, Consolas y Liberation Mono para tuplas y fórmulas; Consolas para entrada, chips, pila y cinta. Las reglas del grafo declaran IBM Plex Mono y recurren a SFMono-Regular o Consolas cuando esa fuente no está instalada. Los nombres de los estados usan STIX Two Text o Georgia, en cursiva.

**Character:** Manrope da carácter al encabezado sin ocupar espacio de trabajo. La familia de interfaz mantiene legibles las herramientas compactas; la notación separa visualmente símbolos, estados y texto explicativo.

### Hierarchy
- **Headline:** encabezado del modelo; baja a (23px) en móvil y a (24px) en la disposición compacta para portátil.
- **Title:** encabezados de sección; los títulos del inspector y del documento se compactan a (15px) y (14px).
- **Body:** texto general. La interfaz utiliza explicaciones locales de (12–13px); los mensajes de cada paso tienen interlineado (1.75) y un ancho máximo de (80ch).
- **Label:** campos y herramientas. Los botones generales usan (13px), peso (600) e interlineado (1.35); los controles densos usan (12px).
- **Notation:** tuplas y reglas. Los símbolos de entrada, cinta y chips de estado grandes suben a (19px).
- **State:** nombre matemático del nodo; los sufijos numéricos se presentan como subíndices.

## Layout

La primera pantalla ocupa la altura disponible del navegador. La cabecera, la navegación de cuatro modelos y las herramientas se compactan para dejar al grafo todo el ancho y el resto de la altura. El lienzo crece con la ventana y no reserva espacio para una barra lateral.

Seleccionar un estado o una regla, o crear una conexión, abre un popup no modal anclado al elemento. Su posición y altura se ajustan para permanecer dentro del lienzo, con desplazamiento interno cuando hace falta. La configuración del modelo se abre desde la barra de herramientas; el inspector comienza cerrado y se descarta con su botón, Escape o un clic en el fondo del grafo.

El inspector presenta un encabezado fijo con título contextual, acceso a «Ver modelo» al editar estados y cierre SVG de (44px). Los campos y las acciones aparecen primero. «Ayuda y definición» es un único desplegable nativo, cerrado al seleccionar otro objeto; escribir conserva tanto el desplegado como la identidad de los campos. Dentro se reúnen la explicación contextual y la definición formal compacta. Solo permanecen visibles las pistas indispensables sobre alfabetos y reemplazo de pila.

La guía, la validación, la prueba de cadenas y las referencias siguen debajo de la primera pantalla. El pie del grafo enlaza directamente con «Probar cadena». La definición formal presenta tupla, conjuntos y ecuaciones de transición; agrupa los resultados no deterministas y conserva controles para editar cada regla.

A (600px) o menos, los controles se acomodan al ancho disponible, la reproducción forma dos columnas y la configuración se coloca bajo la tira de símbolos. Las tiras de entrada y cinta permiten desplazamiento horizontal dentro de su área; las fórmulas se ajustan al ancho. Los controles principales de reproducción e inspector alcanzan (44px) de altura en móvil. El ritmo recurrente se apoya en espacios de (4–28px), según los tokens del frontmatter.

## Elevation & Depth

La profundidad procede principalmente de bordes y cambios de tono. La navegación seleccionada y los controles del grafo llevan una sombra apenas perceptible; los nodos seleccionados o activos usan anillos de cobalto. El símbolo actual tiene un trazo interior inferior que comunica estado. No hay sombras grandes bajo los paneles de trabajo; el popup conserva su sombra de elevación contextual.

### Shadow Vocabulary
- **Navegación seleccionada:** `0 2px 4px #21355706`.
- **Controles del grafo:** `0 2px 5px #18264105`.
- **Nodo seleccionado:** `0 0 0 5px #245de817`.
- **Nodo activo:** `0 0 0 5px #245de810`.
- **Selección interior:** `inset 0 -2px var(--accent)` en el símbolo actual.
- **Popup contextual:** `0 8px 32px #18264126`, en la superficie interior que se anima; el contenedor exterior solo posiciona y mide.

## Shapes

Los paneles usan esquinas suavemente redondeadas y bordes de (1px). Botones y campos comparten el radio de control; los chips y símbolos son más compactos. La navegación tiene una envolvente redondeada y sus botones conservan la forma del resto de controles.

Los estados del grafo son círculos de (60px) con borde de (2px). La aceptación añade un segundo círculo interior; la flecha exterior indica inicio. Las transiciones usan trazos dirigidos, curvas para conexiones recíprocas y bucles para una transición al mismo estado.

## Components

### Buttons

Controles compactos con texto explícito.
- **Primary:** texto blanco sobre cobalto para el paso siguiente y la confirmación de cambios.
- **Neutral:** papel, texto secundario oscuro y borde frío; altura mínima general de (40px).
- **Text:** fondo y borde transparentes para acciones auxiliares.
- **Hover / Focus:** hover en dispositivos con puntero preciso; foco general de (3px) en cobalto con separación de (3px). La pulsación con puntero reduce el botón a escala (0.98) en (100ms); el teclado conserva la escala.
- **Disabled:** se atenúan fondo, texto y borde; el cursor indica que la acción no está disponible.

### Chips

Pequeñas unidades de notación.
- Los estados activos de la simulación usan un lavado de cobalto, contorno suave y texto monoespaciado.
- El estado actual individual aumenta el tamaño de la notación; no se presenta como un botón.

### Cards / Containers

Paneles de trabajo blancos y planos.
- El editor agrupa título, herramientas y grafo dentro de una envolvente; el inspector flota dentro del lienzo.
- La simulación usa un panel equivalente, con relleno de (20px 22px) en escritorio y (18px 15px) en móvil.
- Las referencias plegables usan el radio de soporte y un borde frío.

### Inputs / Fields

Campos delineados sobre blanco.
- Altura mínima de (42px), radio de control y relleno indicado en el token de campo.
- Etiqueta encima del campo, separada por (6px), con ayuda contextual debajo.
- El foco usa el contorno global. El borde de peligro y el mensaje asociado comunican datos inválidos.
- La cadena de entrada usa notación monoespaciada y comparte contorno con la acción «Usar ε».

### Navigation

Cuatro modelos en una banda clara.
- La selección se muestra como una superficie blanca con contorno, texto de cobalto y sombra ligera.
- Los acrónimos permanecen visibles cuando desaparecen las descripciones en anchuras reducidas.
- El modelo activo se identifica también mediante `aria-current`.
- Una única superficie blanca se desliza entre modelos en (220ms), con desaceleración `cubic-bezier(.16, 1, .3, 1)`. Sus medidas siguen las cuatro columnas también en móvil; el foco permanece en el botón elegido.
- Los campos responden al foco y al puntero mediante el borde en (140ms). El encabezado del documento usa papel ligeramente frío y la etiqueta Editable un lavado de cobalto; la explicación del paso usa (13px), tinta secundaria y un máximo de (75ch).
- El popup se expande en (220ms), con escala (0.94 → 1.01 → 1) y opacidad. El origen corresponde al estado o regla, ajustado al borde del panel; en la configuración general es la esquina superior derecha. La salida reduce la escala a (0.97) y desvanece en (140ms), conservando posición y contenido mientras pierde inmediatamente interacción y exposición accesible. Reabrir cancela la salida y restablece los formularios cancelados; cambiar de modelo descarta el panel anterior.
- Cambiar de selección acompaña el contenido con una aparición de (160ms) desde opacidad (0.65), sin remontar los campos; escribir o mover el grafo no reinicia la burbuja. Guía, avisos, validación, confirmación de reemplazo y contenido desplegable usan (160ms) con un desplazamiento de (3px) y desaceleración exponencial.
- Aperturas y cierres por teclado son inmediatos, al igual que la selección de modelo por teclado. El foco nunca espera al movimiento. La preferencia de movimiento reducido elimina estas animaciones y cancela una entrada o salida ya iniciada, resolviendo el estado final. Los efectos de ejecución conservan su comportamiento propio.

### Graph and simulation

El grafo es un componente operativo. Los nodos tienen indicadores de inicio, aceptación y actividad; las reglas activas y seleccionadas aumentan el grosor del trazo. Las etiquetas de reglas son controles seleccionables, y las conexiones que comparten origen y destino agrupan sus etiquetas.

El zoom, el ajuste a vista y el desplazamiento permiten explorar el lienzo. En lienzos de menos de (650px) de ancho, los grafos que no caben a una escala legible abren cerca del estado inicial con zoom (0.95) y una indicación para deslizar. Un estado activo fuera de la vista se recentra sin animación. Ajustar a vista incluye el espacio de flechas iniciales y bucles y se anima durante (240ms) solo cuando lo solicita el usuario. La preferencia de movimiento reducido lo hace inmediato y detiene un ajuste en curso. A (849px) o menos, los controles de zoom miden (44px), las etiquetas de reglas tienen objetivos mínimos de (48px) y se amplía el área táctil de los conectores.

El teclado mueve y selecciona nodos; el popup del inspector y la definición formal permiten editar estados y reglas. La representación formal muestra funciones mediante ecuaciones, con conjuntos de destinos para AFN y conjuntos de pares (estado, reemplazo) para pila, equivalentes a su relación de transición. La simulación inferior presenta entrada, resultado, número de paso y configuración; para pila añade selección de rama y tope a la izquierda, y para Turing una ventana de cinta con posición del cabezal.

Cada paso tiene un pulso de llegada sobre los estados activos y un trazo luminoso sobre las conexiones utilizadas, ambos de (220ms), sin cambiar posiciones ni reconstruir el grafo. Se repiten incluso en autolazos. En AFN y pila, todas las reglas aplicadas se resaltan simultáneamente: el efecto no atribuye un orden a las clausuras ε ni un parentesco entre ramas.

La entrada, la configuración, la pila y la cinta muestran la instantánea actual inmediatamente y acompañan el cambio con feedback breve. Retroceder o saltar por el historial restaura los datos sin esperar al efecto. Las capas decorativas no reciben eventos ni forman parte del árbol accesible; los controles y las regiones de anuncio conservan su identidad.

Las transiciones de controles duran (100–150ms); la reproducción mantiene intervalos de (1400ms), (800ms) o (300ms). Los efectos de cada paso terminan antes del siguiente intervalo rápido. La preferencia de movimiento reducido elimina los pulsos, los desplazamientos y las transiciones nuevas, manteniendo colores, contornos, etiquetas y datos actuales.

## Do's and Don'ts

### Do:
- **Do** vincular el grafo, la configuración y el mensaje de paso mediante estados de cobalto y texto explícito.
- **Do** mantener la notación separada del texto de interfaz y conservar los indicadores formales de inicio y aceptación.
- **Do** acompañar los gestos del lienzo con edición por formulario y representación textual.
- **Do** preservar los cambios de disposición del inspector y de la simulación en pantallas pequeñas.
- **Do** usar SVG para los diagramas funcionales y conservar foco visible y movimiento reducido.

### Don't:
- **Don't** usar solo color para distinguir aceptación, rechazo e inconclusión.
- **Don't** sustituir el lienzo funcional por una imagen del grafo.
- **Don't** convertir las ayudas o metadatos en encabezados de mayor jerarquía que el modelo.
- **Don't** añadir sombras grandes a los paneles de trabajo.
