import"../chunks/Bg9kRutz.js";import{f as s,$,s as n,i as b,r as u,n as P}from"../chunks/Da0nnPzC.js";import{h as x}from"../chunks/C2Jph-m6.js";import{a as p,t as i}from"../chunks/-Ct6wzUb.js";import{i as k}from"../chunks/pJBJIWGn.js";import{P as B,a as C}from"../chunks/DJfrN4jc.js";var L=i("<!> <!>",1),O=i('<p><strong>Ope!</strong> </p> <p><a href="/blog">Back to blog</a></p>',1),S=i("<h1></h1> <!>",1);function D(f,c){const{page:v,posts:g,category:r,total:h}=c.data;var l=S();x(a=>{$.title=`Category: ${r??""}`});var m=s(l);m.textContent=`Blog category: ${r??""}`;var d=n(m,2);{var _=a=>{var t=L(),o=s(t);B(o,{posts:g});var e=n(o,2);C(e,{currentPage:v,totalPosts:h,path:`/blog/category/${r??""}/page`}),p(a,t)},y=a=>{var t=O(),o=s(t),e=n(b(o));e.nodeValue=` Sorry, couldn't find any posts in the category "${r??""}".`,u(o),P(2),p(a,t)};k(d,a=>{g.length?a(_):a(y,!1)})}p(f,l)}export{D as component};
