(function(){"use strict";
function init(section){if(!section||section.dataset.lgInit)return;section.dataset.lgInit="true";
var track=section.querySelector("[data-lg-track]"),slides=section.querySelectorAll("[data-lg-slide]"),dots=section.querySelectorAll("[data-lg-dot]"),prev=section.querySelector("[data-lg-prev]"),next=section.querySelector("[data-lg-next]"),card=section.querySelector("[data-lg-card]"),cardContent=section.querySelector("[data-lg-card-content]"),index=0;
function goTo(i){if(!slides.length)return;index=(i+slides.length)%slides.length;if(track)track.style.transform="translateX(-"+index*100+"%)";slides.forEach(function(s,n){s.classList.toggle("is-active",n===index);});dots.forEach(function(d,n){d.classList.toggle("is-active",n===index);});if(card)card.hidden=true;}
if(prev)prev.addEventListener("click",function(){goTo(index-1);});if(next)next.addEventListener("click",function(){goTo(index+1);});
dots.forEach(function(d){d.addEventListener("click",function(){goTo(parseInt(d.dataset.index,10));});});
section.addEventListener("click",function(e){if(e.target.closest("[data-lg-card-close]")){if(card)card.hidden=true;return;}
var hotspot=e.target.closest("[data-lg-hotspot]");if(!hotspot||!card||!cardContent)return;var handle=hotspot.dataset.productHandle;if(!handle)return;
cardContent.innerHTML="<p>Loading…</p>";card.hidden=false;
fetch("/products/"+handle+".js").then(function(r){return r.json();}).then(function(product){var img=product.featured_image?'<img src="'+product.featured_image+'" alt="" width="80" height="80">':"";var price=product.price?(window.ThemeUtils&&ThemeUtils.formatMoney?ThemeUtils.formatMoney(product.price):(product.price/100).toFixed(2)):"";
cardContent.innerHTML='<div class="lookbook-gallery__card-inner">'+img+"<div><p class=\"lookbook-gallery__card-title\">"+(product.title||"")+"</p><p class=\"lookbook-gallery__card-price\">"+price+'</p><a href="/products/'+handle+'">View product →</a></div></div>';}).catch(function(){cardContent.innerHTML="<p>Could not load product</p>";});});}
function initAll(root){var s=root&&root.querySelectorAll?root:document;s.querySelectorAll("[data-section-type=\"lookbook-gallery\"]").forEach(init);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){initAll();});else initAll();
document.addEventListener("shopify:section:load",function(e){initAll(e.target);});
})();
