import fs from 'node:fs';
import path from 'node:path';
import { BOT_FILE_RE, normalizeBotScenario, normalizeBotTemplate } from '@vltk/shared';
export class ConfigInUseError extends Error { readonly code = 'CONFIG_IN_USE'; }
export class ConfigStore {
  constructor(readonly dir:string) {}
  private folder(kind:string):string {if(kind==='templates')return path.join(this.dir,'templates');if(kind==='scenarios')return this.dir;throw Error('Loại cấu hình không hợp lệ.');}
  private file(kind:string,name:string):string {if(typeof name!=='string'||!BOT_FILE_RE.test(name))throw Error('Tên file không hợp lệ.');return path.join(this.folder(kind),`${name}.json`);}
  read(kind:string,name:string):unknown {const value=JSON.parse(fs.readFileSync(this.file(kind,name),'utf8'));return kind==='templates'?normalizeBotTemplate(value):normalizeBotScenario(value);}
  save(kind:string,name:string,value:unknown):unknown {const file=this.file(kind,name);const normalized=kind==='templates'?normalizeBotTemplate(value):normalizeBotScenario(value);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(normalized,null,2)+'\n');return normalized;}
  remove(kind:string,name:string):void {
    const file=this.file(kind,name);
    // Check existence before dependencies so a repeated delete reports the missing file.
    fs.accessSync(file);
    if(kind==='templates') {
      const references:string[]=[];
      for(const scenario of this.list().scenarios) {
        let config:ReturnType<typeof normalizeBotScenario>;
        try {config=this.read('scenarios',scenario) as typeof config;}
        catch {throw new ConfigInUseError(`Không kiểm tra được kịch bản “${scenario}”. Hãy sửa hoặc xóa kịch bản này trước.`);}
        if(config.initialSetup?.some(group=>group.template===name)) references.push(config.title||scenario);
      }
      if(references.length) throw new ConfigInUseError(`Thiết lập đang được dùng bởi kịch bản: ${references.join(', ')}. Hãy đổi thiết lập hoặc xóa các kịch bản đó trước.`);
    }
    fs.unlinkSync(file);
  }
  list():{templates:string[];titles:Record<string,string>;scenarios:string[];scenarioTitles:Record<string,string>;dir:string} {
    const names=(kind:string)=>{const folder=this.folder(kind);return fs.existsSync(folder)?fs.readdirSync(folder).filter(n=>n.endsWith('.json')&&BOT_FILE_RE.test(n.slice(0,-5))).map(n=>n.slice(0,-5)).sort():[];};
    const templates=names('templates'),scenarios=names('scenarios');
    const titles=(kind:string,list:string[])=>Object.fromEntries(list.map(name=>{try{return[name,(this.read(kind,name) as {title?:string}).title||name];}catch{return[name,name];}}));
    return{templates,titles:titles('templates',templates),scenarios,scenarioTitles:titles('scenarios',scenarios),dir:this.dir};
  }
}
