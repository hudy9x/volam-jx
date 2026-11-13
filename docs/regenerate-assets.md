# Dựng lại `apps/client/public/assets` từ client gốc

`apps/client/public/assets` (hơn 15 GB khi đủ bản đồ) **không phải mã nguồn**: toàn bộ sinh ra từ client gốc
`jx-origin` bằng tool trong `apps/client/tools/`. Vì vậy có thể nén codebase mà bỏ thư mục này, rồi dựng lại trên máy khác.

## Tool nào sinh gì

| Lệnh (chạy ở gốc `jx-system-online`) | Sinh ra | Thời gian |
| :--- | :--- | :--- |
| `npm run gen:assets -w @vltk/client` | `public/assets/char`, `npc`, `items` (WebP) + `src/art/jx/data.gen.ts`, `packages/shared/src/items/items.gen.ts`, `horses.gen.ts`, `monsters/monsters.gen.ts` | khoảng 3 phút lần đầu; thêm `-- --force` để làm lại hết |
| `npm run gen:skills -w @vltk/client` | `public/assets/skill` (fx, icon) + các `*.gen.ts` của kỹ năng | vài giây; `-- --force` để mã hóa lại hiệu ứng |
| `npm run gen:maps -w @vltk/client -- 37 140` | `public/assets/maps/<id>` (ảnh nền theo vùng, atlas vật thể, minimap, `nav.json`) cho 2 bản đồ khởi đầu | nhanh |
| `npm run gen:maps -w @vltk/client` | toàn bộ khoảng 300 bản đồ của `maplist.ini` + `catalog.gen.ts` (khoảng 16 GB) | vài giờ |
| `npm run gen:ui -w @vltk/client` | `public/assets/ui` (khung, nút, thanh phím tắt gốc, icon ngân lượng, con trỏ chuột `ui/cursor/*.png`, ảnh động chọn/tạo nhân vật `ui/login/figures/*.webp`) + `src/art/cursors.gen.ts`, `src/art/login-figures.gen.ts` | vài giây |
| `npm run gen:sounds -w @vltk/client` | `public/assets/sound` (≈300 MP3, 2,6 MB), `public/assets/music` (30 bài, 34 MB) + `src/game/audio/sounds.gen.ts` | khoảng 15 giây |
| `npm run gen:manifest -w @vltk/client` | `public/assets/manifest.json` (phiên bản từng gói asset cho cache, `docs/performance/05-cache-va-phien-ban.md`). Các tool `gen:*` ở trên **tự cập nhật** gói của mình; chạy lệnh này khi manifest mất / lệch (chép asset bằng tay, tool bị ngắt). `-- core map/37` = chỉ vài gói | lần đầu đọc hết file (≈ 1,5 phút cho 1 GB trên `/mnt`), sau đó nhanh (nhớ hash theo cỡ + mtime ở `tools/.cache/asset-hashes.json`, không vào git) |
| `npm run gen:magic -w @vltk/client` | `packages/shared/src/items/magicattrib.gen.ts` (dòng thuộc tính đồ xanh, đọc `settings/item/magicattrib.txt` gói `update01`) | vài giây |
| `npm run gen:spawns -w @vltk/client` | `packages/shared/spawns/<id>.json` cho bản đồ chưa có (cần `nav.json` của bản đồ) | vài giây |
| `npm run gen:gold -w @vltk/client` | `packages/shared/src/items/gold.gen.ts` (hoàng kim môn phái) **+ icon còn thiếu trong `public/assets/items`**: đồ hoàng kim, bí kíp Kỳ Trân Các, Lệnh bài, Thổ Địa Phù (`gen:assets` không sinh các icon này) | vài giây |
| `npm run gen:player -w @vltk/client` | `packages/shared/src/characters/player.gen.ts` (exp từng cấp, sinh lực / nội lực theo hệ, nhân vật mới) | vài giây |
| `npm run gen:drops -w @vltk/client` | `packages/shared/src/drops/drops.gen.ts` (bảng rơi đồ gốc) | vài giây |
| `npm run audit:skills -w @vltk/client` | `docs/skills-audit.md` (kiểm tra mọi kỹ năng bằng engine dùng chung; không đọc client) | vài giây |
| `cd apps/client && npx tsx tools/doc-gold.ts` | `docs/equipment-gold-thientu.md` (tài liệu hoàng kim + Thiên Tứ) | vài giây |

