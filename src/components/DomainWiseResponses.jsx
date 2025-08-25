// DomainWiseResponses.jsx
import React, { useMemo, useState } from 'react';
import { Minimize2, Maximize2, Code2, FileText, SplitSquareVertical, Download, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { jsPDF } from 'jspdf';

/* -------- small utils (local) -------- */
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
    items.forEach(({ label, color = 'gray' }) => {
      const safeLabel = sanitizeText(label ?? '');
      const w = doc.getTextWidth(safeLabel) + padX * 2; const h = 18;
      if (x + w > pageW - margin) { y += h + 4; x = margin; }
      const fill = color === 'green' ? [222, 247, 236] : color === 'red' ? [255, 228, 230] : [229, 231, 235];
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.roundedRect(x, y, w, h, 4, 4, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text(safeLabel, x + padX, y + h/2 + 3);
      x += w + gap;
    });
    return y + 26;
  };
  return { pageW, pageH, margin, addWrapped, addDivider, addBadgeRow };
}

/**
 * DomainWiseResponses
 * Props:
 *   domainJsons: object keyed by domain → JSON
 *   domainTexts: object keyed by domain → string (plain text)
 *   domains (optional): array for canonical ordering
 *   defaultOpen (optional): boolean (default false)
 *   fileName (optional): original uploaded file name for export naming
 */
