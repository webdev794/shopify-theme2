(function(){"use strict";
function money(c){return window.ThemeUtils&&ThemeUtils.formatMoney?ThemeUtils.formatMoney(c,(window.theme&&window.theme.moneyFormat)||"{{amount}}"):(c/100).toFixed(2);}
function init(section){if(!section||section.dataset.obInit)return;section.dataset.obInit="true";
var maxItems=parseInt(section.dataset.maxItems,10)||4,selection=[],selectionEl=section.querySelector("[data-ob-selection]"),emptyEl=section.querySelector("[data-ob-empty]"),totalsEl=section.querySelector("[data-ob-totals]"),totalPriceEl=section.querySelector("[data-ob-total-price]"),addAllBtn=section.querySelector("[data-ob-add-all]");
function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function sync(){if(!selectionEl)return;selectionEl.innerHTML="";selection.forEach(function(item,idx){var li=document.createElement("li");li.className="outfit-builder__selection-item";li.innerHTML="<span>"+esc(item.title)+" <small>("+money(item.price)+")</small></span><button type=\"button\" class=\"outfit-builder__selection-remove\" data-ob-remove=\""+idx+"\">Remove</button>";selectionEl.appendChild(li);});
var total=selection.reduce(function(s,i){return s+i.price;},0);if(totalPriceEl)totalPriceEl.textContent=money(total);var has=selection.length>0;if(emptyEl)emptyEl.hidden=has;if(totalsEl)totalsEl.hidden=!has;if(addAllBtn)addAllBtn.disabled=!has;
section.querySelectorAll("[data-ob-product]").forEach(function(card){card.classList.toggle("is-selected",selection.some(function(s){return String(s.productId)===String(card.dataset.productId);}));});}
section.addEventListener("click",function(e){var rm=e.target.closest("[data-ob-remove]");if(rm){selection.splice(parseInt(rm.dataset.obRemove,10),1);sync();return;}
var btn=e.target.closest("[data-ob-select]");if(!btn)return;var card=btn.closest("[data-ob-product]");if(!card)return;
var vs=card.querySelector("[data-ob-variant]"),variantId=vs?vs.value:card.dataset.variantId,price=vs?parseInt(vs.selectedOptions[0].dataset.price,10):parseInt(card.dataset.price,10),title=card.dataset.title,productId=card.dataset.productId;
var existing=selection.findIndex(function(s){return String(s.productId)===String(productId);});if(existing!==-1){selection.splice(existing,1);sync();return;}
if(selection.length>=maxItems){if(window.A11y)A11y.announce("Maximum of "+maxItems+" items","assertive");return;}
selection.push({productId:productId,variantId:variantId,price:price,title:title});sync();});
if(addAllBtn)addAllBtn.addEventListener("click",function(){if(!selection.length)return;addAllBtn.disabled=true;var items=selection.map(function(s){return{id:Number(s.variantId),quantity:1};});
var add=window.ThemeUtils&&ThemeUtils.addToCart?ThemeUtils.addToCart(items):fetch("/cart/add.js",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:items}),credentials:"same-origin"}).then(function(r){return r.json();});
add.then(function(){document.dispatchEvent(new CustomEvent("product:added",{detail:{items:items}}));return window.ThemeUtils&&ThemeUtils.getCart?ThemeUtils.getCart():fetch("/cart.js").then(function(r){return r.json();});}).then(function(cart){if(window.ThemeUtils&&ThemeUtils.publishCart)ThemeUtils.publishCart(cart);}).catch(console.error).finally(function(){addAllBtn.disabled=selection.length===0;});});
sync();}
function initAll(root){var s=root&&root.querySelectorAll?root:document;s.querySelectorAll("[data-section-type=\"outfit-builder\"]").forEach(init);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){initAll();});else initAll();
document.addEventListener("shopify:section:load",function(e){initAll(e.target);});
})();
