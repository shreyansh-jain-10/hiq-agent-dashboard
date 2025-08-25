// ResponseDisplay.jsx
import React, { useMemo, useState } from 'react';
import {
  ChevronDown, ChevronRight, Copy, Check, Maximize2, Minimize2, Download, Code2, FileText, SplitSquareVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { jsPDF } from 'jspdf';
import DomainWiseResponses from './DomainWiseResponses.jsx';

/* -------------------- helpers -------------------- */
function safeParse(v) {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
}
function sanitizeText(s) {
  if (s == null) return '';
  let t = String(s);
  if (t.normalize) t = t.normalize('NFKC');
  t = t.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  t = t.replace(/[\u200B-\u200D\u2060\uFEFF\uFE0E\uFE0F]/g, '');
  try { t = t.replace(/[\p{Extended_Pictographic}]/gu, ''); }
  catch { t = t.replace(/[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]/gu, ''); }
  return t.trim();
}
function cleanPlain(s) {
  let t = sanitizeText(s);
  t = t.replace(/^[ '"`]+/, '');
  return t;
}
function makePdfHelpers(doc) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  const addWrapped = (text, x, y, size = 11, gap = 8, font = { name: 'helvetica', style: 'normal' }) => {
    const safe = sanitizeText(text ?? '');
    doc.setFont(font.name, font.style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(safe, maxW);
    lines.forEach((line) => {
      if (y > pageH - margin) { doc.addPage(); y = margin; }
      doc.text(line, x, y);
      y += 16;
    });
    return y + gap;
  };
  const addDivider = (y) => { doc.setDrawColor(210); doc.line(margin, y, pageW - margin, y); return y + 12; };
  const addBadgeRow = (items, y) => {
    const padX = 8, gap = 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    let x = margin;
    items.forEach(({ label, color }) => {
      const safeLabel = sanitizeText(label ?? '');
      const w = doc.getTextWidth(safeLabel) + padX * 2; const h = 18;
      if (x + w > pageW - margin) { y += h + 4; x = margin; }
      const fill = color === 'green' ? [222, 247, 236] : color === 'red' ? [255, 228, 230] : [229, 231, 235];
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.roundedRect(x, y, w, h, 4, 4, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text(safeLabel, x + padX, y + h / 2 + 3);
      x += w + gap;
    });
    return y + 26;
  };
  return { pageW, pageH, margin, addWrapped, addDivider, addBadgeRow };
}

/**
 * Normalize payload into:
 *  - jsons / plain_texts (agents)
 *  - domain_wise_jsons / domain_wise_texts (domains)
 */
function normalizeResponseShape(response) {
  const raw = safeParse(response);
  const pickHost = (x) => {
    if (!x || typeof x !== 'object') return null;
    if (x.jsons || x.plain_texts || x.domain_wise_jsons || x.domain_wise_texts) return x;
    if (x.data && (x.data.jsons || x.data.plain_texts || x.data.domain_wise_jsons || x.data.domain_wise_texts)) return x.data;
    return null;
  };
  if (Array.isArray(raw)) {
    const candidate = raw.find((x) => pickHost(x)) || null;
    const host = pickHost(candidate) || {};
    return {
      jsons: host.jsons || {},
      plain_texts: host.plain_texts || {},
      domain_wise_jsons: host.domain_wise_jsons || {},
      domain_wise_texts: host.domain_wise_texts || {},
    };
  }
  if (raw && typeof raw === 'object') {
    const host = pickHost(raw) || {};
    const source = (host && Object.keys(host).length) ? host : raw;
    return {
      jsons: source.jsons || {},
      plain_texts: source.plain_texts || {},
      domain_wise_jsons: source.domain_wise_jsons || {},
      domain_wise_texts: source.domain_wise_texts || {},
    };
  }
  return {
    jsons: { Response: raw },
    plain_texts: { Response: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2) },
    domain_wise_jsons: {},
    domain_wise_texts: {},
  };
}

export default function ResponseDisplay({ response, domains, fileName }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [agentOpen, setAgentOpen] = useState(false);

  // Agent controls
  const [copied, setCopied] = useState(false);
  const [expandedMap, setExpandedMap] = useState({});
  const toggleCard = (key) => setExpandedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  const isCardExpanded = (key) => !!expandedMap[key];
  const [modeMap, setModeMap] = useState({});
  const [globalDefaultMode, setGlobalDefaultMode] = useState('jsons');
  const setCardMode = (key, mode) => setModeMap((prev) => ({ ...prev, [key]: mode }));
  const modeFor = (key) => modeMap[key] || globalDefaultMode;
  const [splitView, setSplitView] = useState(false);

  const preferredOrder = ['Document Checker', 'Sample Adequacy', 'Waste Organiser', 'Danger Detector', 'EPA rule book', 'Recycling Hunter'];
  const normalized = useMemo(() => normalizeResponseShape(response), [response]);

  // Agent keys
  const agentKeys = useMemo(() => {
    const setKeys = new Set([
      ...Object.keys(normalized.jsons || {}),
      ...Object.keys(normalized.plain_texts || {})
    ]);
    setKeys.delete('summary');
    const ordered = [];
    for (const name of preferredOrder) {
      if (setKeys.has(name)) { ordered.push(name); setKeys.delete(name); }
    }
    return [...ordered, ...Array.from(setKeys).sort((a, b) => a.localeCompare(b))];
  }, [normalized, preferredOrder]);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ jsons: normalized.jsons, plain_texts: normalized.plain_texts }, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) { console.error('Failed to copy:', e); }
  };

  // Base for file naming — strip extension
  const safeBase = (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'report').trim() || 'report';

  /* ------- Agent PDF (updated name) ------- */
  const exportAgentPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const { pageW, pageH, margin, addWrapped, addDivider, addBadgeRow } = makePdfHelpers(doc);

    let y = margin + 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text('Agent Responses', margin, y); y += 28;
    const sum = normalized.jsons?.summary;
    const total = sum?.total_nodes ?? agentKeys.length;
    const passedCount = sum?.passed_count ?? agentKeys.filter(k => normalized.jsons?.[k]?.passed).length;
    const failedCount = sum?.failed_count ?? Math.max(0, total - passedCount);

    doc.setFont('helvetica', 'normal');
    y = addWrapped(`Exported: ${new Date().toLocaleString()}`, margin, y, 11, 6);
    y = addWrapped('Includes all agent outputs using each card’s current selection.', margin, y, 11, 10);
    const statusColor = failedCount === 0 ? 'green' : 'red';
    y = addBadgeRow([
      { label: `Agents: ${agentKeys.length}`, color: 'gray' },
      { label: `Passed: ${passedCount}`, color: 'green' },
      { label: `Failed: ${failedCount}`, color: statusColor },
    ], y);

    // TOC
    doc.addPage();
    const tocPage = doc.getNumberOfPages();
    y = margin + 6; doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Table of Contents', margin, y); y += 18;
    const tocStartY = y;
    const sectionStartPages = {};

    agentKeys.forEach((key) => {
      doc.addPage();
      const startPage = doc.getNumberOfPages();
      sectionStartPages[key] = startPage;
      let yy = margin + 6;

      const mode = modeFor(key);
      const jsonNode = normalized.jsons?.[key];
      const plain = normalized.plain_texts?.[key];
      const modeLabel = splitView ? 'Split' : (mode === 'plain_texts' ? 'Plain Text' : 'JSON');

      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(sanitizeText(key), margin, yy); yy += 18;
      const passed = jsonNode && typeof jsonNode === 'object' && 'passed' in jsonNode ? !!jsonNode.passed : null;
      const statusTxt = passed === null ? 'Status: —' : passed ? 'Status: Passed' : 'Status: Failed';
      yy = addBadgeRow([{ label: statusTxt, color: passed ? 'green' : (passed === false ? 'red' : 'gray') }, { label: `View: ${modeLabel}`, color: 'gray' }], yy);
      yy = addDivider(yy);

      const out = jsonNode?.output ?? jsonNode;
      if (splitView) {
        const jsonStr = out == null ? 'No output' : (typeof out === 'string' ? sanitizeText(out) : JSON.stringify(out ?? '—', null, 2));
        yy = addWrapped('JSON:\n' + jsonStr, margin, yy, 9, 8, { name: 'courier', style: 'normal' });
        yy = addDivider(yy);
        const plainStr = typeof plain === 'string' ? cleanPlain(plain) : (plain ? cleanPlain(String(plain)) : 'No plain text available');
        yy = addWrapped('Plain Text:\n' + plainStr, margin, yy, 11, 8, { name: 'helvetica', style: 'normal' });
      } else if (mode === 'plain_texts') {
        const plainStr = typeof plain === 'string' ? cleanPlain(plain) : (plain ? cleanPlain(String(plain)) : '—');
        yy = addWrapped(plainStr, margin, yy, 11, 8, { name: 'helvetica', style: 'normal' });
      } else {
        const jsonStr = out == null ? 'No output' : (typeof out === 'string' ? sanitizeText(out) : JSON.stringify(out ?? '—', null, 2));
        yy = addWrapped(jsonStr, margin, yy, 9, 8, { name: 'courier', style: 'normal' });
      }
    });

    // TOC write
    doc.setPage(tocPage);
    let yToc = tocStartY;
    const drawTocLine = (label, pageNum) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      const safe = sanitizeText(label); const labelW = doc.getTextWidth(safe);
      const leftX = doc.internal.pageSize.getWidth() - (doc.internal.pageSize.getWidth() - 48);
      const rightX = doc.internal.pageSize.getWidth() - 48;
      const dotsStart = leftX + labelW + 8; const dotsEnd = rightX - 28;
      doc.text(safe, leftX, yToc);
      if (typeof doc.setLineDash === 'function') {
        doc.setDrawColor(180); doc.setLineDash([2, 2], 0); doc.line(dotsStart, yToc - 4, dotsEnd, yToc - 4); doc.setLineDash();
      } else {
        doc.setDrawColor(180); doc.line(dotsStart, yToc - 4, dotsEnd, yToc - 4);
      }
      doc.text(String(pageNum), rightX, yToc, { align: 'right' });
      yToc += 16;
    };
    agentKeys.forEach((key, i) => {
      const mode = modeFor(key);
      const modeLabel = splitView ? 'Split' : (mode === 'plain_texts' ? 'Plain Text' : 'JSON');
      drawTocLine(`${i + 1}. ${key} — ${modeLabel}`, sectionStartPages[key]);
    });

    // footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(`${i} / ${totalPages}`, doc.internal.pageSize.getWidth() - 48, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
    }

    // UPDATED NAME:
    doc.save(`${safeBase}-agent-responses.pdf`);
  };

  if (!response) return null;

  const summary = normalized.jsons?.summary;
  const domainJsons = normalized.domain_wise_jsons;
  const domainTexts = normalized.domain_wise_texts;

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      {/* Header for entire widget with file name */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {/* Toggle + label */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-left hover:text-primary transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <h3 className="font-semibold">Responses</h3>
          </button>

          {fileName && (
            <div className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-md 
                  bg-gray-100 dark:bg-gray-800 
                  text-gray-800 dark:text-gray-200">
              <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="truncate max-w-[220px]">{fileName}</span>
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* ============ Agent Responses ============ */}
          <div className="border rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-center justify-between p-4 border-b">
              <button
                onClick={() => setAgentOpen(o => !o)}
                className="flex items-center gap-2 hover:text-primary"
              >
                {agentOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <h4 className="font-semibold">Agent Responses</h4>
              </button>

              <div className="flex items-center gap-2">
                {!splitView && (
                  <div className="hidden md:flex items-center gap-1 text-xs mr-1">
                    <span className="text-muted-foreground mr-2">View:</span>
                    <Button
                      variant={(globalDefaultMode === 'jsons') ? 'default' : 'outline'}
                      size="sm" className="h-8"
                      onClick={() => {
                        setGlobalDefaultMode('jsons');
                        setModeMap(agentKeys.reduce((acc, key) => { acc[key] = 'jsons'; return acc; }, {}));
                      }}
                    >
                      <Code2 className="w-4 h-4 mr-1" /> JSON
                    </Button>
                    <Button
                      variant={(globalDefaultMode === 'plain_texts') ? 'default' : 'outline'}
                      size="sm" className="h-8"
                      onClick={() => {
                        setGlobalDefaultMode('plain_texts');
                        setModeMap(agentKeys.reduce((acc, key) => { acc[key] = 'plain_texts'; return acc; }, {}));
                      }}
                    >
                      <FileText className="w-4 h-4 mr-1" /> Plain
                    </Button>
                  </div>
                )}

                <Button variant="secondary" size="sm" className="h-8" onClick={exportAgentPdf}>
                  <Download className="w-4 h-4 mr-2" /> Export PDF
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setSplitView((s) => !s)}>
                  <SplitSquareVertical className="w-4 h-4 mr-2" /> {splitView ? 'Single' : 'Split'} View
                </Button>
                <Button variant="ghost" size="sm" className="h-8" onClick={copyAll}>
                  {copied ? (<><Check className="w-4 h-4 mr-1" /> Copied</>) : (<><Copy className="w-4 h-4 mr-1" /> Copy</>)}
                </Button>
              </div>
            </div>

            {agentOpen && (
              <>
                {summary && (
                  <div className="p-4 pt-3">
                    <div className="sticky top-2 z-10 bg-white/80 dark:bg-gray-950/70 backdrop-blur rounded-xl border shadow-sm p-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">Summary</span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">Agents: {agentKeys.length}</span>
                        {'passed_count' in summary && (<span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">Passed: {summary.passed_count}</span>)}
                        {'failed_count' in summary && (<span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">Failed: {summary.failed_count}</span>)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 flex flex-col gap-4">
                  {agentKeys.map((key) => {
                    const jsonNode = normalized.jsons?.[key];
                    const plain = normalized.plain_texts?.[key];
                    const expanded = isCardExpanded(key);
                    const mode = modeFor(key);
                    const passed = jsonNode && typeof jsonNode === 'object' && 'passed' in jsonNode ? !!jsonNode.passed : null;

                    const renderPlain = () => (
                      <div className={`bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap overflow-y-auto ${expanded ? 'max-h-[70vh]' : 'max-h-56'}`}>
                        {cleanPlain(typeof plain === 'string' ? plain : (plain ? String(plain) : 'No plain text available'))}
                      </div>
                    );
                    const out = jsonNode?.output ?? jsonNode;
                    const renderJson = () => (
                      <div className={`bg-muted/30 rounded-lg p-3 overflow-y-auto ${expanded ? 'max-h-[70vh]' : 'max-h-56'}`}>
                        {out == null ? (<p className="text-sm text-muted-foreground">No output</p>) : (
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {typeof out === 'string' ? sanitizeText(out) : JSON.stringify(out, null, 2)}
                          </pre>
                        )}
                      </div>
                    );

                    return (
                      <div key={key} className="border rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden w-full">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                          <h4 className="font-medium text-lg flex items-center gap-3">
                            {key}
                            {passed !== null && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {passed ? 'Passed' : 'Failed'}
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-2">
                            {!splitView && (
                              <div className="flex items-center gap-1 text-xs mr-2">
                                <Button variant={mode === 'jsons' ? 'default' : 'outline'} size="sm" className="h-7" onClick={() => setCardMode(key, 'jsons')}>JSON</Button>
                                <Button variant={mode === 'plain_texts' ? 'default' : 'outline'} size="sm" className="h-7" onClick={() => setCardMode(key, 'plain_texts')}>Plain</Button>
                              </div>
                            )}
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => toggleCard(key)}>
                              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          {splitView ? (
                            <div className="grid gap-4 grid-cols-2">
                              <div>{renderJson()}</div>
                              <div>{renderPlain()}</div>
                            </div>
                          ) : (
                            <>{mode === 'plain_texts' ? renderPlain() : renderJson()}</>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ============ Domain-wise Responses (STRICT) ============ */}
          <DomainWiseResponses
            domainJsons={domainJsons}
            domainTexts={domainTexts}
            domains={domains}
            defaultOpen={false}
            fileName={fileName}  // pass down for PDF naming
          />
        </div>
      )}
    </div>
  );
}