`gen:ui`, `gen:sounds` cũng tái sinh được, nên có thể thêm `'jx-system-online/apps/client/public/assets/{ui,sound,music}/*'` vào
danh sách loại khi nén. File spawn (`packages/shared/spawns`) là dữ liệu game (có file sửa tay), **giữ lại**.
`gen:player`, `gen:drops`, `gen:magic` chỉ ghi `*.gen.ts` (đã có trong git): máy mới không cần chạy, chỉ chạy khi đổi bản client.
Thứ tự khi thêm quái mới vào spawn: `gen:spawns` (hoặc công cụ dev) → `gen:skills` (chiêu của quái) → `gen:assets` (hình quái).

Tham số `gen:maps`: `<id>…` chỉ các bản đồ đó; `--skip-existing` chạy tiếp phần còn thiếu; `--nav` chỉ lưới đi lại;
`--catalog` chỉ danh mục và ảnh thu nhỏ; `--entries` chọn lại điểm vào tự động (chỉ `nav.json`).

**Không có trong git** (từ 2026-11-12, người dùng yêu cầu): toàn bộ `apps/client/public/assets/` (`.gitignore`), **trừ `portraits/`**
(không có tool sinh). Clone về phải chạy đủ `gen:assets`, `gen:skills`, `gen:ui`, `gen:sounds`, `gen:gold`, `gen:maps -- 37 140` mới chơi được.

Nhạc nền giờ do `gen:sounds` chép từ `jx-origin/music/` (thư mục loose, không nằm trong PAK). **Không có tool** cho
`public/assets/portraits` (11 PNG, khoảng 70 KB, giữ trong file nén; `huashan.png` cắt từ ảnh chụp nhân vật Hoa Sơn trong game,
ghép nền đen/trắng để lấy độ trong suốt, thu về 65×47).

## Điều kiện cần

- Node.js 22+ (`npm install` ở gốc `jx-system-online`; `sharp` nằm trong `devDependencies`).
- Thư mục `jx-origin` có `data/*.pak`, đặt **cạnh** `jx-system-online`; nếu đặt chỗ khác thì đặt biến môi trường
  `JX_CLIENT=/đường/dẫn/jx-origin` (đọc trong `apps/client/tools/jx/source.ts`).
- `python3` và `gcc` để giải nén PAK bằng `tools/jxpak/jxpak.py` (build `libjxpak.so` lần đầu).
- Tool **không đọc PAK trực tiếp** mà đọc `jx-origin/data_extract/` (28 PAK giải nén, khoảng 7,1 GB). Nó dò file thắng theo
  `_manifest.tsv` (cột `overridden_by` rỗng = bản game dùng).

## Client nằm trong volam-shxt (macOS)

Khi không có tool `jxpak.py` cũ, dùng bộ chuyển đổi đi kèm project, tận dụng hàm hash và giải nén của `volam-shxt/scripts/unpack_pak.py`:

```sh
python3 tools/jxpak/from-volam.py /Users/hudy/ws/volam-shxt/Client_VLTK_SHXT /Users/hudy/ws/volam-shxt/scripts
export JX_CLIENT=/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT
```

Đường dẫn `JX_CLIENT` là thư mục client **cha của `data/`**. Tool ghi `data_extract/`, giữ nguyên dữ liệu nguồn và dùng thứ tự gói trong `package.ini`. Xem `tools/jxpak/README.md`; kiểm tra `data_extract/extraction-report.json` trước khi gen.

## Gói PAK nào cần cho tool nào

