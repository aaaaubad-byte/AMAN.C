import test from "node:test";
import assert from "node:assert/strict";
import { readProjectFile, fileExists } from "./helpers.mjs";

// P-01 binary icons are deferred by instruction; only the documented PNG names are exempt.
const deferredIconPath = path => /^(?:client|admin)\\/icons\\/(?:icon-192|icon-512|icon-maskable-512|apple-touch-icon)\\.png$/.test(path);

for(const app of ["client","admin"]){
  test(app+": بيان PWA عربي باتجاه RTL",()=>{
    const manifest=JSON.parse(readProjectFile(app+"/manifest.webmanifest"));
    assert.equal(manifest.lang,"ar");
    assert.equal(manifest.dir,"rtl");
    assert.equal(manifest.display,"standalone");
    assert.ok(manifest.name);
    assert.ok(manifest.short_name);
    assert.ok(manifest.start_url);
    assert.ok(manifest.scope);
    assert.ok(Array.isArray(manifest.icons));
    for(const icon of manifest.icons) {
      const path=app+"/"+icon.src;
      assert.equal(fileExists(path) || deferredIconPath(path),true,icon.src);
    }
  });

  test(app+": الصفحة تربط البيان وأيقونة الهاتف وملف PWA",()=>{
    const html=readProjectFile(app+"/index.html");
    assert.match(html,/rel="manifest" href="\.\/manifest\.webmanifest"/);
    assert.match(html,/rel="apple-touch-icon"/);
    assert.match(html,/src="\.\/pwa\.js"/);
  });

  test(app+": عامل الخدمة لا يخزن استجابات خاصة أو طلبات معتمدة",()=>{
    const sw=readProjectFile(app+"/sw.js");
    assert.match(sw,/__BUILD_ID__/);
    assert.match(sw,/authorization/);
    assert.match(sw,/PRIVATE_HEADERS/);
    assert.match(sw,/set-cookie/);
    assert.match(sw,/vary/);
    assert.match(sw,/APP_STATIC/);
    assert.match(sw,/SHARED_ALLOWED/);
  });
}

test("أداة البناء تختم عاملي الخدمة ولا تنشئ وضع معاينة أو محاكاة",()=>{
  const build=readProjectFile("scripts/build.mjs");
  assert.match(build,/__BUILD_ID__/);
  assert.match(build,/stampWorkers/);
  assert.match(build,/dist/);
  assert.doesNotMatch(build,/simulation-adapter|__AMAN_SIMULATION__/);
});

test("الخادم لا يخدم إلا مجلد dist المحلي ولا يحقن سكربتات",()=>{
  const serve=readProjectFile("scripts/serve.mjs");
  assert.match(serve,/127\.0\.0\.1/);
  assert.match(serve,/dist/);
  assert.doesNotMatch(serve,/simulation-adapter|__AMAN_SIMULATION__/);
});
