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
    fontSize: "23px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.02em"
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
- Inspector lateral en escritorio y apilado bajo el lienzo en pantallas pequeñas.
- Grafo, entrada y configuración legibles en una misma secuencia de trabajo.

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

- **Headline:** nombre del documento; se adapta a (22px) bajo el corte de tableta y a (20px) en móvil.
- **Title:** secciones de lectura. El inspector usa (18px) y la banda de simulación (19px), que pasa a (20px) en móvil.
- **Body:** texto general. Ayudas y metadatos usan (12–14px); la explicación del paso usa (15px), interlineado (1.4) y máximo (75ch).
- **Label:** botones y campos. Los botones usan el interlineado del token; las etiquetas de formulario heredan (1.5).
- **Notation:** reglas del grafo. La entrada usa (16px), los símbolos (17px), la cinta (18px) y el estado actual (19px).
- **State:** cursiva matemática en nodos; los sufijos numéricos bajan a subíndices de (0.65em).

Los archivos de fuente y su cobertura están registrados en `public/fonts/README.md`. Los operadores ausentes en las fuentes locales requieren los respaldos del sistema.

## Layout

La aplicación ocupa todo el ancho. La escena de edición y simulación tiene altura mínima `max(720px, 100dvh)`; puede crecer cuando el contenido lo necesita. Cabecera, contexto del documento y herramientas forman bandas compactas. El lienzo flexible tiene un mínimo de (260px); la simulación reserva al menos (218px), o (250px) en pila y Turing.

El nombre del documento precede visualmente al tipo de modelo, que aparece como información secundaria en la misma fila o se ajusta debajo cuando falta ancho.

El inspector es una columna contextual de (340px) a la derecha del lienzo. Su cuerpo se desplaza dentro de la columna; el título y el cierre permanecen fuera de ese desplazamiento. Las acciones y los campos aparecen antes del desplegable «Ayuda y definición». El inspector conserva su naturaleza no modal.

La simulación reúne entrada y reproducción arriba, y entrada consumida o cinta junto a la configuración debajo. La configuración ocupa (300px) en los autómatas finitos; pila distribuye dos columnas equivalentes. La explicación se sitúa junto a los datos del paso. El historial se despliega dentro de la banda y puede extender la página.

La referencia inferior tiene un ancho máximo de (1440px), relleno de (24px), separación de (24px) y columnas en proporción (2:1). Las ayudas no aumentan la jerarquía del documento ni desplazan las acciones a una pantalla inicial aparte.

- Hasta (1200px), desaparecen las descripciones de modelo y la tupla contextual; la reproducción puede pasar a otra línea.
- Hasta (850px), la navegación ocupa su propia fila. El inspector se apila bajo el lienzo, con altura máxima de (440px); el lienzo mide (410px). La simulación y la referencia pasan a una columna.
- Hasta (600px), el lienzo mide (370px), las herramientas y la reproducción usan dos columnas, y los controles principales alcanzan (44px). Turing apila entrada, cinta y explicación.
- Entrada, cinta y pila conservan desplazamiento local horizontal. Fórmulas, nombres y mensajes permiten ajuste de línea; los datos no se reducen para aparentar que caben.

El ritmo recurrente usa los pasos del frontmatter. Los interiores del inspector usan (12px 16px); el resto de bandas de escritorio conserva márgenes laterales de (24px), que bajan a (20px) y (12px).

## Elevation & Depth

La profundidad procede de cambios de tono y bordes. Grafo, simulación e inspector permanecen planos; la columna contextual tiene una separación lateral, sin sombra y sin esquinas redondeadas. La navegación seleccionada se desplaza como una superficie blanca. El único contenedor elevado reutilizable es el menú Archivo.

### Shadow Vocabulary

- **Menú Archivo:** `0 8px 26px #251c3b2b`, para separar las acciones flotantes de la cabecera y el documento.

**The Continuous Surface Rule.** Las áreas de construcción y cálculo se separan por borde y espacio; la elevación se reserva para el menú flotante.

## Shapes

Los controles usan esquinas suaves; chips, símbolos y etiquetas son más compactos. Las referencias y el menú Archivo usan el radio de soporte. La envolvente del trabajo y el inspector lateral mantienen esquinas rectas.

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
- Los cambios de celda usan (160ms); los valores de configuración aparecen en (220ms), sin retrasar la actualización de datos.

### Cards / Containers

Referencias claras, con borde y sin sombra.

- La definición formal y la explicación del modelo usan desplegables nativos dentro de contenedores de soporte.
- La guía usa lavado violeta; avisos y validación mantienen texto y acciones explícitos.
- El inspector preserva campos estables al escribir y una única sección cerrada de ayuda contextual.

### Graph and simulation

El diagrama es operativo y conserva representación textual equivalente.

- Los nodos muestran inicio, aceptación, actividad y selección. Las etiquetas de reglas son botones; las conexiones con el mismo origen y destino agrupan sus etiquetas.
- Las reglas activas incluyen «en uso» y los nodos activos muestran su estado textual. La selección utiliza borde además de color.
- Zoom y «Ajustar todos los estados» permiten recorrer o abarcar el modelo. Los controles miden (44px); las reglas tienen objetivos mínimos de (44px), que aumentan a (48px) en pantallas pequeñas.
- Cuando el grafo completo no cabe a escala legible, abre alrededor del estado inicial con zoom (0.95), en cualquier ancho de pantalla. La vista permite desplazamiento y recentra un estado activo fuera del área visible. «Ajustar todos los estados» ofrece la vista general explícita, con escala entre (0.25) y (1.15); la vista inicial no promete mostrar todo el grafo a la vez.
- Cada paso produce un pulso de llegada y un trazo sobre las reglas utilizadas durante (220ms). Todas las reglas no deterministas aplicadas se resaltan simultáneamente.
- El mensaje de paso usa una región `aria-live="polite"`. Los pulsos decorativos están ocultos al árbol accesible y no reciben eventos.
- El ajuste manual de vista dura (240ms); recentrar un estado activo es inmediato. El movimiento reducido interrumpe también un ajuste ya iniciado.
- El inspector entra en (220ms), con escala (0.94 → 1.01 → 1), y sale en (140ms), con escala final (0.97), desde la esquina superior izquierda de su superficie. El cierre retira la interacción y la exposición accesible inmediatamente; el teclado y el movimiento reducido evitan la animación.
- Cambiar el objeto inspeccionado acompaña el contenido con una aparición de (160ms); escribir conserva los campos. Las ayudas, avisos y validación usan (160ms) y un desplazamiento de (3px).
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
- **Don't** añadir sombras a las bandas de trabajo o al inspector lateral.
- **Don't** reducir la notación para encajar todo el contenido en una pantalla.
