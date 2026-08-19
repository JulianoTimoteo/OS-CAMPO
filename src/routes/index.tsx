import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  useEffect(() => {
    // Injeção de CSS
    const cssId = 'main-app-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "/OS-CAMPO/assets/index-D1-h-7Ox.css";
      document.head.appendChild(link);
    }

    // Injeção de JS
    const scriptId = 'main-app-bundle';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "/OS-CAMPO/assets/index-BkEAc5_S.js";
      script.type = "module";
      script.async = true;
      document.body.appendChild(script);
    }

    // Intervalo para aplicar customizações e monitorar montagem
    const interval = setInterval(() => {
      // Checkboxes Neon
      document.querySelectorAll('input[type="checkbox"]:not(.neon-replaced)').forEach(el => {
        const original = el as HTMLInputElement;
        if (original.id === 'salvar-credenciais' || original.id === 'manter-conectado') {
          const labelText = original.id === 'salvar-credenciais' ? 'Salvar usuário e senha' : 'Manter-me conectado';
          const container = document.createElement('label');
          container.className = 'neon-checkbox-container';
          container.innerHTML = `
            <input type="checkbox" style="display:none" ${original.checked ? 'checked' : ''}>
            <div class="checkmark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
            <span class="label-text">${labelText}</span>
          `;
          container.onclick = (e) => {
            e.preventDefault();
            original.click();
            const innerCheck = container.querySelector('input');
            if (innerCheck) innerCheck.checked = original.checked;
          };
          if (original.parentElement) {
            original.parentElement.appendChild(container);
          }
          original.classList.add('neon-replaced');
          original.style.display = 'none';
        }
      });

      // Logo (stabilized: apply only once to avoid layout thrashing)
      const logo = document.querySelector('img[alt*="Pitangueiras"], img[src*="logo-usina"]') as HTMLImageElement;
      const targetLogoUrl = "https://julianotimoteo.github.io/OS-CAMPO/logo-usina.png";
      if (logo && !logo.dataset['osCampoLogoFixed']) {
        logo.dataset['osCampoLogoFixed'] = 'true';
        if (!logo.src.includes('logo-usina.png')) {
          logo.src = targetLogoUrl;
        }
        logo.style.display = 'block';
        logo.style.visibility = 'visible';
        logo.style.width = '100px';
        logo.style.height = '36px';
        logo.style.objectFit = 'contain';
        logo.style.maxWidth = '100px';
        logo.style.minWidth = '100px';
        logo.style.flexShrink = '0';
      }
      
      // Texto animado
      const quote = Array.from(document.querySelectorAll('p')).find(p => p.textContent?.includes("A energia que move a região"));
      if (quote && !quote.classList.contains('animated-quote')) {
        quote.classList.add('animated-quote');
      }

      // Busca na aba Solicitante
      const allCards = Array.from(document.querySelectorAll('.rounded-xl.border.bg-card.text-card-foreground.shadow-soft'));
      const solicitanteHeader = Array.from(document.querySelectorAll('.font-semibold, .text-base')).find(el => el.textContent?.trim() === 'Todos os chamados');
      
      if (allCards.length > 0 && solicitanteHeader && !document.getElementById('solicitante-search-wrapper')) {
        const firstCard = allCards[0] as HTMLElement;
        const cardsContainer = firstCard.parentElement;
        
        if (cardsContainer) {
          const wrapper = document.createElement('div');
          wrapper.id = 'solicitante-search-wrapper';
          wrapper.className = 'space-y-5 mb-5';
          wrapper.innerHTML = `
            <div class="relative w-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg>
              <input type="text" id="solicitante-search-input" placeholder="Buscar OS, frota, equipe…" aria-label="Buscar chamados" class="h-10 w-full rounded-full border border-input bg-background pl-9 pr-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] duration-200 hover:border-ring/40 focus:border-ring focus:ring-2 focus:ring-ring/25">
            </div>
          `;
          cardsContainer.parentNode?.insertBefore(wrapper, cardsContainer);
          
          const input = document.getElementById('solicitante-search-input') as HTMLInputElement;
          if (input) {
            input.oninput = (e) => {
              const term = (e.target as HTMLInputElement).value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              let foundCount = 0;
              const currentCards = Array.from(document.querySelectorAll('.rounded-xl.border.bg-card.text-card-foreground.shadow-soft'));
              
              currentCards.forEach((el) => {
                const card = el as HTMLElement;
                const text = card.textContent?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
                const isMatch = text.includes(term);
                card.style.display = isMatch ? 'flex' : 'none';
                if (isMatch) foundCount++;
              });

              let noResults = document.getElementById('solicitante-no-results');
              if (foundCount === 0 && term.length > 0) {
                if (!noResults) {
                  noResults = document.createElement('div');
                  noResults.id = 'solicitante-no-results';
                  noResults.className = 'text-center py-10 text-muted-foreground';
                  noResults.textContent = 'Nenhum chamado encontrado para sua busca.';
                  cardsContainer.appendChild(noResults);
                }
              } else if (noResults) {
                noResults.remove();
              }
            };
          }
        }
      }

      // Re-apply filter if active
      const searchInput = document.getElementById('solicitante-search-input') as HTMLInputElement;
      if (searchInput && searchInput.value) {
        const term = searchInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        allCards.forEach((el) => {
          const card = el as HTMLElement;
          const text = card.textContent?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
          card.style.display = text.includes(term) ? 'flex' : 'none';
        });
      }

      // Status Radar Animation
      document.querySelectorAll('.inline-flex.items-center.rounded-md.border:not(.radar-applied)').forEach(el => {
        const dot = el.querySelector('span[class*="rounded-full"]');
        if (dot) {
          dot.classList.add('radar-dot');
          el.classList.add('radar-applied');
        }
      });

      // Reabrir: apenas para chamados de Solicitante (ocultar em GPS / Solinftec)
      document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent?.includes('Reabrir')) {
          const icon = btn.querySelector('svg:not(.spinning-icon)');
          if (icon) icon.classList.add('spinning-icon');

          // Procura o card do chamado e verifica a origem pelos badges
          let card: HTMLElement | null = btn.closest('[class*="rounded-lg"], [class*="border"]') as HTMLElement | null;
          for (let i = 0; i < 6 && card; i++) {
            if (card.textContent?.includes('OS')) break;
            card = card.parentElement;
          }
          if (card) {
            const badges = Array.from(card.querySelectorAll('.inline-flex.items-center.rounded-md.border'))
              .map(b => b.textContent?.trim());
            const isOutraOrigem = badges.includes('GPS') || badges.includes('Solinftec');
            (btn as HTMLElement).style.display = isOutraOrigem ? 'none' : '';
          }
        }
      });


      // Badges Solinftec e GPS
      document.querySelectorAll('.inline-flex.items-center.rounded-md.border:not(.custom-badge-applied)').forEach(el => {
        const text = el.textContent?.trim();
        if (text === 'Solinftec') {
          (el as HTMLElement).style.borderColor = '#40800C';
          (el as HTMLElement).style.color = '#40800C';
          el.classList.add('custom-badge-applied');
        } else if (text === 'GPS') {
          (el as HTMLElement).style.borderColor = '#3b82f6';
          (el as HTMLElement).style.color = '#3b82f6';
          el.classList.add('custom-badge-applied');
        }
      });

      // Botão Assumir pulse
      document.querySelectorAll('button:not(.assumir-pulse-applied)').forEach(btn => {
        if (btn.textContent?.includes('Assumir')) {
          btn.classList.add('assumir-pulse-applied', 'gentle-pulse');
        }
      });

      // Correção do link Itinerário (Embed link público fornecido pelo usuário)
      document.querySelectorAll('iframe').forEach(iframe => {
        const src = iframe.src;
        if (src.includes('pitaa-my.sharepoint.com') && src.includes('EZKqwy-p4w9Dq4yrLQ_47L0BaolM6qlwNItqnfwcfE7tqA')) {
          // O usuário confirmou que este link é público: "qualquer pessoa com esse link pode exibir"
          // Forçamos o src para garantir que ele use o formato de visualização embutida correto para SharePoint
          const publicEmbedUrl = "https://pitaa-my.sharepoint.com/:w:/g/personal/julianotimoteo_usinapitangueiras_com_br/EZKqwy-p4w9Dq4yrLQ_47L0BaolM6qlwNItqnfwcfE7tqA?e=2agoUZ&action=embedview&wdStartOn=1";
          if (iframe.src !== publicEmbedUrl) {
            iframe.src = publicEmbedUrl;
          }
        }
      });


      // Zoom Control for Itinerário
      const itinerarioIframe = Array.from(document.querySelectorAll('iframe')).find(iframe => 
        iframe.src.includes('pitaa-my.sharepoint.com') && iframe.src.includes('EZKqwy-p4w9Dq4yrLQ_47L0BaolM6qlwNItqnfwcfE7tqA')
      );

      if (itinerarioIframe && !document.getElementById('zoom-controls-wrapper')) {
        const container = itinerarioIframe.parentElement;
        if (container) {
          container.style.position = 'relative';
          const zoomWrapper = document.createElement('div');
          zoomWrapper.id = 'zoom-controls-wrapper';
          zoomWrapper.className = 'absolute bottom-4 right-4 flex items-center gap-2 z-50 bg-background/80 backdrop-blur-sm p-1 rounded-lg border border-border shadow-lg';
          zoomWrapper.innerHTML = `
            <button id="zoom-out" class="w-8 h-8 flex items-center justify-center rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <span id="zoom-level" class="text-xs font-medium min-w-[3rem] text-center">100%</span>
            <button id="zoom-in" class="w-8 h-8 flex items-center justify-center rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          `;
          container.appendChild(zoomWrapper);

          let currentZoom = 100;
          itinerarioIframe.style.transformOrigin = 'top left';
          itinerarioIframe.style.transition = 'transform 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out';

          const updateZoom = () => {
            const scale = currentZoom / 100;
            itinerarioIframe.style.transform = `scale(${scale})`;
            itinerarioIframe.style.width = `${100 / scale}%`;
            itinerarioIframe.style.height = `${100 / scale}%`;
            const zoomLabel = document.getElementById('zoom-level');
            if (zoomLabel) zoomLabel.textContent = `${currentZoom}%`;
          };

          const btnIn = document.getElementById('zoom-in');
          const btnOut = document.getElementById('zoom-out');

          if (btnIn) btnIn.onclick = () => {
            currentZoom = Math.min(currentZoom + 10, 200);
            updateZoom();
          };
          if (btnOut) btnOut.onclick = () => {
            currentZoom = Math.max(currentZoom - 10, 50);
            updateZoom();
          };
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      <div id="root"></div>
      
      <style>{`
        .neon-checkbox-container { display: inline-flex; align-items: center; cursor: pointer; padding: 4px 8px; margin-right: 12px; margin-bottom: 8px; }
        .neon-checkbox-container .checkmark { width: 18px; height: 18px; border: 2px solid #00ff88; border-radius: 4px; margin-right: 8px; display: flex; justify-content: center; align-items: center; }
        .neon-checkbox-container input:checked + .checkmark { background: #00ff88; }
        .neon-checkbox-container .label-text { font-size: 13px; }

        .animated-quote { font-size: 0.95rem !important; font-weight: bold !important; color: #40800c !important; animation: gentle-fade-pulse 4s ease-in-out infinite !important; }
        @keyframes gentle-fade-pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }

        .custom-search-container { position: relative; width: 100%; }
        .custom-search-input { height: 2.25rem; width: 100%; border-radius: 9999px; border: 1px solid var(--border); background: var(--background); padding-left: 2rem; font-size: 0.875rem; outline: none; }
        .custom-search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); width: 0.875rem; height: 0.875rem; color: var(--muted-foreground); }

        .radar-dot { position: relative; z-index: 1; }
        .radar-dot::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border-radius: 50%;
          background: inherit;
          animation: radar-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          opacity: 0.6;
          z-index: -1;
        }
        @keyframes radar-pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(3.5); opacity: 0; }
        }

        .spinning-icon { animation: slow-spin 8s linear infinite !important; }
        @keyframes slow-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        .gentle-pulse {
          animation: gentle-pulse 2s infinite ease-in-out;
        }
        @keyframes gentle-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 4px rgba(59, 130, 246, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }

        img[alt*="Pitangueiras"], img[src*="logo-usina"] {
          max-width: 100px;
          height: 36px;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
}
