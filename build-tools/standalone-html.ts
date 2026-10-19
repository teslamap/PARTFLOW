import {writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';
const names:Record<string,string>={customer:'მომხმარებელი',shop:'ავტომაღაზია',admin:'ადმინი',superadmin:'სუპერადმინი','mobile-customer':'მობილური მომხმარებელი'};
export function standaloneHTML():Plugin {
  let root='';
  return {name:'partflow-complete-html',enforce:'post',configResolved(c){root=c.root},
    configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url&&/^\/(customer|shop|admin|superadmin|mobile-customer|index)\.html(?:\?|$)/.test(req.url))req.url='/entries'+req.url;next();});},
    generateBundle(_options,bundle){
      const icon=readFileSync(resolve(root,'public/favicon.svg')).toString('base64');
      for(const [key,asset] of Object.entries(bundle)){
        if(asset.type!=='asset'||!key.endsWith('.html'))continue;
        const filename=key.split('/').pop()!,role=filename.replace('.html','');
        let html=String(asset.source);
        html=html.replace(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g,(_tag,url)=>{
          const chunk=bundle[url.replace(/^\//,'')];
          if(!chunk||chunk.type!=='chunk')throw Error('Missing application bundle: '+url);
          if(chunk.imports.length||chunk.dynamicImports.length)throw Error('Standalone HTML requires a single complete JavaScript bundle');
          return '<!-- Complete PARTFLOW application: React, Firebase SDK and panel behavior are embedded below. -->\n<script type="module">\n'+chunk.code.replace(/<\/script/gi,'<\\/script')+'\n</script>';
        });
        html=html.replace(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g,(_tag,url)=>{
          const css=bundle[url.replace(/^\//,'')];if(!css||css.type!=='asset')throw Error('Missing stylesheet');
          return '<!-- Complete panel stylesheet -->\n<style>\n'+String(css.source).replace(/<\/style/gi,'<\\/style')+'\n</style>';
        }).replace(/<link\b[^>]*href="\/favicon\.svg"[^>]*>/,'<link rel="icon" href="data:image/svg+xml;base64,'+icon+'">');
        if(names[role])html=html.replace('<div id="root"></div>',`<!-- Visible HTML interface while the embedded application initializes. -->
<div id="root">
  <main class="auth-shell" style="margin:0;width:100%">
    <section class="auth-card" aria-busy="true">
      <a class="auth-logo" href="customer.html">PART<span>FLOW</span></a>
      <div class="eyebrow">${names[role]} / FIREBASE</div>
      <h1>კეთილი იყოს შენი დაბრუნება</h1>
      <p class="muted">შედი ან დარეგისტრირდი და იპოვე სასურველი ავტონაწილი.</p>
      <button class="google-button" disabled>Google-ით შესვლა <span>G</span></button>
      <div class="auth-divider">ან ელფოსტით</div>
      <form class="auth-form">
        <label>ელფოსტა<input type="email" name="email" disabled></label>
        <label>პაროლი<input type="password" name="password" disabled></label>
        <button class="primary" disabled>იტვირთება...</button>
      </form>
      <nav class="auth-bottom">${Object.entries(names).map(([r,n])=>`<a href="${r}.html">${n}</a>`).join(' · ')}</nav>
      <noscript>PARTFLOW-ის გამოყენებისთვის ჩართე JavaScript.</noscript>
    </section>
  </main>
</div>`);
        delete bundle[key];
        this.emitFile({type:'asset',fileName:filename,source:html});
      }
    },
    writeBundle(options,bundle){for(const asset of Object.values(bundle)){if(asset.type==='asset'&&asset.fileName.endsWith('.html'))writeFileSync(resolve(root,asset.fileName),String(asset.source));}},
  };
}
