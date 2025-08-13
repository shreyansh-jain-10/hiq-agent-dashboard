import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { jsPDF } from 'jspdf';
// near the header
<h3 className="font-medium">Agent Responses (TEST MARKER)</h3>

// at the very top of the component function

/** ------------------------------------------------------------------------------------------------
 * Robust normalizer: accepts any of these and returns { jsons, plain_texts }
 * - response = { jsons, plain_texts }
 * - response = [ { jsons, plain_texts } ]
 * - response = '{"jsons": {...}, "plain_texts": {...}}' (string)
 * - response = '{"data": {"jsons": {...}, "plain_texts": {...}}}' (string)
 * - response = { data: { jsons, plain_texts } }
 * If none match, falls back to a single "Response" agent.
 * ------------------------------------------------------------------------------------------------ */
function normalizeResponseShape(response) {
  const safeParse = (v) => {
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { return v; }
  };

  let raw = safeParse(response);

  // If array, try first element that has jsons/plain_texts
  if (Array.isArray(raw)) {
    const candidate = raw.find(
      (x) => x && typeof x === 'object' && (x.jsons || x.plain_texts)
    );
    if (candidate) {
      return {
        jsons: candidate.jsons || {},
        plain_texts: candidate.plain_texts || {},
      };
    }
    // maybe array of wrapper objects { data: { jsons, plain_texts } }
    const candidate2 = raw.find(
      (x) => x && typeof x === 'object' && x.data && (x.data.jsons || x.data.plain_texts)
    );
    if (candidate2) {
      return {
        jsons: candidate2.data.jsons || {},
        plain_texts: candidate2.data.plain_texts || {},
      };
    }
  }

  // If plain object with jsons/plain_texts
  if (raw && typeof raw === 'object') {
    if (raw.jsons || raw.plain_texts) {
      return { jsons: raw.jsons || {}, plain_texts: raw.plain_texts || {} };
    }
    // wrapper: { data: { jsons, plain_texts } }
    if (raw.data && (raw.data.jsons || raw.data.plain_texts)) {
      return {
        jsons: raw.data.jsons || {},
        plain_texts: raw.data.plain_texts || {},
      };
    }
  }

  // Fallback: treat whole thing as one agent
  return {
    jsons: { Response: raw },
    plain_texts: {
      Response: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2),
    },
  };
}

// Strip control characters except newline, carriage return, tab
function sanitizeText(s) {
  if (s == null) return '';
  const str = String(s);
  return str.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, '');
}

