'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Fragment, type ReactNode } from 'react';

/**
 * A small markdown renderer for the generated development prompt.
 *
 * Deliberately not a dependency: the prompt uses a known, bounded subset -
 * headings, lists, GFM tables, fenced code, blockquotes and inline emphasis -
 * and a full CommonMark parser plus a sanitiser is a lot of surface area to
 * take on for that. Everything renders through MUI components, so the document
 * inherits the app's type scale instead of fighting it.
 *
 * Nothing here interprets raw HTML; text is always rendered as text, so a model
 * response cannot inject markup.
 */

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; language: string; code: string }
  | { kind: 'quote'; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'rule' };

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?[\s:-]*-[-\s:|]*\|?\s*$/.test(line) && line.includes('-');
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';

    // Blank
    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Fenced code
    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      const language = fence[1] ?? '';
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index] ?? '')) {
        body.push(lines[index] ?? '');
        index += 1;
      }
      index += 1; // closing fence
      blocks.push({ kind: 'code', language, code: body.join('\n') });
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
      blocks.push({ kind: 'rule' });
      index += 1;
      continue;
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1]!.length, text: heading[2]!.trim() });
      index += 1;
      continue;
    }

    // Table: a header row followed by a divider row
    if (line.includes('|') && isTableDivider(lines[index + 1] ?? '')) {
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && (lines[index] ?? '').includes('|') && (lines[index] ?? '').trim()) {
        rows.push(splitTableRow(lines[index] ?? ''));
        index += 1;
      }
      blocks.push({ kind: 'table', headers, rows });
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const body: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index] ?? '')) {
        body.push((lines[index] ?? '').replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push({ kind: 'quote', text: body.join(' ').trim() });
      continue;
    }

    // Lists (bullet, numbered, and `- [ ]` checklists)
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index] ?? '';
        const nextBullet = current.match(/^\s*[-*+]\s+(.*)$/);
        const nextNumbered = current.match(/^\s*\d+[.)]\s+(.*)$/);
        const match = ordered ? nextNumbered : nextBullet;
        if (!match) break;
        items.push((match[1] ?? '').trim());
        index += 1;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    // Paragraph - consume until a blank line or a block starter
    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index] ?? '';
      if (
        !current.trim() ||
        /^(#{1,6})\s+/.test(current) ||
        /^\s*```/.test(current) ||
        /^\s*[-*+]\s+/.test(current) ||
        /^\s*\d+[.)]\s+/.test(current) ||
        /^\s*>\s?/.test(current)
      ) {
        break;
      }
      paragraph.push(current.trim());
      index += 1;
    }
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    }
  }

  return blocks;
}

/** Inline emphasis, code spans and links. Order matters: code wins first. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${counter}`;
    counter += 1;

    if (token.startsWith('`')) {
      nodes.push(<InlineCode key={key}>{token.slice(1, -1)}</InlineCode>);
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <Box component="strong" key={key} sx={{ fontWeight: 700 }}>
          {token.slice(2, -2)}
        </Box>,
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <Link key={key} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" underline="hover">
            {linkMatch[1]}
          </Link>,
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(
        <Box component="em" key={key}>
          {token.slice(1, -1)}
        </Box>,
      );
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <Box
      component="code"
      sx={(theme) => ({
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        fontSize: '0.85em',
        px: 0.625,
        py: 0.125,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: theme.palette.surface.subtle,
      })}
    >
      {children}
    </Box>
  );
}

const HEADING_VARIANTS = ['h2', 'h3', 'h4', 'h5', 'h6', 'h6'] as const;

export function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <Box sx={{ '& > *:first-of-type': { mt: 0 } }}>
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        switch (block.kind) {
          case 'heading': {
            const variant = HEADING_VARIANTS[Math.min(block.level, HEADING_VARIANTS.length) - 1] ?? 'h6';
            return (
              <Typography
                key={key}
                variant={variant}
                component={`h${Math.min(block.level + 1, 6)}` as 'h2'}
                sx={{ mt: block.level <= 2 ? 4 : 3, mb: 1.25, scrollMarginTop: 80 }}
              >
                {renderInline(block.text, key)}
              </Typography>
            );
          }

          case 'paragraph':
            return (
              <Typography key={key} variant="body2" sx={{ mb: 1.75, lineHeight: 1.75 }}>
                {renderInline(block.text, key)}
              </Typography>
            );

          case 'list':
            return (
              <Box
                key={key}
                component={block.ordered ? 'ol' : 'ul'}
                sx={{ my: 1.75, pl: 3, '& li': { mb: 0.625 } }}
              >
                {block.items.map((item, itemIndex) => (
                  <Typography component="li" key={`${key}-${itemIndex}`} variant="body2" sx={{ lineHeight: 1.7 }}>
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </Typography>
                ))}
              </Box>
            );

          case 'code':
            return (
              <Box
                key={key}
                component="pre"
                sx={(theme) => ({
                  my: 2,
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: theme.palette.surface.subtle,
                  overflowX: 'auto',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                })}
              >
                <code>{block.code}</code>
              </Box>
            );

          case 'quote':
            return (
              <Box
                key={key}
                sx={{
                  my: 2,
                  pl: 2,
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                  color: 'text.secondary',
                }}
              >
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  {renderInline(block.text, key)}
                </Typography>
              </Box>
            );

          case 'table':
            return (
              <TableContainer key={key} sx={{ my: 2.5, overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {block.headers.map((header, headerIndex) => (
                        <TableCell key={`${key}-h-${headerIndex}`}>{renderInline(header, `${key}-h-${headerIndex}`)}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {block.rows.map((row, rowIndex) => (
                      <TableRow key={`${key}-r-${rowIndex}`}>
                        {block.headers.map((_, cellIndex) => (
                          <TableCell key={`${key}-r-${rowIndex}-${cellIndex}`} sx={{ verticalAlign: 'top' }}>
                            {renderInline(row[cellIndex] ?? '', `${key}-r-${rowIndex}-${cellIndex}`)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );

          case 'rule':
            return <Divider key={key} sx={{ my: 3 }} />;

          default:
            return <Fragment key={key} />;
        }
      })}
    </Box>
  );
}
