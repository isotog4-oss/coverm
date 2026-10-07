# Cotizador de materiales

Abre `index.html` en el navegador (o súbelo a tu hosting). No necesita instalación.

```
index.html          estructura de la página
css/base.css        colores (variables), tipografía, encabezado, botones, formularios
css/entrada.css     pasos 1 y 2 (materiales, proveedores, precios)
css/resultado.css   paso 3 (tablas, semáforo, totales)
js/config.js        categorías/unidades por defecto, regla del semáforo con 2 precios
js/estado.js        datos y guardado en el navegador
js/calculos.js      totales, IVA, ranking, compra combinada, semáforo
js/vistas.js        pantallas de cada paso
js/acciones.js      botones, formularios, ejemplo, copiar resumen
js/pdf.js           PDF
js/main.js          arranque
```

Los archivos JS se cargan en ese orden (ver el final de `index.html`). No cambies el orden.
