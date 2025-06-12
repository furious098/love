// Script para coleta de dados de fingerprinting e funcionalidades do frontend

// Função para coletar os dados de fingerprinting
function collectFingerprintData() {
    const data = {};

    // Resolução de tela
    data.resolution = `${window.screen.width}x${window.screen.height}`;

    // Timezone
    data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Idioma
    data.language = navigator.language;

    // Canvas fingerprint (exemplo básico)
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Hello, world!', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Canvas fingerprint', 4, 40);
        data.canvas = canvas.toDataURL();
    } catch (e) {
        data.canvas = 'unavailable';
    }

    // WebGL information (exemplo básico)
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const renderer = gl.getParameter(gl.RENDERER);
            const vendor = gl.getParameter(gl.VENDOR);
            data.webgl = `${vendor} - ${renderer}`;
        } else {
            data.webgl = 'unavailable';
        }
    } catch (e) {
        data.webgl = 'unavailable';
    }


    // Plugins (simplificado)
    data.plugins = [];
    if (navigator.plugins) {
        for (let i = 0; i < navigator.plugins.length; i++) {
            data.plugins.push(navigator.plugins[i].name);
        }
    }


    // Fonts (detecção básica - requer mais código para ser robusto)
    // Esta é uma detecção muito básica e não confiável.
    // Detecção de fontes robusta é complexa.
    data.fonts = [];
     // Exemplo: verificar algumas fontes comuns
    const commonFonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    testCtx.textBaseLine = 'top';
    const testText = 'mmmmmmmmmmlli'; // String para testar a largura
    const baseWidth = testCtx.measureText(testText).width;

    commonFonts.forEach(font => {
        testCtx.font = '72px ' + font + ', monospace'; // Comparar com uma fonte fallback
        const currentWidth = testCtx.measureText(testText).width;
        if (currentWidth !== baseWidth) {
            data.fonts.push(font);
        }
    });


    // Detecção de Tor, proxy, headless (heurísticas muito simples e não confiáveis)
    // Detecção robusta requer métodos mais avançados e backend checks.
    data.isTor = (navigator.webdriver === true || navigator.plugins.length === 0 || navigator.languages.length === 0) ? 1 : 0; // Exemplo de heurística fraca
    data.isProxy = 0; // Não é possível detectar confiavelmente apenas com JS de navegador
    data.isHeadless = navigator.webdriver ? 1 : 0; // navigator.webdriver pode indicar headless, mas não é definitivo

    // Coletar User Agent, etc. (Flask já faz isso)
    // Referer (Flask já faz isso com request.headers.get('Referer'))

    // Placeholder data for browser/os - Flask can often infer this from User Agent
    data.browser = navigator.appName; // Muito básico
    data.os = navigator.platform; // Básico


    // Adicionar Time on Page (tempo de permanência)
    // Usando variáveis globais para que possam ser acessadas na função sendDataToBackend
    window._startTime = Date.now(); // Registrar o tempo de início da página
    window._mouseMovements = 0;
    window._clicks = 0;

    document.addEventListener('mousemove', () => {
        window._mouseMovements++;
    });

    document.addEventListener('click', () => {
        window._clicks++;
    });


    return data;
}

// Função para enviar dados de fingerprinting para o backend
function sendFingerprintData(fingerprintData) {
    const dataToSend = {
        ...fingerprintData,
        // Incluir os dados de comportamento coletado (lembre-se do timing do envio)
        timeOnPage: (Date.now() - (window._startTime || Date.now())) / 1000, // Calcular tempo final em segundos
        mouseMovements: window._mouseMovements || 0,
        clicks: window._clicks || 0

    };

    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
    })
    .then(response => {
        if (!response.ok) {
            // Tentar ler a mensagem de erro do backend se disponível
            return response.json().then(err => { throw new Error(`HTTP error! status: ${response.status}, Message: ${err.message}`); });
        }
        return response.json();
    })
    .then(data => {
        console.log('Success sending fingerprint data:', data);
        // Você pode adicionar feedback para o usuário aqui (ex: uma pequena mensagem na tela)
    })
    .catch((error) => {
        console.error('Error sending fingerprint data:', error);
        // Adicionar tratamento de erro para o usuário (ex: mostrar uma mensagem de erro)
    });
}


