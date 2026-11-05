import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readProjectFile, projectPath, fileExists, stripComments, localHtmlReferences, staysInsideRoot } from "./helpers.mjs";
import { dirname, resolve } from "node:path";

const pages=["index.html","client/index.html","admin/index.html"];
const appScripts=[
  "client/app.js","admin/app.js","admin/requests.js","admin/numbers.js","admin/customers.js",
  "admin/tasks.js","admin/reports.js","admin/complaints.js","admin/messaging.js",
  "admin/companies.js","admin/catalog.js","admin/content-audit.js","admin/account.js"
];

test("صفحات AMAN.D لا تحتوي أي رابط للمحاكاة أو المشروع القديم",()=>{
  for(const path of pages){
    const source=stripComments(readProjectFile(path));
    assert.doesNotMatch(source,/AMAN\.C|AMAN\.B|__AMAN_SIMULATION__|simulation-adapter|local-preview/i,path);
  }
});

test("روابط HTML المحلية تبقى داخل AMAN.D وتشير إلى ملفات موجودة",()=>{
  for(const page of pages){
    for(const ref of localHtmlReferences(readProjectFile(page))){
      const clean=ref.split(/[?#]/,1)[0];
      if(!clean) continue;
      const resolved=resolve(dirname(projectPath(page)),clean);
      const relativePath=resolve(projectPath("."),resolved);
      assert.equal(staysInsideRoot(relativePath),true,page+" → "+ref);
      assert.equal(existsSync(relativePath),true,page+" → "+ref);
    }
  }
});

test("الواجهات لا تتعامل مباشرة مع مخزن الجلسات أو قواعد البيانات المحلية",()=>{
  for(const path of appScripts)
    assert.doesNotMatch(stripComments(readProjectFile(path)),/localStorage|sessionStorage|indexedDB/,path);
});

test("تحميل طبقة الخدمات المشتركة يسبق الواجهات في العميل والإدارة",()=>{
  for(const app of ["client","admin"]){
    const html=readProjectFile(app+"/index.html");
    const positions=[
      html.indexOf("../shared/runtime.js"),
      html.indexOf("supabase-js@2.104.0"),
      html.indexOf("../shared/config.js"),
      html.indexOf("../shared/supabase-adapter.js"),
      html.indexOf("./app.js")
    ];
    assert.ok(positions.every(position=>position>=0),app);
    assert.deepEqual(positions,[...positions].sort((a,b)=>a-b),app);
  }
});

test("طبقة الاتصال وحدها تملك مفاتيح تخزين جلسات Supabase",()=>{
  const adapter=readProjectFile("shared/supabase-adapter.js");
  assert.match(adapter,/storageKey\s*=\s*scope\s*=>\s*"aman_c_"\s*\+\s*scope\s*\+\s*"_auth"/);
  assert.match(adapter,/ADMIN_REMEMBER_KEY\s*=\s*"aman_c_admin_remember"/);
  assert.doesNotMatch(readProjectFile("client/app.js"),/localStorage|sessionStorage/);
  assert.doesNotMatch(readProjectFile("admin/app.js"),/localStorage|sessionStorage/);
});

test("أدوات التشغيل والبناء لا تحقن المحاكاة ولا تنسخ مجلدًا خارجيًا",()=>{
  const build=readProjectFile("scripts/build.mjs");
  const serve=readProjectFile("scripts/serve.mjs");
  assert.doesNotMatch(build,/simulation|AMAN\.C|AMAN\.B/i);
  assert.doesNotMatch(serve,/simulation|AMAN\.C|AMAN\.B/i);
  assert.match(build,/client.*admin.*shared.*styles/);
  assert.match(serve,/127\.0\.0\.1/);
});
