import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BOT_ROSTER,DEFAULT_BOT_TEMPLATE,DEFAULT_BOT_SCENARIO,botMapIds} from '@vltk/shared';
const data=path.join(path.dirname(fileURLToPath(import.meta.url)),'data');
const bands:[[number,number],[number,number],[number,number]]=[[40,69],[70,90],[110,150]];
for(const [lo,hi] of bands){const name=`cap-${lo}-${hi}`;const file=path.join(data,'templates',`${name}.json`);if(fs.existsSync(file))continue;fs.writeFileSync(file,JSON.stringify({...DEFAULT_BOT_TEMPLATE,title:`Luyện công cấp ${lo}–${hi}`,level:[lo,hi],map:{mode:'both',maps:botMapIds('both'),radius:200}},null,2)+'\n');}
const scenario=path.join(data,'luyen-cong-30.json');if(!fs.existsSync(scenario))fs.writeFileSync(scenario,JSON.stringify({...DEFAULT_BOT_SCENARIO,title:'30 bot luyện công, chat và rao bán',note:'10 nhân vật mỗi dải 40–69 / 70–90 / 110–150. Tự khởi tạo tài khoản còn thiếu; giữ tiến trình nhân vật đã có.',bots:{prefix:'botfixed',count:30,usernames:BOT_ROSTER.slice(0,30).map(bot=>bot.id)},joinPerSecond:3,initialSetup:bands.map(([lo,hi],i)=>({template:`cap-${lo}-${hi}`,usernames:BOT_ROSTER.slice(i*10,i*10+10).map(bot=>bot.id)}))},null,2)+'\n');
