---
name: Autómata
description: Laboratorio claro de lenguajes formales, con grafo, configuración y regla sincronizados.
colors:
  cobalt: "#245de8"
  cobalt-hover: "#164bcf"
  cobalt-ink: "#174ac5"
  cobalt-wash: "#eaf0ff"
  ink: "#182641"
  muted: "#536276"
  border: "#dce3ef"
  paper: "#ffffff"
  shell: "#f3f6fb"
  canvas: "#fbfcff"
  inspector: "#f9fbfe"
  accepted: "#167249"
  rejected: "#b12c40"
  inconclusive: "#8a5b18"
  danger: "#b42338"
typography:
  headline:
    fontFamily: "Manrope, 'Segoe UI', sans-serif"
    fontSize: "27px"
    fontWeight: 650
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
- Inspector contextual y configuración junto al área de trabajo.
- Controles y representación textual para complementar los gestos del grafo.

## Colors

La paleta combina papel frío y tinta azul oscura con un acento de cobalto; los colores de resultado conservan un significado propio.

### Primary
- **Cobalto:** acciones principales, foco de interacción, estado seleccionado y reglas activas. Su variante oscura sirve al hover de la acción principal; la tinta y el lavado de cobalto distinguen estados activos y etiquetas del grafo.

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

El contenedor central tiene un máximo de (1496px), con márgenes laterales de (28px). La navegación de modelos ocupa cuatro columnas. El editor divide el ancho en un lienzo flexible y un inspector de (302px); a (1150px) el inspector pasa a (280px), se ocultan descripciones de navegación y se simplifican los metadatos.

A (850px) o menos, el inspector sigue al grafo en una sola columna y comienza contraído. Seleccionar un estado o una regla, o crear una conexión, abre la edición contextual. Debajo del grafo aparece un control compacto para avanzar, consultar la configuración y llegar al campo de entrada. La explicación completa de la simulación permanece en su panel.

A (600px) o menos, los márgenes de página pasan a (12px), los controles de reproducción forman dos columnas y la configuración se coloca bajo la tira de símbolos. Las tiras de entrada, cinta y tabla permiten desplazamiento horizontal dentro de su área. Los controles principales de reproducción e inspector alcanzan (44px) de altura en móvil.

El lienzo normal mide (380px) de alto y en pantallas de hasta (640px), (350px). En portátil, con ancho desde (851px) y altura hasta (850px), la cabecera, navegación y espacios verticales se compactan; los lienzos AFD y AFN miden (280px). El ritmo recurrente se apoya en espacios de (4–28px), según los tokens del frontmatter.

## Elevation & Depth

La profundidad procede principalmente de bordes y cambios de tono. La navegación seleccionada y los controles del grafo llevan una sombra apenas perceptible; los nodos seleccionados o activos usan anillos de cobalto. El símbolo actual y la pestaña seleccionada tienen un trazo interior inferior que comunica estado. No hay sombras grandes bajo los paneles.

### Shadow Vocabulary
- **Navegación seleccionada:** `0 2px 4px #21355706`.
- **Controles del grafo:** `0 2px 5px #18264105`.
- **Nodo seleccionado:** `0 0 0 5px #245de817`.
- **Nodo activo:** `0 0 0 5px #245de810`.
- **Selección interior:** `inset 0 -2px var(--accent)` en pestañas del inspector y símbolo actual.

## Shapes

Los paneles usan esquinas suavemente redondeadas y bordes de (1px). Botones y campos comparten el radio de control; los chips y símbolos son más compactos. La navegación tiene una envolvente redondeada y sus botones conservan la forma del resto de controles.

Los estados del grafo son círculos de (60px) con borde de (2px). La aceptación añade un segundo círculo interior; la flecha exterior indica inicio. Las transiciones usan trazos dirigidos, curvas para conexiones recíprocas y bucles para una transición al mismo estado.

## Components

### Buttons

Controles compactos con texto explícito.
- **Primary:** texto blanco sobre cobalto para el paso siguiente y la confirmación de cambios.
- **Neutral:** papel, texto secundario oscuro y borde frío; altura mínima general de (40px).
- **Text:** fondo y borde transparentes para acciones auxiliares.
- **Hover / Focus:** hover en dispositivos con puntero preciso; foco general de (3px) en cobalto con separación de (3px). La pulsación desplaza el botón (1px) hacia abajo.
- **Disabled:** se atenúan fondo, texto y borde; el cursor indica que la acción no está disponible.

### Chips

Pequeñas unidades de notación.
- Los estados activos de la simulación usan un lavado de cobalto, contorno suave y texto monoespaciado.
- El estado actual individual aumenta el tamaño de la notación; no se presenta como un botón.

### Cards / Containers

Paneles de trabajo blancos y planos.
- El editor agrupa título, herramientas, grafo e inspector dentro de una envolvente.
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

### Graph and simulation

El grafo es un componente operativo. Los nodos tienen indicadores de inicio, aceptación y actividad; las reglas activas y seleccionadas aumentan el grosor del trazo. Las etiquetas de reglas son controles seleccionables, y las conexiones que comparten origen y destino agrupan sus etiquetas.

El zoom, el ajuste a vista y el desplazamiento permiten explorar el lienzo. En lienzos de menos de (650px) de ancho, los grafos que no caben a una escala legible abren cerca del estado inicial con zoom (0.95) y una indicación para deslizar. Un estado activo fuera de la vista se recentra sin animación. Ajustar a vista incluye el espacio de flechas iniciales y bucles. A (849px) o menos, los controles de zoom miden (44px), las etiquetas de reglas tienen objetivos mínimos de (48px) y se amplía el área táctil de los conectores.

El teclado mueve y selecciona nodos; el inspector y la representación textual permiten editar estados y reglas. La simulación presenta entrada, resultado, número de paso y configuración; para pila añade selección de rama y tope a la izquierda, y para Turing una ventana de cinta con posición del cabezal.

Las transiciones de interfaz duran (100–150ms); la reproducción usa intervalos de (1400ms), (800ms) o (300ms). La preferencia de movimiento reducido elimina las transiciones de botones, nodos y etiquetas, y suprime el desplazamiento de pulsación.

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
