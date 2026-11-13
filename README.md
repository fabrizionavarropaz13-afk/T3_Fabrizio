# T3 - Operación Extracción

Videojuego FPS 3D hecho con JavaScript y Three.js.

## Ejecutar

1. Descarga el repositorio y abre la carpeta en Visual Studio Code.
2. Abre `index.html` con Live Server. Necesitas Internet para cargar Three.js.
3. Presiona **INICIAR MISIÓN**.

## Controles

- `W A S D`: desplazarse
- `Mouse`: mirar
- `Clic izquierdo`: disparar (un disparo por clic)
- `1` y `2`: cambiar arma
- `Shift`: correr
- `Q` / `E`: girar como alternativa al mouse

## Objetivo

Recorre la ciudad, evita o elimina los zombis, recoge cajas de munición y llega a la zona verde de extracción.

## Publicar con GitHub Pages

En el repositorio: **Settings > Pages > Build and deployment > Deploy from a branch**, elige `main` y `/ (root)`. El juego debe estar en la raíz del repositorio (donde está `index.html`).

## Recursos

Los modelos `.glb` de las armas y zombis están en la carpeta `assets`. Las dependencias de Three.js se cargan con un import map de jsDelivr.
