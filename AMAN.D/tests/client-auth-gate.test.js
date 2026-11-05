import test from "node:test";
import assert from "node:assert/strict";
import { readProjectFile } from "./helpers.mjs";

const app=readProjectFile("client/app.js");
const html=readProjectFile("client/index.html");

test("الشاشات العامة الوحيدة بلا جلسة هي التمهيد والدخول وإنشاء الحساب",()=>{
  assert.match(app,/PUBLIC_SCREENS\s*=\s*new Set\(\["boot",\s*"login",\s*"signup"\]\)/);
  assert.match(app,/!session\s*&&\s*!PUBLIC_SCREENS\.has\(name\)/);
});

test("أي استجابة auth_required خارج المصادقة تعيد المستخدم إلى الدخول",()=>{
  assert.match(app,/AUTH_EXEMPT\s*=\s*new Set\(\["getSession",\s*"signIn",\s*"signUp",\s*"signOut"\]\)/);
  assert.match(app,/result\.code\s*===\s*"auth_required"/);
  assert.match(app,/function sessionLost\(/);
});

test("تدفق الدخول وإنشاء الحساب متبادل ولا يتطلب جلسة لفتح النموذجين",()=>{
  for(const id of ["login-form","signup-form","login-to-signup","signup-to-login"])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(app,/svc\(\)\.signIn/);
  assert.match(app,/svc\(\)\.signUp/);
  assert.match(app,/navigate\("signup"\)/);
  assert.match(app,/navigate\("login"\)/);
});

test("استعادة الجلسة تبدأ من الخدمة المشتركة ولا تعرض الرئيسية قبل التحقق",()=>{
  assert.match(app,/svc\(\)\.getSession\(\)/);
  assert.match(app,/if\s*\(!session\)\s*\{\s*showLogin/);
  assert.match(app,/window\.AMANClientNavigation/);
});
