const fs = require('fs');
const cases = [
  {id:46,  year:'C', season:'Advent',    wk:'03', book:'賽', passage:'11:1-9'},
  {id:365, year:'C', season:'Pentecost', wk:'16', book:'耶', passage:'9:12-26'},
  {id:370, year:'C', season:'Pentecost', wk:'16', book:'路', passage:'9:43b-48'},
  {id:376, year:'C', season:'Pentecost', wk:'17', book:'哀', passage:'3:19-26'},
  {id:396, year:'C', season:'Pentecost', wk:'20', book:'路', passage:'18:9-14'},
  {id:409, year:'C', season:'Pentecost', wk:'21', book:'哈', passage:'1:5-17'},
  {id:414, year:'C', season:'Pentecost', wk:'22', book:'哈', passage:'3:1-16'},
  {id:428, year:'C', season:'Pentecost', wk:'24', book:'西', passage:'1:11-20'},
  {id:431, year:'C', season:'Pentecost', wk:'24', book:'賽', passage:'66:14-24'},
  {id:439, year:'C', season:'Pentecost', wk:'25', book:'耶', passage:'31:1-6'},
  {id:444, year:'A', season:'Christmas', wk:'01', book:'約', passage:'1:1-18'},
  {id:456, year:'A', season:'Christmas', wk:'02', book:'撒上', passage:'3:1-9'},
  {id:468, year:'A', season:'Epiphany',  wk:'02', book:'林前', passage:'1'},
  {id:780, year:'B', season:'Easter',    wk:'07', book:'約', passage:'15:26-27'},
];

for (const c of cases) {
  const file = 'stores/三讀三禱/' + c.year + '-' + c.season + '-wk' + c.wk + '-text.txt';
  if (!fs.existsSync(file)) { console.log('MISSING FILE:', file); continue; }
  const text = fs.readFileSync(file, 'utf8');
  const abbrev = c.book;
  const passage = c.passage.split(';')[0].replace(/[ab]/g,'').replace(/\([^)]*\)/g,'').trim();
  const reStr = abbrev.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '[\\s　]+' + passage.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re = new RegExp(reStr);
  const m = re.exec(text);
  if (!m) { console.log('HEADER NOT FOUND: id='+c.id+' '+abbrev+' '+passage); continue; }
  const seg = text.substring(m.index);
  const instrIdx = seg.indexOf('請默禱');
  if (instrIdx < 0) { console.log('NO INSTR: id='+c.id+' '+abbrev+' '+passage); continue; }
  const instrEnd = seg.indexOf('心得記下', instrIdx);
  const contentStart = instrEnd + 6;
  console.log('--- id='+c.id+' '+abbrev+' '+c.passage);
  console.log(seg.substring(contentStart, contentStart+300).replace(/\n/g,'↵').replace(/=== PAGE \d+ ===/g,'[PAGE]'));
  console.log();
}