export default function DomainWiseResponses({ domainJsons, domainTexts, domains, defaultOpen = false, fileName }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [splitView, setSplitView] = useState(false);
  const [globalMode, setGlobalMode] = useState('jsons'); // 'jsons' | 'plain_texts'
  const [modeMap, setModeMap] = useState({});
  const [expandedMap, setExpandedMap] = useState({});
  const [copied, setCopied] = useState(false);

  const setCardMode = (key, mode) => setModeMap((m) => ({ ...m, [key]: mode }));
  const modeFor = (key) => modeMap[key] || globalMode;
  const isExpanded = (key) => !!expandedMap[key];
  const toggleExpand = (key) => setExpandedMap((m) => ({ ...m, [key]: !m[key] }));

  const domainKeys = useMemo(() => {
    const keys = Object.keys(domainJsons || {});
    if (domains && Array.isArray(domains) && domains.length) {
      const set = new Set(keys);
      const first = domains.filter((d) => set.has(d));
      first.forEach((d) => set.delete(d));
      return [...first, ...Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
    }
    return keys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [domainJsons, domains]);

  const copyAllDomains = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ domain_wise_jsons: domainJsons, domain_wise_texts: domainTexts }, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (e) { console.error('copy failed', e); }
  };

  const exportDomainPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const { pageW, pageH, margin, addWrapped, addDivider, addBadgeRow } = makePdfHelpers(doc);
    const safeBase = (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'report').trim() || 'report';

    let y = margin + 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text('Domain-wise Responses', margin, y); y += 28;
    doc.setFont('helvetica', 'normal');
    y = addWrapped(`Exported: ${new Date().toLocaleString()}`, margin, y, 11, 6);
    y = addWrapped('Shows only domains found in domain_wise_jsons.', margin, y, 11, 10);
    y = addBadgeRow([{ label: `Domains: ${domainKeys.length}`, color: 'gray' }], y);

    // TOC
    doc.addPage();
    const tocPage = doc.getNumberOfPages();
    y = margin + 6; doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Table of Contents', margin, y); y += 18;
    const tocStartY = y;
    const sectionPages = {};

    domainKeys.forEach((key) => {
      const j = domainJsons?.[key];
      const p = domainTexts?.[key];
      const hasJ = j != null && (typeof j === 'string' || Object.keys(j || {}).length > 0);
      const hasP = typeof p === 'string' && p.trim().length > 0;
      if (!hasJ && !hasP) return;

      doc.addPage();
      const start = doc.getNumberOfPages();
      sectionPages[key] = start;

      let yy = margin + 6;
      const cardMode = modeFor(key);
      const modeLabel = splitView ? 'Split' : (cardMode === 'plain_texts' ? 'Plain Text' : 'JSON');

      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(sanitizeText(key), margin, yy); yy += 18;
      yy = addBadgeRow([{ label: `View: ${modeLabel}`, color: 'gray' }], yy);
      yy = addDivider(yy);

      if (splitView) {
        const jsonStr = j == null ? 'No output' : (typeof j === 'string' ? sanitizeText(j) : JSON.stringify(j ?? '—', null, 2));
        yy = addWrapped('JSON:\n' + jsonStr, margin, yy, 9, 8, { name: 'courier', style: 'normal' });
        yy = addDivider(yy);
        const plainStr = typeof p === 'string' ? cleanPlain(p) : (p ? cleanPlain(String(p)) : 'No plain text available');
        yy = addWrapped('Plain Text:\n' + plainStr, margin, yy, 11, 8, { name: 'helvetica', style: 'normal' });
      } else if (cardMode === 'plain_texts') {
        const plainStr = typeof p === 'string' ? cleanPlain(p) : (p ? cleanPlain(String(p)) : '—');
        yy = addWrapped(plainStr, margin, yy, 11, 8, { name: 'helvetica', style: 'normal' });
      } else {
        const jsonStr = j == null ? 'No output' : (typeof j === 'string' ? sanitizeText(j) : JSON.stringify(j ?? '—', null, 2));
        yy = addWrapped(jsonStr, margin, yy, 9, 8, { name: 'courier', style: 'normal' });
      }
    });

    // Write TOC
    doc.setPage(tocPage);
    let yToc = tocStartY;
    const drawTocLine = (label, pageNum) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      const safe = sanitizeText(label);
      const labelW = doc.getTextWidth(safe);
      const leftX = margin; const rightX = pageW - margin; const dotsStart = leftX + labelW + 8; const dotsEnd = rightX - 28;
      doc.text(safe, leftX, yToc);
      if (typeof doc.setLineDash === 'function') {
        doc.setDrawColor(180); doc.setLineDash([2, 2], 0); doc.line(dotsStart, yToc - 4, dotsEnd, yToc - 4); doc.setLineDash();
      } else {
        doc.setDrawColor(180); doc.line(dotsStart, yToc - 4, dotsEnd, yToc - 4);
      }
      doc.text(String(pageNum), rightX, yToc, { align: 'right' });
      yToc += 16;
    };

    domainKeys.forEach((key, i) => {
      const page = sectionPages[key];
      if (!page) return;
      const mode = modeFor(key);
      const modeLabel = splitView ? 'Split' : (mode === 'plain_texts' ? 'Plain Text' : 'JSON');
      drawTocLine(`${i + 1}. ${key} — ${modeLabel}`, page);
    });

    // Footer page numbers
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(`${i} / ${total}`, pageW - 48, pageH - 20, { align: 'right' });
    }

    // UPDATED NAME:
    doc.save(`${safeBase}-domain-responses.pdf`);
  };

  return (
    <div className="border rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 hover:text-primary">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <h4 className="font-semibold">Domain-wise Responses</h4>
        </button>

        <div className="flex items-center gap-2">
          {!splitView && (
            <div className="hidden md:flex items-center gap-1 text-xs mr-1">
              <span className="text-muted-foreground mr-2">View:</span>
              <Button
                variant={(globalMode === 'jsons') ? 'default' : 'outline'}
                size="sm" className="h-8"
                onClick={() => {
                  setGlobalMode('jsons');
                  setModeMap(domainKeys.reduce((acc, key) => { acc[key] = 'jsons'; return acc; }, {}));
                }}
              >
                <Code2 className="w-4 h-4 mr-1" /> JSON
              </Button>
              <Button
                variant={(globalMode === 'plain_texts') ? 'default' : 'outline'}
                size="sm" className="h-8"
                onClick={() => {
                  setGlobalMode('plain_texts');
                  setModeMap(domainKeys.reduce((acc, key) => { acc[key] = 'plain_texts'; return acc; }, {}));
                }}
              >
                <FileText className="w-4 h-4 mr-1" /> Plain
              </Button>
            </div>
          )}
          <Button variant="secondary" size="sm" className="h-8" onClick={exportDomainPdf}>
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setSplitView((s) => !s)}>
            <SplitSquareVertical className="w-4 h-4 mr-2" /> {splitView ? 'Single' : 'Split'} View
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={copyAllDomains}>
            {copied ? (<><Check className="w-4 h-4 mr-1" /> Copied</>) : (<><Copy className="w-4 h-4 mr-1" /> Copy</>)}
          </Button>
        </div>
      </div>

      {open && (
        <div className="p-4 flex flex-col gap-4">
          {domainKeys.length === 0 && (
            <div className="text-sm text-muted-foreground">No domain-wise data present (domain_wise_jsons is empty).</div>
          )}

          {domainKeys.map((key) => {
            const jsonNode = domainJsons?.[key];
            const plain = domainTexts?.[key];
            const expanded = isExpanded(key);
            const mode = modeFor(key);

            const hasJson = jsonNode != null && (typeof jsonNode === 'string' || Object.keys(jsonNode || {}).length > 0);
            const hasText = typeof plain === 'string' && plain.trim().length > 0;
            if (!hasJson && !hasText) return null;

            const renderPlain = () => (
              <div className={`bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap overflow-y-auto ${expanded ? 'max-h-[70vh]' : 'max-h-56'}`}>
                {cleanPlain(typeof plain === 'string' ? plain : (plain ? String(plain) : 'No plain text available'))}
              </div>
            );
            const renderJson = () => (
              <div className={`bg-muted/30 rounded-lg p-3 overflow-y-auto ${expanded ? 'max-h-[70vh]' : 'max-h-56'}`}>
                {jsonNode == null ? (
                  <p className="text-sm text-muted-foreground">No output</p>
                ) : (
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {typeof jsonNode === 'string' ? sanitizeText(jsonNode) : JSON.stringify(jsonNode, null, 2)}
                  </pre>
                )}
              </div>
            );

            return (
              <div key={key} className="border rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden w-full">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h4 className="font-medium text-lg">{key}</h4>
                  <div className="flex items-center gap-2">
                    {!splitView && (
                      <div className="flex items-center gap-1 text-xs mr-2">
                        <Button variant={mode === 'jsons' ? 'default' : 'outline'} size="sm" className="h-7" onClick={() => setCardMode(key, 'jsons')}>JSON</Button>
                        <Button variant={mode === 'plain_texts' ? 'default' : 'outline'} size="sm" className="h-7" onClick={() => setCardMode(key, 'plain_texts')}>Plain</Button>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => toggleExpand(key)}>
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
      )}
    </div>
  );
}
