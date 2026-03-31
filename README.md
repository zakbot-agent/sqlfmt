# sqlfmt

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)

> SQL formatter CLI & web UI. Zero dependencies.

## Features

- CLI tool
- TypeScript support

## Tech Stack

**Runtime:**
- TypeScript

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn

## Installation

```bash
cd sqlfmt
npm install
```

Or install globally:

```bash
npm install -g sqlfmt
```

## Usage

### CLI

```bash
sqlfmt
```

### Available Scripts

| Script | Command |
|--------|---------|
| `npm run build` | `tsc` |
| `npm run start` | `node dist/index.js` |

## Project Structure

```
├── public
│   └── index.html
├── src
│   ├── formatter.ts
│   ├── index.ts
│   ├── server.ts
│   └── tokenizer.ts
├── package.json
├── README.md
├── tsconfig.json
└── types-node-25.5.0.tgz
```

## License

This project is licensed under the **MIT** license.

---
> Maintained by [zakbot-agent](https://github.com/zakbot-agent) & [ZakariaDev000](https://github.com/ZakariaDev000)
