import { tokenize, Token, TokenType } from "./tokenizer";

export interface FormatOptions {
  indent: number;
  uppercase: boolean;
  compact: boolean;
}

const DEFAULT_OPTIONS: FormatOptions = {
  indent: 2,
  uppercase: true,
  compact: false,
};

// Compound keywords that should stay together
const COMPOUND_KEYWORDS: [string, string][] = [
  ["ORDER", "BY"],
  ["GROUP", "BY"],
  ["INSERT", "INTO"],
  ["DELETE", "FROM"],
  ["CREATE", "TABLE"],
  ["ALTER", "TABLE"],
  ["DROP", "TABLE"],
  ["LEFT", "JOIN"],
  ["RIGHT", "JOIN"],
  ["INNER", "JOIN"],
  ["OUTER", "JOIN"],
  ["FULL", "JOIN"],
  ["CROSS", "JOIN"],
  ["PRIMARY", "KEY"],
  ["FOREIGN", "KEY"],
  ["NOT", "NULL"],
  ["ADD", "COLUMN"],
  ["DROP", "COLUMN"],
  ["IS", "NULL"],
  ["IS", "NOT"],
];

// Keywords that start on a new line at indent level 0
const TOP_LEVEL_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "ORDER BY", "GROUP BY", "HAVING",
  "LIMIT", "OFFSET", "INSERT INTO", "VALUES", "UPDATE", "SET",
  "DELETE FROM", "CREATE TABLE", "ALTER TABLE", "DROP TABLE",
  "UNION", "INTERSECT", "EXCEPT", "WITH", "RETURNING",
]);

// Keywords that start on a new line but indented
const NEWLINE_KEYWORDS = new Set([
  "AND", "OR", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN",
  "OUTER JOIN", "FULL JOIN", "CROSS JOIN", "ON",
]);

function resolveCompound(tokens: Token[], pos: number): { keyword: string; skip: number } | null {
  if (tokens[pos].type !== TokenType.Keyword) return null;
  const upper = tokens[pos].upperValue;

  // Look ahead for compound (skip whitespace)
  let next = pos + 1;
  while (next < tokens.length && tokens[next].type === TokenType.Whitespace) next++;

  if (next < tokens.length && tokens[next].type === TokenType.Keyword) {
    const nextUpper = tokens[next].upperValue;
    for (const [a, b] of COMPOUND_KEYWORDS) {
      if (upper === a && nextUpper === b) {
        // Check for triple: IS NOT NULL
        if (a === "IS" && b === "NOT") {
          let third = next + 1;
          while (third < tokens.length && tokens[third].type === TokenType.Whitespace) third++;
          if (third < tokens.length && tokens[third].upperValue === "NULL") {
            return { keyword: "IS NOT NULL", skip: third - pos };
          }
        }
        return { keyword: `${a} ${b}`, skip: next - pos };
      }
    }
  }

  return null;
}

export function formatSQL(sql: string, opts?: Partial<FormatOptions>): string {
  const options: FormatOptions = { ...DEFAULT_OPTIONS, ...opts };
  const tokens = tokenize(sql);

  if (options.compact) {
    return compactSQL(tokens, options);
  }

  return prettyFormat(tokens, options);
}

function compactSQL(tokens: Token[], options: FormatOptions): string {
  const parts: string[] = [];

  for (const token of tokens) {
    if (token.type === TokenType.Whitespace) {
      // Collapse to single space
      if (parts.length > 0 && parts[parts.length - 1] !== " ") {
        parts.push(" ");
      }
      continue;
    }
    if (token.type === TokenType.Comment) continue;

    if (token.type === TokenType.Keyword) {
      parts.push(options.uppercase ? token.upperValue : token.value.toLowerCase());
    } else {
      parts.push(token.value);
    }
  }

  return parts.join("").trim();
}

