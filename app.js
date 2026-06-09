// ==========================================================================
// App State Configuration
// ==========================================================================
const DEFAULT_SYSTEM_INSTRUCTION = "Você é Lili, uma assistente virtual clássica, elegante, empática e altamente inteligente. Responda em português com clareza, refinamento e sofisticação. Use formatação organizada (listas, negritos) quando apropriado para facilitar a leitura. Se o usuário pedir códigos, responda com blocos de códigos formatados com a linguagem correspondente.";

const state = {
    apiKey: localStorage.getItem('lili_gemini_api_key') || '',
    model: localStorage.getItem('lili_gemini_model') || 'gemini-2.5-flash',
    systemInstructions: localStorage.getItem('lili_gemini_system_instructions') || DEFAULT_SYSTEM_INSTRUCTION,
    temperature: parseFloat(localStorage.getItem('lili_gemini_temperature')) || 0.7,
    conversations: JSON.parse(localStorage.getItem('lili_conversations')) || [],
    activeConversationId: localStorage.getItem('lili_active_conversation_id') || null
};

// ==========================================================================
// DOM Elements Bindings
// ==========================================================================
const DOM = {
    sidebar: document.getElementById('sidebar'),
    menuToggleBtn: document.getElementById('menuToggleBtn'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    historyList: document.getElementById('historyList'),
    activeModelLabel: document.getElementById('activeModelLabel'),
    headerSettingsBtn: document.getElementById('headerSettingsBtn'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    welcomeContainer: document.getElementById('welcomeContainer'),
    messagesContainer: document.getElementById('messagesContainer'),
    chatInput: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendBtn'),
    attachFileBtn: document.getElementById('attachFileBtn'),
    voiceInputBtn: document.getElementById('voiceInputBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
    cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    resetSettingsBtn: document.getElementById('resetSettingsBtn'),
    geminiApiKey: document.getElementById('geminiApiKey'),
    geminiModel: document.getElementById('geminiModel'),
    systemInstructions: document.getElementById('systemInstructions'),
    temperature: document.getElementById('temperature'),
    tempVal: document.getElementById('tempVal'),
    toggleApiKeyVisibility: document.getElementById('toggleApiKeyVisibility'),
    toastContainer: document.getElementById('toastContainer'),
    suggestionCards: document.querySelectorAll('.suggestion-card')
};

// ==========================================================================
// Initialization & Event Listeners
// ==========================================================================
function init() {
    // Carregar configurações no formulário
    DOM.geminiApiKey.value = state.apiKey;
    DOM.geminiModel.value = state.model;
    DOM.systemInstructions.value = state.systemInstructions;
    DOM.temperature.value = state.temperature;
    DOM.tempVal.innerText = state.temperature;
    DOM.activeModelLabel.innerText = getModelFriendlyName(state.model);

    // Ajustar visualização inicial da barra lateral
    if (window.innerWidth <= 768) {
        DOM.sidebar.classList.add('closed');
    }

    // Renderizar Histórico e Conversa Ativa
    renderHistoryList();
    if (state.activeConversationId) {
        loadConversation(state.activeConversationId);
    } else {
        showWelcomeScreen();
    }

    setupEventListeners();
}

function setupEventListeners() {
    // Menu e Sidebar
    DOM.menuToggleBtn.addEventListener('click', () => DOM.sidebar.classList.remove('closed'));
    DOM.closeSidebarBtn.addEventListener('click', () => DOM.sidebar.classList.add('closed'));
    DOM.newChatBtn.addEventListener('click', () => startNewChat());

    // Settings Modal
    const openModal = () => {
        DOM.geminiApiKey.value = state.apiKey;
        DOM.geminiModel.value = state.model;
        DOM.systemInstructions.value = state.systemInstructions;
        DOM.temperature.value = state.temperature;
        DOM.tempVal.innerText = state.temperature;
        DOM.settingsModal.classList.add('active');
    };
    const closeModal = () => DOM.settingsModal.classList.remove('active');

    DOM.openSettingsBtn.addEventListener('click', openModal);
    DOM.headerSettingsBtn.addEventListener('click', openModal);
    DOM.closeSettingsModalBtn.addEventListener('click', closeModal);
    DOM.cancelSettingsBtn.addEventListener('click', closeModal);

    DOM.saveSettingsBtn.addEventListener('click', () => {
        state.apiKey = DOM.geminiApiKey.value.trim();
        state.model = DOM.geminiModel.value;
        state.systemInstructions = DOM.systemInstructions.value.trim() || DEFAULT_SYSTEM_INSTRUCTION;
        state.temperature = parseFloat(DOM.temperature.value);

        localStorage.setItem('lili_gemini_api_key', state.apiKey);
        localStorage.setItem('lili_gemini_model', state.model);
        localStorage.setItem('lili_gemini_system_instructions', state.systemInstructions);
        localStorage.setItem('lili_gemini_temperature', state.temperature.toString());

        DOM.activeModelLabel.innerText = getModelFriendlyName(state.model);
        closeModal();
        showToast('Configurações salvas com sucesso!', 'success');

        // Se houver conversa ativa e a chave foi colocada, avisa que está pronta
        if (state.apiKey && !state.activeConversationId) {
            showToast('Chave API configurada! Faça sua pergunta à Lili.', 'info');
        }
    });

    DOM.resetSettingsBtn.addEventListener('click', () => {
        DOM.geminiApiKey.value = '';
        DOM.geminiModel.value = 'gemini-2.5-flash';
        DOM.systemInstructions.value = DEFAULT_SYSTEM_INSTRUCTION;
        DOM.temperature.value = 0.7;
        DOM.tempVal.innerText = '0.7';
        showToast('Valores restaurados para o padrão. Clique em Salvar.', 'info');
    });

    DOM.temperature.addEventListener('input', (e) => {
        DOM.tempVal.innerText = e.target.value;
    });

    // Toggle para visualização de senha da API Key
    DOM.toggleApiKeyVisibility.addEventListener('click', () => {
        const type = DOM.geminiApiKey.type === 'password' ? 'text' : 'password';
        DOM.geminiApiKey.type = type;
        
        const eyeShow = DOM.toggleApiKeyVisibility.querySelector('.eye-show');
        const eyeHide = DOM.toggleApiKeyVisibility.querySelector('.eye-hide');
        
        if (type === 'password') {
            eyeShow.classList.remove('hidden');
            eyeHide.classList.add('hidden');
        } else {
            eyeShow.classList.add('hidden');
            eyeHide.classList.remove('hidden');
        }
    });

    // Textarea Auto-height e Envio com Enter
    DOM.chatInput.addEventListener('input', () => {
        DOM.chatInput.style.height = 'auto';
        DOM.chatInput.style.height = (DOM.chatInput.scrollHeight - 16) + 'px';
        toggleSendBtnState();
    });

    DOM.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendAction();
        }
    });

    DOM.sendBtn.addEventListener('click', handleSendAction);

    // Sugestões de Prompt
    DOM.suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            DOM.chatInput.value = prompt;
            DOM.chatInput.style.height = 'auto';
            DOM.chatInput.style.height = (DOM.chatInput.scrollHeight - 16) + 'px';
            toggleSendBtnState();
            handleSendAction();
        });
    });

    // Attach File / Voice placeholder actions
    DOM.attachFileBtn.addEventListener('click', () => {
        showToast('O envio de mídias está desativado nesta versão. Lili processa apenas texto no momento.', 'info');
    });

    DOM.voiceInputBtn.addEventListener('click', () => {
        showToast('A entrada de voz está desativada nesta versão.', 'info');
    });

    // Redimensionamento de janela (fechar sidebar no mobile)
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            DOM.sidebar.classList.remove('closed');
        } else {
            DOM.sidebar.classList.add('closed');
        }
    });
}