// --- Funcionalidade de Edição de Texto ---

const letterContentDiv = document.getElementById('letterContent');
const boldBtn = document.getElementById('boldBtn');
const italicBtn = document.getElementById('italicBtn');
const underlineBtn = document.getElementById('underlineBtn');
const sendBtn = document.getElementById('sendBtn'); // Botão enviar carta (agora abre o formulário de e-mail)
const downloadBtn = document.getElementById('downloadBtn'); // Botão baixar imagem

const emailForm = document.getElementById('emailForm'); // Formulário de e-mail
const senderEmailInput = document.getElementById('senderEmail'); // Campo e-mail remetente
const recipientEmailInput = document.getElementById('recipientEmail'); // Campo e-mail destinatário
const sendEmailBtn = document.getElementById('sendEmailBtn'); // Botão enviar e-mail
const cancelEmailBtn = document.getElementById('cancelEmailBtn'); // Botão cancelar envio de e-mail


// Adiciona event listeners para os botões de formatação
if (boldBtn) {
    boldBtn.addEventListener('click', (event) => {
        event.preventDefault(); // Previne o comportamento padrão do botão (que pode tirar o foco)
        document.execCommand('bold', false, null);
        letterContentDiv.focus(); // Manter o foco na área editável
        updateToolbarState(); // Atualiza o estado dos botões após formatar
    });
}

if (italicBtn) {
    italicBtn.addEventListener('click', (event) => {
        event.preventDefault(); // Previne o comportamento padrão do botão
        document.execCommand('italic', false, null);
         letterContentDiv.focus(); // Manter o foco na área editável
         updateToolbarState(); // Atualiza o estado dos botões após formatar
    });
}

if (underlineBtn) {
    underlineBtn.addEventListener('click', (event) => {
        event.preventDefault(); // Previne o comportamento padrão do botão
        document.execCommand('underline', false, null);
         letterContentDiv.focus(); // Manter o foco na área editável
         updateToolbarState(); // Atualiza o estado dos botões após formatar
    });
}

// Função para atualizar o estado ativo dos botões da toolbar
function updateToolbarState() {
    if (boldBtn) {
        if (document.queryCommandState('bold')) {
            boldBtn.classList.add('active');
        } else {
            boldBtn.classList.remove('active');
        }
    }

    if (italicBtn) {
        if (document.queryCommandState('italic')) {
            italicBtn.classList.add('active');
        } else {
            italicBtn.classList.remove('active');
        }
    }

    if (underlineBtn) {
        if (document.queryCommandState('underline')) {
            underlineBtn.classList.add('active');
        } else {
            underlineBtn.classList.remove('active');
        }
    }
}

// Monitora mudanças na seleção e cliques na área editável para atualizar o estado dos botões
if (letterContentDiv) {
    letterContentDiv.addEventListener('mouseup', updateToolbarState); // Ao soltar o clique após uma seleção
    letterContentDiv.addEventListener('keyup', updateToolbarState); // Ao digitar e soltar a tecla
    letterContentDiv.addEventListener('click', updateToolbarState); // Ao clicar
    // Pode adicionar 'selectionchange' no document para uma detecção mais precisa, mas pode ser intensivo
    // document.addEventListener('selectionchange', updateToolbarState);
}


// --- Lógica para o Placeholder na div contenteditable ---

// Adicionar classe para o placeholder quando a div está vazia
function updatePlaceholder() {
    // Check if the div is truly empty (no text nodes or elements)
    // Considera também se contém apenas tags vazias (como <br>)
    const content = letterContentDiv.innerHTML.trim();
    const isEmpty = content === '' || content === '<br>' || content === '<p></p>' || content === '<b><br></b>' || content === '<i><br></i>' || content === '<u><br></u>' || content === '<b></b>' || content === '<i></i>' || content === '<u></u>'; // Adicione outras tags comuns vazias

    if (isEmpty) {
         letterContentDiv.classList.add('editable-area-empty');
    } else {
         letterContentDiv.classList.remove('editable-area-empty');
    }
}

