import{S as Ke,i as ze,s as Qe,e as t,t as i,k as n,c as a,a as r,g as s,d as o,n as u,f as d,J as e,K as Te}from"../../chunks/vendor-219f1c8b.js";function Ve(Je){let k,j,F,m,w,J,K,B,z,Q,T,V,X,g,Z,q,_,$,C,E,ee,U,f,O,le,oe,Y,te,ae,x,re,ie,G,se,ne,S,ue,fe,W,he,ye,b,ce,c,R,de,me,A,pe,ke,D,ve,_e,H,Ee,be,P,Ie,M,I,Le,N,L,we;return{c(){k=t("p"),j=i("You rule a city-state, with the following stats:"),F=n(),m=t("ul"),w=t("li"),J=i("Obelisk: Your progress towards winning the game."),K=n(),B=t("li"),z=i("Walls: These help you defend your obelisk from other players"),Q=n(),T=t("li"),V=i("Barracks: These help you raise an army to prevent other players from completing their obelisks"),X=n(),g=t("li"),Z=i("Soldiers: This is the number of soldiers in your army"),q=n(),_=t("p"),$=i("Resources have a minimum of 0, and a maximum of 10 (except soldiers)."),C=n(),E=t("p"),ee=i("Each turn you select one action to take from the following list:"),U=n(),f=t("ul"),O=t("li"),le=i("Declare a Holiday: Gain 1 Soldier"),oe=n(),Y=t("li"),te=i("Build Obelisk: Gain 1 Obelisk"),ae=n(),x=t("li"),re=i("Build Wall: Gain 1 Wall"),ie=n(),G=t("li"),se=i("Build Barracks: Gain 1 Barracks"),ne=n(),S=t("li"),ue=i("Recruit Soldiers: You gain soldiers equal to the number of Barracks in your city"),fe=n(),W=t("li"),he=i("Defend: Double your Wall stat until your next turn"),ye=n(),b=t("li"),ce=i("Attack TARGET_NAME"),c=t("ul"),R=t("li"),de=i("Choose another player."),me=n(),A=t("li"),pe=i("If any other player has attacked that player, you lose one soldier for each soldier of the attacker with the highest number of soldiers."),ke=n(),D=t("li"),ve=i("You then lose one soldier for each of your target\u2019s Walls."),_e=n(),H=t("li"),Ee=i("If your target is not Attacking, Recruiting, or on Holiday, you lose one soldier for each of their Soldiers. They also lose 1 soldier for each of your soldiers lost this way."),be=n(),P=t("li"),Ie=i("For each soldier you have remaining, remove one of your target\u2019s Obelisk. If they reach 0, they lose the game."),M=n(),I=t("p"),Le=i("You gain a soldier from your Holiday feast immediately. Then attacks are processed. Finally, all other actions are taken."),N=n(),L=t("p"),we=i("You win if you get to 10 Obelisk or all your opponents have 0 Obelisk.")},l(l){k=a(l,"P",{});var h=r(k);j=s(h,"You rule a city-state, with the following stats:"),h.forEach(o),F=u(l),m=a(l,"UL",{});var v=r(m);w=a(v,"LI",{});var ge=r(w);J=s(ge,"Obelisk: Your progress towards winning the game."),ge.forEach(o),K=u(v),B=a(v,"LI",{});var Oe=r(B);z=s(Oe,"Walls: These help you defend your obelisk from other players"),Oe.forEach(o),Q=u(v),T=a(v,"LI",{});var Ye=r(T);V=s(Ye,"Barracks: These help you raise an army to prevent other players from completing their obelisks"),Ye.forEach(o),X=u(v),g=a(v,"LI",{});var xe=r(g);Z=s(xe,"Soldiers: This is the number of soldiers in your army"),xe.forEach(o),v.forEach(o),q=u(l),_=a(l,"P",{});var Ge=r(_);$=s(Ge,"Resources have a minimum of 0, and a maximum of 10 (except soldiers)."),Ge.forEach(o),C=u(l),E=a(l,"P",{});var Se=r(E);ee=s(Se,"Each turn you select one action to take from the following list:"),Se.forEach(o),U=u(l),f=a(l,"UL",{});var y=r(f);O=a(y,"LI",{});var We=r(O);le=s(We,"Declare a Holiday: Gain 1 Soldier"),We.forEach(o),oe=u(y),Y=a(y,"LI",{});var Re=r(Y);te=s(Re,"Build Obelisk: Gain 1 Obelisk"),Re.forEach(o),ae=u(y),x=a(y,"LI",{});var Ae=r(x);re=s(Ae,"Build Wall: Gain 1 Wall"),Ae.forEach(o),ie=u(y),G=a(y,"LI",{});var De=r(G);se=s(De,"Build Barracks: Gain 1 Barracks"),De.forEach(o),ne=u(y),S=a(y,"LI",{});var He=r(S);ue=s(He,"Recruit Soldiers: You gain soldiers equal to the number of Barracks in your city"),He.forEach(o),fe=u(y),W=a(y,"LI",{});var Pe=r(W);he=s(Pe,"Defend: Double your Wall stat until your next turn"),Pe.forEach(o),ye=u(y),b=a(y,"LI",{});var Be=r(b);ce=s(Be,"Attack TARGET_NAME"),c=a(Be,"UL",{});var p=r(c);R=a(p,"LI",{});var Fe=r(R);de=s(Fe,"Choose another player."),Fe.forEach(o),me=u(p),A=a(p,"LI",{});var qe=r(A);pe=s(qe,"If any other player has attacked that player, you lose one soldier for each soldier of the attacker with the highest number of soldiers."),qe.forEach(o),ke=u(p),D=a(p,"LI",{});var Ce=r(D);ve=s(Ce,"You then lose one soldier for each of your target\u2019s Walls."),Ce.forEach(o),_e=u(p),H=a(p,"LI",{});var Ue=r(H);Ee=s(Ue,"If your target is not Attacking, Recruiting, or on Holiday, you lose one soldier for each of their Soldiers. They also lose 1 soldier for each of your soldiers lost this way."),Ue.forEach(o),be=u(p),P=a(p,"LI",{});var Me=r(P);Ie=s(Me,"For each soldier you have remaining, remove one of your target\u2019s Obelisk. If they reach 0, they lose the game."),Me.forEach(o),p.forEach(o),Be.forEach(o),y.forEach(o),M=u(l),I=a(l,"P",{});var Ne=r(I);Le=s(Ne,"You gain a soldier from your Holiday feast immediately. Then attacks are processed. Finally, all other actions are taken."),Ne.forEach(o),N=u(l),L=a(l,"P",{});var je=r(L);we=s(je,"You win if you get to 10 Obelisk or all your opponents have 0 Obelisk."),je.forEach(o)},m(l,h){d(l,k,h),e(k,j),d(l,F,h),d(l,m,h),e(m,w),e(w,J),e(m,K),e(m,B),e(B,z),e(m,Q),e(m,T),e(T,V),e(m,X),e(m,g),e(g,Z),d(l,q,h),d(l,_,h),e(_,$),d(l,C,h),d(l,E,h),e(E,ee),d(l,U,h),d(l,f,h),e(f,O),e(O,le),e(f,oe),e(f,Y),e(Y,te),e(f,ae),e(f,x),e(x,re),e(f,ie),e(f,G),e(G,se),e(f,ne),e(f,S),e(S,ue),e(f,fe),e(f,W),e(W,he),e(f,ye),e(f,b),e(b,ce),e(b,c),e(c,R),e(R,de),e(c,me),e(c,A),e(A,pe),e(c,ke),e(c,D),e(D,ve),e(c,_e),e(c,H),e(H,Ee),e(c,be),e(c,P),e(P,Ie),d(l,M,h),d(l,I,h),e(I,Le),d(l,N,h),d(l,L,h),e(L,we)},p:Te,i:Te,o:Te,d(l){l&&o(k),l&&o(F),l&&o(m),l&&o(q),l&&o(_),l&&o(C),l&&o(E),l&&o(U),l&&o(f),l&&o(M),l&&o(I),l&&o(N),l&&o(L)}}}class Ze extends Ke{constructor(k){super();ze(this,k,null,Ve,Qe,{})}}export{Ze as default};
