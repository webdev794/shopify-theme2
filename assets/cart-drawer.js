(function(){"use strict";
var drawer=document.querySelector("[data-cart-drawer]");if(!drawer)return;
var panel=drawer.querySelector("[data-cart-drawer-panel]");
var bodyEl=drawer.querySelector("[data-cart-drawer-body]");
var countEl=drawer.querySelector("[data-cart-drawer-count]");
var subtotalEl=drawer.querySelector("[data-cart-drawer-subtotal]");
var emptyEl=drawer.querySelector("[data-cart-drawer-empty]");
var itemsEl=drawer.querySelector("[data-cart-drawer-items]");
var footerEl=drawer.querySelector("[data-cart-drawer-footer]");
var unlockScroll=null,releaseFocus=null;
var moneyFormat=(window.theme&&window.theme.moneyFormat)||drawer.dataset.moneyFormat||"{{amount}}";
var pendingCart=null;

function formatMoney(c){return window.ThemeUtils&&ThemeUtils.formatMoney?ThemeUtils.formatMoney(c,moneyFormat):(c/100).toFixed(2);}

function openDrawer(){
  if(window.A11y)A11y.saveFocus();
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden","false");
  if(!unlockScroll)unlockScroll=window.ThemeUtils&&ThemeUtils.lockScroll?ThemeUtils.lockScroll():null;
  if(window.ThemeUtils&&ThemeUtils.trapFocus&&panel)releaseFocus=ThemeUtils.trapFocus(panel);
  // Always re-fetch so line items match the badge
  refresh();
}

function closeDrawer(){
  if(!drawer.classList.contains("is-open"))return;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden","true");
  if(releaseFocus){releaseFocus();releaseFocus=null;}
  if(unlockScroll){unlockScroll();unlockScroll=null;}
  if(window.A11y)A11y.restoreFocus();
}

function setLoading(on){if(bodyEl)bodyEl.classList.toggle("cart-drawer__loading",on);}

function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

function render(cart){
  if(!cart)return;
  pendingCart=cart;
  if(countEl)countEl.textContent=cart.item_count?"("+cart.item_count+")":"";
  if(subtotalEl)subtotalEl.textContent=formatMoney(cart.total_price);
  var has=cart.item_count>0;
  if(emptyEl)emptyEl.hidden=has;
  if(itemsEl)itemsEl.hidden=!has;
  if(footerEl)footerEl.hidden=!has;
  if(!itemsEl)return;
  if(!has){itemsEl.innerHTML="";return;}
  var lines=Array.isArray(cart.items)?cart.items:[];
  itemsEl.innerHTML="";
  lines.forEach(function(item,index){
    var li=document.createElement("li");
    li.className="cart-drawer__item";
    li.dataset.line=String(index+1);
    var img=item.image?'<img class="cart-drawer__item-image" src="'+String(item.image).replace(/(\.[^.]+)$/,"_160x$1")+'" alt="" width="80" height="80" loading="lazy">':'<div class="cart-drawer__item-image"></div>';
    var v=item.variant_title&&item.variant_title!=="Default Title"?'<span class="cart-drawer__item-variant">'+esc(item.variant_title)+"</span>":"";
    var title=item.product_title||item.title||"Item";
    var url=item.url||"#";
    var price=typeof item.final_line_price==="number"?item.final_line_price:(item.line_price||item.price||0);
    li.innerHTML=img+'<div class="cart-drawer__item-info"><a class="cart-drawer__item-title" href="'+esc(url)+'">'+esc(title)+"</a>"+v+'<span class="cart-drawer__item-price">'+formatMoney(price)+'</span><div class="cart-drawer__item-actions"><div class="cart-drawer__qty"><button type="button" class="cart-drawer__qty-btn" data-qty-change="-1" aria-label="Decrease">−</button><span class="cart-drawer__qty-value">'+(item.quantity||1)+'</span><button type="button" class="cart-drawer__qty-btn" data-qty-change="1" aria-label="Increase">+</button></div><button type="button" class="cart-drawer__remove" data-remove>Remove</button></div></div>';
    itemsEl.appendChild(li);
  });
}

function fetchCart(){
  if(window.ThemeUtils&&ThemeUtils.getCart)return ThemeUtils.getCart();
  return fetch("/cart.js",{credentials:"same-origin",headers:{"Accept":"application/json"}}).then(function(r){return r.json();});
}

function refresh(){
  setLoading(true);
  fetchCart().then(function(cart){
    render(cart);
    if(window.ThemeUtils&&ThemeUtils.publishCart)ThemeUtils.publishCart(cart);
  }).catch(function(e){console.error("[Petlio cart-drawer]",e);}).finally(function(){setLoading(false);});
}

function changeLine(line,qty){
  setLoading(true);
  var p=window.ThemeUtils&&ThemeUtils.changeCart?ThemeUtils.changeCart(line,qty):fetch("/cart/change.js",{method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"XMLHttpRequest","Accept":"application/json"},body:JSON.stringify({line:line,quantity:qty}),credentials:"same-origin"}).then(function(r){return r.json();});
  p.then(function(cart){
    render(cart);
    if(window.ThemeUtils&&ThemeUtils.publishCart)ThemeUtils.publishCart(cart);
  }).catch(console.error).finally(function(){setLoading(false);});
}

document.addEventListener("click",function(e){
  if(e.target.closest("[data-cart-drawer-open]")){e.preventDefault();openDrawer();}
  if(e.target.closest("[data-cart-drawer-close]")){e.preventDefault();closeDrawer();}
});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&drawer.classList.contains("is-open"))closeDrawer();});
if(bodyEl)bodyEl.addEventListener("click",function(e){
  var item=e.target.closest(".cart-drawer__item");if(!item)return;
  var line=parseInt(item.dataset.line,10);
  if(e.target.closest("[data-remove]")){changeLine(line,0);return;}
  var btn=e.target.closest("[data-qty-change]");
  if(btn){
    var d=parseInt(btn.dataset.qtyChange,10);
    var cur=parseInt(item.querySelector(".cart-drawer__qty-value").textContent,10)||1;
    changeLine(line,Math.max(0,cur+d));
  }
});

// Only render into the drawer when it is already open.
// When closed, just keep a pending snapshot — openDrawer always refreshes from server.
function onCartEvent(e){
  var cart=e&&e.detail&&e.detail.cart?e.detail.cart:null;
  if(drawer.classList.contains("is-open")){
    if(cart&&Array.isArray(cart.items))render(cart);
    else refresh();
  }else if(cart){
    pendingCart=cart;
  }
}
document.addEventListener("cart:updated",onCartEvent);
document.addEventListener("cart:refresh",onCartEvent);
document.addEventListener("product:added",function(){
  if(drawer.classList.contains("is-open"))refresh();
});
})();