if (letterContentDiv) {
     // Usar um MutationObserver para detectar mudanças no conteúdo
    const observer = new MutationObserver(updatePlaceholder);
    observer.observe(letterContentDiv, { childList: true, characterData: true, subtree: true });

    // Também verificar no evento de input (útil para colar texto)
    letterContentDiv.addEventListener('input', updatePlaceholder);

    // Chamar na carga inicial para exibir o placeholder se estiver vazio
    // Será chamado no window.onload principal
}


// --- Funcionalidade do Botão Enviar Carta (Agora abre formulário de e-mail) ---
if (sendBtn && emailForm && letterContentDiv) {
    sendBtn.addEventListener('click', () => {
         const letterContent = letterContentDiv.innerHTML;

         if (!letterContent.trim() || letterContent.trim() === '<br>') {
             alert("Por favor, escreva sua carta antes de enviar.");
             return;
         }

        // Esconder a área de edição e botões de formatação/envio
        letterContentDiv.style.display = 'none';
        document.querySelector('.actions-row').style.display = 'none';
        downloadBtn.style.display = 'none'; // Esconder o botão de download também

        // Mostrar o formulário de e-mail
        emailForm.style.display = 'flex'; // Usar flex para alinhar os elementos em coluna
    });
}

// --- Funcionalidade do Botão Cancelar Envio de E-mail ---
if (cancelEmailBtn && emailForm && letterContentDiv) {
    cancelEmailBtn.addEventListener('click', () => {
        // Esconder o formulário de e-mail
        emailForm.style.display = 'none';

        // Limpar os campos de e-mail
        senderEmailInput.value = '';
        recipientEmailInput.value = '';

        // Mostrar novamente a área de edição e botões
        letterContentDiv.style.display = 'block'; // Voltar para display: block
        document.querySelector('.actions-row').style.display = 'flex'; // Voltar para display: flex
         downloadBtn.style.display = 'block'; // Mostrar o botão de download novamente
    });
}


// --- Funcionalidade do Botão Enviar E-mail (Fará a requisição para o backend) ---
if (sendEmailBtn && senderEmailInput && recipientEmailInput && letterContentDiv) {
    sendEmailBtn.addEventListener('click', () => {
        const senderEmail = senderEmailInput.value.trim();
        const recipientEmail = recipientEmailInput.value.trim();
        const letterContent = letterContentDiv.innerHTML; // Pega o HTML rico

        // Validação básica de e-mail
        if (!senderEmail || !recipientEmail) {
            alert("Por favor, preencha ambos os campos de e-mail.");
            return;
        }

        // Regex simples para validação de formato de e-mail (não é 100% robusto)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(senderEmail) || !emailRegex.test(recipientEmail)) {
             alert("Por favor, insira endereços de e-mail válidos.");
             return;
        }


        // Obter o conteúdo da carta (HTML rico)
        if (!letterContent.trim() || letterContent.trim() === '<br>') {
             alert("A carta está vazia.");
             return; // Não deve acontecer se o botão 'Enviar' original validou
        }

        console.log(`Preparando para enviar e-mail de ${senderEmail} para ${recipientEmail} com conteúdo:`, letterContent);

        // --- Fazer a requisição para o backend para enviar o e-mail ---
        // Você precisará criar o endpoint /send-email no seu backend (app.py)
        fetch('/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sender_email: senderEmail,
                recipient_email: recipientEmail,
                letter_content: letterContent
            }),
        })
        .then(response => {
            if (!response.ok) {
                // Tentar ler a mensagem de erro do backend se disponível
                 return response.json().then(err => { throw new Error(`HTTP error! status: ${response.status}, Message: ${err.message}`); });
            }
            return response.json();
        })
        .then(data => {
            console.log('Success sending email:', data);
            alert("E-mail enviado com sucesso!"); // Feedback de sucesso
            // Opcional: Esconder o formulário e voltar para a área de edição após sucesso
            emailForm.style.display = 'none';
            letterContentDiv.style.display = 'block';
            document.querySelector('.actions-row').style.display = 'flex';
             downloadBtn.style.display = 'block';
            // Limpar campos de e-mail após sucesso
            senderEmailInput.value = '';
            recipientEmailInput.value = '';
        })
        .catch((error) => {
            console.error('Error sending email:', error);
            alert(`Ocorreu um erro ao enviar o e-mail: ${error.message}`); // Feedback de erro com a mensagem
        });
    });
}


