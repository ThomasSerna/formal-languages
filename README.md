# Autómata

Laboratorio interactivo de lenguajes formales, en español. Construye y simula autómatas finitos deterministas, no deterministas con ε, autómatas de pila y máquinas de Turing. Aplicación estática en React, TypeScript y Vite; no necesita servidor ni cuentas.

## Ejecutar

Requiere Node.js 24 y npm.

```sh
npm ci
npm run dev
```

Abre la URL que muestra Vite, normalmente `http://127.0.0.1:5173/formal-languages/`.

```sh
npm test            # Motor matemático y archivos guardados
npm run build      # TypeScript y aplicación de producción en dist/
npm run preview    # Revisar el resultado de producción
npm run test:e2e   # Flujos reales en navegador
```

Las pruebas de navegador locales usan Google Chrome instalado. En CI se instala Chromium con `npx playwright install --with-deps chromium`; para usarlo localmente, elimina la opción `channel` del archivo de configuración de Playwright.

## Cómo usarlo

1. Abre el ejemplo AFD y avanza con **Paso siguiente**. Observa la entrada, la regla y los estados resaltados.
2. Selecciona un estado para cambiar su nombre o sus roles; selecciona una etiqueta para editar su regla.
3. Agrega estados y transiciones desde la barra. También puedes conectar el punto derecho de un estado con el izquierdo de otro, arrastrando o con dos clics.
4. Prueba una entrada diferente, reproduce el cálculo o retrocede. Cambiar el modelo o la entrada reinicia la ejecución; mover un estado conserva el cálculo.
5. Abre **Definición formal** para relacionar el dibujo con la tupla y **Estados y transiciones** para editar sin depender del lienzo.

Los estados admiten Tab, Enter/Espacio y las flechas del teclado. El formulario permite crear también autolazos. En pila, inspecciona cada rama por separado: estado, pila y posición de entrada no se comparten entre ramas.

El inspector muestra primero los campos de edición. **Ayuda y definición** reúne la explicación contextual y la tupla del modelo; comienza plegada al seleccionar otro objeto y conserva su estado al escribir.

La navegación y los controles usan transiciones breves. El inspector aparece como una burbuja desde el elemento seleccionado y se desvanece al cerrar; el foco responde inmediatamente. Abrir o cerrar por teclado es instantáneo. Cada paso resalta los estados y las reglas utilizados y acompaña los cambios de entrada, pila y cinta; los datos se actualizan inmediatamente. En AFN y pila las reglas del paso se muestran a la vez. Las preferencias de movimiento reducido del sistema eliminan los efectos y conservan los indicadores estáticos, incluso al cambiar la preferencia con el laboratorio abierto.

Los borradores se guardan por modelo en este navegador. **Exportar JSON** permite conservarlos o llevarlos a otro equipo. Importar valida el archivo antes de reemplazar el modelo y descarga una copia del borrador anterior. Los borradores con errores matemáticos se conservan; el simulador indica qué completar antes de ejecutarlos. No se guardan los historiales de ejecución.

## Convenciones matemáticas

Basado en *Automata and Computability*, de Dexter Kozen, y el material público del [curso SI2002/ST0270](https://sites.google.com/site/sergiosramirezrico/eafit/si2002-st0270?authuser=0).

- **AFD:** `M = (Q, Σ, δ, s, F)`. δ es total; los borradores con transiciones faltantes no se ejecutan.
- **AFN:** `N = (Q, Σ, Δ, S, F)`. Admite un conjunto de estados iniciales y la extensión con ε. Calcula la clausura ε inicial y después de cada símbolo; sigue todas las posibilidades.
- **Pila:** `P = (Q, Σ, Γ, δ, s, ⊥, F)`. Cada regla retira un símbolo real del tope y lo reemplaza por una palabra cuyo extremo izquierdo queda arriba. Aceptación por estado final **y entrada consumida**. No se utiliza el criterio alternativo de pila vacía.
- **Turing:** `M = (Q, Σ, Γ, ⊢, ␣, δ, s, t, r)`. Una cinta semiinfinita a la derecha; cabeza inicial en el marcador, movimientos L/R. Al leer el marcador se conserva y se mueve R. Las reglas omitidas son `δ(p,a)=(r,a,R)`. Los estados t/r son absorbentes y la interfaz se detiene al entrar en ellos.

Cada símbolo es un punto de código Unicode. ε se representa internamente como lectura `''` o reemplazo `[]`; no es una letra del alfabeto. El formato JSON usa `schemaVersion: 1`, modelos `dfa`, `nfa`, `pda`, `tm` y campos estructurados; las etiquetas del grafo se derivan de esas reglas.

Fuentes: [Kozen, lecciones de autómatas finitos](https://www.cs.cornell.edu/courses/cs6861/2024sp/Handouts/ACLec2-6.pdf), [pila, material del curso](https://asr.github.io/cursos/st0270-lenguajes-formales-y-compiladores/diapositivas/lenguajes-libres-de-contexto-y-automatas-a-pila.pdf), [Turing, notas de Cornell basadas en Kozen](https://www.cs.cornell.edu/courses/cs4820/2014sp/notes/kozen-computability-sp13.pdf). Los cuatro ejemplos del laboratorio son ejemplos docentes propios.

## Límites

| Recurso | Máximo |
| --- | --- |
| Documento | 50 estados, 300 reglas |
| Entrada | 256 símbolos |
| Archivo importado | 1 MiB |
| Pila | 2.000 configuraciones, 10.000 aplicaciones, profundidad 256 |
| Turing | 10.000 pasos, 4.096 posiciones de cinta |

Un límite produce **resultado inconcluso**, nunca rechazo. Una máquina de Turing o de pila puede no terminar; estos límites mantienen el navegador utilizable. El historial de Turing almacena cambios de celda para evitar copiar una cinta completa por cada paso.

## GitHub Pages

La base de Vite es `/formal-languages/`, correspondiente a este repositorio. Si cambias el nombre del repositorio, cambia también esa base.

En GitHub, selecciona **Settings → Pages → Build and deployment → Source: GitHub Actions**. Al subir la rama `main`, el flujo verifica pruebas, compilación y navegador, y publica `dist/`. Las pull requests solo verifican. También puedes ejecutar el flujo manualmente.

La URL esperada, una vez publicado, es `https://thomasserna.github.io/formal-languages/`. Esta tarea prepara la publicación; no hace push ni activa Pages.
