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
    animation: "fadeIn",
    effect: "none"
  },
  {
    name: "Título Impactante",
    family: "Arial",
    size: 60,
    color: "#e74c3c",
    bg: "#f39c12",
    weight: "bold",
    style: "normal",
    animation: "bounce",
    effect: "glow"
  },
  {
    name: "Subtítulo Moderno",
    family: "'Courier New'",
    size: 36,
    color: "#34495e",
    bg: "#bdc3c7",
    weight: "normal",
    style: "oblique",
    animation: "slideIn",
    effect: "none"
  },
  {
    name: "Texto Decorativo",
    family: "fantasy",
    size: 42,
    color: "#8e44ad",
    bg: "#d7bde2",
    weight: "bolder",
    style: "normal",
    animation: "flip",
    effect: "gradient"
  },
  {
    name: "Mono Espacial",
    family: "monospace",
    size: 40,
    color: "#27ae60",
    bg: "#2c3e50",
    weight: "normal",
    style: "normal",
    animation: "zoom",
    effect: "none"
  },
  {
    name: "Clássico Serif",
    family: "'Times New Roman'",
    size: 44,
    color: "#c0392b",
    bg: "#f5b7b1",
    weight: "bold",
    style: "italic",
    animation: "typewriter",
    effect: "none"
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
  animationType: document.getElementById('animationType'),
  effectType: document.getElementById('effectType'),
  textColor: document.getElementById('textColor'),
  bgColor: document.getElementById('bgColor'),
  textColorPreview: document.getElementById('textColorPreview'),
  bgColorPreview: document.getElementById('bgColorPreview'),
  previewBox: document.getElementById('previewBox'),
  previewText: document.getElementById('previewText'),
  urlOutput: document.getElementById('urlOutput'),
  usageExample: document.getElementById('usageExample'),
  fontsGrid: document.getElementById('fontsGrid')
};

// Inicialização
function init() {
  updatePreview();
  setupEventListeners();
  renderPredefinedFonts();
  updateColorPreviews();
}

// Configurar event listeners
function setupEventListeners() {
  elements.textInput.addEventListener('input', updatePreview);
  elements.fontFamily.addEventListener('change', updatePreview);
  elements.fontSize.addEventListener('input', updateFontSize);
  elements.fontWeight.addEventListener('change', updatePreview);
  elements.fontStyle.addEventListener('change', updatePreview);
  elements.animationType.addEventListener('change', updatePreview);
  elements.effectType.addEventListener('change', updatePreview);
  elements.textColor.addEventListener('input', updateColors);
  elements.bgColor.addEventListener('input', updateColors);
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
  const effect = elements.effectType.value;

  // Remover classes anteriores
  elements.previewText.className = '';
  elements.previewText.classList.add('preview-text-base');
  
  // Aplicar estilos ao preview
  elements.previewText.textContent = text;
  elements.previewText.style.fontFamily = fontFamily;
  elements.previewText.style.fontSize = fontSize;
  elements.previewText.style.fontWeight = fontWeight;
  elements.previewText.style.fontStyle = fontStyle;
  elements.previewText.style.color = color;
  elements.previewBox.style.backgroundColor = bgColor;

  // Aplicar animação
  if (animation && animation !== 'none') {
    elements.previewText.classList.add(animation);
  }
  
  // Aplicar efeitos especiais
  if (effect === 'glow') {
    elements.previewText.classList.add('glow');
    // Se for pulse + glow, adicionar classe pulse também
    if (animation === 'pulse') {
      elements.previewText.classList.add('pulse');
    }
  } else if (effect === 'gradient') {
    elements.previewText.classList.add('gradient-text');
  }

  // Gerar URL
  generateUrl();
}

// Gerar URL da API
function generateUrl() {
  const baseUrl = window.location.origin + window.location.pathname.replace('fonts.html', 'text.html');
  const params = new URLSearchParams({
    text: elements.textInput.value || 'Seu Texto Aqui',
    font: elements.fontFamily.value,
    size: elements.fontSize.value,
    color: elements.textColor.value.replace('#', ''),
    bg: elements.bgColor.value.replace('#', ''),
    weight: elements.fontWeight.value,
    style: elements.fontStyle.value
  });

  // Adicionar animação e efeito se disponíveis
  if (elements.animationType.value !== 'none') {
    params.append('animation', elements.animationType.value);
  }
  
  if (elements.effectType.value !== 'none') {
    params.append('effect', elements.effectType.value);
  }

  const url = `${baseUrl}?${params.toString()}`;
  elements.urlOutput.textContent = url;
  elements.usageExample.textContent = url;
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

// Renderizar fontes pré-definidas
function renderPredefinedFonts() {
  elements.fontsGrid.innerHTML = '';
  
  predefinedFonts.forEach((font, index) => {
    const fontCard = document.createElement('div');
    fontCard.className = 'font-card';
    
    fontCard.innerHTML = `
      <h3>${font.name}</h3>
      <div class="font-preview" style="
        font-family: ${font.family};
        font-size: ${font.size}px;
        color: ${font.color};
        background: ${font.bg};
        font-weight: ${font.weight};
        font-style: ${font.style};
        padding: 10px;
        border-radius: 5px;
      ">
        ${elements.textInput.value || 'Seu Texto'}
      </div>
      <div style="margin: 10px 0; font-size: 12px; color: #666;">
        Animação: ${font.animation} | Efeito: ${font.effect}
      </div>
      <button class="use-font-btn" onclick="usePredefinedFont(${index})">
        Usar Esta Fonte
      </button>
    `;
    
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
  elements.animationType.value = font.animation;
  elements.effectType.value = font.effect;
  elements.textColor.value = font.color;
  elements.bgColor.value = font.bg;
  
  updateColors();
  updatePreview();
}

// Inicializar quando carregar
document.addEventListener('DOMContentLoaded', init);
