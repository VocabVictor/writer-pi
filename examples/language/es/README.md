# Ejemplo es: crónica de barrio a partir de notas

Arrancar writer-pi en este directorio:

```bash
cd examples/language/es
writer-pi
```

Después escribir en la interfaz interactiva:

```
/draft Escribe una crónica de barrio sobre la librería de segunda mano
```

brief.md lleva las condiciones (idioma objetivo, género, longitud, palabras prohibidas); sources/libreria.md guarda el material.
Generación real no interactiva:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft Escribe una crónica de barrio sobre la librería de segunda mano" --no-session
```

El proceso avanza solo: borrador, guardado, comprobaciones, revisiones.
El texto final está en article.md; las versiones quedan en drafts/.
