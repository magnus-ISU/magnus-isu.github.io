var ot=Object.defineProperty,at=Object.defineProperties;var lt=Object.getOwnPropertyDescriptors;var D=Object.getOwnPropertySymbols;var J=Object.prototype.hasOwnProperty,W=Object.prototype.propertyIsEnumerable;var x=(n,t,e)=>t in n?ot(n,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):n[t]=e,L=(n,t)=>{for(var e in t||(t={}))J.call(t,e)&&x(n,e,t[e]);if(D)for(var e of D(t))W.call(t,e)&&x(n,e,t[e]);return n},G=(n,t)=>at(n,lt(t));var X=(n,t)=>{var e={};for(var s in n)J.call(n,s)&&t.indexOf(s)<0&&(e[s]=n[s]);if(n!=null&&D)for(var s of D(n))t.indexOf(s)<0&&W.call(n,s)&&(e[s]=n[s]);return e};import{S as ct,i as ut,s as ft,e as ht,c as dt,a as _t,d as R,b as C,f as S,t as pt,g as gt,h as mt,j as O,k as bt,l as E,m as M,n as wt,o as P,p as H,q as B,r as j,u as k,v as T,w as I,x as b,y as vt,z as yt,A as Et,B as K,C as Y}from"./chunks/vendor-219f1c8b.js";function F(n){let t,e,s;const r=[n[2]||{}];var o=n[0][1];function i(a){let l={$$slots:{default:[kt]},$$scope:{ctx:a}};for(let c=0;c<r.length;c+=1)l=K(l,r[c]);return{props:l}}return o&&(t=new o(i(n))),{c(){t&&O(t.$$.fragment),e=E()},l(a){t&&M(t.$$.fragment,a),e=E()},m(a,l){t&&P(t,a,l),S(a,e,l),s=!0},p(a,l){const c=l&4?H(r,[B(a[2]||{})]):{};if(l&521&&(c.$$scope={dirty:l,ctx:a}),o!==(o=a[0][1])){if(t){j();const u=t;k(u.$$.fragment,1,0,()=>{T(u,1)}),I()}o?(t=new o(i(a)),O(t.$$.fragment),b(t.$$.fragment,1),P(t,e.parentNode,e)):t=null}else o&&t.$set(c)},i(a){s||(t&&b(t.$$.fragment,a),s=!0)},o(a){t&&k(t.$$.fragment,a),s=!1},d(a){a&&R(e),t&&T(t,a)}}}function Q(n){let t,e,s;const r=[n[3]||{}];var o=n[0][2];function i(a){let l={};for(let c=0;c<r.length;c+=1)l=K(l,r[c]);return{props:l}}return o&&(t=new o(i())),{c(){t&&O(t.$$.fragment),e=E()},l(a){t&&M(t.$$.fragment,a),e=E()},m(a,l){t&&P(t,a,l),S(a,e,l),s=!0},p(a,l){const c=l&8?H(r,[B(a[3]||{})]):{};if(o!==(o=a[0][2])){if(t){j();const u=t;k(u.$$.fragment,1,0,()=>{T(u,1)}),I()}o?(t=new o(i()),O(t.$$.fragment),b(t.$$.fragment,1),P(t,e.parentNode,e)):t=null}else o&&t.$set(c)},i(a){s||(t&&b(t.$$.fragment,a),s=!0)},o(a){t&&k(t.$$.fragment,a),s=!1},d(a){a&&R(e),t&&T(t,a)}}}function kt(n){let t,e,s=n[0][2]&&Q(n);return{c(){s&&s.c(),t=E()},l(r){s&&s.l(r),t=E()},m(r,o){s&&s.m(r,o),S(r,t,o),e=!0},p(r,o){r[0][2]?s?(s.p(r,o),o&1&&b(s,1)):(s=Q(r),s.c(),b(s,1),s.m(t.parentNode,t)):s&&(j(),k(s,1,1,()=>{s=null}),I())},i(r){e||(b(s),e=!0)},o(r){k(s),e=!1},d(r){s&&s.d(r),r&&R(t)}}}function Rt(n){let t,e,s=n[0][1]&&F(n);return{c(){s&&s.c(),t=E()},l(r){s&&s.l(r),t=E()},m(r,o){s&&s.m(r,o),S(r,t,o),e=!0},p(r,o){r[0][1]?s?(s.p(r,o),o&1&&b(s,1)):(s=F(r),s.c(),b(s,1),s.m(t.parentNode,t)):s&&(j(),k(s,1,1,()=>{s=null}),I())},i(r){e||(b(s),e=!0)},o(r){k(s),e=!1},d(r){s&&s.d(r),r&&R(t)}}}function Z(n){let t,e=n[5]&&tt(n);return{c(){t=ht("div"),e&&e.c(),this.h()},l(s){t=dt(s,"DIV",{id:!0,"aria-live":!0,"aria-atomic":!0,class:!0});var r=_t(t);e&&e.l(r),r.forEach(R),this.h()},h(){C(t,"id","svelte-announcer"),C(t,"aria-live","assertive"),C(t,"aria-atomic","true"),C(t,"class","svelte-1j55zn5")},m(s,r){S(s,t,r),e&&e.m(t,null)},p(s,r){s[5]?e?e.p(s,r):(e=tt(s),e.c(),e.m(t,null)):e&&(e.d(1),e=null)},d(s){s&&R(t),e&&e.d()}}}function tt(n){let t;return{c(){t=pt(n[6])},l(e){t=gt(e,n[6])},m(e,s){S(e,t,s)},p(e,s){s&64&&mt(t,e[6])},d(e){e&&R(t)}}}function $t(n){let t,e,s,r;const o=[n[1]||{}];var i=n[0][0];function a(c){let u={$$slots:{default:[Rt]},$$scope:{ctx:c}};for(let h=0;h<o.length;h+=1)u=K(u,o[h]);return{props:u}}i&&(t=new i(a(n)));let l=n[4]&&Z(n);return{c(){t&&O(t.$$.fragment),e=bt(),l&&l.c(),s=E()},l(c){t&&M(t.$$.fragment,c),e=wt(c),l&&l.l(c),s=E()},m(c,u){t&&P(t,c,u),S(c,e,u),l&&l.m(c,u),S(c,s,u),r=!0},p(c,[u]){const h=u&2?H(o,[B(c[1]||{})]):{};if(u&525&&(h.$$scope={dirty:u,ctx:c}),i!==(i=c[0][0])){if(t){j();const f=t;k(f.$$.fragment,1,0,()=>{T(f,1)}),I()}i?(t=new i(a(c)),O(t.$$.fragment),b(t.$$.fragment,1),P(t,e.parentNode,e)):t=null}else i&&t.$set(h);c[4]?l?l.p(c,u):(l=Z(c),l.c(),l.m(s.parentNode,s)):l&&(l.d(1),l=null)},i(c){r||(t&&b(t.$$.fragment,c),r=!0)},o(c){t&&k(t.$$.fragment,c),r=!1},d(c){t&&T(t,c),c&&R(e),l&&l.d(c),c&&R(s)}}}function Lt(n,t,e){let{stores:s}=t,{page:r}=t,{components:o}=t,{props_0:i=null}=t,{props_1:a=null}=t,{props_2:l=null}=t;vt("__svelte__",s),yt(s.page.notify);let c=!1,u=!1,h=null;return Et(()=>{const f=s.page.subscribe(()=>{c&&(e(5,u=!0),e(6,h=document.title||"untitled page"))});return e(4,c=!0),f}),n.$$set=f=>{"stores"in f&&e(7,s=f.stores),"page"in f&&e(8,r=f.page),"components"in f&&e(0,o=f.components),"props_0"in f&&e(1,i=f.props_0),"props_1"in f&&e(2,a=f.props_1),"props_2"in f&&e(3,l=f.props_2)},n.$$.update=()=>{n.$$.dirty&384&&s.page.set(r)},[o,i,a,l,c,u,h,s,r]}class St extends ct{constructor(t){super();ut(this,t,Lt,$t,ft,{stores:7,page:8,components:0,props_0:1,props_1:2,props_2:3})}}const qt="modulepreload",et={},At="/_app/",v=function(t,e){return!e||e.length===0?t():Promise.all(e.map(s=>{if(s=`${At}${s}`,s in et)return;et[s]=!0;const r=s.endsWith(".css"),o=r?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${s}"]${o}`))return;const i=document.createElement("link");if(i.rel=r?"stylesheet":qt,r||(i.as="script",i.crossOrigin=""),i.href=s,document.head.appendChild(i),r)return new Promise((a,l)=>{i.addEventListener("load",a),i.addEventListener("error",l)})})).then(()=>t())},d=[()=>v(()=>import("./pages/__layout.svelte-77c65cf5.js"),["pages/__layout.svelte-77c65cf5.js","assets/pages/__layout.svelte-d1017ca8.css","chunks/vendor-219f1c8b.js"]),()=>v(()=>import("./error.svelte-e92c004a.js"),["error.svelte-e92c004a.js","chunks/vendor-219f1c8b.js"]),()=>v(()=>import("./pages/index.svelte-664d2e1e.js"),["pages/index.svelte-664d2e1e.js","chunks/vendor-219f1c8b.js"]),()=>v(()=>import("./pages/obelisk/index.svelte-11512eb7.js"),["pages/obelisk/index.svelte-11512eb7.js","assets/pages/obelisk/index.svelte-1cfc700c.css","chunks/vendor-219f1c8b.js","pages/obelisk/city.svelte-d1816c91.js","assets/pages/obelisk/city.svelte-f15bec2f.css"]),()=>v(()=>import("./pages/obelisk/rules.md-7db36dd6.js"),["pages/obelisk/rules.md-7db36dd6.js","chunks/vendor-219f1c8b.js"]),()=>v(()=>import("./pages/obelisk/city.svelte-d1816c91.js"),["pages/obelisk/city.svelte-d1816c91.js","assets/pages/obelisk/city.svelte-f15bec2f.css","chunks/vendor-219f1c8b.js"]),()=>v(()=>import("./pages/obelisk/lore.md-6a38e6eb.js"),["pages/obelisk/lore.md-6a38e6eb.js","chunks/vendor-219f1c8b.js"]),()=>v(()=>import("./pages/about/index.svelte-3ddfdefe.js"),["pages/about/index.svelte-3ddfdefe.js","assets/pages/about/index.svelte-1ed8a41d.css","chunks/vendor-219f1c8b.js","pages/about/README.md-16be903a.js"]),()=>v(()=>import("./pages/about/README.md-16be903a.js"),["pages/about/README.md-16be903a.js","chunks/vendor-219f1c8b.js"]),()=>v(()=>import("./pages/blog.svelte-f6c8df7b.js"),["pages/blog.svelte-f6c8df7b.js","chunks/vendor-219f1c8b.js"]),()=>v(()=>import("./pages/egg.svelte-8bb6342f.js"),["pages/egg.svelte-8bb6342f.js","chunks/vendor-219f1c8b.js"])],Ot=[[/^\/$/,[d[0],d[2]],[d[1]]],[/^\/obelisk\/?$/,[d[0],d[3]],[d[1]]],[/^\/obelisk\/rules\/?$/,[d[0],d[4]],[d[1]]],[/^\/obelisk\/city\/?$/,[d[0],d[5]],[d[1]]],[/^\/obelisk\/lore\/?$/,[d[0],d[6]],[d[1]]],[/^\/about\/?$/,[d[0],d[7]],[d[1]]],[/^\/about\/README\/?$/,[d[0],d[8]],[d[1]]],[/^\/blog\/?$/,[d[0],d[9]],[d[1]]],[/^\/egg\/?$/,[d[0],d[10]],[d[1]]]],Pt=[d[0](),d[1]()];function Tt(n){let t=n.baseURI;if(!t){const e=n.getElementsByTagName("base");t=e.length?e[0].href:n.URL}return t}let st="";function Ut(n){st=n.base,n.assets}function z(){return{x:pageXOffset,y:pageYOffset}}function rt(n){return n.composedPath().find(e=>e instanceof Node&&e.nodeName.toUpperCase()==="A")}function it(n){return n instanceof SVGAElement?new URL(n.href.baseVal,document.baseURI):new URL(n.href)}class jt{constructor({base:t,routes:e,trailing_slash:s,renderer:r}){this.base=t,this.routes=e,this.trailing_slash=s,this.navigating=0,this.renderer=r,r.router=this,this.enabled=!0,document.body.setAttribute("tabindex","-1"),history.replaceState(history.state||{},"",location.href)}init_listeners(){"scrollRestoration"in history&&(history.scrollRestoration="manual"),addEventListener("beforeunload",()=>{history.scrollRestoration="auto"}),addEventListener("load",()=>{history.scrollRestoration="manual"});let t;addEventListener("scroll",()=>{clearTimeout(t),t=setTimeout(()=>{const o=G(L({},history.state||{}),{"sveltekit:scroll":z()});history.replaceState(o,document.title,window.location.href)},200)});const e=o=>{const i=rt(o);i&&i.href&&i.hasAttribute("sveltekit:prefetch")&&this.prefetch(it(i))};let s;const r=o=>{clearTimeout(s),s=setTimeout(()=>{var i;(i=o.target)==null||i.dispatchEvent(new CustomEvent("sveltekit:trigger_prefetch",{bubbles:!0}))},20)};addEventListener("touchstart",e),addEventListener("mousemove",r),addEventListener("sveltekit:trigger_prefetch",e),addEventListener("click",o=>{if(!this.enabled||o.button||o.which!==1||o.metaKey||o.ctrlKey||o.shiftKey||o.altKey||o.defaultPrevented)return;const i=rt(o);if(!i||!i.href)return;const a=it(i),l=a.toString();if(l===location.href){location.hash||o.preventDefault();return}const c=(i.getAttribute("rel")||"").split(/\s+/);if(i.hasAttribute("download")||c&&c.includes("external")||(i instanceof SVGAElement?i.target.baseVal:i.target)||!this.owns(a))return;const u=i.hasAttribute("sveltekit:noscroll"),h=l.indexOf("#"),f=location.href.indexOf("#"),y=h>=0?l.substring(0,h):l,g=f>=0?location.href.substring(0,f):location.href;history.pushState({},"",a.href),y===g&&window.dispatchEvent(new HashChangeEvent("hashchange")),this._navigate(a,u?z():null,!1,[],a.hash),o.preventDefault()}),addEventListener("popstate",o=>{if(o.state&&this.enabled){const i=new URL(location.href);this._navigate(i,o.state["sveltekit:scroll"],!1,[])}})}owns(t){return t.origin===location.origin&&t.pathname.startsWith(this.base)}parse(t){if(this.owns(t)){const e=t.pathname.slice(this.base.length)||"/",s=decodeURI(e),r=this.routes.filter(([a])=>a.test(s)),o=new URLSearchParams(t.search);return{id:`${e}?${o}`,routes:r,path:e,decoded_path:s,query:o}}}async goto(t,{noscroll:e=!1,replaceState:s=!1,keepfocus:r=!1,state:o={}}={},i){const a=new URL(t,Tt(document));return this.enabled&&this.owns(a)?(history[s?"replaceState":"pushState"](o,"",t),this._navigate(a,e?z():null,r,i,a.hash)):(location.href=a.href,new Promise(()=>{}))}enable(){this.enabled=!0}disable(){this.enabled=!1}async prefetch(t){const e=this.parse(t);if(!e)throw new Error("Attempted to prefetch a URL that does not belong to this app");return this.renderer.load(e)}async _navigate(t,e,s,r,o){const i=this.parse(t);if(!i)throw new Error("Attempted to navigate to a URL that does not belong to this app");if(this.navigating||dispatchEvent(new CustomEvent("sveltekit:navigation-start")),this.navigating++,i.path!=="/"){const a=i.path.endsWith("/");(a&&this.trailing_slash==="never"||!a&&this.trailing_slash==="always"&&!(i.path.split("/").pop()||"").includes("."))&&(i.path=a?i.path.slice(0,-1):i.path+"/",history.replaceState({},"",`${this.base}${i.path}${location.search}`))}await this.renderer.handle_navigation(i,r,!1,{hash:o,scroll:e,keepfocus:s}),this.navigating--,this.navigating||dispatchEvent(new CustomEvent("sveltekit:navigation-end"))}}function nt(n){return n instanceof Error||n&&n.name&&n.message?n:new Error(JSON.stringify(n))}function It(n){let t=5381,e=n.length;if(typeof n=="string")for(;e;)t=t*33^n.charCodeAt(--e);else for(;e;)t=t*33^n[--e];return(t>>>0).toString(36)}function Vt(n){const t=n.status&&n.status>=400&&n.status<=599&&!n.redirect;if(n.error||t){const e=n.status;if(!n.error&&t)return{status:e||500,error:new Error};const s=typeof n.error=="string"?new Error(n.error):n.error;return s instanceof Error?!e||e<400||e>599?(console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500'),{status:500,error:s}):{status:e,error:s}:{status:500,error:new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof s}"`)}}if(n.redirect){if(!n.status||Math.floor(n.status/100)!==3)return{status:500,error:new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')};if(typeof n.redirect!="string")return{status:500,error:new Error('"redirect" property returned from load() must be a string')}}if(n.context)throw new Error('You are returning "context" from a load function. "context" was renamed to "stuff", please adjust your code accordingly.');return n}function Dt(n){const t=Y(n);let e=!0;function s(){e=!0,t.update(i=>i)}function r(i){e=!1,t.set(i)}function o(i){let a;return t.subscribe(l=>{(a===void 0||e&&l!==a)&&i(a=l)})}return{notify:s,set:r,subscribe:o}}function Ct(n,t){const e=typeof n=="string"?n:n.url;let s=`script[data-type="svelte-data"][data-url=${JSON.stringify(e)}]`;t&&typeof t.body=="string"&&(s+=`[data-body="${It(t.body)}"]`);const r=document.querySelector(s);if(r&&r.textContent){const o=JSON.parse(r.textContent),{body:i}=o,a=X(o,["body"]);return Promise.resolve(new Response(i,a))}return fetch(n,t)}class Nt{constructor({Root:t,fallback:e,target:s,session:r,host:o}){this.Root=t,this.fallback=e,this.host=o,this.router,this.target=s,this.started=!1,this.session_id=1,this.invalid=new Set,this.invalidating=null,this.current={page:null,session_id:0,branch:[]},this.cache=new Map,this.loading={id:null,promise:null},this.stores={page:Dt({}),navigating:Y(null),session:Y(r)},this.$session=null,this.root=null;let i=!1;this.stores.session.subscribe(async a=>{if(this.$session=a,!i||!this.router)return;this.session_id+=1;const l=this.router.parse(new URL(location.href));l&&this.update(l,[],!0)}),i=!0}async start({status:t,error:e,nodes:s,page:r}){const o=[];let i={},a,l;try{for(let c=0;c<s.length;c+=1){const u=c===s.length-1,h=await this._load_node({module:await s[c],page:r,stuff:i,status:u?t:void 0,error:u?e:void 0});if(o.push(h),h&&h.loaded)if(h.loaded.error){if(e)throw h.loaded.error;l={status:h.loaded.status,error:h.loaded.error,path:r.path,query:r.query}}else h.loaded.stuff&&(i=L(L({},i),h.loaded.stuff))}a=l?await this._load_error(l):await this._get_navigation_result_from_branch({page:r,branch:o})}catch(c){if(e)throw c;a=await this._load_error({status:500,error:nt(c),path:r.path,query:r.query})}if(a.redirect){location.href=new URL(a.redirect,location.href).href;return}this._init(a)}async handle_navigation(t,e,s,r){this.started&&this.stores.navigating.set({from:{path:this.current.page.path,query:this.current.page.query},to:{path:t.path,query:t.query}}),await this.update(t,e,s,r)}async update(t,e,s,r){var l;const o=this.token={};let i=await this._get_navigation_result(t,s);if(o!==this.token)return;if(this.invalid.clear(),i.redirect)if(e.length>10||e.includes(t.path))i=await this._load_error({status:500,error:new Error("Redirect loop"),path:t.path,query:t.query});else{this.router?this.router.goto(i.redirect,{replaceState:!0},[...e,t.path]):location.href=new URL(i.redirect,location.href).href;return}if(this.started?(this.current=i.state,this.root.$set(i.props),this.stores.navigating.set(null)):this._init(i),r){const{hash:c,scroll:u,keepfocus:h}=r;h||((l=getSelection())==null||l.removeAllRanges(),document.body.focus());const f=Math.round(pageYOffset),y=document.documentElement.scrollHeight-innerHeight;await 0;const g=Math.round(pageYOffset),$=document.documentElement.scrollHeight-innerHeight;if(g===Math.min(f,$)||y-f==$-g){const q=c&&document.getElementById(c.slice(1));u?scrollTo(u.x,u.y):q?q.scrollIntoView():scrollTo(0,0)}}else await 0;if(this.loading.promise=null,this.loading.id=null,!this.router)return;const a=i.state.branch[i.state.branch.length-1];a&&a.module.router===!1?this.router.disable():this.router.enable()}load(t){return this.loading.promise=this._get_navigation_result(t,!1),this.loading.id=t.id,this.loading.promise}invalidate(t){return this.invalid.add(t),this.invalidating||(this.invalidating=Promise.resolve().then(async()=>{const e=this.router&&this.router.parse(new URL(location.href));e&&await this.update(e,[],!0),this.invalidating=null})),this.invalidating}_init(t){this.current=t.state;const e=document.querySelector("style[data-svelte]");e&&e.remove(),this.root=new this.Root({target:this.target,props:L({stores:this.stores},t.props),hydrate:!0}),this.started=!0}async _get_navigation_result(t,e){if(this.loading.id===t.id&&this.loading.promise)return this.loading.promise;for(let s=0;s<t.routes.length;s+=1){const r=t.routes[s];let o=s+1;for(;o<t.routes.length;){const a=t.routes[o];if(a[0].toString()===r[0].toString())a[1].forEach(l=>l()),o+=1;else break}const i=await this._load({route:r,info:t},e);if(i)return i}return await this._load_error({status:404,error:new Error(`Not found: ${t.path}`),path:t.path,query:t.query})}async _get_navigation_result_from_branch({page:t,branch:e}){const s=e.filter(Boolean),r=s.find(l=>l.loaded&&l.loaded.redirect),o={redirect:r&&r.loaded?r.loaded.redirect:void 0,state:{page:t,branch:e,session_id:this.session_id},props:{components:s.map(l=>l.module.default)}};for(let l=0;l<s.length;l+=1){const c=s[l].loaded;o.props[`props_${l}`]=c?await c.props:null}(!this.current.page||t.path!==this.current.page.path||t.query.toString()!==this.current.page.query.toString())&&(o.props.page=t);const i=s[s.length-1],a=i.loaded&&i.loaded.maxage;if(a){const l=`${t.path}?${t.query}`;let c=!1;const u=()=>{this.cache.get(l)===o&&this.cache.delete(l),f(),clearTimeout(h)},h=setTimeout(u,a*1e3),f=this.stores.session.subscribe(()=>{c&&u()});c=!0,this.cache.set(l,o)}return o}async _load_node({status:t,error:e,module:s,page:r,stuff:o}){const i={module:s,uses:{params:new Set,path:!1,query:!1,session:!1,stuff:!1,dependencies:[]},loaded:null,stuff:o},a={};for(const c in r.params)Object.defineProperty(a,c,{get(){return i.uses.params.add(c),r.params[c]},enumerable:!0});const l=this.$session;if(s.load){const{started:c}=this,u={page:{host:r.host,params:a,get path(){return i.uses.path=!0,r.path},get query(){return i.uses.query=!0,r.query}},get session(){return i.uses.session=!0,l},get stuff(){return i.uses.stuff=!0,L({},o)},fetch(f,y){const g=typeof f=="string"?f:f.url,{href:$}=new URL(g,new URL(r.path,document.baseURI));return i.uses.dependencies.push($),c?fetch(f,y):Ct(f,y)}};e&&(u.status=t,u.error=e);const h=await s.load.call(null,u);if(!h)return;i.loaded=Vt(h),i.loaded.stuff&&(i.stuff=i.loaded.stuff)}return i}async _load({route:t,info:{path:e,decoded_path:s,query:r}},o){const i=`${s}?${r}`;if(!o){const _=this.cache.get(i);if(_)return _}const[a,l,c,u]=t,h=u?u(a.exec(s)):{},f=this.current.page&&{path:e!==this.current.page.path,params:Object.keys(h).filter(_=>this.current.page.params[_]!==h[_]),query:r.toString()!==this.current.page.query.toString(),session:this.session_id!==this.current.session_id},y={host:this.host,path:e,query:r,params:h};let g=[],$={},N=!1,q=200,U;l.forEach(_=>_());t:for(let _=0;_<l.length;_+=1){let p;try{if(!l[_])continue;const w=await l[_](),m=this.current.branch[_];if(!m||w!==m.module||f.path&&m.uses.path||f.params.some(A=>m.uses.params.has(A))||f.query&&m.uses.query||f.session&&m.uses.session||m.uses.dependencies.some(A=>this.invalid.has(A))||N&&m.uses.stuff){p=await this._load_node({module:w,page:y,stuff:$});const A=_===l.length-1;if(p&&p.loaded){if(p.loaded.error&&(q=p.loaded.status,U=p.loaded.error),p.loaded.redirect)return{redirect:p.loaded.redirect,props:{},state:this.current};p.loaded.stuff&&(N=!0)}else if(A&&w.load)return}else p=m}catch(w){q=500,U=nt(w)}if(U){for(;_--;)if(c[_]){let w,m,V=_;for(;!(m=g[V]);)V-=1;try{if(w=await this._load_node({status:q,error:U,module:await c[_](),page:y,stuff:m.stuff}),w&&w.loaded&&w.loaded.error)continue;g=g.slice(0,V+1).concat(w);break t}catch{continue}}return await this._load_error({status:q,error:U,path:e,query:r})}else p&&p.loaded&&p.loaded.stuff&&($=L(L({},$),p.loaded.stuff)),g.push(p)}return await this._get_navigation_result_from_branch({page:y,branch:g})}async _load_error({status:t,error:e,path:s,query:r}){const o={host:this.host,path:s,query:r,params:{}},i=await this._load_node({module:await this.fallback[0],page:o,stuff:{}}),a=[i,await this._load_node({status:t,error:e,module:await this.fallback[1],page:o,stuff:i&&i.loaded&&i.loaded.stuff||{}})];return await this._get_navigation_result_from_branch({page:o,branch:a})}}async function Bt({paths:n,target:t,session:e,host:s,route:r,spa:o,trailing_slash:i,hydrate:a}){const l=new Nt({Root:St,fallback:Pt,target:t,session:e,host:s}),c=r?new jt({base:n.base,routes:Ot,trailing_slash:i,renderer:l}):null;Ut(n),a&&await l.start(a),c&&(o&&c.goto(location.href,{replaceState:!0},[]),c.init_listeners()),dispatchEvent(new CustomEvent("sveltekit:start"))}export{Bt as start};
