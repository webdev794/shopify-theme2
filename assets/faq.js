(function(){"use strict";
function initFaq(section){if(!section||section.dataset.faqInit)return;section.dataset.faqInit="true";
var list=section.querySelector("[data-faq-list]");if(!list)return;
list.addEventListener("toggle",function(e){var item=e.target;if(!item.matches("[data-faq-item]")||!item.open)return;
list.querySelectorAll("[data-faq-item][open]").forEach(function(other){if(other!==item)other.removeAttribute("open");});},true);}
function initAll(root){var scope=root&&root.querySelectorAll?root:document;scope.querySelectorAll("[data-section-type=\"faq\"]").forEach(initFaq);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){initAll();});else initAll();
document.addEventListener("shopify:section:load",function(e){initAll(e.target);});
})();