// --- Funcionalidade do Botão Baixar como Imagem ---
if (downloadBtn && letterContentDiv) {
    downloadBtn.addEventListener('click', () => {
        // Criar um contêiner temporário invisível para renderização
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        // Definir o tamanho do contêiner temporário para o tamanho atual da área de texto visível
        tempContainer.style.width = letterContentDiv.offsetWidth + 'px';
        tempContainer.style.minHeight = letterContentDiv.offsetHeight + 'px'; // Usar min-height
        tempContainer.style.backgroundColor = 'white'; // Fundo branco para a imagem

        // Copiar estilos relevantes da área de texto para o contêiner temporário
        const computedStyles = getComputedStyle(letterContentDiv);
        tempContainer.style.padding = computedStyles.padding;
        tempContainer.style.fontFamily = computedStyles.fontFamily;
        tempContainer.style.fontSize = computedStyles.fontSize;
        tempContainer.style.textAlign = computedStyles.textAlign;
        tempContainer.style.color = computedStyles.color;
        tempContainer.style.boxSizing = computedStyles.boxSizing;
        tempContainer.style.lineHeight = computedStyles.lineHeight;
        tempContainer.style.whiteSpace = computedStyles.whiteSpace;
        tempContainer.style.border = computedStyles.border; // Copiar a borda também
        tempContainer.style.borderRadius = computedStyles.borderRadius; // Copiar o border-radius


        // Clonar o conteúdo formatado da área de texto para o contêiner temporário
        // Clonar para manter a formatação (negrito, itálico, etc.)
        const clonedLetterContent = letterContentDiv.cloneNode(true);
         // Limpar o conteúdo do elemento clonado se ele estiver vazio para remover o placeholder visualmente na cópia.
         if (clonedLetterContent.innerHTML.trim() === '' || clonedLetterContent.innerHTML.trim() === '<br>') {
              clonedLetterContent.innerHTML = '';
         }

        // Adicionar o conteúdo clonado ao contêiner temporário
        tempContainer.innerHTML = clonedLetterContent.innerHTML;


        // --- Adicionar Corações Decorativos ao Contêiner Temporário (Dinamicamente) ---
        const numberOfDecorativeHearts = 15; // Aumentei a quantidade um pouco
        const heartColors = ['#ffcccc', '#ff9999', '#ff6666']; // Variações de rosa/vermelho claro
        const heartEmojis = ['❤️', '💖', '✨']; // Variações de ícones


        for (let i = 0; i < numberOfDecorativeHearts; i++) {
            const heart = document.createElement('span');
            // Conteúdo do coração aleatório
            heart.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];

            // Estilos básicos para o coração
            heart.style.position = 'absolute'; // Posicionamento absoluto dentro do tempContainer
             // Cor aleatória dos corações
            heart.style.color = heartColors[Math.floor(Math.random() * heartColors.length)];
            heart.style.fontSize = `${Math.random() * 30 + 20}px`; // Tamanho aleatório (20px a 50px)
            heart.style.opacity = `${Math.random() * 0.3 + 0.2}`; // Opacidade aleatória (0.2 a 0.5)
            heart.style.pointerEvents = 'none'; // Não interage com o mouse
            heart.style.lineHeight = '1'; // Ajustar line-height para o coração
            heart.style.userSelect = 'none'; // Prevenir seleção do coração


            // Posicionamento aleatório dentro do contêiner temporário (relativo ao seu tamanho)
            // Para evitar que fiquem muito nas bordas, use um intervalo menor
            const randomX = Math.random() * 80 + 10; // Entre 10% e 90% da largura
            const randomY = Math.random() * 80 + 10; // Entre 10% e 90% da altura
            const randomRotation = Math.random() * 360;

            heart.style.left = `${randomX}%`;
            heart.style.top = `${randomY}%`;
            heart.style.transform = `translate(-50%, -50%) rotate(${randomRotation}deg)`; // Centraliza e rotaciona

            heart.style.zIndex = 0; // Coloca atrás do texto
            tempContainer.appendChild(heart);
        }
        // --- Fim da Adição de Corações ---


        // Adicionar o contêiner temporário ao body para que html2canvas possa capturá-lo
        document.body.appendChild(tempContainer);


        // Usar html2canvas para capturar o conteúdo do contêiner temporário
        html2canvas(tempContainer, { // Capturar o contêiner temporário
            scale: 2, // Aumenta a escala para melhor qualidade da imagem (pode aumentar o tempo)
            logging: true, // Habilita logs (útil para depuração)
            useCORS: true, // Tentar carregar recursos externos (como fontes do Google Fonts)
            backgroundColor: null // Permitir que o background do tempContainer (branco) seja usado
        }).then(canvas => {
            // Remover o contêiner temporário
            tempContainer.remove();

            // Converter o canvas para uma URL de imagem (Data URL)
            const image = canvas.toDataURL('image/jpeg', 0.9); // 'image/jpeg' para JPG, 0.9 é a qualidade (0 a 1)

            // Criar um link temporário para download
            const link = document.createElement('a');
            link.download = 'sua-carta-anonima.jpg'; // Nome do arquivo para download
            link.href = image;

            // Clicar no link para iniciar o download
            link.click();

            // Limpar o link temporário
            link.remove();
        }).catch(error => {
            console.error("Error converting HTML to image:", error);
            alert("Ocorreu um erro ao gerar a imagem da carta.");
             // Garantir que o contêiner temporário seja removido mesmo em caso de erro
             if (tempContainer.parentNode) {
                 tempContainer.remove();
             }
        });
    });
}


