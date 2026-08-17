(function(){"use strict";
function initPicker(root){if(!root||root.dataset.vpInit)return;root.dataset.vpInit="true";
var jsonEl=root.querySelector("[data-variant-json]");if(!jsonEl)return;var variants;try{variants=JSON.parse(jsonEl.textContent);}catch(e){return;}
var optionCount=root.querySelectorAll("[data-option-index]").length;
function currentOptions(){var opts=[];for(var i=0;i<optionCount;i++){var c=root.querySelector('[data-option-index="'+i+'"] [data-option-value]:checked');opts.push(c?c.value:null);}return opts;}
function findVariant(options){return variants.find(function(v){return v.options.every(function(o,i){return o===options[i];});});}
function updateLabels(){root.querySelectorAll("[data-option-index]").forEach(function(fs){var c=fs.querySelector("[data-option-value]:checked");var l=fs.querySelector("[data-selected-value]");if(l&&c)l.textContent=c.value;});}
function updateAvailability(){root.querySelectorAll("[data-option-index]").forEach(function(fieldset,optIndex){fieldset.querySelectorAll("[data-option-value]").forEach(function(input){var test=currentOptions();test[optIndex]=input.value;var availableMatch=variants.find(function(v){return v.available&&v.options.every(function(o,i){return test[i]==null||o===test[i];});});var chip=input.nextElementSibling;if(!availableMatch){input.disabled=true;if(chip)chip.classList.add("is-unavailable");}else{input.disabled=false;if(chip)chip.classList.remove("is-unavailable");}});});}
function onChange(){updateLabels();updateAvailability();var variant=findVariant(currentOptions());if(!variant)return;var form=root.closest("form")||document.querySelector('form[action*="/cart/add"]');if(form){var idInput=form.querySelector('[name="id"]');if(idInput){idInput.value=variant.id;idInput.dispatchEvent(new Event("change",{bubbles:true}));}}document.dispatchEvent(new CustomEvent("variant:change",{detail:{variant:variant,productId:root.dataset.productId},bubbles:true}));if(history.replaceState){var url=new URL(window.location.href);url.searchParams.set("variant",variant.id);history.replaceState({},"",url.toString());}}
root.addEventListener("change",function(e){if(e.target.matches("[data-option-value]"))onChange();});updateLabels();updateAvailability();}
function initAll(scope){var root=scope&&scope.querySelectorAll?scope:document;root.querySelectorAll("[data-variant-picker]").forEach(initPicker);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){initAll();});else initAll();
document.addEventListener("shopify:section:load",function(e){initAll(e.target);});
})();