function prettyFormat(tokens: Token[], options: FormatOptions): string {
  const indentStr = " ".repeat(options.indent);
  const lines: string[] = [];
  let currentLine = "";
  let indentLevel = 0;
  let parenDepth = 0;
  let afterSelect = false;
  let afterWhere = false;
  let afterSet = false;
  let i = 0;

  function pushLine() {
    if (currentLine.trim()) {
      lines.push(indentStr.repeat(indentLevel) + currentLine.trim());
    }
    currentLine = "";
  }

  function kwCase(kw: string): string {
    return options.uppercase ? kw.toUpperCase() : kw.toLowerCase();
  }

  function tokenValue(token: Token): string {
    if (token.type === TokenType.Keyword) {
      return kwCase(token.value);
    }
    return token.value;
  }

  while (i < tokens.length) {
    const token = tokens[i];

    // Skip whitespace — we handle spacing ourselves
    if (token.type === TokenType.Whitespace) {
      i++;
      continue;
    }

    // Comments get their own line
    if (token.type === TokenType.Comment) {
      pushLine();
      lines.push(indentStr.repeat(indentLevel) + token.value.trim());
      i++;
      continue;
    }

    // Check for compound keywords
    if (token.type === TokenType.Keyword) {
      const compound = resolveCompound(tokens, i);
      const keyword = compound ? compound.keyword : token.upperValue;
      const skip = compound ? compound.skip : 0;

      if (TOP_LEVEL_KEYWORDS.has(keyword)) {
        pushLine();
        indentLevel = 0;
        currentLine = kwCase(keyword);
        afterSelect = keyword === "SELECT";
        afterWhere = keyword === "WHERE" || keyword === "HAVING";
        afterSet = keyword === "SET";

        if (afterSelect || afterWhere || afterSet) {
          pushLine();
          indentLevel = 1;
        }

        i += skip + 1;
        continue;
      }

      if (NEWLINE_KEYWORDS.has(keyword)) {
        pushLine();
        if (keyword === "AND" || keyword === "OR") {
          indentLevel = 1;
        } else if (keyword === "ON") {
          indentLevel = 2;
        } else {
          // JOINs at indent 0
          indentLevel = 0;
        }
        currentLine = kwCase(keyword);
        i += skip + 1;
        continue;
      }

      // Regular keyword, just append
      if (currentLine) currentLine += " ";
      currentLine += kwCase(keyword);
      i += skip + 1;
      continue;
    }

    // Semicolon
    if (token.type === TokenType.Semicolon) {
      currentLine += ";";
      pushLine();
      indentLevel = 0;
      afterSelect = false;
      afterWhere = false;
      afterSet = false;
      // Add blank line between statements
      lines.push("");
      i++;
      continue;
    }

    // Open paren
    if (token.type === TokenType.OpenParen) {
      parenDepth++;
      // Check if this is a subquery
      let next = i + 1;
      while (next < tokens.length && tokens[next].type === TokenType.Whitespace) next++;
      const isSubquery = next < tokens.length && tokens[next].type === TokenType.Keyword &&
        (tokens[next].upperValue === "SELECT" || tokens[next].upperValue === "WITH");

      if (isSubquery) {
        currentLine += " (";
        pushLine();
        indentLevel++;
        i++;
        continue;
      }

      currentLine += "(";
      i++;
      continue;
    }

    // Close paren
    if (token.type === TokenType.CloseParen) {
      parenDepth--;
      if (parenDepth < 0) parenDepth = 0;
      currentLine += ")";
      i++;
      continue;
    }

    // Comma
    if (token.type === TokenType.Comma) {
      currentLine += ",";
      if (parenDepth === 0 && (afterSelect || afterSet)) {
        pushLine();
      }
      i++;
      continue;
    }

    // Everything else
    if (currentLine && !currentLine.endsWith("(") && !currentLine.endsWith(".") && token.type !== TokenType.Dot) {
      currentLine += " ";
    }
    currentLine += tokenValue(token);
    i++;
  }

  pushLine();

  // Clean trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  return lines.join("\n") + "\n";
}
