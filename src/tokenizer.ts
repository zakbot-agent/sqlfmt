export enum TokenType {
  Keyword = "KEYWORD",
  Identifier = "IDENTIFIER",
  Number = "NUMBER",
  String = "STRING",
  Operator = "OPERATOR",
  Comma = "COMMA",
  OpenParen = "OPEN_PAREN",
  CloseParen = "CLOSE_PAREN",
  Semicolon = "SEMICOLON",
  Dot = "DOT",
  Star = "STAR",
  Whitespace = "WHITESPACE",
  Comment = "COMMENT",
  Unknown = "UNKNOWN",
}

export interface Token {
  type: TokenType;
  value: string;
  upperValue: string;
}

const KEYWORDS = new Set([
  "SELECT", "DISTINCT", "FROM", "WHERE", "AND", "OR", "NOT",
  "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "FULL", "CROSS", "ON",
  "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "OFFSET",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
  "CREATE", "TABLE", "ALTER", "DROP", "ADD", "COLUMN",
  "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "INDEX", "UNIQUE",
  "NULL", "NOT", "DEFAULT", "AUTO_INCREMENT", "CASCADE",
  "AS", "IN", "BETWEEN", "LIKE", "IS", "EXISTS",
  "CASE", "WHEN", "THEN", "ELSE", "END",
  "ASC", "DESC", "ALL", "ANY", "SOME",
  "UNION", "INTERSECT", "EXCEPT",
  "IF", "CONSTRAINT", "CHECK",
  "INT", "INTEGER", "VARCHAR", "TEXT", "BOOLEAN", "BOOL",
  "DATE", "TIMESTAMP", "FLOAT", "DOUBLE", "DECIMAL", "CHAR",
  "BIGINT", "SMALLINT", "SERIAL", "BIGSERIAL",
  "TRUE", "FALSE", "COUNT", "SUM", "AVG", "MIN", "MAX",
  "COALESCE", "NULLIF", "CAST",
  "WITH", "RECURSIVE", "RETURNING",
]);

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    // Whitespace
    if (/\s/.test(ch)) {
      let start = i;
      while (i < sql.length && /\s/.test(sql[i])) i++;
      tokens.push({ type: TokenType.Whitespace, value: sql.slice(start, i), upperValue: " " });
      continue;
    }

    // Single-line comment
    if (ch === "-" && sql[i + 1] === "-") {
      let start = i;
      while (i < sql.length && sql[i] !== "\n") i++;
      tokens.push({ type: TokenType.Comment, value: sql.slice(start, i), upperValue: sql.slice(start, i) });
      continue;
    }

    // Multi-line comment
    if (ch === "/" && sql[i + 1] === "*") {
      let start = i;
      i += 2;
      while (i < sql.length && !(sql[i - 1] === "*" && sql[i] === "/")) i++;
      i++;
      tokens.push({ type: TokenType.Comment, value: sql.slice(start, i), upperValue: sql.slice(start, i) });
      continue;
    }

    // String literals
    if (ch === "'" || ch === '"') {
      let start = i;
      const quote = ch;
      i++;
      while (i < sql.length) {
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            i += 2; // escaped quote
          } else {
            i++;
            break;
          }
        } else {
          i++;
        }
      }
      const val = sql.slice(start, i);
      tokens.push({ type: TokenType.String, value: val, upperValue: val });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === "." && i + 1 < sql.length && /[0-9]/.test(sql[i + 1]))) {
      let start = i;
      while (i < sql.length && /[0-9.]/.test(sql[i])) i++;
      const val = sql.slice(start, i);
      tokens.push({ type: TokenType.Number, value: val, upperValue: val });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(ch)) {
      let start = i;
      while (i < sql.length && /[a-zA-Z0-9_]/.test(sql[i])) i++;
      const val = sql.slice(start, i);
      const upper = val.toUpperCase();
      const isKw = KEYWORDS.has(upper);
      tokens.push({
        type: isKw ? TokenType.Keyword : TokenType.Identifier,
        value: val,
        upperValue: upper,
      });
      continue;
    }

    // Backtick-quoted identifiers
    if (ch === "`") {
      let start = i;
      i++;
      while (i < sql.length && sql[i] !== "`") i++;
      i++;
      const val = sql.slice(start, i);
      tokens.push({ type: TokenType.Identifier, value: val, upperValue: val });
      continue;
    }

    // Operators (multi-char)
    if (i + 1 < sql.length) {
      const two = sql.slice(i, i + 2);
      if (["<=", ">=", "<>", "!=", "||", "&&", "::"].includes(two)) {
        tokens.push({ type: TokenType.Operator, value: two, upperValue: two });
        i += 2;
        continue;
      }
    }

    // Single characters
    if (ch === ",") {
      tokens.push({ type: TokenType.Comma, value: ch, upperValue: ch });
    } else if (ch === "(") {
      tokens.push({ type: TokenType.OpenParen, value: ch, upperValue: ch });
    } else if (ch === ")") {
      tokens.push({ type: TokenType.CloseParen, value: ch, upperValue: ch });
    } else if (ch === ";") {
      tokens.push({ type: TokenType.Semicolon, value: ch, upperValue: ch });
    } else if (ch === ".") {
      tokens.push({ type: TokenType.Dot, value: ch, upperValue: ch });
    } else if (ch === "*") {
      tokens.push({ type: TokenType.Star, value: ch, upperValue: ch });
    } else if ("<>=+-/%&|^~!".includes(ch)) {
      tokens.push({ type: TokenType.Operator, value: ch, upperValue: ch });
    } else {
      tokens.push({ type: TokenType.Unknown, value: ch, upperValue: ch });
    }
    i++;
  }

  return tokens;
}