export default function ResponseDisplay({ response }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  // Per-agent expand state
  const [expandedMap, setExpandedMap] = useState({});
  const toggleCard = (key) =>
    setExpandedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  const isCardExpanded = (key) => !!expandedMap[key];

  // Per-agent mode + global default
  const [modeMap, setModeMap] = useState({}); // { [agentKey]: 'jsons' | 'plain_texts' }
  const [globalDefaultMode, setGlobalDefaultMode] = useState('jsons');
  const setCardMode = (key, mode) =>
    setModeMap((prev) => ({ ...prev, [key]: mode }));
  const modeFor = (key) => modeMap[key] || globalDefaultMode;

  // Preferred agent ordering
  const preferredOrder = [
    'Document Checker',
    'Sample Adequacy',
    'Waste Organiser',
    'Danger Detector',
    'EPA rule book',
    'Recycling Hunter',
  ];

  // Normalize the input shape
  const normalized = useMemo(() => normalizeResponseShape(response), [response]);

  // Compute the agent list: preferred order first (only if present), then any extras
  const agentKeys = useMemo(() => {
    const setKeys = new Set([
      ...Object.keys(normalized.jsons || {}),
      ...Object.keys(normalized.plain_texts || {}),
    ]);
    setKeys.delete('summary'); // ensure we don't render meta

    const ordered = [];
    for (const name of preferredOrder) {
      if (setKeys.has(name)) {
        ordered.push(name);
        setKeys.delete(name);
      }
    }
    const rest = Array.from(setKeys).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...rest];
  }, [normalized, preferredOrder]);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(normalized, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  // Pretty printer for JSON objects/arrays
  const renderValue = (value, depth = 0) => {
    if (value === null) return <span className="text-muted-foreground">null</span>;
    if (value === undefined) return <span className="text-muted-foreground">undefined</span>;
    if (typeof value === 'boolean') return <span className="text-blue-600">{String(value)}</span>;
    if (typeof value === 'number') return <span className="text-green-600">{value}</span>;
    if (typeof value === 'string') {
      if (depth === 0) return <pre className="text-sm whitespace-pre-wrap">{value}</pre>;
      return <span className="text-orange-600">"{value}"</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-muted-foreground">[]</span>;
      return (
        <div className="ml-4">
          <span className="text-muted-foreground">[</span>
          {value.map((item, index) => (
            <div key={index} className="ml-4">
              <span className="text-muted-foreground">{index}: </span>
              {renderValue(item, depth + 1)}
              {index < value.length - 1 && <span className="text-muted-foreground">,</span>}
            </div>
          ))}
          <span className="text-muted-foreground">]</span>
        </div>
      );
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return <span className="text-muted-foreground">{'{}'}</span>;
      return (
        <div className="ml-4">
          <span className="text-muted-foreground">{'{'}</span>
          {keys.map((key, index) => (
            <div key={key} className="ml-4">
              <span className="text-purple-600">"{key}"</span>
              <span className="text-muted-foreground">: </span>
              {renderValue(value[key], depth + 1)}
              {index < keys.length - 1 && <span className="text-muted-foreground">,</span>}
            </div>
          ))}
          <span className="text-muted-foreground">{'}'}</span>
        </div>
      );
    }
    return <span>{String(value)}</span>;
  };

  // ---------- PDF EXPORT (respects per-card selection + polished layout) ----------
  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    const maxW = pageW - margin * 2;

    // helpers
    const addWrapped = (text, x, y, size = 11, gap = 8, font = { name: 'helvetica', style: 'normal' }) => {
      const safe = sanitizeText(text ?? '');
      doc.setFont(font.name, font.style);
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(safe, maxW);
      lines.forEach((line) => {
        if (y > pageH - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, x, y);
        y += 16;
      });
      return y + gap;
    };

    const addDivider = (y) => {
      doc.setDrawColor(210);
      doc.line(margin, y, pageW - margin, y);
      return y + 12;
    };

    const addBadgeRow = (items, y) => {
      // items = [{label, color:'green'|'red'|'gray'}]
      const padX = 8, padY = 6, gap = 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      let x = margin;
      items.forEach(({ label, color }) => {
        const w = doc.getTextWidth(label) + padX * 2;
        const h = 18;
        if (x + w > pageW - margin) {
          y += h + 4;
          x = margin;
        }
        // bg
        const fill =
          color === 'green' ? [222, 247, 236] :
          color === 'red'   ? [255, 228, 230] :
                              [229, 231, 235];
        doc.setFillColor(...fill);
        doc.roundedRect(x, y, w, h, 4, 4, 'F');
        // text
        doc.setTextColor(0,0,0);
        doc.text(label, x + padX, y + h/2 + 3);
        x += w + gap;
      });
      return y + 26;
    };

    // ---------- Build content (we'll come back to fill TOC with page numbers) ----------
    // COVER
    let coverPage = 1;
    let y = margin + 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Agent Responses', margin, y);
    y += 28;

    // cover summary (if present)
    const sum = normalized.jsons?.summary;
    const total = sum?.total_nodes ?? agentKeys.length;
    const passedCount = sum?.passed_count ?? agentKeys.filter(k => normalized.jsons?.[k]?.passed).length;
    const failedCount = sum?.failed_count ?? Math.max(0, total - passedCount);

    doc.setFont('helvetica', 'normal');
    y = addWrapped(`Exported: ${new Date().toLocaleString()}`, margin, y, 11, 6);
    y = addWrapped(
      'This document includes all agent outputs using the current per-card selection (JSON or Plain Text).',
      margin, y, 11, 10
    );

    // badges
    const statusColor = failedCount === 0 ? 'green' : 'red';
    y = addBadgeRow(
      [
        { label: `Agents: ${agentKeys.length}`, color: 'gray' },
        { label: `Passed: ${passedCount}`, color: 'green' },
        { label: `Failed: ${failedCount}`, color: statusColor },
      ],
      y
    );

    // TOC placeholder page
    doc.addPage();
    const tocPage = doc.getNumberOfPages();
    y = margin + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Table of Contents', margin, y);
    y += 18;

    // We'll write TOC entries later (after we know section start pages).
    // Keep track of where to start writing entries.
    const tocStartY = y;

    // ---------- Per-Agent Sections (each starts on a fresh page) ----------
    const sectionStartPages = {};
    agentKeys.forEach((key) => {
      // Always start a fresh page for each agent
      doc.addPage();
      const startPage = doc.getNumberOfPages();
      sectionStartPages[key] = startPage;

      let yy = margin + 6;
      const mode = modeFor(key);
      const jsonNode = normalized.jsons?.[key];
      const plain = normalized.plain_texts?.[key];
      const modeLabel = mode === 'plain_texts' ? 'Plain Text' : 'JSON';

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(key, margin, yy);
      yy += 18;

      // subtitle row (status + view)
      doc.setFont('helvetica', 'normal');
      const passed = jsonNode && typeof jsonNode === 'object' && 'passed' in jsonNode ? !!jsonNode.passed : null;
      const statusTxt = passed === null ? 'Status: —' : passed ? 'Status: Passed' : 'Status: Failed';
      yy = addBadgeRow([{ label: statusTxt, color: passed ? 'green' : (passed === false ? 'red' : 'gray') },
                        { label: `View: ${modeLabel}`, color: 'gray' }], yy);

      yy = addDivider(yy);

      // Body
      if (mode === 'plain_texts') {
        const text = typeof plain === 'string' ? plain : (plain ? String(plain) : '—');
        yy = addWrapped(text, margin, yy, 11, 8, { name: 'helvetica', style: 'normal' });
      } else {
        const out = jsonNode?.output ?? jsonNode;
        const jsonStr = typeof out === 'string' ? out : JSON.stringify(out ?? '—', null, 2);
        yy = addWrapped(jsonStr, margin, yy, 9, 8, { name: 'courier', style: 'normal' });
      }
    });

    // ---------- Fill the TOC with entries + page numbers ----------
    doc.setPage(tocPage);
    let yToc = tocStartY;

    const drawTocLine = (label, pageNum) => {
      // Label on the left
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const safe = sanitizeText(label);
      const labelW = doc.getTextWidth(safe);
      const leftX = margin;
      const rightX = pageW - margin;
      const dotsStart = leftX + labelW + 8;
      const dotsEnd = rightX - 28;

      // label
      doc.text(safe, leftX, yToc);

      // dotted leader
      if (dotsEnd > dotsStart + 10) {
        doc.setDrawColor(180);
        doc.setLineDash([2, 2], 0);
        doc.line(dotsStart, yToc - 4, dotsEnd, yToc - 4);
        doc.setLineDash(); // reset
      }

      // page number on the right
      doc.text(String(pageNum), rightX, yToc, { align: 'right' });

      yToc += 16;
      if (yToc > pageH - margin) {
        doc.addPage();
        yToc = margin + 6;
      }
    };

    agentKeys.forEach((key, i) => {
      const mode = modeFor(key);
      const modeLabel = mode === 'plain_texts' ? 'Plain Text' : 'JSON';
      const entry = `${i + 1}. ${key} — ${modeLabel}`;
      drawTocLine(entry, sectionStartPages[key]);
    });

    // ---------- Footer page numbers on every page ----------
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`${i} / ${totalPages}`, pageW - margin, pageH - 20, { align: 'right' });
    }

    doc.save('agent-responses.pdf');
  };

  if (!response) return null;

  return (
    <div className="bg-card border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left hover:text-primary transition-colors"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <h3 className="font-medium">Agent Responses</h3>
        </button>

        <div className="flex items-center gap-2">
          {/* Global default view toggle (FORCE-ALL) */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground mr-2">View:</span>
            <Button
              variant={ (globalDefaultMode === 'jsons') ? 'default' : 'outline' }
              size="sm"
              className="h-8"
              onClick={() => {
                setGlobalDefaultMode('jsons');
                setModeMap(agentKeys.reduce((acc, key) => {
                  acc[key] = 'jsons';
                  return acc;
                }, {}));
              }}
            >
              JSON
            </Button>
            <Button
              variant={ (globalDefaultMode === 'plain_texts') ? 'default' : 'outline' }
              size="sm"
              className="h-8"
              onClick={() => {
                setGlobalDefaultMode('plain_texts');
                setModeMap(agentKeys.reduce((acc, key) => {
                  acc[key] = 'plain_texts';
                  return acc;
                }, {}));
              }}
            >
              Plain Text
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="h-8"
            onClick={exportPdf}
            title="Export a PDF that respects each card's current selection"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={copyAll}
            title="Copy all (jsons + plain_texts)"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" /> Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Cards for each agent */}
          <div className="flex flex-col gap-4">
            {agentKeys.map((key) => {
              const jsonNode = normalized.jsons?.[key];
              const plain = normalized.plain_texts?.[key];
              const expanded = isCardExpanded(key);
              const mode = modeFor(key);

              const renderBody = () => {
                if (mode === 'plain_texts') {
                  const text =
                    typeof plain === 'string'
                      ? plain
                      : plain
                      ? String(plain)
                      : 'No plain text available';
                  return (
                    <div
                      className={`bg-muted/30 rounded-md p-4 text-sm whitespace-pre-wrap overflow-y-auto ${
                        expanded ? 'max-h-[70vh]' : 'max-h-56'
                      }`}
                    >
                      {text}
                    </div>
                  );
                }
                // JSON mode
                const out = jsonNode?.output ?? jsonNode;
                if (out == null)
                  return <p className="text-sm text-muted-foreground">No output</p>;
                if (typeof out === 'string') {
                  return (
                    <div
                      className={`bg-muted/30 rounded-md p-4 text-sm whitespace-pre-wrap overflow-y-auto ${
                        expanded ? 'max-h-[70vh]' : 'max-h-56'
                      }`}
                    >
                      {out}
                    </div>
                  );
                }
                return (
                  <div
                    className={`bg-muted/30 rounded-md p-4 font-mono text-xs overflow-y-auto ${
                      expanded ? 'max-h-[70vh]' : 'max-h-56'
                    }`}
                  >
                    {renderValue(out, 1)}
                  </div>
                );
              };

              const passed =
                jsonNode && typeof jsonNode === 'object' && 'passed' in jsonNode
                  ? !!jsonNode.passed
                  : null;

              return (
                <div
                  key={key}
                  className="border rounded-xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden w-full"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h4 className="font-medium text-lg flex items-center gap-3">
                      {key}
                      {passed !== null && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            passed
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}
                        >
                          {passed ? 'Passed' : 'Failed'}
                        </span>
                      )}
                    </h4>

                    <div className="flex items-center gap-2">
                      {/* Per-card view toggle */}
                      <div className="flex items-center gap-1 text-xs mr-2">
                        <Button
                          variant={mode === 'jsons' ? 'default' : 'outline'}
                          size="sm"
                          className="h-7"
                          onClick={() => setCardMode(key, 'jsons')}
                        >
                          JSON
                        </Button>
                        <Button
                          variant={mode === 'plain_texts' ? 'default' : 'outline'}
                          size="sm"
                          className="h-7"
                          onClick={() => setCardMode(key, 'plain_texts')}
                        >
                          Plain
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => toggleCard(key)}
                        title={expanded ? 'Collapse' : 'Expand'}
                      >
                        {expanded ? (
                          <Minimize2 className="w-4 h-4" />
                        ) : (
                          <Maximize2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {mode === 'plain_texts' ? 'Plain Text' : 'Output'}
                    </div>
                    {renderBody()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