Client có 29 gói trong `data/` (`package.ini`, tổng ≈4,5 GB nén / 7,1 GB giải nén). Tool không đọc PAK; nó tra `data_extract/<gói>/_manifest.tsv`
và chỉ lấy dòng có `overridden_by` rỗng (bản game thực dùng, vì cùng một đường dẫn có thể nằm trong nhiều gói và **gói chỉ số nhỏ
trong `package.ini` thắng**). Vì vậy "cần gói nào" = gói đang giữ **bản thắng** của những file tool đọc. Bảng dưới đây được tính từ
`_manifest.tsv` của bản `jx-origin` hiện có (2026-11-12); gói liệt kê theo số file thắng giảm dần.

| Tool | Đọc gì (đường dẫn trong game) | Gói giữ bản thắng |
| :--- | :--- | :--- |
| `gen:assets` | bảng `settings/npcres/*`, `settings/npcs.txt`, `settings/item/*.txt` | `slistcache` (hầu hết bảng), `update01` (`item/armor.txt`, `helm`…), `update03`, `update04` |
| | sprite nhân vật / quái / NPC `spr/npcres/**` (28 700 file thắng) | `spr` 11 300, `updatejx14` 11 200, `updatejx05` 2 500, `updatejx07_jxf06` 1 000, `updatejx04` 840, `update` 350, `update03` 290, `update02` 280, `update01` 245, `updatejx10` / `updatejx11` / `updatejx08` / `updatejx06` / `updatejx12` / `updatejx03` / `update04` / `updatejx09` (10–160 mỗi gói), `updatejx13` 1 |
| | icon vật phẩm `spr/item/**` (1 850 file) | `update01` 850, `updatejx14` 180, `update03` 165, `updatejx03` 118, `updatejx05` 86, `updatejx08` 66, `ui` 64, `update04` 64, `updatejx10` 62, `updatejx04` 44, `update` 38, `updatejx06` 37, `update02` 34, `updatejx07_jxf06` / `updatejx09` / `updatejx11` / `updatejx13` (3–17) |
| `gen:skills` | `settings/skills.txt`, `missles.txt`, `magicdesc.ini`, `gamesetting.ini`, `settings/npcres/状态图形对照表.txt`, `script/global/skills_table.lua` | `slistcache` |
| | công thức `script/skill/<phái>.lua` (496 file) | `update01` 429, `slistcache` 57, `update03` 9, `update04` 1; riêng `script/skill/huashan.lua` là file **rời** trong thư mục client (không có trong PAK) |
| | hiệu ứng `spr/skill/**` (454 file) | `skills` 234, `ui` 87, `updatejx09` 53, `updatejx14` 26, `update01` 24, `update03` 19, `updatejx10` 7, `updatejx03` 3, `updatejx06` 1 |
| | icon kỹ năng (cột `SkillIcon`, nằm trong `spr/ui/**`) | `update01` 234, `ui` 95, `updatejx09` 33, `updatejx14` 25, `updatejx10` 12, `update03` 11, `updatejx11` 11, `updatejx08` 6, `updatejx03` 2 |
| `gen:maps` | `settings/maplist.ini` | `slistcache` |
| | vùng bản đồ `maps/<khu>/<map>/*.dat`, `*.wor` — khu chính (江南区, 中原北区, 两湖区, 东北区, 西北北区, 西北南区, 西南北区, 西南南区) | `maps` (≈57 000 file), `update01` (≈5 100, bản vá của nhiều khu), `update04` 967 (江南区), `updatejx14` 377 (西北南区), `update02` 46 |
| | bản đồ đặc biệt `maps/特殊用地/**` (phụ bản, chiến trường; 31 200 file) | `update03` 7 800, `update01` 6 800, `updatejx03` 5 000, `update` 3 500, `updatejx09` 2 300, `updatejx11` 1 600, `updatejx06` 1 300, `updatejx08` 970, `maps` 810, `update04` 575, `updatejx10` 474, `updatejx13` 176; `maps/rongyuxitong` → `updatejx02` 66 |
| | đồ hoạ nền `游戏资源/**` (1 280 file) | `resource` 764, `updatejx14` 166, `updatejx10` 125, `updatejx09` 110, `updatejx11` 47, `updatejx06` 33, `updatejx03` 26, `update01` 7, `update03` 4, `updatejx08` 2 |
| | vật thể trên bản đồ `spr/obj/**` (418 file) | `spr` 218, `update01` 182, `update03` 12, `ui` / `update04` / `update02` / `updatejx06` (1–2) |
| | riêng hai bản đồ khởi đầu: 37 Biện Kinh (`maps/中原北区/汴京`, 2 339 vùng) và 140 Dược Vương Cốc (`maps/江南区/药王谷`, 929 vùng) | vùng: chỉ `maps`; nền + vật thể: `resource`, `spr`, `update01` (+ gói `updatejx*` nào đang giữ bản vá của sprite được tham chiếu) |
| `gen:ui` | khung / nút / thanh `spr/ui3/**` (1 009 file) và con trỏ `spr/Ui3/鼠标/*.cur` | `ui` 800, `update01` 149, `update03` 23, `updatejx11` 23, `updatejx10` 12, `updatejx08` 1, `updatejx14` 1 |
| `gen:sounds` | `sound/**/*.wav` (369 file) | `sound` (toàn bộ) |
| | `settings/skills.txt`, `missles.txt`, `settings/npcres/npc动作声音表.txt`, `主角动作声音表.txt`, `settings/music/musicset.txt` | `slistcache`; hai bảng âm thanh và `musicset.txt` ở `update01` |
| | nhạc nền `.mp3` | thư mục rời `jx-origin/music/`, không nằm trong PAK |
| `gen:spawns` | `public/assets/maps/<id>/nav.json` đã sinh | không đọc PAK |
| `gen:magic` | `settings/item/magicattrib.txt` | `update01` |
| `gen:player` | `settings/npc/player/*` (`level_exp.txt`, `level_add.txt`, `newplayerini00–09.ini`, `basevalue.ini`) | `update01` 19, `slistcache` 2 |
| `gen:drops` | `settings/droprate/**.ini` | `update01` |
| `gen:gold` | `settings/item/goldequipres.txt`; icon `spr/item/questkey/**`, `spr/item/special/obj_townportal.spr` + icon trong `goldequip.txt` | `slistcache` (bảng); icon: `update01` (hầu hết), `ui`, `update04`, `update03`, `updatejx08/10/14` |
| `gen:gold`, `doc-gold` | **file rời bản mod SHXT** (không có trong PAK, AGENTS.md §7): `jx-origin/settings/item/goldequip.txt`, `magicattrib_ge.txt`; riêng `doc-gold` thêm `platinaequip.txt`, `platina_magicrate.txt`, `platina_magicattr.txt` | chép kèm thư mục `jx-origin/settings/item/` |

