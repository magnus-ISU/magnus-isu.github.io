import{S as Ie,i as De,s as Oe,e as g,t as D,c as b,a as I,g as O,d as u,f as J,J as c,h as j,G as fe,b as P,Y as oe,Z as F,W as ie,l as ce,T as re,_ as _e,k as W,n as B,K as he,$ as ue}from"../../chunks/vendor-219f1c8b.js";function de(i,e,l){const a=i.slice();return a[13]=e[l],a}function ve(i,e,l){const a=i.slice();return a[16]=e[l],a[18]=l,a}function me(i){let e,l=i[16]+"",a,n;return{c(){e=g("option"),a=D(l),this.h()},l(t){e=b(t,"OPTION",{});var s=I(e);a=O(s,l),s.forEach(u),this.h()},h(){e.__value=n=i[18],e.value=e.__value},m(t,s){J(t,e,s),c(e,a)},p(t,s){s&512&&l!==(l=t[16]+"")&&j(a,l)},d(t){t&&u(e)}}}function ke(i){let e,l,a,n=Object.entries(i[8]),t=[];for(let s=0;s<n.length;s+=1)t[s]=be(de(i,n,s));return{c(){e=g("select");for(let s=0;s<t.length;s+=1)t[s].c();this.h()},l(s){e=b(s,"SELECT",{style:!0,class:!0});var k=I(e);for(let o=0;o<t.length;o+=1)t[o].l(k);k.forEach(u),this.h()},h(){fe(e,"float","right"),P(e,"class","svelte-18kfhrm"),i[1]===void 0&&oe(()=>i[11].call(e))},m(s,k){J(s,e,k);for(let o=0;o<t.length;o+=1)t[o].m(e,null);F(e,i[1]),l||(a=ie(e,"change",i[11]),l=!0)},p(s,k){if(k&260){n=Object.entries(s[8]);let o;for(o=0;o<n.length;o+=1){const E=de(s,n,o);t[o]?t[o].p(E,k):(t[o]=be(E),t[o].c(),t[o].m(e,null))}for(;o<t.length;o+=1)t[o].d(1);t.length=n.length}k&258&&F(e,s[1])},d(s){s&&u(e),re(t,s),l=!1,a()}}}function ge(i){let e,l=i[13][0]+"",a,n;return{c(){e=g("option"),a=D(l),this.h()},l(t){e=b(t,"OPTION",{});var s=I(e);a=O(s,l),s.forEach(u),this.h()},h(){e.__value=n=i[13][0],e.value=e.__value},m(t,s){J(t,e,s),c(e,a)},p(t,s){s&256&&l!==(l=t[13][0]+"")&&j(a,l),s&256&&n!==(n=t[13][0])&&(e.__value=n,e.value=e.__value)},d(t){t&&u(e)}}}function be(i){let e,l=i[13][0]!=i[2]&&ge(i);return{c(){l&&l.c(),e=ce()},l(a){l&&l.l(a),e=ce()},m(a,n){l&&l.m(a,n),J(a,e,n)},p(a,n){a[13][0]!=a[2]?l?l.p(a,n):(l=ge(a),l.c(),l.m(e.parentNode,e)):l&&(l.d(1),l=null)},d(a){l&&l.d(a),a&&u(e)}}}function Ee(i){let e,l,a;return{c(){e=g("input"),this.h()},l(n){e=b(n,"INPUT",{style:!0,class:!0}),this.h()},h(){fe(e,"float","right"),P(e,"class","svelte-18kfhrm")},m(n,t){J(n,e,t),_e(e,i[1]),l||(a=ie(e,"input",i[12]),l=!0)},p(n,t){t&258&&e.value!==n[1]&&_e(e,n[1])},d(n){n&&u(e),l=!1,a()}}}function Ve(i){let e,l,a,n,t,s,k,o,E,w,C,L,K,N,U,r,M,q,Q,Z,R,V,S,X,z,y,Y,A,p,se,G=i[9],d=[];for(let f=0;f<G.length;f+=1)d[f]=me(ve(i,G,f));let v=i[0]===6&&ke(i),m=i[0]===7&&Ee(i);return{c(){e=g("div"),l=g("h1"),a=D(i[2]),n=W(),t=g("div"),s=g("div"),k=D("Obelisk: "),o=D(i[3]),E=W(),w=g("div"),C=D("Walls: "),L=D(i[4]),K=W(),N=g("div"),U=D("Barracks: "),r=D(i[5]),M=W(),q=g("div"),Q=D("Soldiers: "),Z=D(i[6]),R=W(),V=g("div"),S=g("select");for(let f=0;f<d.length;f+=1)d[f].c();X=W(),v&&v.c(),z=W(),m&&m.c(),y=W(),Y=g("div"),A=D(i[7]),this.h()},l(f){e=b(f,"DIV",{id:!0,class:!0});var _=I(e);l=b(_,"H1",{class:!0});var h=I(l);a=O(h,i[2]),h.forEach(u),n=B(_),t=b(_,"DIV",{id:!0,class:!0});var T=I(t);s=b(T,"DIV",{});var x=I(s);k=O(x,"Obelisk: "),o=O(x,i[3]),x.forEach(u),E=B(T),w=b(T,"DIV",{});var $=I(w);C=O($,"Walls: "),L=O($,i[4]),$.forEach(u),K=B(T),N=b(T,"DIV",{});var ee=I(N);U=O(ee,"Barracks: "),r=O(ee,i[5]),ee.forEach(u),M=B(T),q=b(T,"DIV",{});var le=I(q);Q=O(le,"Soldiers: "),Z=O(le,i[6]),le.forEach(u),T.forEach(u),R=B(_),V=b(_,"DIV",{});var H=I(V);S=b(H,"SELECT",{class:!0});var ae=I(S);for(let te=0;te<d.length;te+=1)d[te].l(ae);ae.forEach(u),X=B(H),v&&v.l(H),z=B(H),m&&m.l(H),H.forEach(u),y=B(_),Y=b(_,"DIV",{});var ne=I(Y);A=O(ne,i[7]),ne.forEach(u),_.forEach(u),this.h()},h(){P(l,"class","svelte-18kfhrm"),P(t,"id","resources"),P(t,"class","svelte-18kfhrm"),P(S,"class","svelte-18kfhrm"),i[0]===void 0&&oe(()=>i[10].call(S)),P(e,"id","card"),P(e,"class","svelte-18kfhrm")},m(f,_){J(f,e,_),c(e,l),c(l,a),c(e,n),c(e,t),c(t,s),c(s,k),c(s,o),c(t,E),c(t,w),c(w,C),c(w,L),c(t,K),c(t,N),c(N,U),c(N,r),c(t,M),c(t,q),c(q,Q),c(q,Z),c(e,R),c(e,V),c(V,S);for(let h=0;h<d.length;h+=1)d[h].m(S,null);F(S,i[0]),c(V,X),v&&v.m(V,null),c(V,z),m&&m.m(V,null),c(e,y),c(e,Y),c(Y,A),p||(se=ie(S,"change",i[10]),p=!0)},p(f,[_]){if(_&4&&j(a,f[2]),_&8&&j(o,f[3]),_&16&&j(L,f[4]),_&32&&j(r,f[5]),_&64&&j(Z,f[6]),_&512){G=f[9];let h;for(h=0;h<G.length;h+=1){const T=ve(f,G,h);d[h]?d[h].p(T,_):(d[h]=me(T),d[h].c(),d[h].m(S,null))}for(;h<d.length;h+=1)d[h].d(1);d.length=G.length}_&1&&F(S,f[0]),f[0]===6?v?v.p(f,_):(v=ke(f),v.c(),v.m(V,z)):v&&(v.d(1),v=null),f[0]===7?m?m.p(f,_):(m=Ee(f),m.c(),m.m(V,null)):m&&(m.d(1),m=null),_&128&&j(A,f[7])},i:he,o:he,d(f){f&&u(e),re(d,f),v&&v.d(),m&&m.d(),p=!1,se()}}}function Se(i,e,l){let{name:a}=e,{obelisk:n}=e,{walls:t}=e,{barracks:s}=e,{soldiers:k}=e,{action:o}=e,{target:E}=e,{lore:w}=e,{cities:C={}}=e,{actions:L={}}=e;function K(){o=ue(this),l(0,o)}function N(){E=ue(this),l(1,E),l(8,C)}function U(){E=this.value,l(1,E),l(8,C)}return i.$$set=r=>{"name"in r&&l(2,a=r.name),"obelisk"in r&&l(3,n=r.obelisk),"walls"in r&&l(4,t=r.walls),"barracks"in r&&l(5,s=r.barracks),"soldiers"in r&&l(6,k=r.soldiers),"action"in r&&l(0,o=r.action),"target"in r&&l(1,E=r.target),"lore"in r&&l(7,w=r.lore),"cities"in r&&l(8,C=r.cities),"actions"in r&&l(9,L=r.actions)},[o,E,a,n,t,s,k,w,C,L,K,N,U]}class we extends Ie{constructor(e){super();De(this,e,Se,Ve,Oe,{name:2,obelisk:3,walls:4,barracks:5,soldiers:6,action:0,target:1,lore:7,cities:8,actions:9})}}export{we as default};
