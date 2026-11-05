#!/usr/bin/env node
/*
 * AMAN.D — خادم ملفات ثابتة للنسخة المبنية فقط.
 * لا يحقن محاكاة ولا يتصل بخدمات خارجية. يتطلب وجود dist/ بعد البناء.
 */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, join, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const MIME = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8", ".webmanifest":"application/manifest+json; charset=utf-8",
  ".svg":"image/svg+xml", ".png":"image/png", ".ico":"image/x-icon", ".woff2":"font/woff2"
};

function parseArgs(args) {
  let port = Number(process.env.PORT || 8080), host = "127.0.0.1";
  for (let i=0;i<args.length;i++) {
    if (args[i]==="--port") port=Number(args[++i]);
    else if (args[i]==="--host") host=args[++i];
    else throw new Error("خيار غير معروف: " + args[i]);
  }
  if (!Number.isInteger(port) || port<0 || port>65535) throw new Error("رقم المنفذ غير صالح.");
  if (host!=="127.0.0.1") throw new Error("الخادم المحلي يستمع على 127.0.0.1 فقط.");
  return {port,host};
}

export function startServer({port=8080,host="127.0.0.1",root=DIST}={}) {
  if (host!=="127.0.0.1") return Promise.reject(new Error("الخادم المحلي يستمع على 127.0.0.1 فقط."));
  const base=resolve(root);
  const server=http.createServer(async (request,response)=>{
    const send=(status,body,type="text/plain; charset=utf-8")=>{
      response.writeHead(status,{"content-type":type,"cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"});
      response.end(body);
    };
    if (!["GET","HEAD"].includes(request.method||"")) return send(405,"الطريقة غير مسموحة");
    try {
      const url=new URL(request.url||"/","http://127.0.0.1");
      let pathname=decodeURIComponent(url.pathname);
      if (pathname.includes("\0")) return send(400,"طلب غير صالح");
      if (pathname==="/") pathname="/index.html";
      const file=resolve(join(base,pathname.replace(/^\/+/, "")));
      if (file!==base && !file.startsWith(base+sep)) return send(403,"ممنوع");
      let info=await stat(file).catch(()=>null);
      let actual=file;
      if (info?.isDirectory()) {
        if (!pathname.endsWith("/")) { response.writeHead(301,{location:pathname+"/"});return response.end(); }
        actual=join(file,"index.html");
        info=await stat(actual).catch(()=>null);
      }
      if (!info?.isFile()) return send(404,"غير موجود");
      const body=await readFile(actual);
      response.writeHead(200,{
        "content-type":MIME[extname(actual)]||"application/octet-stream",
        "cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"
      });
      if (request.method==="HEAD") return response.end();
      return response.end(body);
    } catch(error) { return send(400,"تعذر معالجة الطلب: "+error.message); }
  });
  return new Promise((resolveServer,reject)=>{
    server.once("error",reject);
    server.listen(port,host,()=>resolveServer({
      server,port:server.address().port,host,
      close:()=>new Promise(done=>server.close(done))
    }));
  });
}

const isMain=process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options=parseArgs(process.argv.slice(2));
    const {port,host}=await startServer(options);
    const base="http://"+host+":"+port;
    console.log("خادم AMAN.D الثابت يعمل من dist/.");
    console.log("واجهة العميل : "+base+"/client/");
    console.log("واجهة الإدارة: "+base+"/admin/");
    console.log("للإيقاف: Ctrl+C");
  } catch(error) {
    console.error("تعذر تشغيل AMAN.D: "+error.message);
    process.exitCode=1;
  }
}