// ==========================================================================
// Helper Utility Functions
// ==========================================================================
function getModelFriendlyName(modelId) {
    switch(modelId) {
        case 'gemini-2.5-flash': return 'Gemini 2.5 Flash';
        case 'gemini-2.5-pro': return 'Gemini 2.5 Pro';
        case 'gemini-1.5-flash': return 'Gemini 1.5 Flash';
        default: return 'Gemini AI';
    }
}

function toggleSendBtnState() {
    const hasText = DOM.chatInput.value.trim().length > 0;
    DOM.sendBtn.disabled = !hasText;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'error') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    } else {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'scale(0.9) translateY(10px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 4000);
}

// ==========================================================================
// Sidebar and Conversation Management
// ==========================================================================
function renderHistoryList() {
    DOM.historyList.innerHTML = '';
    
    if (state.conversations.length === 0) {
        DOM.historyList.innerHTML = '<div class="empty-history">Nenhuma conversa recente</div>';
        return;
    }

    // Ordenar do mais novo para o mais antigo
    const sorted = [...state.conversations].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    sorted.forEach(convo => {
        const item = document.createElement('div');
        item.className = `history-item ${state.activeConversationId === convo.id ? 'active' : ''}`;
        item.setAttribute('data-id', convo.id);

        item.innerHTML = `
            <div class="history-title-container">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span class="history-title">${escapeHTML(convo.title)}</span>
            </div>
            <div class="history-actions">
                <button class="history-action-btn delete-btn" title="Excluir conversa">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;

        // Click no item para carregar conversa
        item.addEventListener('click', (e) => {
            // Evitar carregar se clicar no botão deletar
            if (e.target.closest('.delete-btn')) {
                e.stopPropagation();
                deleteConversation(convo.id);
                return;
            }
            loadConversation(convo.id);
            if (window.innerWidth <= 768) {
                DOM.sidebar.classList.add('closed');
            }
        });

        DOM.historyList.appendChild(item);
    });
}

function showWelcomeScreen() {
    DOM.welcomeContainer.classList.remove('hidden');
    DOM.messagesContainer.classList.add('hidden');
    DOM.messagesContainer.innerHTML = '';
    state.activeConversationId = null;
    localStorage.removeItem('lili_active_conversation_id');
    
    // Atualizar itens ativos no histórico
    document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
}

function startNewChat() {
    showWelcomeScreen();
    DOM.chatInput.value = '';
    DOM.chatInput.style.height = 'auto';
    toggleSendBtnState();
    if (window.innerWidth <= 768) {
        DOM.sidebar.classList.add('closed');
    }
}

function loadConversation(id) {
    const convo = state.conversations.find(c => c.id === id);
    if (!convo) {
        startNewChat();
        return;
    }

    state.activeConversationId = id;
    localStorage.setItem('lili_active_conversation_id', id);
    
    DOM.welcomeContainer.classList.add('hidden');
    DOM.messagesContainer.classList.remove('hidden');
    DOM.messagesContainer.innerHTML = '';

    // Renderizar mensagens
    convo.messages.forEach(msg => {
        appendMessageToDOM(msg.role, msg.content);
    });

    renderHistoryList();
    scrollToBottom();
}

function deleteConversation(id) {
    state.conversations = state.conversations.filter(c => c.id !== id);
    localStorage.setItem('lili_conversations', JSON.stringify(state.conversations));

    if (state.activeConversationId === id) {
        showWelcomeScreen();
    }
    renderHistoryList();
    showToast('Conversa excluída.', 'info');
}

// ==========================================================================
// Messaging and Interaction
// ==========================================================================
function handleSendAction() {
    const text = DOM.chatInput.value.trim();
    if (!text) return;

    // Limpar input
    DOM.chatInput.value = '';
    DOM.chatInput.style.height = 'auto';
    toggleSendBtnState();

    if (!state.activeConversationId) {
        // Criar uma nova conversa
        const newId = 'convo_' + Date.now();
        const newConvo = {
            id: newId,
            title: text.length > 30 ? text.substring(0, 30) + '...' : text,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };
        state.conversations.push(newConvo);
        state.activeConversationId = newId;
        localStorage.setItem('lili_active_conversation_id', newId);
        
        DOM.welcomeContainer.classList.add('hidden');
        DOM.messagesContainer.classList.remove('hidden');
    }

    // Adicionar mensagem do usuário
    const activeConvo = state.conversations.find(c => c.id === state.activeConversationId);
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    activeConvo.messages.push(userMsg);
    activeConvo.updatedAt = new Date().toISOString();
    
    // Salvar
    localStorage.setItem('lili_conversations', JSON.stringify(state.conversations));
    renderHistoryList();
    
    // Append no DOM
    appendMessageToDOM('user', text);
    scrollToBottom();

    // Iniciar animação de digitação do bot
    const loaderId = appendLoadingIndicatorToDOM();
    scrollToBottom();

    // Chamar API
    getBotResponse(activeConvo, loaderId);
}

function appendMessageToDOM(role, content) {
    const row = document.createElement('div');
    row.className = `message-row ${role === 'user' ? 'user' : 'bot'}`;
    
    let avatarContent = '';
    if (role === 'user') {
        avatarContent = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
    } else {
        avatarContent = '<img src="assets/lili_logo.png" alt="Lili Avatar" class="bot-avatar-img">';
    }

    const formattedContent = role === 'model' || role === 'bot' ? parseMarkdown(content) : escapeHTML(content).replace(/\n/g, '<br>');

    row.innerHTML = `
        <div class="message-avatar">
            ${avatarContent}
        </div>
        <div class="message-content-wrapper">
            <div class="message-sender">${role === 'user' ? 'Você' : 'Lili'}</div>
            <div class="message-bubble">
                ${formattedContent}
            </div>
            ${role !== 'user' ? `
            <div class="message-actions">
                <button class="message-action-icon-btn copy-message-btn" title="Copiar resposta">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
            </div>` : ''}
        </div>
    `;

    // Configurar botão de cópia de mensagem
    const copyBtn = row.querySelector('.copy-message-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(content).then(() => {
                showToast('Resposta copiada para a área de transferência!', 'success');
            }).catch(() => {
                showToast('Erro ao copiar resposta.', 'error');
            });
        });
    }

    // Configurar botões de cópia em blocos de código
    row.querySelectorAll('.copy-code-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pre = btn.closest('pre');
            const code = pre.querySelector('code').innerText;
            navigator.clipboard.writeText(code).then(() => {
                btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Copiado!`;
                setTimeout(() => {
                    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar`;
                }, 2000);
            });
        });
    });

    DOM.messagesContainer.appendChild(row);
}

function appendLoadingIndicatorToDOM() {
    const id = 'loader_' + Date.now();
    const row = document.createElement('div');
    row.className = 'message-row bot loading-row';
    row.id = id;

    row.innerHTML = `
        <div class="message-avatar">
            <img src="assets/lili_logo.png" alt="Lili Avatar" class="bot-avatar-img">
        </div>
        <div class="message-content-wrapper">
            <div class="message-sender">Lili</div>
            <div class="message-bubble">
                <div class="loading-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        </div>
    `;
    DOM.messagesContainer.appendChild(row);
    return id;
}

function removeLoadingIndicator(id) {
    const loader = document.getElementById(id);
    if (loader) loader.remove();
}

function scrollToBottom() {
    DOM.messagesContainer.scrollIntoView({ block: 'end', behavior: 'smooth' });
}

// ==========================================================================
// Gemini API Integration and Mock Response logic
// ==========================================================================
async function getBotResponse(conversation, loaderId) {
    // Se não tiver chave de API, responde com simulação elegante
    if (!state.apiKey) {
        setTimeout(() => {
            removeLoadingIndicator(loaderId);
            const mockText = getMockResponse(conversation.messages[conversation.messages.length - 1].content);
            
            // Adicionar resposta simulada na conversa
            const botMsg = { role: 'model', content: mockText, timestamp: new Date().toISOString() };
            conversation.messages.push(botMsg);
            localStorage.setItem('lili_conversations', JSON.stringify(state.conversations));
            
            appendMessageToDOM('model', mockText);
            scrollToBottom();
        }, 1500);
        return;
    }

    try {
        // Formatar histórico para a API do Gemini
        // O Gemini espera a estrutura { role: "user" | "model", parts: [{ text: "..." }] }
        const contents = conversation.messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${state.model}:generateContent?key=${state.apiKey}`;

        const requestBody = {
            contents: contents,
            systemInstruction: {
                parts: [{ text: state.systemInstructions }]
            },
            generationConfig: {
                temperature: state.temperature
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `Erro HTTP ${response.status}`);
        }

        const data = await response.json();
        removeLoadingIndicator(loaderId);

        let botReplyText = "";
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            botReplyText = data.candidates[0].content.parts[0].text;
        } else {
            botReplyText = "Desculpe, recebi uma resposta vazia do servidor. Por favor, tente enviar sua mensagem novamente.";
        }

        // Salvar resposta da Lili na conversa
        const botMsg = { role: 'model', content: botReplyText, timestamp: new Date().toISOString() };
        conversation.messages.push(botMsg);
        localStorage.setItem('lili_conversations', JSON.stringify(state.conversations));
        
        appendMessageToDOM('model', botReplyText);
        scrollToBottom();

    } catch (error) {
        console.error("Erro na chamada da API:", error);
        removeLoadingIndicator(loaderId);
        
        const errorText = `**Ocorreu um erro ao processar sua solicitação:**\n\n\`${error.message}\`\n\nPor favor, verifique se sua chave API está correta e ativa nas Configurações ⚙️ no painel lateral.`;
        
        // Adicionar mensagem de erro
        const botMsg = { role: 'model', content: errorText, timestamp: new Date().toISOString() };
        conversation.messages.push(botMsg);
        localStorage.setItem('lili_conversations', JSON.stringify(state.conversations));
        
        appendMessageToDOM('model', errorText);
        scrollToBottom();
        showToast("Falha na requisição. Verifique sua chave API.", "error");
    }
}

// Resposta Simulada (Modo de Demonstração Elegante)
function getMockResponse(userPrompt) {
    const cleanPrompt = userPrompt.toLowerCase().trim();
    
    let welcomeMessage = `Olá! Sou a **Lili AI**, sua assistente clássica e elegante. ✨

Atualmente, estou operando em **Modo de Demonstração**, o que significa que minhas conexões estão prontas, mas você ainda não configurou uma chave API ativa para conversar diretamente com o cérebro do Gemini.

### ⚙️ Como Ativar as Respostas Reais:
1. Abra as **Configurações** (no botão no canto superior direito ou no rodapé do menu lateral).
2. Cole sua chave de API do Gemini no campo correspondente. (Você pode obter uma gratuitamente no [Google AI Studio](https://aistudio.google.com/)).
3. Clique em **Salvar Alterações**.

Como demonstração das minhas habilidades de formatação clássica, aqui está um exemplo de código que você pode copiar:

\`\`\`javascript
// Função clássica em JS
function saudacaoLili(nome) {
    console.log(\`Olá, \${nome}! Seja muito bem-vindo ao mundo elegante de Lili AI.\`);
}

saudacaoLili("Nélia");
\`\`\`

Fique à vontade para explorar a interface. Se você precisar de alguma ajuda adicional para configurar sua chave API, me avise!`;

    if (cleanPrompt.includes("olá") || cleanPrompt.includes("oi") || cleanPrompt.includes("ola") || cleanPrompt.includes("bom dia") || cleanPrompt.includes("boa tarde") || cleanPrompt.includes("boa noite")) {
        return `Olá! É um grande prazer conversar com você. Eu sou a **Lili AI**. 🌸

Como minhas credenciais com a **Vercel** e o **GitHub** estão perfeitamente conectadas, eu já posso ser implantada em ambiente de produção! 

Para fazermos perguntas reais e obtermos respostas completas baseadas no Gemini, lembre-se de configurar sua **Gemini API Key** no painel de **Configurações** ⚙️.

Deseja que eu lhe explique como gerar uma chave API gratuita no Google AI Studio?`;
    }

    if (cleanPrompt.includes("chave") || cleanPrompt.includes("api") || cleanPrompt.includes("key") || cleanPrompt.includes("configurar")) {
        return `### Como obter sua Gemini API Key gratuita:

1. Acesse o portal do [Google AI Studio](https://aistudio.google.com/).
2. Faça login com sua conta do Google.
3. Clique no botão de destaque **"Get API Key"** (Obter chave de API).
4. Clique em **"Create API Key"** e selecione se deseja associá-la a um projeto novo ou existente.
5. Copie o token gerado (ele começa com \`AIzaSy...\`).
6. Volte aqui na interface da **Lili**, clique em **Configurações** ⚙️ no rodapé lateral ou topo da tela, cole no campo de chave e clique em **Salvar**.

Assim que salvar, estarei pronta para responder a qualquer assunto com todo o poder dos modelos Gemini!`;
    }

    return welcomeMessage;
}

// ==========================================================================
// Custom Markdown Parser (Safe and Vanilla)
// ==========================================================================
function escapeHTML(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function parseMarkdown(markdownText) {
    if (!markdownText) return '';

    // Primeiro escapa HTML para prevenir XSS, exceto se pretendemos renderizar elementos específicos
    let html = escapeHTML(markdownText);

    // 1. Regex para blocos de código com linguagem (ex: ```javascript ... ```)
    const codeBlockRegex = /```([a-zA-Z0-9+#-]+)?\n([\s\S]*?)\n```/g;
    html = html.replace(codeBlockRegex, function(match, lang, code) {
        const language = lang || 'texto';
        // Decodificar entidades html básicas no bloco de código para exibição limpa
        const decodedCode = code
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");

        return `
            <pre><div class="code-header"><span class="code-lang">${language}</span><button class="copy-code-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar</button></div><code>${escapeHTML(decodedCode)}</code></pre>
        `;
    });

    // 2. Regex para código em linha (ex: `código`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 3. Negrito (ex: **texto**)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 4. Itálico (ex: *texto*)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 5. Cabeçalhos (### Título)
    html = html.replace(/^\s*###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^\s*##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^\s*#\s+(.+)$/gm, '<h1>$1</h1>');

    // 6. Listas não ordenadas (- item ou * item)
    // Agrupa itens de lista consecutivos
    let inList = false;
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
        const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
        if (bulletMatch) {
            let res = '';
            if (!inList) {
                inList = true;
                res += '<ul>';
            }
            res += `<li>${bulletMatch[1]}</li>`;
            return res;
        } else {
            let res = '';
            if (inList) {
                inList = false;
                res += '</ul>';
            }
            return res + line;
        }
    });
    if (inList) {
        processedLines.push('</ul>');
    }
    html = processedLines.join('\n');

    // 7. Listas ordenadas (1. item)
    let inOrdList = false;
    const ordLines = html.split('\n');
    const processedOrdLines = ordLines.map(line => {
        const numMatch = line.match(/^\s*\d+\.\s+(.+)$/);
        if (numMatch) {
            let res = '';
            if (!inOrdList) {
                inOrdList = true;
                res += '<ol>';
            }
            res += `<li>${numMatch[1]}</li>`;
            return res;
        } else {
            let res = '';
            if (inOrdList) {
                inOrdList = false;
                res += '</ol>';
            }
            return res + line;
        }
    });
    if (inOrdList) {
        processedOrdLines.push('</ol>');
    }
    html = processedOrdLines.join('\n');

    // 8. Parágrafos e quebras de linha
    // Divide blocos de texto por duas quebras de linha
    const paragraphs = html.split(/\n{2,}/);
    html = paragraphs.map(p => {
        const trimmed = p.trim();
        // Não envolve tags de blocos em parágrafos
        if (!trimmed) return '';
        if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>') || trimmed.startsWith('<table>')) {
            return trimmed;
        }
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
}

// Iniciar a aplicação
document.addEventListener('DOMContentLoaded', init);
