#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { formatSQL, FormatOptions } from "./formatter";
import { startServer } from "./server";

interface CLIArgs {
  input?: string;
  output?: string;
  compact: boolean;
  uppercase: boolean;
  lowercase: boolean;
  indent: number;
  serve: boolean;
  port: number;
  help: boolean;
}

function parseArgs(args: string[]): CLIArgs {
  const result: CLIArgs = {
    compact: false,
    uppercase: true,
    lowercase: false,
    indent: 2,
    serve: false,
    port: 3466,
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--compact":
      case "-c":
        result.compact = true;
        break;
      case "--uppercase":
      case "-U":
        result.uppercase = true;
        result.lowercase = false;
        break;
      case "--lowercase":
      case "-L":
        result.lowercase = true;
        result.uppercase = false;
        break;
      case "--indent":
      case "-i":
        i++;
        result.indent = parseInt(args[i], 10) || 2;
        break;
      case "--output":
      case "-o":
        i++;
        result.output = args[i];
        break;
      case "--serve":
      case "-s":
        result.serve = true;
        break;
      case "--port":
      case "-p":
        i++;
        result.port = parseInt(args[i], 10) || 3466;
        break;
      case "--help":
      case "-h":
        result.help = true;
        break;
      default:
        if (!arg.startsWith("-") && !result.input) {
          result.input = arg;
        }
        break;
    }
    i++;
  }

  if (result.lowercase) {
    result.uppercase = false;
  }

  return result;
}

function printHelp(): void {
  console.log(`sqlfmt - SQL Formatter

Usage:
  sqlfmt "SELECT ..."              Format inline SQL
  sqlfmt query.sql                 Format SQL file
  sqlfmt query.sql -o out.sql      Write formatted SQL to file
  cat query.sql | sqlfmt           Pipe support
  sqlfmt --serve                   Start web UI (port 3466)

Options:
  --compact, -c          Minify SQL (single line)
  --uppercase, -U        Uppercase keywords (default)
  --lowercase, -L        Lowercase keywords
  --indent, -i <n>       Indent size (default: 2)
  --output, -o <file>    Output file
  --serve, -s            Start web server
  --port, -p <port>      Server port (default: 3466)
  --help, -h             Show this help`);
}

function getOptions(args: CLIArgs): Partial<FormatOptions> {
  return {
    indent: args.indent,
    uppercase: args.uppercase,
    compact: args.compact,
  };
}

function processSQL(sql: string, args: CLIArgs): void {
  const formatted = formatSQL(sql, getOptions(args));

  if (args.output) {
    fs.writeFileSync(args.output, formatted, "utf-8");
    console.log(`Formatted SQL written to ${args.output}`);
  } else {
    process.stdout.write(formatted);
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk: string) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (args.serve) {
    startServer(args.port);
    return;
  }

  // Check if input is a file
  if (args.input) {
    const resolved = path.resolve(args.input);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      const sql = fs.readFileSync(resolved, "utf-8");
      processSQL(sql, args);
    } else {
      // Treat as inline SQL
      processSQL(args.input, args);
    }
    return;
  }

  // Check for piped input
  if (!process.stdin.isTTY) {
    const sql = await readStdin();
    if (sql.trim()) {
      processSQL(sql, args);
    }
    return;
  }

  // No input
  printHelp();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
