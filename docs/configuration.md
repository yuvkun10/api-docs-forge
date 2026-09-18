# Configuration

## Environment variables

No environment variables are required for deterministic local generation.

Copy `.env.example` to a local ignored file only when you want optional generated descriptions:

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

`.env.example` documents the supported optional variables:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
```

Keep real keys in `.env.local`, shell profile secrets, CI secrets, or another ignored secret store. Do not commit `.env`, `.env.local`, generated docs containing private API details, or machine-specific workflow notes.

Use generated descriptions only when you explicitly pass `--openai`:

```bash
node dist/cli.js generate "src/**/*.ts" --out docs --openai
```

If `--openai` is enabled but no key is available, the tool falls back to deterministic local descriptions.

## Privacy and security notes

- Source files are parsed locally from the paths you provide.
- The default generation path does not call an external service.
- The optional OpenAI path is only used when `--openai` is passed and an API key is available.
- The OpenAI description provider sends route metadata, not full source files, but route names, paths, parameters, tags, and response status codes may still be sensitive.
- Review generated docs before publishing if your route paths, descriptions, or schemas reveal internal systems.
- Keep generated docs out of version control unless they are intended to be public artifacts.
- Dependabot is configured for npm packages and GitHub Actions; CI also runs npm audit and outdated checks.