**Gói không tool nào cần:** `dxrm.pak` (0,3 MB; `jxpak.py` cũng bỏ qua), `font.pak` (6 font bitmap `.asf`), `update05.pak` và `updatejx01.pak`
(mọi file đều bị gói khác ghi đè). `updatejx02` chỉ còn 66 vùng `maps/rongyuxitong` + vài sprite; `updatejx13` chỉ còn 1 sprite nhân vật
và 176 vùng bản đồ đặc biệt (gần như toàn bộ bị `updatejx14` thay).

**Khuyến nghị: giải nén tất cả** (`jxpak.py all`, một lần, ≈7,1 GB). Lý do: bản thắng của sprite nhân vật và icon rải trên gần như
mọi gói `update*` / `updatejx*`, nên bỏ một gói là mất một phần hình. Nếu thiếu ổ đĩa, có thể giải nén từng phần bằng `--paks`; khi đó:

- `jxpak.py` vẫn đọc chỉ mục của **cả 29 gói** để xác định bản thắng (`extract()` trong `tools/jxpak/jxpak.py`), nên file có bản thắng
  nằm trong gói chưa giải nén sẽ được đánh `overridden_by=<gói đó>` và tool **không thấy** nó (báo `Not in client: …` hoặc thiếu hình),
  chứ không âm thầm dùng bản cũ. Muốn đủ, giải nén thêm gói được nêu rồi chạy lại tool (`--force` nếu cần làm lại ảnh đã có).
