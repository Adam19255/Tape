/**
 * Minimal .xlsx writer. Pure: no DOM, no dependencies, so it works without a build step and offline.
 *
 *   buildXlsx(sheets, styles) -> Uint8Array
 *   sheets: [{name, rows, widths?, freeze?, filter?, grid?}]
 *     rows    array of rows; a cell is a string, a number, null, or {v, s?, f?}
 *               v  value (numbers stay numbers, so the recipient can sort and sum them)
 *               s  style name, a key of `styles`
 *               f  formula without "=" (v is stored beside it as the cached result)
 *     widths  column widths in characters          freeze  number of header rows to keep in view
 *     filter  1-based header row to put filter buttons on          grid  false hides gridlines
 *   styles: {name: {fmt?, bold?, size?, color?, bg?, align?, line?}}   (colors are RRGGBB; line = bottom rule)
 */
const enc=new TextEncoder();
const NS='http://schemas.openxmlformats.org/';
const esc=s=>String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const colName=i=>{let s='';for(i++;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s};
const sheetName=(n,i)=>String(n||'Sheet'+(i+1)).replace(/[\[\]:*?\/\\]/g,'-').slice(0,31);

// ---- styles.xml: fonts, fills, borders and number formats are de-duplicated into the shared tables ----
function stylesPart(styles){
  const fonts=[],fills=['<fill><patternFill patternType="none"/></fill>','<fill><patternFill patternType="gray125"/></fill>'],borders=[],fmts=[];
  const at=(list,xml)=>{const i=list.indexOf(xml);return i<0?list.push(xml)-1:i};
  at(fonts,'<font><sz val="11"/><name val="Calibri"/></font>');at(borders,'<border><left/><right/><top/><bottom/><diagonal/></border>');
  const xfs=Object.values(styles).map(s=>{
    const font=at(fonts,`<font>${s.bold?'<b/>':''}<sz val="${s.size||11}"/>${s.color?`<color rgb="FF${s.color}"/>`:''}<name val="Calibri"/></font>`),
      fill=s.bg?at(fills,`<fill><patternFill patternType="solid"><fgColor rgb="FF${s.bg}"/><bgColor indexed="64"/></patternFill></fill>`):0,
      border=s.line?at(borders,'<border><left/><right/><top/><bottom style="thin"><color rgb="FFBBBBBB"/></bottom><diagonal/></border>'):0,
      fmt=s.fmt?164+at(fmts,s.fmt):0;
    return`<xf numFmtId="${fmt}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"${s.align?` applyAlignment="1"><alignment horizontal="${s.align}" vertical="center"/></xf>`:'/>'}`});
  const list=(tag,a)=>`<${tag} count="${a.length}">${a.join('')}</${tag}>`;
  return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}spreadsheetml/2006/main">${fmts.length?list('numFmts',fmts.map((f,i)=>`<numFmt numFmtId="${164+i}" formatCode="${esc(f)}"/>`)):''}${list('fonts',fonts)}${list('fills',fills)}${list('borders',borders)}<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>${list('cellXfs',xfs)}<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

// ---- one worksheet ----
function sheetPart(sh,ids){
  const width=Math.max(0,...sh.rows.map(r=>r.length));
  const cell=(c,r,i)=>{
    const o=c!==null&&typeof c==='object'?c:{v:c};
    if(o.s&&!(o.s in ids))throw new Error('Unknown cell style: '+o.s);
    const ref=colName(i)+(r+1),s=o.s?` s="${ids[o.s]}"`:'',v=o.v;
    if(typeof v==='number'&&Number.isFinite(v))return`<c r="${ref}"${s}>${o.f?`<f>${esc(o.f)}</f>`:''}<v>${v}</v></c>`;
    if(typeof v==='string'&&v!=='')return`<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    return o.s?`<c r="${ref}"${s}/>`:''; // an empty but styled cell keeps its fill
  };
  const rows=sh.rows.map((row,r)=>`<row r="${r+1}">${row.map((c,i)=>cell(c,r,i)).join('')}</row>`).join('');
  return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0"${sh.grid===false?' showGridLines="0"':''}>${sh.freeze?`<pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze+1}" activePane="bottomLeft" state="frozen"/>`:''}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${sh.widths?`<cols>${sh.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>`:''}<sheetData>${rows}</sheetData>${sh.filter?`<autoFilter ref="A${sh.filter}:${colName(width-1)}${sh.rows.length}"/>`:''}<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`; // prints one page wide
}

// ---- zip container (entries are stored, not compressed: these files are tiny) ----
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=b=>{let c=~0;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return~c>>>0};
const concat=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out};
function zip(files){
  const d=new Date(),time=d.getHours()<<11|d.getMinutes()<<5|d.getSeconds()>>1,date=(d.getFullYear()-1980)<<9|(d.getMonth()+1)<<5|d.getDate();
  const body=[],dir=[];let offset=0;
  for(const f of files){
    const name=enc.encode(f.name),data=enc.encode(f.text),crc=crc32(data),n=data.length;
    const l=new DataView(new ArrayBuffer(30));
    l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x0800,true);l.setUint16(10,time,true);l.setUint16(12,date,true);
    l.setUint32(14,crc,true);l.setUint32(18,n,true);l.setUint32(22,n,true);l.setUint16(26,name.length,true);
    body.push(new Uint8Array(l.buffer),name,data);
    const c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(12,time,true);c.setUint16(14,date,true);
    c.setUint32(16,crc,true);c.setUint32(20,n,true);c.setUint32(24,n,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);
    dir.push(new Uint8Array(c.buffer),name);
    offset+=30+name.length+n;
  }
  const e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);
  e.setUint32(12,dir.reduce((n,p)=>n+p.length,0),true);e.setUint32(16,offset,true);
  return concat([...body,...dir,new Uint8Array(e.buffer)]);
}

export function buildXlsx(sheets,styles={}){
  const all={default:{},...styles},ids=Object.fromEntries(Object.keys(all).map((k,i)=>[k,i])),N=sheets.length;
  const xml=(body)=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body}`;
  const rel=(id,type,target)=>`<Relationship Id="${id}" Type="${NS}officeDocument/2006/relationships/${type}" Target="${target}"/>`;
  return zip([
    {name:'[Content_Types].xml',text:xml(`<Types xmlns="${NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`)},
    {name:'_rels/.rels',text:xml(`<Relationships xmlns="${NS}package/2006/relationships">${rel('rId1','officeDocument','xl/workbook.xml')}</Relationships>`)},
    {name:'xl/workbook.xml',text:xml(`<workbook xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${esc(sheetName(s.name,i))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`)},
    {name:'xl/_rels/workbook.xml.rels',text:xml(`<Relationships xmlns="${NS}package/2006/relationships">${sheets.map((_,i)=>rel('rId'+(i+1),'worksheet',`worksheets/sheet${i+1}.xml`)).join('')}${rel('rId'+(N+1),'styles','styles.xml')}</Relationships>`)},
    {name:'xl/styles.xml',text:stylesPart(all)},
    ...sheets.map((s,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,text:sheetPart(s,ids)}))
  ]);
}
