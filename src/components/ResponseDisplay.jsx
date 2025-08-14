import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Download,
  Code2,
  FileText,
  SplitSquareVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { jsPDF } from 'jspdf';

function normalizeResponseShape(response) {
  const safeParse = (v) => {
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { return v; }
  };
  let raw = safeParse(response);
  if (Array.isArray(raw)) {
    const candidate = raw.find((x) => x && typeof x === 'object' && (x.jsons || x.plain_texts));
    if (candidate) return { jsons: candidate.jsons || {}, plain_texts: candidate.plain_texts || {} };
    const candidate2 = raw.find((x) => x && typeof x === 'object' && x.data && (x.data.jsons || x.data.plain_texts));
    if (candidate2) return { jsons: candidate2.data.jsons || {}, plain_texts: candidate2.data.plain_texts || {} };
  }
  if (raw && typeof raw === 'object') {
    if (raw.jsons || raw.plain_texts) return { jsons: raw.jsons || {}, plain_texts: raw.plain_texts || {} };
    if (raw.data && (raw.data.jsons || raw.data.plain_texts)) return { jsons: raw.data.jsons || {}, plain_texts: raw.data.plain_texts || {} };
  }
  return {
    jsons: { Response: raw },
    plain_texts: { Response: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2) },
  };
}

