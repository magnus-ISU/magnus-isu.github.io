import"../chunks/Bg9kRutz.js";import{e as fe,f as _e,t as h,g as me,s as l,i as o,j as e,D as G,r as i,ae as B,af as Ge}from"../chunks/Da0nnPzC.js";import{d as Ce,s as m}from"../chunks/Dad94sqd.js";import{i as E}from"../chunks/pJBJIWGn.js";import{e as H,i as R,s as ge}from"../chunks/_G73yJXa.js";import{a as d,t as b}from"../chunks/-Ct6wzUb.js";import{s as he}from"../chunks/CamT9boV.js";import{p as $}from"../chunks/C-xoV1eZ.js";import{o as ye}from"../chunks/T8PLpSSH.js";function Te(F,x,s){G(x,void 0),G(s,0)}var Pe=b('<div class="stat svelte-bboic8"><span class="stat-label svelte-bboic8">Last Score:</span> <span class="stat-value svelte-bboic8"> </span></div>'),ke=b('<div class="stat streak svelte-bboic8"><span class="stat-label svelte-bboic8">Current Streak:</span> <span class="stat-value svelte-bboic8"> </span></div>'),xe=b('<button class="level-btn svelte-bboic8"><h3 class="svelte-bboic8"> </h3> <p class="svelte-bboic8"> </p></button>'),Ae=b('<div class="level-selection svelte-bboic8"><h2 class="svelte-bboic8">Select a Level</h2> <div class="levels-grid svelte-bboic8"></div></div>'),we=(F,x,s,C)=>x(e(s),parseInt(e(C))),De=b("<button> </button>"),Se=b('<div class="octave-row svelte-bboic8"><div class="octave-label svelte-bboic8"> </div> <div class="keyboard svelte-bboic8"></div></div>'),Ee=b('<div class="feedback-correct svelte-bboic8">Correct!</div>'),Le=b('<div class="feedback-incorrect svelte-bboic8"> </div>'),Ne=b('<div class="feedback svelte-bboic8"><!></div>'),Be=b('<div class="feedback feedback-placeholder svelte-bboic8"><div class="feedback-correct svelte-bboic8">Correct!</div></div>'),$e=b(`<div class="practice-area svelte-bboic8"><div class="level-cleared svelte-bboic8"><span class="svelte-bboic8">🎉 Congratulations! You've cleared this level for today! 🎉</span></div> <div class="controls svelte-bboic8"><button class="play-btn svelte-bboic8"> </button> <button class="exit-btn svelte-bboic8">Exit Practice</button></div> <div class="keyboard-container svelte-bboic8"></div> <div class="feedback-container svelte-bboic8"><!></div></div>`),Fe=b('<header class="svelte-bboic8"><h1 class="svelte-bboic8">Perfect Pitch Trainer</h1> <div class="stats svelte-bboic8"><div class="stat svelte-bboic8"><span class="stat-label svelte-bboic8">Lifetime Points:</span> <span class="stat-value svelte-bboic8"> </span></div> <!> <!></div></header> <div class="content svelte-bboic8"><!></div>',1);function qe(F,x){fe(x,!0);let s=B(void 0),C=B(0),A=B(0),c=B(void 0);const P={},W=[{points:1,name:"Level 1: Basic C Notes",description:"Distinguish between middle C (C4), C5 (octave above), and C3 (octave below)",notes:["C3","C4","C5"]},{points:2,name:"Level 2: Extended C Range",description:"Adds F#",notes:["Gb2","C3","Gb3","C4","Gb4","C5","Gb5"]},{points:3,name:"Level 3: Tritones",description:"Adds more intermediate notes around C4",notes:["Gb2","C3","Eb3","Gb3","A4","C4","Eb4","Gb4","A5","C5","Gb5"]},{points:4,name:"Level 4: Half Tones",description:"Adds all notes 2 spaces away around C4",notes:["C3","D3","E3","Gb3","Bb4","C4","D4","E4","Gb4","Bb5","C5"]},{points:5,name:"Level 5: Natural Tones",description:"Adds all natural notes around C4",notes:["C3","D3","E3","F3","G3","A4","B4","C4","D4","E4","F4","G4","A5","B5","C5"]},{points:6,name:"Level 6: Standard Octave",description:"Adds all notes around C4",notes:["C3","Db3","D3","Eb3","E3","F3","Gb3","G3","Ab4","A4","Bb4","B4","C4","Db4","D4","Eb4","E4","F4","Gb4","G4","Ab5","A5","Bb5","B5","C5"]}];function V(a){const t=W[a];t&&(G(s,$({points:t.points,notes:t.notes,noteToGuess:"",isPlaying:!1,userGuess:void 0,levelCleared:!1})),G(C,0),Y())}function Y(){if(!e(s))return;const a=Math.floor(Math.random()*e(s).notes.length),t=e(s).notes[a];e(s).noteToGuess=t,e(s).isPlaying=!1,e(s).userGuess=void 0,X(t),setTimeout(()=>{O()},300)}function O(){!e(s)||!e(s).noteToGuess||(Z(e(s).noteToGuess),e(s).isPlaying=!0,setTimeout(()=>{e(s)&&(e(s).isPlaying=!1)},1e3))}function X(a){if(P[a])return;const t=new Audio(`/piano-mp3/piano-mp3/${a}.mp3`);t.load(),P[a]=t}function Z(a){if(P[a])P[a].currentTime=0,P[a].play();else{const t=new Audio(`/piano-mp3/piano-mp3/${a}.mp3`);t.play(),P[a]=t}}function ee(a,t){if(!e(s)||e(s).userGuess!==void 0)return;const r=`${a}${t}`;e(s).userGuess=r,r===e(s).noteToGuess?(Ge(C),e(C)===20&&se(e(s)),setTimeout(()=>{Y()},1e3)):(G(C,0),setTimeout(()=>{e(s)&&(e(s).userGuess=void 0,O())},1500))}function se(a){a.levelCleared=!0;const t=new Date().toISOString().split("T")[0],r=new Date(Date.now()-864e5).toISOString().split("T")[0];let n=a.points,v=n,g=1;if(e(c))if(e(c).date===t)if(g=e(c).doublePoints?2:1,n>e(c).points)v=(n-e(c).points)*g;else return;else e(c).date===r&&(v=n*2,g=2);G(A,e(A)+v),G(c,$({date:t,points:n,doublePoints:g===2})),te()}function te(){const a={lifetime_points:e(A),last_score:e(c)};localStorage.setItem("perfectPitchProgress",JSON.stringify(a))}function ae(){const a=localStorage.getItem("perfectPitchProgress");if(a)try{const t=JSON.parse(a);G(A,$(t.lifetime_points||0)),t.last_score&&G(c,$(t.last_score))}catch(t){console.error("Error loading saved progress:",t)}}function ie(a,t){if(!e(s)||e(s).userGuess===void 0)return"";const r=`${a}${t}`,n=r===e(s).noteToGuess;return r===e(s).userGuess?n?"correct":"incorrect":e(s).noteToGuess===r&&e(s).userGuess?"correct-answer":""}ye(()=>{ae()});var q=Fe(),M=_e(q),z=l(o(M),2),I=o(z),K=l(o(I),2),oe=o(K,!0);i(K),i(I);var Q=l(I,2);{var re=a=>{var t=Pe(),r=l(o(t),2),n=o(r);i(r),i(t),h(()=>m(n,`${e(c).points??""} pts on ${e(c).date??""}
					${(e(c).doublePoints?"(Double points today!)":"")??""}`)),d(a,t)};E(Q,a=>{e(c)&&a(re)})}var ne=l(Q,2);{var le=a=>{var t=ke(),r=l(o(t),2),n=o(r,!0);i(r),i(t),h(()=>m(n,e(C))),d(a,t)};E(ne,a=>{e(s)&&a(le)})}i(z),i(M);var U=l(M,2),ce=o(U);{var ve=a=>{var t=Ae(),r=l(o(t),2);H(r,21,()=>W,R,(n,v,g)=>{var y=xe();y.__click=()=>V(g);var T=o(y),L=o(T,!0);i(T);var N=l(T,2),J=o(N,!0);i(N),i(y),h(()=>{m(L,e(v).name),m(J,e(v).description)}),d(n,y)}),i(r),i(t),d(a,t)},de=a=>{var t=$e(),r=o(t),n=l(r,2),v=o(n);v.__click=O;var g=o(v,!0);i(v);var y=l(v,2);y.__click=[Te,s,C],i(n);var T=l(n,2);H(T,21,()=>[...new Set(e(s).notes.map(f=>f.slice(-1)))],R,(f,u)=>{var w=Se(),D=o(w),j=o(D);i(D);var _=l(D,2);H(_,21,()=>[...new Set(e(s).notes.filter(p=>p.endsWith(e(u))).map(p=>p.slice(0,-1)))],R,(p,S)=>{var k=De();k.__click=[we,ee,S,u];var ue=o(k);i(k),h(pe=>{he(k,`note-btn ${pe??""} svelte-bboic8`),k.disabled=e(s).userGuess!==void 0,m(ue,`${e(S)??""}${e(u)??""}`)},[()=>ie(e(S),parseInt(e(u)))]),d(p,k)}),i(_),i(w),h(()=>m(j,`Octave ${e(u)??""}`)),d(f,w)}),i(T);var L=l(T,2),N=o(L);{var J=f=>{var u=Ne(),w=o(u);{var D=_=>{var p=Ee();d(_,p)},j=_=>{var p=Le(),S=o(p);i(p),h(()=>m(S,`Incorrect. The correct note was ${e(s).noteToGuess??""}.`)),d(_,p)};E(w,_=>{e(s).userGuess===e(s).noteToGuess?_(D):_(j,!1)})}i(u),d(f,u)},be=f=>{var u=Be();d(f,u)};E(N,f=>{e(s).userGuess!==void 0?f(J):f(be,!1)})}i(L),i(t),h(()=>{ge(r,"style",e(s).levelCleared?"":"visibility: hidden;"),v.disabled=e(s).isPlaying,m(g,e(s).isPlaying?"Playing...":"Play Note")}),d(a,t)};E(ce,a=>{e(s)===void 0?a(ve):a(de,!1)})}i(U),h(()=>m(oe,e(A))),d(F,q),me()}Ce(["click"]);export{qe as component};