- Tối thiểu để chơi thử hai bản đồ khởi đầu (`gen:assets`, `gen:skills`, `gen:maps -- 37 140`, `gen:ui`, `gen:sounds`, `gen:gold`), ≈3,6 GB nén:

  ```sh
  cd ../jx-origin
  python3 tools/jxpak/jxpak.py all --paks ui.pak,slistcache.pak,skills.pak,spr.pak,resource.pak,maps.pak,sound.pak,\
  update.pak,update01.pak,update02.pak,update03.pak,update04.pak,\
  updatejx14.pak,updatejx05.pak,updatejx07_jxf06.pak,updatejx04.pak,updatejx09.pak,updatejx10.pak,updatejx11.pak
  ```

  Bỏ thêm `updatejx14.pak` (1,6 GB nén, lớn nhất) thì thiếu ≈11 000 sprite trang phục / ngựa / NPC mới và 180 icon — chỉ nên bỏ khi
  chấp nhận thiếu hình. `gen:maps` cho toàn bộ ≈300 bản đồ cần thêm mọi gói `updatejx03/06/08/13` và `update` (bản đồ `特殊用地`).

Kiểm tra lại bảng này khi đổi sang bản client khác: chạy đoạn Python sau trong `jx-origin` để in "nhóm đường dẫn → gói thắng"
từ `_manifest.tsv` (chỉ đọc):

```python
import csv, collections, os
csv.field_size_limit(10**9); agg = collections.defaultdict(collections.Counter)
for pak in sorted(os.listdir('data_extract')):
    m = f'data_extract/{pak}/_manifest.tsv'
    if not os.path.isfile(m): continue
    for row in csv.DictReader(open(m, encoding='utf-8', errors='replace', newline=''), delimiter='\t'):
        if row['overridden_by'] or not row['path']: continue
        q = row['path'].lstrip('\\').lower().split('\\')
        agg['\\'.join(q[:2]) if q[0] in ('spr', 'maps', 'script') else q[0]][pak] += 1
for cat in sorted(agg): print(cat, dict(agg[cat].most_common()))
```

## Quy trình trên máy mới

```sh
# 1. Giải nén codebase (zip không có node_modules, .git, public/assets/{char,npc,items,skill,maps})
unzip jx-system-online-src.zip && cd jx-system-online
npm install                                   # .npmrc đã bật legacy-peer-deps
cp apps/server/.env.example apps/server/.env  # cấu hình server (không vào git)

# 2. Giải nén PAK của client gốc (một lần, chạy trong jx-origin; gói nào cần xem mục "Gói PAK nào cần cho tool nào")
cd ../jx-origin && python3 tools/jxpak/jxpak.py all && cd ../jx-system-online

# 3. Dựng asset
npm run gen:assets -w @vltk/client
npm run gen:skills -w @vltk/client
npm run gen:maps   -w @vltk/client -- 37 140     # đủ để chơi thử; bỏ "37 140" để làm hết
npm run gen:ui     -w @vltk/client
npm run gen:sounds -w @vltk/client               # âm thanh + nhạc nền
npm run gen:gold   -w @vltk/client               # icon hoàng kim, bí kíp, Lệnh bài, Thổ Địa Phù (sau gen:assets)

# 4. (tuỳ chọn) quái cho bản đồ mới sinh: gen:spawns rồi gen:skills + gen:assets lần nữa

# 5. Chạy
npm run dev
```

Các file `*.gen.ts` đã nằm trong git và khớp với asset; chạy lại tool sẽ ghi đè bằng nội dung tương đương nếu `jx-origin`
là cùng bản mod.

### Báo thiếu là bình thường (dữ liệu gốc thiếu, đã kiểm 2026-11-13)

Các tool in số tham chiếu không tìm thấy. Đã tra cả theo tên lẫn mã băm đường dẫn PAK trong cả 28 gói và trong `jx-web-main`:
những file dưới đây **không có trong client**, bảng gốc trỏ tới file không được phát hành (engine gốc cũng bỏ qua). Tool không sai.

