// Configuração inicial
const predefinedFonts = [
  {
    name: "Cursiva Elegante",
    family: "cursive",
    size: 48,
    color: "#2c3e50",
    bg: "#ecf0f1",
    weight: "normal",
    style: "italic",
    animation: "fadeIn"
  },
  {
    name: "Título Impactante", 
    family: "Arial",
    size: 60,
    color: "#e74c3c",
    bg: "#f39c12",
    weight: "bold",
    style: "normal",
    animation: "bounce"
  },
  {
    name: "Subtítulo Moderno",
    family: "'Courier New'",
    size: 36,
    color: "#34495e",
    bg: "#bdc3c7",
    weight: "normal",
    style: "oblique",
    animation: "slideIn"
  },
  {
    name: "Texto Decorativo",
    family: "fantasy",
    size: 42,
    color: "#8e44ad",
    bg: "#d7bde2",
    weight: "bolder",
    style: "normal",
    animation: "pulse"
  },
  {
    name: "Mono Espacial",
    family: "monospace",
    size: 40,
    color: "#27ae60",
    bg: "#2c3e50",
    weight: "normal",
    style: "normal",
    animation: "typewriter"
  },
  {
    name: "Clássico Serif",
    family: "'Times New Roman'",
    size: 44,
    color: "#c0392b",
    bg: "#f5b7b1",
    weight: "bold",
    style: "italic",
    animation: "flip"
  }
];

// Elementos DOM
const elements = {
  textInput: document.getElementById('textInput'),
  fontFamily: document.getElementById('fontFamily'),
  fontSize: document.getElementById('fontSize'),
  fontSizeValue: document.getElementById('fontSizeValue'),
  fontWeight: document.getElementById('fontWeight'),
  fontStyle: document.getElementById('fontStyle'),
  textColor: document.getElementById('textColor'),
  bgColor: document.getElementById('bgColor'),
  animationType: document.getElementById('animationType'),
  textColorPreview: document.getElementById('textColorPreview'),
  bgColorPreview: document.getElementById('bgColorPreview'),
  previewBox: document.getElementById('previewBox'),
  previewText: document.getElementById('previewText'),
  urlOutput: document.getElementById('urlOutput'),
  usageExample: document.getElementById('usageExample'),
  fontsGrid: document.getElementById('fontsGrid'),
  iframeCode: document.getElementById('iframeCode')
};

// Animações disponíveis
const animations = [
  { name: "Nenhuma", value: "none" },
  { name: "Fade In", value: "fadeIn" },
  { name: "Bounce", value: "bounce" },
  { name: "Slide In", value: "slideIn" },
  { name: "Pulse", value: "pulse" },
  { name: "Typewriter", value: "typewriter" },
  { name: "Flip", value: "flip" },
  { name: "Zoom", value: "zoom" },
  { name: "Rotate", value: "rotate" }
];

// Inicialização
function init() {
  setupAnimations();
  updatePreview();
  setupEventListeners();
  renderPredefinedFonts();
  updateColorPreviews();
}

// Configurar opções de animação
function setupAnimations() {
  elements.animationType.innerHTML = '';
  animations.forEach(anim => {
    const option = document.createElement('option');
    option.value = anim.value;
    option.textContent = anim.name;
    elements.animationType.appendChild(option);
  });
}

// Configurar event listeners
function setupEventListeners() {
  elements.textInput.addEventListener('input', updatePreview);
  elements.fontFamily.addEventListener('change', updatePreview);
  elements.fontSize.addEventListener('input', updateFontSize);
  elements.fontWeight.addEventListener('change', updatePreview);
  elements.fontStyle.addEventListener('change', updatePreview);
  elements.textColor.addEventListener('input', updateColors);
  elements.bgColor.addEventListener('input', updateColors);
  elements.animationType.addEventListener('change', updatePreview);
}

// Atualizar tamanho da fonte
function updateFontSize() {
  elements.fontSizeValue.textContent = `${elements.fontSize.value}px`;
  updatePreview();
}

// Atualizar cores
function updateColors() {
  elements.textColorPreview.style.backgroundColor = elements.textColor.value;
  elements.bgColorPreview.style.backgroundColor = elements.bgColor.value;
  updatePreview();
}

// Aplicar animação
function applyAnimation(element, animationName) {
  // Remove animações anteriores
  element.classList.remove('fadeIn', 'bounce', 'slideIn', 'pulse', 'typewriter', 'flip', 'zoom', 'rotate');
  
  if (animationName && animationName !== 'none') {
    // Adiciona a nova animação
    setTimeout(() => {
      element.classList.add(animationName);
    }, 100);
  }
}

