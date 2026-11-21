# Pepita

Your kind conscience for building habits. A *local-first* PWA, with no accounts or server: your data stays on your device.

- Spec: [docs/spec-v1.md](docs/spec-v1.md)
- Decisions: [docs/decisions.md](docs/decisions.md)

## Development

Requires Node 24 and pnpm.

```sh
pnpm install
pnpm dev        # development server
pnpm test       # domain core tests (Vitest)
pnpm lint
pnpm build      # type-checks and generates dist/
```

`dist/` is static files with relative paths: you can serve them from any server or subfolder.

## License

[AGPL-3.0](LICENSE)
