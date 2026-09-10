// 事件簿の挿絵一覧を game.js の LOCAL_EVENT_PIC に同期する。assets/event-ai/*.webp を足したら実行
const fs = require("node:fs"), path = require("node:path");
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "assets", "event-ai");
const ids = fs.readdirSync(dir).filter(f => /\.webp$/i.test(f)).map(f => path.basename(f, ".webp")).sort();
let g = fs.readFileSync(path.join(root, "game.js"), "utf8");
const rows = []; for(let i = 0; i < ids.length; i += 4) rows.push("  " + ids.slice(i, i + 4).map(x => JSON.stringify(x)).join(","));
const next = "const LOCAL_EVENT_PIC = new Set([\n" + rows.join(",\n") + "\n]);";
const re = /const LOCAL_EVENT_PIC = new Set\(\[[\s\S]*?\]\);/;
if(!re.test(g)) throw new Error("LOCAL_EVENT_PIC が見つからない");
g = g.replace(re, next);
fs.writeFileSync(path.join(root, "game.js"), g);
// 挿絵の無い事件を数える
const party = fs.readFileSync(path.join(root, "party.js"), "utf8");
const events = JSON.parse(party.match(/const\s+PARTY_LORE\s*=\s*(\[[\s\S]*\]);/)[1]);
const remote = new Set([...g.match(/const EVENT_PIC = new Set\(\[([\s\S]*?)\]\);/)[1].matchAll(/"([^"]+)"/g)].map(m => m[1]));
const local = new Set(ids);
const missing = events.filter(e => !remote.has(e.id) && !local.has(e.id));
console.log("local", ids.length, "remote", remote.size, "events", events.length, "missing", missing.length, missing.slice(0, 5).map(e => e.id).join(" "));
