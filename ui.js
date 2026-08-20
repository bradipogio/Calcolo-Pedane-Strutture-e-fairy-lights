(function(){
  "use strict";

  const FAIRY_SETTINGS_KEY = "fairyPlannerSettings";

  function emitNumberChange(input){
    input.dispatchEvent(new Event("input", {bubbles:true}));
    input.dispatchEvent(new Event("change", {bubbles:true}));
  }

  function adjustNumber(input, direction){
    if(input.disabled || input.readOnly) return;

    try{
      direction > 0 ? input.stepUp() : input.stepDown();
    }catch(error){
      const step = Number(input.step) || 1;
      const current = Number(input.value) || 0;
      input.value = String(current + step * direction);
    }

    emitNumberChange(input);
  }

  function decorateNumberInput(input){
    if(input.dataset.numberReady === "true") return;

    input.dataset.numberReady = "true";
    input.inputMode = input.step && Number(input.step) % 1 !== 0
      ? "decimal"
      : "numeric";

    let freshFocus = false;
    input.addEventListener("focus", ()=>{
      freshFocus = true;
      requestAnimationFrame(()=>input.select());
    });
    input.addEventListener("mouseup", event=>{
      if(!freshFocus) return;
      event.preventDefault();
      freshFocus = false;
      input.select();
    });
    input.addEventListener("blur", ()=>{
      freshFocus = false;
      if(input.value === "") return;
      if(input.min !== "" && Number(input.value) < Number(input.min)){
        input.value = input.min;
        emitNumberChange(input);
      }
    });
    input.addEventListener("wheel", event=>{
      if(document.activeElement === input) event.preventDefault();
    }, {passive:false});

    if(!input.hasAttribute("data-stepper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "number-control";
    if(input.dataset.stepper === "compact") wrapper.classList.add("compact");

    const unit = input.dataset.unit;
    if(unit) wrapper.classList.add("has-unit");

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "stepper-button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", `Diminuisci ${input.getAttribute("aria-label") || input.id || "valore"}`);
    minus.addEventListener("click", ()=>adjustNumber(input, -1));

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "stepper-button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", `Aumenta ${input.getAttribute("aria-label") || input.id || "valore"}`);
    plus.addEventListener("click", ()=>adjustNumber(input, 1));

    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(minus, input);

    if(unit){
      const unitNode = document.createElement("span");
      unitNode.className = "number-unit";
      unitNode.textContent = unit;
      wrapper.appendChild(unitNode);
    }

    wrapper.appendChild(plus);
  }

  function decorateNumbers(root = document){
    root.querySelectorAll?.('input[type="number"]').forEach(decorateNumberInput);
  }

  function loadFairySetting(){
    const input = document.getElementById("fairySlackCm");
    if(!input) return;

    try{
      const saved = JSON.parse(localStorage.getItem(FAIRY_SETTINGS_KEY) || "{}");
      const value = Number(saved.fairySlackCm);
      if(Number.isFinite(value) && value >= 0) input.value = String(value);
    }catch(error){}
  }

  function saveFairySetting(){
    const input = document.getElementById("fairySlackCm");
    const feedback = document.getElementById("fairySaveFeedback");
    if(!input) return;

    const value = Math.max(0, Number(input.value) || 0);
    input.value = String(value);
    localStorage.setItem(FAIRY_SETTINGS_KEY, JSON.stringify({fairySlackCm:value}));

    if(feedback){
      feedback.textContent = "Scarto salvato.";
      window.setTimeout(()=>{
        if(feedback.textContent === "Scarto salvato.") feedback.textContent = "";
      }, 1800);
    }
  }

  function setupSettingsModal(){
    const modal = document.getElementById("settingsModal");
    const openButton = document.getElementById("openSettings");
    const closeButton = document.getElementById("closeSettings");
    if(!modal || !openButton || !closeButton) return;

    let previousFocus = null;

    const syncOpenState = ()=>{
      const open = modal.classList.contains("open");
      document.body.classList.toggle("modal-open", open);
      modal.setAttribute("aria-hidden", String(!open));
      openButton.setAttribute("aria-expanded", String(open));

      if(open){
        previousFocus = openButton;
        window.setTimeout(()=>closeButton.focus({preventScroll:true}), 0);
      }else if(previousFocus){
        previousFocus.focus({preventScroll:true});
      }
    };

    new MutationObserver(syncOpenState).observe(modal, {
      attributes:true,
      attributeFilter:["class"]
    });

    modal.addEventListener("mousedown", event=>{
      if(event.target === modal) closeButton.click();
    });

    document.addEventListener("keydown", event=>{
      if(event.key === "Escape" && modal.classList.contains("open")){
        event.preventDefault();
        closeButton.click();
      }
    });

    syncOpenState();
  }

  function setup(){
    decorateNumbers();
    loadFairySetting();
    setupSettingsModal();

    document.getElementById("saveFairySettings")
      ?.addEventListener("click", saveFairySetting);

    new MutationObserver(records=>{
      records.forEach(record=>{
        record.addedNodes.forEach(node=>{
          if(node.nodeType !== Node.ELEMENT_NODE) return;
          if(node.matches?.('input[type="number"]')) decorateNumberInput(node);
          decorateNumbers(node);
        });
      });
    }).observe(document.body, {childList:true, subtree:true});
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", setup, {once:true});
  }else{
    setup();
  }
})();
