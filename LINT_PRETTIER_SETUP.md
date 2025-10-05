# ESLint + Prettier + VS Code (Format on Save)

## 1) Install Dev Dependencies
```bash
npm i -D eslint prettier \
  eslint-config-prettier \
  eslint-plugin-react eslint-plugin-react-hooks \
  @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-import eslint-import-resolver-typescript \
  eslint-plugin-simple-import-sort
```

## 2) Scripts in package.json
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx --max-warnings=0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier . --check",
    "format:fix": "prettier . --write"
  }
}
```

## 3) VS Code
- Die Datei `.vscode/settings.json` in diesem Patch aktiviert **Prettier** + **ESLint Fix** **beim Speichern**.
- Die Datei `.vscode/extensions.json` empfiehlt die nötigen Extensions.

## 4) Run
```bash
npm run lint
npm run lint:fix
npm run format:fix
```

> Hinweis: `public/` ist für Lint/Prettier ignoriert.