// Atualizar pré-visualização
function updatePreview() {
  const text = elements.textInput.value || 'Seu Texto Aqui';
  const fontFamily = elements.fontFamily.value;
  const fontSize = `${elements.fontSize.value}px`;
  const fontWeight = elements.fontWeight.value;
  const fontStyle = elements.fontStyle.value;
  const color = elements.textColor.value;
  const bgColor = elements.bgColor.value;
  const animation = elements.animationType.value;

  // Aplicar estilos ao preview
  elements.previewText.textContent = text;
  elements.previewText.style.fontFamily = fontFamily;
  elements.previewText.style.fontSize = fontSize;
  elements.previewText.style.fontWeight = fontWeight;
  elements.previewText.style.fontStyle = fontStyle;
  elements.previewText.style.color = color;
  elements.previewBox.style.backgroundColor = bgColor;

  // Aplicar animação
  applyAnimation(elements.previewText, animation);

  // Gerar URL
  generateUrl();
}

// Gerar URL da API
function generateUrl() {
  const baseUrl = window.location.origin + window.location.pathname;
  const basePath = baseUrl.replace(/\/[^\/]*$/, '/text.html');
  
  const params = new URLSearchParams({
    text: elements.textInput.value || 'Seu Texto Aqui',
    font: elements.fontFamily.value,
    size: elements.fontSize.value,
    color: elements.textColor.value.replace('#', ''),
    bg: elements.bgColor.value.replace('#', ''),
    weight: elements.fontWeight.value,
    style: elements.fontStyle.value,
    animation: elements.animationType.value
  });

  const url = `${basePath}?${params.toString()}`;
  elements.urlOutput.textContent = url;
  
  // Código iframe limpo (só o código)
  const iframeCode = `<iframe src="${url}" width="400" height="200" frameborder="0"></iframe>`;
  elements.iframeCode.textContent = iframeCode;
  
  // EXECUTA o iframe
  elements.usageExample.innerHTML = `
    <div class="iframe-container" style="margin-bottom: 15px;">
      <iframe src="${url}" width="100%" height="200" frameborder="0" style="border: 2px solid #ccc; border-radius: 8px;"></iframe>
    </div>
  `;
}

// Copiar URL
function copyUrl() {
  const url = elements.urlOutput.textContent;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.querySelector('.copy-btn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Copiado!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

// Copiar código iframe
function copyIframeCode() {
  const iframeCode = elements.iframeCode.textContent;
  
  navigator.clipboard.writeText(iframeCode).then(() => {
    const btn = document.querySelector('.copy-iframe-btn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Código Copiado!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

// Renderizar fontes pré-definidas
function renderPredefinedFonts() {
  elements.fontsGrid.innerHTML = '';
  
  predefinedFonts.forEach((font, index) => {
    const fontCard = document.createElement('div');
    fontCard.className = 'font-card';
    fontCard.style.cssText = `
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      background: white;
      text-align: center;
      transition: transform 0.3s ease;
      cursor: pointer;
    `;
    
    fontCard.innerHTML = `
      <h3 style="margin-bottom: 10px; font-size: 16px;">${font.name}</h3>
      <div class="font-preview" style="
        font-family: ${font.family};
        font-size: ${font.size}px;
        color: ${font.color};
        background: ${font.bg};
        font-weight: ${font.weight};
        font-style: ${font.style};
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 10px;
        min-height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: ${font.animation} 1s ease;
      ">
        ${elements.textInput.value || 'Seu Texto'}
      </div>
      <button class="use-font-btn" onclick="usePredefinedFont(${index})" style="
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
        transition: background 0.3s ease;
      ">
        Usar Esta Fonte
      </button>
    `;
    
    // Efeito hover
    fontCard.addEventListener('mouseenter', () => {
      fontCard.style.transform = 'translateY(-5px)';
    });
    fontCard.addEventListener('mouseleave', () => {
      fontCard.style.transform = 'translateY(0)';
    });
    
    elements.fontsGrid.appendChild(fontCard);
  });
}

// Usar fonte pré-definida
function usePredefinedFont(index) {
  const font = predefinedFonts[index];
  
  elements.fontFamily.value = font.family;
  elements.fontSize.value = font.size;
  elements.fontSizeValue.textContent = `${font.size}px`;
  elements.fontWeight.value = font.weight;
  elements.fontStyle.value = font.style;
  elements.textColor.value = font.color;
  elements.bgColor.value = font.bg;
  elements.animationType.value = font.animation;
  
  updateColors();
  updatePreview();
}

// Inicializar quando carregar
document.addEventListener('DOMContentLoaded', init);