function sanitizeText(s) {
  if (s == null) return '';
  let t = String(s);
  if (t.normalize) t = t.normalize('NFKC');
  t = t.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  t = t.replace(/[\u200B-\u200D\u2060\uFEFF\uFE0E\uFE0F]/g, '');
  try { t = t.replace(/[\p{Extended_Pictographic}]/gu, ''); } catch { t = t.replace(/[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]/gu, ''); }
  return t.trim();
}
function cleanAgentPlain(s) {
  let t = sanitizeText(s);
  t = t.replace(/^[ '"`]+/, '');
  return t;
}

export default function ResponseDisplay({ response }) {
  const [isExpanded, setIsExpanded] = useState(true);
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
  const agentKeys = useMemo(() => {
    const setKeys = new Set([...Object.keys(normalized.jsons || {}), ...Object.keys(normalized.plain_texts || {})]);
    setKeys.delete('summary');
    const ordered = [];
    for (const name of preferredOrder) {
      if (setKeys.has(name)) {
        ordered.push(name);
        setKeys.delete(name);
      }
    }
    return [...ordered, ...Array.from(setKeys).sort((a, b) => a.localeCompare(b))];
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

  // ---------- PDF EXPORT (restored) ----------
  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
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
        doc.setFillColor(...fill); doc.roundedRect(x, y, w, h, 4, 4, 'F'); doc.setTextColor(0,0,0); doc.text(safeLabel, x + padX, y + h/2 + 3);
        x += w + gap;
      });
      return y + 26;
    };

    let y = margin + 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text('Agent Responses', margin, y); y += 28;

    const sum = normalized.jsons?.summary;
    const total = sum?.total_nodes ?? agentKeys.length;
    const passedCount = sum?.passed_count ?? agentKeys.filter(k => normalized.jsons?.[k]?.passed).length;
    const failedCount = sum?.failed_count ?? Math.max(0, total - passedCount);

    doc.setFont('helvetica', 'normal');
    y = addWrapped(`Exported: ${new Date().toLocaleString()}`, margin, y, 11, 6);
    y = addWrapped('This document includes all agent outputs using the current per-card selection (JSON or Plain Text).', margin, y, 11, 10);

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
        // JSON block
        const jsonStr = out == null ? 'No output' : (typeof out === 'string' ? sanitizeText(out) : JSON.stringify(out ?? '—', null, 2));
        yy = addWrapped('JSON:\n' + jsonStr, margin, yy, 9, 8, { name: 'courier', style: 'normal' });
        yy = addDivider(yy);
        const plainStr = typeof plain === 'string' ? cleanAgentPlain(plain) : (plain ? cleanAgentPlain(String(plain)) : 'No plain text available');
        yy = addWrapped('Plain Text:\n' + plainStr, margin, yy, 11, 8, { name: 'helvetica', style: 'normal' });
      } else if (mode === 'plain_texts') {
        const plainStr = typeof plain === 'string' ? cleanAgentPlain(plain) : (plain ? cleanAgentPlain(String(plain)) : '—');
        yy = addWrapped(plainStr, margin, yy, 11, 8, { name: 'helvetica', style: 'normal' });
      } else {
        const jsonStr = out == null ? 'No output' : (typeof out === 'string' ? sanitizeText(out) : JSON.stringify(out ?? '—', null, 2));
        yy = addWrapped(jsonStr, margin, yy, 9, 8, { name: 'courier', style: 'normal' });
      }
    });

    // Fill TOC
    doc.setPage(tocPage);
    let yToc = tocStartY;
    const drawTocLine = (label, pageNum) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      const safe = sanitizeText(label); const labelW = doc.getTextWidth(safe);
      const leftX = margin; const rightX = pageW - margin; const dotsStart = leftX + labelW + 8; const dotsEnd = rightX - 28;
      doc.text(safe, leftX, yToc);
      if (dotsEnd > dotsStart + 10) { doc.setDrawColor(180); doc.setLineDash([2, 2], 0); doc.line(dotsStart, yToc - 4, dotsEnd, yToc - 4); doc.setLineDash(); }
      doc.text(String(pageNum), rightX, yToc, { align: 'right' });
      yToc += 16; if (yToc > pageH - margin) { doc.addPage(); yToc = margin + 6; }
    };

    agentKeys.forEach((key, i) => {
      const mode = modeFor(key);
      const modeLabel = splitView ? 'Split' : (mode === 'plain_texts' ? 'Plain Text' : 'JSON');
      const entry = `${i + 1}. ${key} — ${modeLabel}`;
      drawTocLine(entry, sectionStartPages[key]);
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(`${i} / ${totalPages}`, pageW - 48, pageH - 20, { align: 'right' });
    }

    doc.save('agent-responses.pdf');
  };

  if (!response) return null;
  const summary = normalized.jsons?.summary;

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 text-left hover:text-primary transition-colors">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <h3 className="font-semibold">Agent Responses</h3>
        </button>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 text-xs mr-1">
            <span className="text-muted-foreground mr-2">View:</span>
            <Button variant={(globalDefaultMode === 'jsons') ? 'default' : 'outline'} size="sm" className="h-8" onClick={() => {
              setGlobalDefaultMode('jsons');
              setModeMap(agentKeys.reduce((acc, key) => { acc[key] = 'jsons'; return acc; }, {}));
            }}>
              <Code2 className="w-4 h-4 mr-1" /> JSON
            </Button>
            <Button variant={(globalDefaultMode === 'plain_texts') ? 'default' : 'outline'} size="sm" className="h-8" onClick={() => {
              setGlobalDefaultMode('plain_texts');
              setModeMap(agentKeys.reduce((acc, key) => { acc[key] = 'plain_texts'; return acc; }, {}));
            }}>
              <FileText className="w-4 h-4 mr-1" /> Plain
            </Button>
          </div>
          <Button variant="secondary" size="sm" className="h-8" onClick={exportPdf} title="Export a PDF that respects each card's current selection">
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
      {isExpanded && (
        <div className="p-4 space-y-4">
          {summary && (
            <div className="sticky top-2 z-10 bg-white/80 dark:bg-gray-950/70 backdrop-blur rounded-xl border shadow-sm p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">Summary</span>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">Agents: {agentKeys.length}</span>
                {'passed_count' in summary && (<span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">Passed: {summary.passed_count}</span>)}
                {'failed_count' in summary && (<span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">Failed: {summary.failed_count}</span>)}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-4">
            {agentKeys.map((key) => {
              const jsonNode = normalized.jsons?.[key];
              const plain = normalized.plain_texts?.[key];
              const expanded = isCardExpanded(key);
              const mode = modeFor(key);
              const passed = jsonNode && typeof jsonNode === 'object' && 'passed' in jsonNode ? !!jsonNode.passed : null;
              const renderPlain = () => (
                <div className={`bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap overflow-y-auto ${expanded ? 'max-h-[70vh]' : 'max-h-56'}`}>
                  {cleanAgentPlain(typeof plain === 'string' ? plain : (plain ? String(plain) : 'No plain text available'))}
                </div>
              );
              const out = jsonNode?.output ?? jsonNode;
              const renderJson = () => (
                <div className={`bg-muted/30 rounded-lg p-3 overflow-y-auto ${expanded ? 'max-h-[70vh]' : 'max-h-56'}`}>
                  {out == null ? (<p className="text-sm text-muted-foreground">No output</p>) : (<pre className="text-xs font-mono whitespace-pre-wrap">{typeof out === 'string' ? sanitizeText(out) : JSON.stringify(out, null, 2)}</pre>)}
                </div>
              );
              return (
                <div key={key} className="border rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden w-full">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h4 className="font-medium text-lg flex items-center gap-3">
                      {key}
                      {passed !== null && (<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{passed ? 'Passed' : 'Failed'}</span>)}
                    </h4>
                    <div className="flex items-center gap-2">
                      {!splitView && (
                        <div className="flex items-center gap-1 text-xs mr-2">
                          <Button variant={mode === 'jsons' ? 'default' : 'outline'} size="sm" className="h-7" onClick={() => setCardMode(key, 'jsons')}>JSON</Button>
                          <Button variant={mode === 'plain_texts' ? 'default' : 'outline'} size="sm" className="h-7" onClick={() => setCardMode(key, 'plain_texts')}>Plain</Button>
                        </div>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => toggleCard(key)}>{expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button>
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
        </div>
      )}
    </div>
  );
}
