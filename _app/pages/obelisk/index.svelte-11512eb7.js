import{S as Yt,i as Wt,s as jt,j as Dt,m as Nt,o as At,R as xe,x as de,u as et,v as Ct,e as c,t as d,k as m,c as u,a as f,g as y,d as i,n as b,b as U,f as C,J as t,w as Gt,T as Rt,U as tt,V as lt,r as Pt,G as ue,W as ot,K as Bt,X as Ut}from"../../chunks/vendor-219f1c8b.js";import qt from"./city.svelte-d1816c91.js";function Tt(r,s,_){const e=r.slice();return e[7]=s[_],e[8]=s,e[9]=_,e}function Lt(r){let s,_,e,g,p;function B(a){r[4](a,r[7])}function S(a){r[5](a,r[7])}function Y(a){r[6](a,r[7])}let T={name:r[7][0],obelisk:r[7][1].obelisk,walls:r[7][1].walls,barracks:r[7][1].barracks,soldiers:r[7][1].soldiers,cities:r[0],actions:r[1]};return r[7][1].action!==void 0&&(T.action=r[7][1].action),r[7][1].target!==void 0&&(T.target=r[7][1].target),r[7][1].lore!==void 0&&(T.lore=r[7][1].lore),s=new qt({props:T}),tt.push(()=>lt(s,"action",B)),tt.push(()=>lt(s,"target",S)),tt.push(()=>lt(s,"lore",Y)),{c(){Dt(s.$$.fragment)},l(a){Nt(s.$$.fragment,a)},m(a,n){At(s,a,n),p=!0},p(a,n){r=a;const w={};n&1&&(w.name=r[7][0]),n&1&&(w.obelisk=r[7][1].obelisk),n&1&&(w.walls=r[7][1].walls),n&1&&(w.barracks=r[7][1].barracks),n&1&&(w.soldiers=r[7][1].soldiers),n&1&&(w.cities=r[0]),!_&&n&1&&(_=!0,w.action=r[7][1].action,xe(()=>_=!1)),!e&&n&1&&(e=!0,w.target=r[7][1].target,xe(()=>e=!1)),!g&&n&1&&(g=!0,w.lore=r[7][1].lore,xe(()=>g=!1)),s.$set(w)},i(a){p||(de(s.$$.fragment,a),p=!0)},o(a){et(s.$$.fragment,a),p=!1},d(a){Ct(s,a)}}}function Ft(r){let s,_,e,g,p,B,S,Y;return{c(){s=c("div"),_=c("button"),e=d("End this Turn"),g=m(),p=c("button"),B=d("Add another city-state"),this.h()},l(T){s=u(T,"DIV",{style:!0});var a=f(s);_=u(a,"BUTTON",{class:!0});var n=f(_);e=y(n,"End this Turn"),n.forEach(i),g=b(a),p=u(a,"BUTTON",{class:!0});var w=f(p);B=y(w,"Add another city-state"),w.forEach(i),a.forEach(i),this.h()},h(){U(_,"class","svelte-1a09293"),U(p,"class","svelte-1a09293"),ue(s,"display","flex"),ue(s,"flex-direction","row"),ue(s,"justify-content","center"),ue(s,"align-items","center"),ue(s,"width","100%")},m(T,a){C(T,s,a),t(s,_),t(_,e),t(s,g),t(s,p),t(p,B),S||(Y=[ot(_,"click",r[3]),ot(p,"click",r[2])],S=!0)},p:Bt,d(T){T&&i(s),S=!1,Ut(Y)}}}function Ht(r){let s,_,e,g;return{c(){s=c("button"),_=d("Begin the Obelisk..."),this.h()},l(p){s=u(p,"BUTTON",{class:!0});var B=f(s);_=y(B,"Begin the Obelisk..."),B.forEach(i),this.h()},h(){U(s,"class","svelte-1a09293")},m(p,B){C(p,s,B),t(s,_),e||(g=ot(s,"click",r[2]),e=!0)},p:Bt,d(p){p&&i(s),e=!1,g()}}}function Vt(r){let s,_,e,g,p,B,S,Y,T,a,n,w,k,o,E,L,N,A,q,K,F,R,ye,pe,J,me,be,X,ge,ke,z,ve,we,Q,Ee,Ie,O,Z,Oe,Be,$,Te,Le,x,Se,Ye,ee,We,je,te,De,Ne,le,Ae,Ce,M,Ge,D,oe,Re,Pe,se,Ue,qe,ae,Fe,He,re,Ve,Ke,ie,Me,Je,ne,Xe,ze,_e,Qe,fe,V=Object.entries(r[0]),v=[];for(let l=0;l<V.length;l+=1)v[l]=Lt(Tt(r,V,l));const St=l=>et(v[l],1,1,()=>{v[l]=null});function st(l,h){return(B==null||h&1)&&(B=Object.entries(l[0]).length===0),B?Ht:Ft}let he=st(r,-1),G=he(r);return{c(){s=c("pre"),_=d(`u/revesvans'
                                  \u2571\u2572
                                  ||
   ________ ___.          .__     ||          ____  __.
   \\_____  \\\\_ |__   ____ |  |    ||    _____|    |/ _|
    /   |   \\| __ \\_/ __ \\|  |    ||   /  ___/      \u2039 
   /    |    \\ \\_\\ \\  ___/|  |__ |  |  \\___ \\|    |  \\ 
   \\_______  /___  /\\___  \u203A____/_|__|_/____  \u203A____|__ \\
           \\/    \\/     \\/     \u2571______\u2572    \\/        \\/`),e=m(),g=c("div");for(let l=0;l<v.length;l+=1)v[l].c();p=m(),G.c(),S=m(),Y=c("p"),T=d("King, you must now gather your masons and bolster your defenses, for you have heard the plea of the gods. You must build an Obelisk."),a=m(),n=c("p"),w=d("It will scrape the heavens and be immortal in its glory, and your name will be forever carved among its great stones. But hurry, for across the lands, the lords of strange lands have also heard the call. And should their efforts succeed while you tarry, your worship will go unheard, and your name die with you."),k=m(),o=c("div"),E=c("p"),L=d("You rule a city-state, with the following stats:"),N=m(),A=c("ul"),q=c("li"),K=d("Obelisk: Your progress towards winning the game."),F=m(),R=c("li"),ye=d("Walls: These help you defend your obelisk from other players"),pe=m(),J=c("li"),me=d("Barracks: These help you raise an army to prevent other players from completing their obelisks"),be=m(),X=c("li"),ge=d("Soldiers: This is the number of soldiers in your army"),ke=m(),z=c("p"),ve=d("Resources have a minimum of 0, and a maximum of 10 (except soldiers)."),we=m(),Q=c("p"),Ee=d("Each turn you select one action to take from the following list:"),Ie=m(),O=c("ul"),Z=c("li"),Oe=d("Declare a Holiday: Gain 1 Soldier"),Be=m(),$=c("li"),Te=d("Build Obelisk: Gain 1 Obelisk"),Le=m(),x=c("li"),Se=d("Build Wall: Gain 1 Wall"),Ye=m(),ee=c("li"),We=d("Build Barracks: Gain 1 Barracks"),je=m(),te=c("li"),De=d("Recruit Soldiers: You gain soldiers equal to the number of Barracks in your city"),Ne=m(),le=c("li"),Ae=d("Defend: Double your Wall stat until your next turn"),Ce=m(),M=c("li"),Ge=d(`Attack
			`),D=c("ul"),oe=c("li"),Re=d("Choose another player."),Pe=m(),se=c("li"),Ue=d("If any other player has attacked that player, you lose one soldier for each soldier of the attacker with the highest number of soldiers."),qe=m(),ae=c("li"),Fe=d("You then lose one soldier for each of your target\u2019s Walls."),He=m(),re=c("li"),Ve=d("If your target is not Attacking or Recruiting, you lose one soldier for each of their Soldiers. They also lose 1 soldier for each of your soldiers lost this way."),Ke=m(),ie=c("li"),Me=d("For each soldier you have remaining, remove one of your target\u2019s Obelisk. If they reach 0, they lose the game."),Je=m(),ne=c("p"),Xe=d("You gain a soldier from your Holiday feast immediately. Then attacks are processed. Finally, all other actions are taken."),ze=m(),_e=c("p"),Qe=d("You win if you get to 10 Obelisk or all your opponents have 0 Obelisk."),this.h()},l(l){s=u(l,"PRE",{class:!0});var h=f(s);_=y(h,`u/revesvans'
                                  \u2571\u2572
                                  ||
   ________ ___.          .__     ||          ____  __.
   \\_____  \\\\_ |__   ____ |  |    ||    _____|    |/ _|
    /   |   \\| __ \\_/ __ \\|  |    ||   /  ___/      \u2039 
   /    |    \\ \\_\\ \\  ___/|  |__ |  |  \\___ \\|    |  \\ 
   \\_______  /___  /\\___  \u203A____/_|__|_/____  \u203A____|__ \\
           \\/    \\/     \\/     \u2571______\u2572    \\/        \\/`),h.forEach(i),e=b(l),g=u(l,"DIV",{id:!0,class:!0});var I=f(g);for(let $e=0;$e<v.length;$e+=1)v[$e].l(I);I.forEach(i),p=b(l),G.l(l),S=b(l),Y=u(l,"P",{class:!0});var ce=f(Y);T=y(ce,"King, you must now gather your masons and bolster your defenses, for you have heard the plea of the gods. You must build an Obelisk."),ce.forEach(i),a=b(l),n=u(l,"P",{class:!0});var at=f(n);w=y(at,"It will scrape the heavens and be immortal in its glory, and your name will be forever carved among its great stones. But hurry, for across the lands, the lords of strange lands have also heard the call. And should their efforts succeed while you tarry, your worship will go unheard, and your name die with you."),at.forEach(i),k=b(l),o=u(l,"DIV",{id:!0,class:!0});var W=f(o);E=u(W,"P",{});var rt=f(E);L=y(rt,"You rule a city-state, with the following stats:"),rt.forEach(i),N=b(W),A=u(W,"UL",{});var H=f(A);q=u(H,"LI",{});var it=f(q);K=y(it,"Obelisk: Your progress towards winning the game."),it.forEach(i),F=b(H),R=u(H,"LI",{});var nt=f(R);ye=y(nt,"Walls: These help you defend your obelisk from other players"),nt.forEach(i),pe=b(H),J=u(H,"LI",{});var _t=f(J);me=y(_t,"Barracks: These help you raise an army to prevent other players from completing their obelisks"),_t.forEach(i),be=b(H),X=u(H,"LI",{});var ct=f(X);ge=y(ct,"Soldiers: This is the number of soldiers in your army"),ct.forEach(i),H.forEach(i),ke=b(W),z=u(W,"P",{});var ut=f(z);ve=y(ut,"Resources have a minimum of 0, and a maximum of 10 (except soldiers)."),ut.forEach(i),we=b(W),Q=u(W,"P",{});var ft=f(Q);Ee=y(ft,"Each turn you select one action to take from the following list:"),ft.forEach(i),Ie=b(W),O=u(W,"UL",{});var j=f(O);Z=u(j,"LI",{});var ht=f(Z);Oe=y(ht,"Declare a Holiday: Gain 1 Soldier"),ht.forEach(i),Be=b(j),$=u(j,"LI",{});var dt=f($);Te=y(dt,"Build Obelisk: Gain 1 Obelisk"),dt.forEach(i),Le=b(j),x=u(j,"LI",{});var yt=f(x);Se=y(yt,"Build Wall: Gain 1 Wall"),yt.forEach(i),Ye=b(j),ee=u(j,"LI",{});var pt=f(ee);We=y(pt,"Build Barracks: Gain 1 Barracks"),pt.forEach(i),je=b(j),te=u(j,"LI",{});var mt=f(te);De=y(mt,"Recruit Soldiers: You gain soldiers equal to the number of Barracks in your city"),mt.forEach(i),Ne=b(j),le=u(j,"LI",{});var bt=f(le);Ae=y(bt,"Defend: Double your Wall stat until your next turn"),bt.forEach(i),Ce=b(j),M=u(j,"LI",{});var Ze=f(M);Ge=y(Ze,`Attack
			`),D=u(Ze,"UL",{});var P=f(D);oe=u(P,"LI",{});var gt=f(oe);Re=y(gt,"Choose another player."),gt.forEach(i),Pe=b(P),se=u(P,"LI",{});var kt=f(se);Ue=y(kt,"If any other player has attacked that player, you lose one soldier for each soldier of the attacker with the highest number of soldiers."),kt.forEach(i),qe=b(P),ae=u(P,"LI",{});var vt=f(ae);Fe=y(vt,"You then lose one soldier for each of your target\u2019s Walls."),vt.forEach(i),He=b(P),re=u(P,"LI",{});var wt=f(re);Ve=y(wt,"If your target is not Attacking or Recruiting, you lose one soldier for each of their Soldiers. They also lose 1 soldier for each of your soldiers lost this way."),wt.forEach(i),Ke=b(P),ie=u(P,"LI",{});var Et=f(ie);Me=y(Et,"For each soldier you have remaining, remove one of your target\u2019s Obelisk. If they reach 0, they lose the game."),Et.forEach(i),P.forEach(i),Ze.forEach(i),j.forEach(i),Je=b(W),ne=u(W,"P",{});var It=f(ne);Xe=y(It,"You gain a soldier from your Holiday feast immediately. Then attacks are processed. Finally, all other actions are taken."),It.forEach(i),ze=b(W),_e=u(W,"P",{});var Ot=f(_e);Qe=y(Ot,"You win if you get to 10 Obelisk or all your opponents have 0 Obelisk."),Ot.forEach(i),W.forEach(i),this.h()},h(){U(s,"class","centered svelte-1a09293"),U(g,"id","cities"),U(g,"class","svelte-1a09293"),U(Y,"class","lore svelte-1a09293"),U(n,"class","lore svelte-1a09293"),U(o,"id","rules"),U(o,"class","svelte-1a09293")},m(l,h){C(l,s,h),t(s,_),C(l,e,h),C(l,g,h);for(let I=0;I<v.length;I+=1)v[I].m(g,null);C(l,p,h),G.m(l,h),C(l,S,h),C(l,Y,h),t(Y,T),C(l,a,h),C(l,n,h),t(n,w),C(l,k,h),C(l,o,h),t(o,E),t(E,L),t(o,N),t(o,A),t(A,q),t(q,K),t(A,F),t(A,R),t(R,ye),t(A,pe),t(A,J),t(J,me),t(A,be),t(A,X),t(X,ge),t(o,ke),t(o,z),t(z,ve),t(o,we),t(o,Q),t(Q,Ee),t(o,Ie),t(o,O),t(O,Z),t(Z,Oe),t(O,Be),t(O,$),t($,Te),t(O,Le),t(O,x),t(x,Se),t(O,Ye),t(O,ee),t(ee,We),t(O,je),t(O,te),t(te,De),t(O,Ne),t(O,le),t(le,Ae),t(O,Ce),t(O,M),t(M,Ge),t(M,D),t(D,oe),t(oe,Re),t(D,Pe),t(D,se),t(se,Ue),t(D,qe),t(D,ae),t(ae,Fe),t(D,He),t(D,re),t(re,Ve),t(D,Ke),t(D,ie),t(ie,Me),t(o,Je),t(o,ne),t(ne,Xe),t(o,ze),t(o,_e),t(_e,Qe),fe=!0},p(l,[h]){if(h&3){V=Object.entries(l[0]);let I;for(I=0;I<V.length;I+=1){const ce=Tt(l,V,I);v[I]?(v[I].p(ce,h),de(v[I],1)):(v[I]=Lt(ce),v[I].c(),de(v[I],1),v[I].m(g,null))}for(Pt(),I=V.length;I<v.length;I+=1)St(I);Gt()}he===(he=st(l,h))&&G?G.p(l,h):(G.d(1),G=he(l),G&&(G.c(),G.m(S.parentNode,S)))},i(l){if(!fe){for(let h=0;h<V.length;h+=1)de(v[h]);fe=!0}},o(l){v=v.filter(Boolean);for(let h=0;h<v.length;h+=1)et(v[h]);fe=!1},d(l){l&&i(s),l&&i(e),l&&i(g),Rt(v,l),l&&i(p),G.d(l),l&&i(S),l&&i(Y),l&&i(a),l&&i(n),l&&i(k),l&&i(o)}}}function Kt(r,s,_){let e={},g=["Declare a Holiday","Build the Obelisk","Fortify the Walls","Construct a Barracks","Recruit more Soldiers","Defend the City","Attack your Foes","Cheat"];function p(){_(0,e["State "+(1+Object.entries(e).length)]={obelisk:1,walls:1,barracks:1,soldiers:1,action:0,target:"",lore:""},e)}function B(){let a=Object.entries(e),n={};for(let k=0;k<a.length;k++){let o=a[k][0];if(e[o].action===0){_(0,e[o].soldiers++,e);break}else(e[o].action<0||e[o].action>=g.length)&&alert("Illegal game state reached! action was '"+e[o].action+"'")}for(let k=0;k<a.length;k++){let o=a[k][0];if(e[o].action===6){let E=e[o].target;if(!(E in e))continue;let L=0;for(let F=0;F<a.length;F++){if(k===F)continue;let R=a[F][0];e[R].action===6&&e[R].target===e[o].target&&e[R].soldiers>L&&(L=e[R].soldiers)}let N=e[E].soldiers;({4:!0,6:!0})[e[E].action]&&(N=0);let q=e[E].walls;e[E].action===5&&(q*=2),o in n||(n[o]=0),n[o]+=L+N+q;let K=n[o]-q-L;K>0&&(E in n||(n[E]=0),n[E]+=K),e[o].soldiers>n[o]&&_(0,e[E].obelisk=e[E].obelisk-e[o].soldiers+n[o],e),e[E].obelisk<0&&(_(0,e[E].obelisk=0,e),alert(E+"'s Obelisk has been demolished!"))}}let w=Object.entries(n);for(let k=0;k<w.length;k++){let o=w[k][1];_(0,e[w[k][0]].soldiers=Math.max(e[w[k][0]].soldiers-o,0),e)}for(let k=0;k<a.length;k++){let o=a[k][0];switch(e[o].action){case 1:_(0,e[o].obelisk++,e),e[o].obelisk===10&&alert(o+"'s obelisk has been completed! Hooray!");break;case 2:_(0,e[o].walls++,e);break;case 3:_(0,e[o].barracks++,e);break;case 4:_(0,e[o].soldiers+=e[o].barracks,e);break;case 7:let E=e[o].target.split(" ");if(E.length!=4){alert("To cheat, put 4 space-seperated integers as the values of your 4 resources. Example: '9 1 3 20'");break}let L=[];for(let N=0;N<4;N++)if(L[N]=parseInt(E[N]),L[N]===NaN){alert("To cheat, put 4 space-seperated integers as the values of your 4 resources. Example: '9 1 3 20'");break}_(0,e[o].obelisk=L[0],e),_(0,e[o].walls=L[1],e),_(0,e[o].barracks=L[2],e),_(0,e[o].soldiers=L[3],e);break}}}function S(a,n){r.$$.not_equal(n[1].action,a)&&(n[1].action=a)}function Y(a,n){r.$$.not_equal(n[1].target,a)&&(n[1].target=a)}function T(a,n){r.$$.not_equal(n[1].lore,a)&&(n[1].lore=a)}return[e,g,p,B,S,Y,T]}class Xt extends Yt{constructor(s){super();Wt(this,s,Kt,Vt,jt,{})}}export{Xt as default};