// --- Geração de Corações no Fundo da PÁGINA (se ainda desejar) ---
// Esta função gera os corações que aparecem no fundo da *página*, não na imagem baixada.
// Se você quer esses corações, certifique-se de que esta função está completa e sendo chamada.
function createHeartsBackground(numberOfHearts = 50) { // Ajuste o número de corações no fundo da página
    const body = document.body;
    const fragment = document.createDocumentFragment(); // Usar fragmento para performance

    for (let i = 0; i < numberOfHearts; i++) {
        const heart = document.createElement('span'); // Usar span ou div simples
        heart.classList.add('heart-icon'); // Adicionar classe para estilizar
        heart.innerHTML = '❤️'; // Conteúdo do coração (pode ser um SVG ou imagem via CSS background)

        // Posicionamento aleatório
        const randomX = Math.random() * 100; // Posição X em %
        const randomY = Math.random() * 100; // Posição Y em %
        const randomRotation = Math.random() * 360; // Rotação inicial aleatória em graus

        heart.style.position = 'fixed'; // Posicionamento fixo para não rolar
        heart.style.left = `${randomX}vw`; // vw = viewport width
        heart.style.top = `${randomY}vh`; // vh = viewport height
        // Aplicar a rotação inicial aleatória diretamente no estilo
        heart.style.transform = `translate(-50%, -50%) rotate(${randomRotation}deg)`; // Centraliza o coração e aplica rotação inicial

        heart.style.zIndex = -1; // Coloca os corações atrás do conteúdo principal
        heart.style.opacity = Math.random() * 0.4 + 0.1; // Opacidade aleatória (entre 0.1 e 0.5)
        heart.style.pointerEvents = 'none'; // Garante que não interfiram com cliques

        // Opcional: Adicionar uma pequena animação de opacidade ou escala
        // heart.style.animation = `fadeIn 1s ease-out forwards ${Math.random() * 2}s`; // Exemplo de fade-in com delay

        fragment.appendChild(heart);
    }

    body.appendChild(fragment); // Adiciona todos os corações de uma vez
}


// --- Inicialização ---
// Coleta e envia dados de fingerprinting quando a página carrega.
// Também configura o placeholder inicial e gera os corações do background.
window.onload = () => {
    const fingerprintData = collectFingerprintData();
    sendFingerprintData(fingerprintData); // Chamado agora de sendFingerprintData
    updatePlaceholder(); // Verificar e exibir placeholder na carga inicial
    updateToolbarState(); // Atualizar o estado dos botões na carga inicial (se houver conteúdo pré-existente)
    createHeartsBackground(80); // Gerar 80 corações no fundo da PÁGINA (ajuste o número)
};