| Tool | Báo | Là gì |
| :--- | :--- | :--- |
| `gen:assets` | `missing references (≈4 700)` | ô bảng bộ phận nhân vật trỏ tới sprite tóc / vai / vũ khí / ngựa theo động tác không tồn tại |
| `gen:sounds` | `missing in the client (skipped): 121` | phần lớn `sound_e*_bat` / `sound_a*_bat`, vài tiếng chiêu (`护体寒冰`, `刀剑刺中声`, `补充\投石爆炸`), `Music501.mp3` |
| `gen:skills` | `missing art: 5` | `补充\born01`, `补充\BZ_?` (tên trong `missles.txt` đã hỏng), `天忍\mag_tr_09_偷天换日`, `昆仑\kl_17/18_魔法施放` |
| `gen:maps` | 299 bản đồ trong `maplist.ini`, catalog 297 | 356 Trường đấu (1), 357 Đơn đấu Bình nguyên hỏng từ dữ liệu gốc |

`gen:skills` tự tìm hình ở thư mục khác khi tên file là duy nhất dưới `spr/skill` (bảng trỏ sai thư mục: `补充\mag_npc_短毛` nằm ở `npc\`),
và in dòng `art found in another folder`.

## Nén codebase (bỏ phần tái sinh được)

```sh
cd ..   # thư mục cha của jx-system-online (chứa cả jx-origin); tên thư mục cha không quan trọng
zip -r jx-system-online-src.zip jx-system-online \
  -x 'jx-system-online/node_modules/*' 'jx-system-online/*/node_modules/*' 'jx-system-online/.git/*' \
     'jx-system-online/apps/client/public/assets/char/*' 'jx-system-online/apps/client/public/assets/npc/*' \
     'jx-system-online/apps/client/public/assets/items/*' 'jx-system-online/apps/client/public/assets/skill/*' \
     'jx-system-online/apps/client/public/assets/maps/*'
```

Giữ lại `music`, `portraits` và mọi `*.gen.ts`; file nén còn vài chục MB (gần hết là `music` 34 MB).

## Dung lượng tham khảo

| Thành phần | Dung lượng |
| :--- | :-: |
| `apps/client/public` (đủ khoảng 297 bản đồ) | khoảng 15 GB |
| `.git` | khoảng 8 MB (đo 2026-11-13) |
| `node_modules` (gốc) | 246 MB |
| File trong git trừ asset (mã, `*.gen.ts`, tài liệu, spawn) | khoảng 5,7 MB; mã viết tay ≈ 1 MB, `*.gen.ts` ≈ 2,4 MB |

### Ảnh động chọn / tạo nhân vật

`gen:ui` gọi `tools/gen-login-figures.ts`, tìm SPR bằng tên gốc và hash PAK:
`\spr\ui3\登入界面\选存档人物\角色_{金|木|水|火|土}_{男|女}_{0|1}.spr`.
Bộ gốc có 5 hệ × 2 giới tính, không có ảnh riêng từng phái. Màn chọn lấy hệ của phái (chưa vào phái thì lấy hệ nhân vật), màn tạo lấy hệ/giới đang chọn. Hậu tố 0 là tư thế đứng có màu, 1 là hoạt cảnh vào, 2 là bản xám. Xuất WebP lossless + metadata khung/thời gian; các frame dùng cùng vùng cắt để không rung. Thư mục asset vẫn không vào git.

Hành vi chọn (2026-11-13): chưa chọn = idle tĩnh tối màu; click/tap hoặc chọn bằng mũi tên = hoạt cảnh hậu tố 1 phát một lần rồi về idle, click lại phát lại. Hai tư thế dùng chung vùng cắt nhưng căn chân và tỷ lệ theo vùng idle để không nhảy vị trí/thu nhỏ khi đổi tư thế. Ảnh hoạt cảnh được giải mã trước khi phát; dùng đồng hồ requestAnimationFrame thay vòng lặp 1 ms. Header interval nhiều SPR bằng 1 (Mộc nam, Thủy nữ, Hỏa nam/nữ, Thổ nữ); chọn 80 ms/khung cho các file này, không khẳng định đó là tốc độ engine gốc. Các hoạt cảnh có interval 50/80/100/120 giữ giá trị nguồn. Idle không chạy vòng lặp.
