# Pepita

Tu conciencia amable para construir hábitos. Una PWA *local-first*, sin cuentas ni servidor: tus datos se quedan en tu dispositivo.

- Especificación: [docs/especificacion-v1.md](docs/especificacion-v1.md)
- Decisiones: [docs/decisiones.md](docs/decisiones.md)

## Desarrollo

Requiere Node 24 y pnpm.

```sh
pnpm install
pnpm dev        # servidor de desarrollo
pnpm test       # tests del núcleo de dominio (Vitest)
pnpm lint
pnpm build      # comprueba tipos y genera dist/
```

`dist/` son ficheros estáticos con rutas relativas: puedes servirlos desde cualquier servidor o subcarpeta.

## Licencia

[AGPL-3.0](LICENSE)
