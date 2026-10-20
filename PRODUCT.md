# Autómata

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React, TypeScript and Vite; static GitHub Pages deployment, requested by the user. Native CSS, React Flow for graph interaction. No backend or authentication.

## Users and purpose
Spanish-speaking university students studying formal languages at EAFIT. Students build graphs, understand every formal component and inspect how configurations change while processing input.

## Confirmed experience
Start with an editable DFA example and immediate access to all four models. Prioritize the graph and anchored property popups. A shared lower bar opens simulation, language proof, formal definition or model theory, in that order, one panel at a time and all closed initially. Switching panels preserves simulation and proof work and pauses playback when leaving simulation. No permanent usage guide or footer; sources remain available within model theory. DFA, NFA with epsilon, nondeterministic pushdown automata, deterministic single-tape Turing machines. Kozen notation, including multiple NFA initial states and the semi-infinite Turing tape. PDA acceptance is by final state after consuming all input.

Simulation uses alphabet buttons alongside editable input, Unicode symbol deletion, an empty-string action, compact playback and a calculated-step history slider. Graph activity, current symbols, stack and tape lead the explanation; full step messages remain available on demand and through accessible announcements. Results, errors and inconclusive reasons remain visible.

Language proofs compare DFA or NFA with one visual condition (symbol count or length modulo 2–10, prefix, suffix or substring) or a mathematical regular expression over the same alphabet. Expressions use union, concatenation, star, epsilon and the empty language, with escaped reserved literals. Exact reachable-product exploration returns equivalence, a shortest distinguishing word or an inconclusive result. Limits are 10,000 pairs and 100,000 pair–symbol expansions; expressions allow 256 Unicode code points and 32 nested parentheses, and condition words allow 32 code points. Computation yields to the browser and can be cancelled.

Guided proof proceeds through language, base, inductive step and acceptance. State and symbol exercises build a finite relation with the initial pair, all transitions and matching acceptance; representative words support navigation but do not replace these obligations. Automatic equivalence and educational completion have separate status. Show one task at a time, brief feedback and optional mathematical foundations. Incorrect answers preserve the exercise. PDA and Turing retain an accessible explanation of scope.

## Constraints
Keyboard and touch access; accessible forms as alternatives to graph gestures. Lower-bar controls retain full accessible names and 44 px targets, with short mobile labels. Local drafts and versioned JSON import/export remain unchanged; proofs are session-only. Renaming or moving states preserves a proof, while changes to rules, alphabet or initial/final roles invalidate it. Distinguish invalid machines, rejection and resource-limited inconclusive runs. Local feature commits; no push or publication in this task.

## Evidence
Course: https://sites.google.com/site/sergiosramirezrico/eafit/si2002-st0270?authuser=0
Kozen: Automata and Computability (1997 / 2012 reprint). Definitions checked against Cornell handouts and the course's public slides. Examples are authored teaching examples, not attributed textbook exercises.
