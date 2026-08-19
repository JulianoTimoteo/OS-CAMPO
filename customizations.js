(function () {
  'use strict';

  if (window.__osCampoCustomizationsLoaded) return;
  window.__osCampoCustomizationsLoaded = true;

  // Injeção de Estilos CSS no Cabeçalho
  var style = document.createElement("style");
  style.id = "os-campo-customizations";
  style.textContent = `
    .os-radar-dot { position: relative !important; overflow: visible !important; isolation: isolate; }
    .os-radar-dot::after {
      content: ""; position: absolute; inset: 0; border-radius: 9999px;
      background: inherit; opacity: .75; z-index: -1;
      animation: os-radar-pulse 2s cubic-bezier(0,0,.2,1) infinite;
    }
    @keyframes os-radar-pulse { 0% { transform: scale(1); opacity: .8; } 100% { transform: scale(3.6); opacity: 0; } }
    
    .os-reopen-spin { animation: os-slow-spin 8s linear infinite !important; transform-origin: center; }
    @keyframes os-slow-spin { to { transform: rotate(-360deg); } }
    
    .os-assume-pulse { animation: os-gentle-pulse 2.8s ease-in-out infinite !important; }
    @keyframes os-gentle-pulse {
      0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgb(59 130 246 / 0); }
      50% { transform: scale(1.018); box-shadow: 0 0 0 4px rgb(59 130 246 / .12); }
    }
    
    .os-animated-quote { font-size: .95rem !important; font-weight: 700 !important; color: #40800c !important; animation: os-quote-pulse 4s ease-in-out infinite !important; }
    @keyframes os-quote-pulse { 0%,100% { opacity: .7; } 50% { opacity: 1; } }
    
    .os-zoom-controls { position:absolute; right:16px; bottom:16px; z-index:50; display:flex; align-items:center; gap:8px; padding:4px; border:1px solid currentColor; border-radius:8px; background:var(--background, #fff); }
    .os-zoom-controls button { width:32px; height:32px; display:grid; place-items:center; border-radius:6px; cursor:pointer; }
    
    @media (prefers-reduced-motion: reduce) { 
      .os-radar-dot::after, .os-reopen-spin, .os-assume-pulse, .os-animated-quote { animation:none !important; } 
    }
  `;
  document.head.appendChild(style);

  function exactText(el) { 
    return (el.textContent || "").trim(); 
  }

  // Identificação infalível da aba Solicitante baseada no formulário de abertura e no título
  function isSolicitanteView() {
    var pageText = document.body.innerText || "";
    var hasForm = pageText.includes("Abrir Ordem de Serviço") || pageText.includes("Todos os chamados");
    
    // Se o formulário do solicitante estiver visível na página, estamos na aba Solicitante
    if (hasForm) return true;

    // Checagem complementar nas abas do menu principal
    var activeTab = document.querySelector('[role="tab"][data-state="active"], button[data-state="active"], .active');
    if (activeTab) {
      var tabText = exactText(activeTab);
      if (tabText === "GPS" || tabText === "Solinftec") return false;
      if (tabText === "Solicitante") return true;
    }

    return false;
  }

  // Converte <select> em <input> com lista navegável por digitação
  function makeSelectSearchable(select, placeholderText) {
    if (select.dataset.convertedToSearch) return;
    select.dataset.convertedToSearch = "true";

    var datalistId = "dl-search-" + Math.random().toString(36).substring(2, 9);
    var datalist = document.createElement("datalist");
    datalist.id = datalistId;

    var optionsHtml = "";
    Array.from(select.options).forEach(function (opt) {
      if (opt.value && opt.value !== "Selecione…") {
        optionsHtml += `<option value="${opt.value}">${opt.textContent}</option>`;
      }
    });
    datalist.innerHTML = optionsHtml;
    document.body.appendChild(datalist);

    var input = document.createElement("input");
    input.type = "text";
    input.className = select.className || "w-full px-3 py-2 border rounded-md";
    input.placeholder = placeholderText;
    input.setAttribute("list", datalistId);
    input.value = select.value && select.value !== "Selecione…" ? select.value : "";

    input.addEventListener("input", function (e) {
      var typedVal = e.target.value;
      var match = Array.from(select.options).find(function(opt) {
        return opt.value === typedVal || opt.textContent.toLowerCase().includes(typedVal.toLowerCase());
      });

      if (match) {
        select.value = match.value;
      } else {
        select.value = typedVal;
      }

      var event = new Event("change", { bubbles: true });
      select.dispatchEvent(event);
    });

    select.style.display = "none";
    select.parentElement.insertBefore(input, select);
  }

  function applyCustomizations() {
    var allowReopen = isSolicitanteView();

    // 1. REGRAS DOS BOTÕES (REABRIR E ASSUMIR)
    document.querySelectorAll("button, [role='button']").forEach(function (button) {
      var text = exactText(button);

      if (text.includes("Assumir") && !button.classList.contains("os-assume-pulse")) {
        button.classList.add("os-assume-pulse");
      }

      if (text.includes("Reabrir")) {
        var icon = button.querySelector("svg");
        if (icon && !icon.classList.contains("os-reopen-spin")) {
          icon.classList.add("os-reopen-spin");
        }

        // Exibe SOMENTE se a visão ativa for a do Solicitante
        if (allowReopen) {
          button.style.display = "";
        } else {
          button.style.display = "none";
        }
      }
    });

    // 2. e 3. REMOVIDO: os hacks de "forçar Solinftec" e "transformar select em
    // busca por texto" foram removidos daqui porque já estão implementados
    // corretamente no código-fonte do app (Solinftec como padrão em
    // "Solicitar técnico", e Frota/ID com busca de texto real). Manter esses
    // hacks rodando por cima causava bugs — em especial, o campo "Peça" do
    // diálogo de Finalizar chamado (que é um <select> nativo e já mostra
    // "código — descrição" corretamente) estava sendo convertido num <input>
    // cujo valor virava o ID interno da peça (ex: "031ca022-4319-..."), em
    // vez do texto legível.

    // 4. RADAR PULSE NOS BADGES DE STATUS
    document.querySelectorAll("span, div").forEach(function (badge) {
      var text = exactText(badge);
      if (!/^(Aberto|Encerrado|Pausado)$/.test(text)) return;
      
      var dot = badge.querySelector('span[class*="rounded-full"]');
      if (!dot && badge.children.length <= 3) {
        dot = Array.from(badge.children).find(function (child) {
          var box = child.getBoundingClientRect();
          return box.width > 0 && box.width <= 14 && box.height > 0 && box.height <= 14;
        });
      }
      if (dot && !dot.classList.contains("os-radar-dot")) {
        dot.classList.add("os-radar-dot");
      }
    });

    // 5. ESTILIZAÇÃO DOS BADGES DE CATEGORIA
    document.querySelectorAll("span, div").forEach(function (badge) {
      var text = exactText(badge);
      if (badge.children.length > 3) return;

      if (text === "Solinftec") { 
        badge.style.borderColor = "#40800c"; 
        badge.style.color = "#40800c"; 
      }
      if (text === "GPS") { 
        badge.style.borderColor = "#3b82f6"; 
        badge.style.color = "#3b82f6"; 
      }
    });

    // 6. ANIMAÇÃO DO SLOGAN
    document.querySelectorAll("p").forEach(function (p) {
      if (exactText(p).includes("A energia que move a região") && !p.classList.contains("os-animated-quote")) {
        p.classList.add("os-animated-quote");
      }
    });

    // 7. CONTROLES DE ZOOM NO IFRAME SHAREPOINT
    document.querySelectorAll("iframe").forEach(function (iframe) {
      if (!iframe.src.includes("EZKqwy-p4w9Dq4yrLQ_47L0BaolM6qlwNItqnfwcfE7tqA")) return;
      
      var embed = "https://pitaa-my.sharepoint.com/:w:/g/personal/julianotimoteo_usinapitangueiras_com_br/EZKqwy-p4w9Dq4yrLQ_47L0BaolM6qlwNItqnfwcfE7tqA?e=2agoUZ&action=embedview&wdStartOn=1";
      if (iframe.src !== embed) iframe.src = embed;

      if (iframe.dataset.zoomReady) return;
      iframe.dataset.zoomReady = "true";

      var parent = iframe.parentElement;
      if (!parent) return;

      parent.style.position = "relative";

      var controls = document.createElement("div");
      controls.className = "os-zoom-controls";
      controls.innerHTML = '<button type="button" aria-label="Diminuir zoom">−</button><span>100%</span><button type="button" aria-label="Aumentar zoom">+</button>';

      var zoom = 100;
      var label = controls.querySelector("span");
      var buttons = controls.querySelectorAll("button");

      function updateZoom() { 
        var scale = zoom / 100; 
        iframe.style.transformOrigin = "top left"; 
        iframe.style.transform = "scale(" + scale + ")"; 
        iframe.style.width = (100 / scale) + "%"; 
        iframe.style.height = (100 / scale) + "%"; 
        label.textContent = zoom + "%"; 
      }

      buttons[0].onclick = function () { zoom = Math.max(50, zoom - 10); updateZoom(); };
      buttons[1].onclick = function () { zoom = Math.min(200, zoom + 10); updateZoom(); };

      parent.appendChild(controls);
    });
  }

  // Execução Inicial
  applyCustomizations();

  // Proteção Global contra Clique Duplo ao Finalizar Chamados (Online e Offline)
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("button, [role='button']");
    if (!btn) return;
    var text = (btn.textContent || "").trim();
    if (text.includes("Finalizar chamado") || text.includes("Finalizar OS")) {
      if (btn.dataset.osClickProcessing === "true") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      btn.dataset.osClickProcessing = "true";
      btn.setAttribute("disabled", "true");
      btn.style.pointerEvents = "none";
      btn.style.opacity = "0.5";
      setTimeout(function () {
        delete btn.dataset.osClickProcessing;
        btn.removeAttribute("disabled");
        btn.style.pointerEvents = "";
        btn.style.opacity = "";
      }, 3500);
    }
  }, true);

  // Suporte a CTRL + DUPLO CLIQUE em linhas de tabela para Gestores
  document.addEventListener("dblclick", function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    var tr = e.target.closest("tr");
    if (!tr) return;
    var table = tr.closest("table");
    if (!table) return;

    var headers = (table.querySelector("thead") ? table.querySelector("thead").textContent : "").toLowerCase();
    if (headers.includes("tipo") && (headers.includes("peça") || headers.includes("peca")) && headers.includes("qtd")) {
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    }
  }, true);

  // MutationObserver contínuo para reações do React
  var timeoutId = null;
  var observer = new MutationObserver(function () {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(applyCustomizations, 80);
  });

  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });

})();
