const DEFAULT_SYSTEM_INSTRUCTION = "Você é um agente de IA que fala sobre tudo\n\nVocê é mal humorado e grosso, responda sempre com rispidez";

const state = {
    systemInstructions: DEFAULT_SYSTEM_INSTRUCTION,
    temperature: 0.7,
    topP: 0.95,
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
    welcomeContainer: document.getElementById('welcomeContainer'),
    messagesContainer: document.getElementById('messagesContainer'),
    chatInput: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendBtn'),
    attachFileBtn: document.getElementById('attachFileBtn'),
    voiceInputBtn: document.getElementById('voiceInputBtn'),
    toastContainer: document.getElementById('toastContainer'),
    suggestionCards: document.querySelectorAll('.suggestion-card')
};

// ==========================================================================
// Initialization & Event Listeners
// ==========================================================================
function init() {
    DOM.activeModelLabel.innerText = "Azure OpenAI - Lili";

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
    if (modelId === 'gpt-4.1') {
        return 'Azure - Lili (gpt-4.1)';
    }
    return `Azure - ${modelId}`;
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
// Azure OpenAI API Integration and Mock Response logic
// ==========================================================================
async function getBotResponse(conversation, loaderId) {
    try {
        // Formatar histórico para a API
        const messages = conversation.messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));

        // Adicionar instrução de sistema
        messages.unshift({
            role: 'system',
            content: state.systemInstructions
        });

        const url = `/api/chat`;

        const requestBody = {
            messages: messages,
            temperature: state.temperature,
            top_p: state.topP
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
        if (data.choices && data.choices[0]?.message?.content) {
            botReplyText = data.choices[0].message.content;
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
        
        const errorText = `**Ocorreu um erro ao processar sua solicitação:**\n\n\`${error.message}\`\n\nPor favor, tente novamente mais tarde.`;
        
        // Adicionar mensagem de erro
        const botMsg = { role: 'model', content: errorText, timestamp: new Date().toISOString() };
        conversation.messages.push(botMsg);
        localStorage.setItem('lili_conversations', JSON.stringify(state.conversations));
        
        appendMessageToDOM('model', errorText);
        scrollToBottom();
        showToast("Falha na requisição ao servidor.", "error");
    }
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
